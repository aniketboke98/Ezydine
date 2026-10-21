import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { api } from '../services/api';

export interface StaffMember {
  id: string;
  name: string;
  phone: string;
  role: 'Owner' | 'Manager' | 'Cashier' | 'Chef' | 'Waiter';
  pin: string;
  active: boolean;
  canEditMenu: boolean;
  canAccessReports: boolean;
}

interface StaffManagementModalProps {
  visible: boolean;
  onClose: () => void;
}

export const StaffManagementModal: React.FC<StaffManagementModalProps> = ({
  visible,
  onClose,
}) => {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<StaffMember['role']>('Manager');
  const [newPin, setNewPin] = useState('');

  // Fetch staff list from PostgreSQL for active restaurant
  useEffect(() => {
    if (visible) {
      loadStaff();
    }
  }, [visible]);

  const loadStaff = async () => {
    setLoading(true);
    try {
      const res = await api.staff.getAll();
      if (res.success && res.staff) {
        setStaffList(res.staff);
      }
    } catch (e) {
      console.warn('Error fetching staff from API:', e);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (role: StaffMember['role']) => {
    switch (role) {
      case 'Owner':
        return { bg: '#FEE2E2', text: Colors.primaryRed, icon: 'shield-checkmark' as const };
      case 'Manager':
        return { bg: '#E0E7FF', text: '#4338CA', icon: 'briefcase' as const };
      case 'Cashier':
        return { bg: '#FEF3C7', text: Colors.warningOrange, icon: 'cash' as const };
      case 'Chef':
        return { bg: '#DCFCE7', text: Colors.successGreen, icon: 'restaurant' as const };
      case 'Waiter':
        return { bg: '#F1F5F9', text: Colors.navy, icon: 'people' as const };
      default:
        return { bg: '#F1F5F9', text: Colors.navy, icon: 'people' as const };
    }
  };

  const handleAddStaff = async () => {
    if (!newName.trim()) {
      Alert.alert('Required Field', 'Please enter staff name.');
      return;
    }
    if (!newPhone.trim()) {
      Alert.alert('Required Field', 'Please enter staff mobile number.');
      return;
    }
    if (newPin.length < 4) {
      Alert.alert('Invalid PIN', 'Please enter a 4-digit quick access PIN.');
      return;
    }

    try {
      const res = await api.staff.create({
        name: newName.trim(),
        phone: newPhone.trim(),
        role: newRole,
        pin: newPin.trim(),
        canEditMenu: newRole === 'Owner' || newRole === 'Manager',
        canAccessReports: newRole === 'Owner' || newRole === 'Manager',
      });

      if (res.success && res.member) {
        setStaffList((prev) => [res.member, ...prev]);
        setNewName('');
        setNewPhone('');
        setNewPin('');
        setIsAdding(false);
        Alert.alert(
          'Staff Member Saved',
          `${res.member.name} (${res.member.role}) has been saved to the database. They can now log in to the web POS portal using their mobile number and PIN.`
        );
      } else {
        Alert.alert('Error', res.error || 'Failed to create staff member.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save staff member.');
    }
  };

  const handleToggleStatus = async (id: string | number) => {
    try {
      await api.staff.toggle(id);
      setStaffList((prev) =>
        prev.map((s) => (s.id === id ? { ...s, active: !s.active } : s))
      );
    } catch {
      // silent fallback
    }
  };

  const handleDeleteStaff = (member: StaffMember) => {
    if (member.role === 'Owner') {
      Alert.alert('Action Denied', 'Owner account cannot be removed.');
      return;
    }
    Alert.alert(
      'Remove Staff',
      `Are you sure you want to remove ${member.name} from staff? They will lose access to the POS.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.staff.delete(member.id);
              setStaffList((prev) => prev.filter((s) => s.id !== member.id));
            } catch {
              // silent
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Staff Management</Text>
            <Text style={styles.headerSubtitle}>
              Roles, PIN authorizations & POS access
            </Text>
          </View>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={20} color={Colors.navy} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Banner */}
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle-outline" size={20} color={Colors.navy} />
            <Text style={styles.infoBannerText}>
              Staff PINs authorize discount overrides, billing voids, and KOT reprints on the POS terminal.
            </Text>
          </View>

          {/* Action Row */}
          <View style={styles.actionHeader}>
            <Text style={styles.sectionTitle}>
              Active Team Members ({staffList.length})
            </Text>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => setIsAdding(!isAdding)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isAdding ? 'chevron-up' : 'person-add'}
                size={16}
                color="#FFFFFF"
              />
              <Text style={styles.addBtnText}>
                {isAdding ? 'Close Form' : 'Add Staff'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Add Staff Form Accordion */}
          {isAdding && (
            <View style={styles.addCard}>
              <Text style={styles.cardSectionTitle}>New Staff Member</Text>

              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Rahul Sharma"
                placeholderTextColor="#94A3B8"
                value={newName}
                onChangeText={setNewName}
              />

              <Text style={styles.inputLabel}>Mobile Phone</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. +91 98765 00000"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                value={newPhone}
                onChangeText={setNewPhone}
              />

              <Text style={styles.inputLabel}>Role & Permissions</Text>
              <View style={styles.rolesRow}>
                {(['Manager', 'Cashier', 'Chef', 'Waiter'] as const).map((r) => {
                  const isSelected = newRole === r;
                  return (
                    <TouchableOpacity
                      key={r}
                      style={[styles.roleSelectChip, isSelected && styles.roleSelectChipActive]}
                      onPress={() => setNewRole(r)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.roleSelectText,
                          isSelected && styles.roleSelectTextActive,
                        ]}
                      >
                        {r}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.inputLabel}>4-Digit POS Login PIN</Text>
              <TextInput
                style={[styles.input, { letterSpacing: 8, fontSize: 18, fontWeight: '700' }]}
                placeholder="••••"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
                value={newPin}
                onChangeText={setNewPin}
              />

              <TouchableOpacity
                style={styles.saveStaffBtn}
                onPress={handleAddStaff}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                <Text style={styles.saveStaffBtnText}>Save Staff Member</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Staff List */}
          <View style={styles.listCard}>
            {staffList.map((member, idx) => {
              const badge = getRoleBadge(member.role);
              return (
                <View key={member.id}>
                  <View style={styles.memberRow}>
                    <View style={styles.memberAvatar}>
                      <Ionicons name={badge.icon} size={20} color={badge.text} />
                    </View>

                    <View style={styles.memberInfo}>
                      <View style={styles.nameRow}>
                        <Text style={styles.memberName}>{member.name}</Text>
                        <View style={[styles.roleBadge, { backgroundColor: badge.bg }]}>
                          <Text style={[styles.roleBadgeText, { color: badge.text }]}>
                            {member.role}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.memberPhone}>{member.phone}</Text>
                      <View style={styles.pinRow}>
                        <Ionicons name="keypad-outline" size={12} color={Colors.secondaryText} />
                        <Text style={styles.pinText}>PIN: •••• (Saved)</Text>
                      </View>
                    </View>

                    <View style={styles.memberActions}>
                      <TouchableOpacity
                        style={[
                          styles.statusToggle,
                          member.active ? styles.statusActive : styles.statusInactive,
                        ]}
                        onPress={() => handleToggleStatus(member.id)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.statusToggleText,
                            member.active
                              ? styles.statusActiveText
                              : styles.statusInactiveText,
                          ]}
                        >
                          {member.active ? 'Active' : 'Disabled'}
                        </Text>
                      </TouchableOpacity>

                      {member.role !== 'Owner' && (
                        <TouchableOpacity
                          style={styles.trashBtn}
                          onPress={() => handleDeleteStaff(member)}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={18}
                            color={Colors.primaryRed}
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  {idx < staffList.length - 1 && <View style={styles.divider} />}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.navy,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#EEF2F6',
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12,
    color: Colors.navy,
    lineHeight: 17,
  },
  actionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.navy,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryRed,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  addCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 16,
  },
  cardSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.navy,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.secondaryText,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.navy,
    marginBottom: 12,
  },
  rolesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  roleSelectChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  roleSelectChipActive: {
    backgroundColor: Colors.navy,
    borderColor: Colors.navy,
  },
  roleSelectText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.navy,
  },
  roleSelectTextActive: {
    color: '#FFFFFF',
  },
  saveStaffBtn: {
    backgroundColor: Colors.primaryRed,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 4,
  },
  saveStaffBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.navy,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  memberPhone: {
    fontSize: 12,
    color: Colors.secondaryText,
    marginBottom: 2,
  },
  pinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pinText: {
    fontSize: 11,
    color: Colors.secondaryText,
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusToggle: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusActive: {
    backgroundColor: '#DCFCE7',
  },
  statusInactive: {
    backgroundColor: '#F1F5F9',
  },
  statusToggleText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusActiveText: {
    color: Colors.successGreen,
  },
  statusInactiveText: {
    color: Colors.secondaryText,
  },
  trashBtn: {
    padding: 4,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
});
