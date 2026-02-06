import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  TextInput,
  Modal,
  FlatList,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/lib/auth-context';
import { EV_MODELS, EVModel } from '@/constants/vehicles';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, soc, setSoc, logout, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editModel, setEditModel] = useState('');
  const [editMileage, setEditMileage] = useState('');
  const [editBattery, setEditBattery] = useState('');
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [modelSearch, setModelSearch] = useState('');

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      logout().then(() => router.replace('/(auth)/login'));
      return;
    }
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const startEditing = () => {
    if (!user) return;
    setEditModel(user.evModel);
    setEditMileage(user.maxMileage.toString());
    setEditBattery(user.batteryCapacity.toString());
    setIsEditing(true);
  };

  const saveEditing = async () => {
    const mileage = parseFloat(editMileage);
    const battery = parseFloat(editBattery);
    if (isNaN(mileage) || isNaN(battery) || mileage <= 0 || battery <= 0) return;
    await updateProfile({
      evModel: editModel,
      maxMileage: mileage,
      batteryCapacity: battery,
    });
    setIsEditing(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleSelectModel = (model: EVModel) => {
    setEditModel(model.name);
    setEditMileage(model.maxMileage.toString());
    setEditBattery(model.batteryCapacity.toString());
    setShowModelPicker(false);
    setModelSearch('');
  };

  const filteredModels = EV_MODELS.filter((m) =>
    m.name.toLowerCase().includes(modelSearch.toLowerCase())
  );

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  if (!user) return null;

  return (
    <View style={styles.container}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: topPad + 16,
            paddingBottom: Platform.OS === 'web' ? 118 : 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>Profile</Text>

        <View style={styles.profileCard}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>
              {user.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Vehicle Details</Text>
            {!isEditing ? (
              <Pressable onPress={startEditing}>
                <Ionicons name="create-outline" size={20} color={Colors.primary} />
              </Pressable>
            ) : (
              <View style={styles.editActions}>
                <Pressable
                  onPress={() => setIsEditing(false)}
                  style={styles.editActionBtn}
                >
                  <Ionicons name="close" size={20} color={Colors.danger} />
                </Pressable>
                <Pressable onPress={saveEditing} style={styles.editActionBtn}>
                  <Ionicons name="checkmark" size={20} color={Colors.primary} />
                </Pressable>
              </View>
            )}
          </View>

          {!isEditing ? (
            <>
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Ionicons name="car-sport" size={18} color={Colors.primary} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>EV Model</Text>
                  <Text style={styles.detailValue}>{user.evModel}</Text>
                </View>
              </View>
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <MaterialCommunityIcons
                    name="road-variant"
                    size={18}
                    color={Colors.secondary}
                  />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Maximum Range</Text>
                  <Text style={styles.detailValue}>{user.maxMileage} km</Text>
                </View>
              </View>
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Ionicons
                    name="battery-charging"
                    size={18}
                    color={Colors.warning}
                  />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Battery Capacity</Text>
                  <Text style={styles.detailValue}>
                    {user.batteryCapacity} kWh
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.editSection}>
              <Pressable
                style={styles.editInputWrapper}
                onPress={() => setShowModelPicker(true)}
              >
                <Text style={styles.editLabel}>EV Model</Text>
                <View style={styles.editRow}>
                  <Text style={styles.editPickerText}>{editModel}</Text>
                  <Ionicons
                    name="chevron-down"
                    size={16}
                    color={Colors.textMuted}
                  />
                </View>
              </Pressable>
              <View style={styles.editInputWrapper}>
                <Text style={styles.editLabel}>Max Range (km)</Text>
                <TextInput
                  style={styles.editInput}
                  value={editMileage}
                  onChangeText={setEditMileage}
                  keyboardType="numeric"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
              <View style={styles.editInputWrapper}>
                <Text style={styles.editLabel}>Battery (kWh)</Text>
                <TextInput
                  style={styles.editInput}
                  value={editBattery}
                  onChangeText={setEditBattery}
                  keyboardType="numeric"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Status</Text>
          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <Text style={styles.statusValue}>{soc}%</Text>
              <Text style={styles.statusLabel}>SOC</Text>
            </View>
            <View style={styles.statusDivider} />
            <View style={styles.statusItem}>
              <Text style={styles.statusValue}>
                {Math.round((soc / 100) * user.maxMileage)}
              </Text>
              <Text style={styles.statusLabel}>km Range</Text>
            </View>
            <View style={styles.statusDivider} />
            <View style={styles.statusItem}>
              <Text style={styles.statusValue}>
                {Math.round(user.batteryCapacity * (soc / 100) * 10) / 10}
              </Text>
              <Text style={styles.statusLabel}>kWh Left</Text>
            </View>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && styles.logoutPressed,
          ]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
          <Text style={styles.logoutText}>Sign Out</Text>
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
                placeholder="Search..."
                placeholderTextColor={Colors.textMuted}
                value={modelSearch}
                onChangeText={setModelSearch}
              />
            </View>
            <FlatList
              data={filteredModels}
              keyExtractor={(item) => item.name}
              renderItem={({ item }) => (
                <Pressable
                  style={({ pressed }) => [
                    styles.modelItem,
                    pressed && { backgroundColor: Colors.surfaceElevated },
                  ]}
                  onPress={() => handleSelectModel(item)}
                >
                  <Text style={styles.modelName}>{item.name}</Text>
                  <Text style={styles.modelSpecs}>
                    {item.maxMileage} km · {item.batteryCapacity} kWh
                  </Text>
                </Pressable>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              contentContainerStyle={{ paddingHorizontal: 16 }}
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
    paddingHorizontal: 20,
  },
  screenTitle: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    color: Colors.text,
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  profileCard: {
    alignItems: 'center',
    marginBottom: 28,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarLargeText: {
    fontSize: 32,
    fontFamily: 'Inter_700Bold',
    color: Colors.primary,
  },
  userName: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: Colors.text,
  },
  userEmail: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    marginTop: 4,
  },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
    marginBottom: 16,
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
  },
  editActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  detailIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.textMuted,
  },
  detailValue: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
    marginTop: 2,
  },
  editSection: {
    gap: 14,
  },
  editInputWrapper: {
    gap: 6,
  },
  editLabel: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: Colors.textSecondary,
  },
  editInput: {
    backgroundColor: Colors.inputBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    height: 44,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: Colors.text,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.inputBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    height: 44,
  },
  editPickerText: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: Colors.text,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statusItem: {
    alignItems: 'center',
    gap: 4,
  },
  statusValue: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    color: Colors.primary,
  },
  statusLabel: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.textMuted,
  },
  statusDivider: {
    width: 1,
    height: 36,
    backgroundColor: Colors.border,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 14,
    backgroundColor: Colors.dangerMuted,
    marginTop: 8,
  },
  logoutPressed: {
    opacity: 0.8,
  },
  logoutText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.danger,
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
    maxHeight: '60%',
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
    height: 40,
    gap: 8,
    marginBottom: 8,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.text,
  },
  modelItem: {
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  modelName: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
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
  },
});
