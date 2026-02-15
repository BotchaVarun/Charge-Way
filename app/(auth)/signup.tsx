import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  FlatList,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../../constants/colors';
import { useAuth } from '../../lib/auth-context';
import { EV_MODELS, EVModel } from '../../constants/vehicles';

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedModel, setSelectedModel] = useState<EVModel | null>(null);
  const [maxMileage, setMaxMileage] = useState('');
  const [batteryCapacity, setBatteryCapacity] = useState('');
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [modelSearch, setModelSearch] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredModels = EV_MODELS.filter((m) =>
    m.name.toLowerCase().includes(modelSearch.toLowerCase())
  );

  const handleSelectModel = (model: EVModel) => {
    setSelectedModel(model);
    setMaxMileage(model.maxMileage.toString());
    setBatteryCapacity(model.batteryCapacity.toString());
    setShowModelPicker(false);
    setModelSearch('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSignup = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all required fields');
      return;
    }
    if (!selectedModel) {
      setError('Please select your EV model');
      return;
    }
    if (password.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }
    const mileage = parseFloat(maxMileage);
    const battery = parseFloat(batteryCapacity);
    if (isNaN(mileage) || mileage <= 0) {
      setError('Please enter a valid mileage');
      return;
    }
    if (isNaN(battery) || battery <= 0) {
      setError('Please enter a valid battery capacity');
      return;
    }

    setError('');
    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const result = await signup({
      name: name.trim(),
      email: email.trim(),
      password,
      evModel: selectedModel.name,
      maxMileage: mileage,
      batteryCapacity: battery,
    });

    if (result.success) {
      router.replace('/(tabs)');
    } else {
      setError(result.error || 'Signup failed');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setIsSubmitting(false);
  };

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0A2A1B', Colors.background, Colors.background]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.4 }}
      />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: topPad + 20,
            paddingBottom: insets.bottom + 40,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Set up your profile and vehicle details
          </Text>
        </View>

        {!!error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color={Colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Info</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="person-outline"
                size={18}
                color={Colors.textMuted}
              />
              <TextInput
                style={styles.input}
                placeholder="Your name"
                placeholderTextColor={Colors.textMuted}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="mail-outline"
                size={18}
                color={Colors.textMuted}
              />
              <TextInput
                style={styles.input}
                placeholder="your@email.com"
                placeholderTextColor={Colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={Colors.textMuted}
              />
              <TextInput
                style={styles.input}
                placeholder="Create password"
                placeholderTextColor={Colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <Pressable onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={Colors.textMuted}
                />
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehicle Details</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>EV Model</Text>
            <Pressable
              style={styles.inputWrapper}
              onPress={() => setShowModelPicker(true)}
            >
              <Ionicons
                name="car-outline"
                size={18}
                color={Colors.textMuted}
              />
              <Text
                style={[
                  styles.pickerText,
                  !selectedModel && styles.placeholderText,
                ]}
              >
                {selectedModel ? selectedModel.name : 'Select your EV model'}
              </Text>
              <Ionicons
                name="chevron-down"
                size={18}
                color={Colors.textMuted}
              />
            </Pressable>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Max Range (km)</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="speedometer-outline"
                  size={18}
                  color={Colors.textMuted}
                />
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor={Colors.textMuted}
                  value={maxMileage}
                  onChangeText={setMaxMileage}
                  keyboardType="numeric"
                />
                <Text style={styles.unitText}>km</Text>
              </View>
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Battery (kWh)</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="battery-half-outline"
                  size={18}
                  color={Colors.textMuted}
                />
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor={Colors.textMuted}
                  value={batteryCapacity}
                  onChangeText={setBatteryCapacity}
                  keyboardType="numeric"
                />
                <Text style={styles.unitText}>kWh</Text>
              </View>
            </View>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.signupButton,
            pressed && styles.buttonPressed,
            isSubmitting && styles.buttonDisabled,
          ]}
          onPress={handleSignup}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.signupButtonText}>Create Account</Text>
          )}
        </Pressable>
      </ScrollView>

      <Modal
        visible={showModelPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowModelPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContainer,
              { paddingBottom: insets.bottom + 16 },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select EV Model</Text>
              <Pressable onPress={() => setShowModelPicker(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>

            <View style={styles.modalSearch}>
              <Ionicons name="search" size={18} color={Colors.textMuted} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search models..."
                placeholderTextColor={Colors.textMuted}
                value={modelSearch}
                onChangeText={setModelSearch}
                autoFocus
              />
            </View>

            <FlatList
              data={filteredModels}
              keyExtractor={(item) => item.name}
              renderItem={({ item }) => (
                <Pressable
                  style={({ pressed }) => [
                    styles.modelItem,
                    pressed && styles.modelItemPressed,
                    selectedModel?.name === item.name && styles.modelItemSelected,
                  ]}
                  onPress={() => handleSelectModel(item)}
                >
                  <View style={styles.modelIcon}>
                    <Ionicons
                      name="car-sport"
                      size={20}
                      color={
                        selectedModel?.name === item.name
                          ? Colors.primary
                          : Colors.textSecondary
                      }
                    />
                  </View>
                  <View style={styles.modelInfo}>
                    <Text
                      style={[
                        styles.modelName,
                        selectedModel?.name === item.name &&
                        styles.modelNameSelected,
                      ]}
                    >
                      {item.name}
                    </Text>
                    <Text style={styles.modelSpecs}>
                      {item.maxMileage} km range · {item.batteryCapacity} kWh
                    </Text>
                  </View>
                  {selectedModel?.name === item.name && (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color={Colors.primary}
                    />
                  )}
                </Pressable>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              contentContainerStyle={styles.modelList}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
    marginBottom: 8,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    marginTop: 4,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.dangerMuted,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: Colors.danger,
    flex: 1,
  },
  section: {
    gap: 16,
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary,
    marginBottom: 4,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    gap: 10,
    height: 52,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: Colors.text,
  },
  pickerText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: Colors.text,
  },
  placeholderText: {
    color: Colors.textMuted,
  },
  unitText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: Colors.textMuted,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  signupButton: {
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  signupButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: '#0A0E14',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
  },
  modalSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBg,
    borderRadius: 10,
    marginHorizontal: 20,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
    marginBottom: 8,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: Colors.text,
  },
  modelList: {
    paddingHorizontal: 12,
  },
  modelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 12,
  },
  modelItemPressed: {
    backgroundColor: Colors.surfaceElevated,
  },
  modelItemSelected: {
    backgroundColor: Colors.primaryMuted,
  },
  modelIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modelInfo: {
    flex: 1,
  },
  modelName: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
  },
  modelNameSelected: {
    color: Colors.primary,
  },
  modelSpecs: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 8,
  },
});
