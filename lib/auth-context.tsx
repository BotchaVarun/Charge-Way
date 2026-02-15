import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile } from '../types';

const USERS_KEY = '@chargeway_users';
const CURRENT_KEY = '@chargeway_current';
const SOC_KEY = '@chargeway_soc';

interface AuthContextValue {
  user: UserProfile | null;
  isLoading: boolean;
  soc: number;
  setSoc: (soc: number) => void;
  login: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  signup: (
    data: Omit<UserProfile, 'id'>
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [soc, setSocState] = useState(75);

  useEffect(() => {
    (async () => {
      try {
        const [userJson, socJson] = await Promise.all([
          AsyncStorage.getItem(CURRENT_KEY),
          AsyncStorage.getItem(SOC_KEY),
        ]);
        if (userJson) setUser(JSON.parse(userJson));
        if (socJson) setSocState(parseInt(socJson, 10));
      } catch (e) {
        console.error('Failed to load user', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const setSoc = useCallback(async (value: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(value)));
    setSocState(clamped);
    await AsyncStorage.setItem(SOC_KEY, clamped.toString());
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const usersJson = await AsyncStorage.getItem(USERS_KEY);
        const users: UserProfile[] = usersJson ? JSON.parse(usersJson) : [];
        const found = users.find(
          (u) => u.email.toLowerCase() === email.toLowerCase()
        );
        if (!found)
          return { success: false, error: 'No account found with this email' };
        if (found.password !== password)
          return { success: false, error: 'Incorrect password' };
        setUser(found);
        await AsyncStorage.setItem(CURRENT_KEY, JSON.stringify(found));
        return { success: true };
      } catch {
        return { success: false, error: 'Login failed. Please try again.' };
      }
    },
    []
  );

  const signup = useCallback(
    async (data: Omit<UserProfile, 'id'>) => {
      try {
        const usersJson = await AsyncStorage.getItem(USERS_KEY);
        const users: UserProfile[] = usersJson ? JSON.parse(usersJson) : [];
        const exists = users.find(
          (u) => u.email.toLowerCase() === data.email.toLowerCase()
        );
        if (exists)
          return {
            success: false,
            error: 'An account with this email already exists',
          };
        const newUser: UserProfile = {
          ...data,
          id:
            Date.now().toString() +
            Math.random().toString(36).substr(2, 9),
        };
        users.push(newUser);
        await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
        await AsyncStorage.setItem(CURRENT_KEY, JSON.stringify(newUser));
        setUser(newUser);
        return { success: true };
      } catch {
        return { success: false, error: 'Signup failed. Please try again.' };
      }
    },
    []
  );

  const logout = useCallback(async () => {
    setUser(null);
    await AsyncStorage.removeItem(CURRENT_KEY);
  }, []);

  const updateProfile = useCallback(
    async (data: Partial<UserProfile>) => {
      if (!user) return;
      const updated = { ...user, ...data };
      setUser(updated);
      await AsyncStorage.setItem(CURRENT_KEY, JSON.stringify(updated));
      const usersJson = await AsyncStorage.getItem(USERS_KEY);
      const users: UserProfile[] = usersJson ? JSON.parse(usersJson) : [];
      const idx = users.findIndex((u) => u.id === user.id);
      if (idx >= 0) {
        users[idx] = updated;
        await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
      }
    },
    [user]
  );

  const value = useMemo(
    () => ({
      user,
      isLoading,
      soc,
      setSoc,
      login,
      signup,
      logout,
      updateProfile,
    }),
    [user, isLoading, soc, setSoc, login, signup, logout, updateProfile]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
