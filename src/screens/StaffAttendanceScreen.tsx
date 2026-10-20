import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { api } from '../services/api';

interface StaffRecord {
  staffId: number;
  name: string;
  phone: string;
  role: string;
  active: boolean;
  attendanceId: number;
  status: 'present' | 'absent' | 'half_day' | 'on_leave' | 'unmarked';
  clockIn?: string | null;
  clockOut?: string | null;
  shift?: string;
  notes?: string | null;
}

interface StaffMember {
  id: number;
  name: string;
  phone: string;
  role: string;
  pin: string;
  active: boolean;
  canEditMenu: boolean;
  canAccessReports: boolean;
  createdAt?: string;
}

interface StaffAttendanceScreenProps {
  onBack: () => void;
}

export const StaffAttendanceScreen: React.FC<StaffAttendanceScreenProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'attendance' | 'employees'>('attendance');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  // Attendance state
  const [records, setRecords] = useState<StaffRecord[]>([]);
  const [summary, setSummary] = useState({
    totalStaff: 0,
    presentCount: 0,
    absentCount: 0,
    leaveCount: 0,
    unmarkedCount: 0,
  });

  // Employee list state
  const [employees, setEmployees] = useState<StaffMember[]>([]);

  // Add Employee Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<'Manager' | 'Cashier' | 'Waiter' | 'Chef'>('Waiter');
  const [newPin, setNewPin] = useState('');
  const [canEditMenu, setCanEditMenu] = useState(false);
  const [canAccessReports, setCanAccessReports] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load Attendance data for selected date
  const loadAttendance = async (dateStr = selectedDate) => {
    setLoading(true);
    try {
      const res = await api.staff.getAttendance(dateStr);
      if (res.success) {
        setRecords(res.records || []);
        if (res.summary) {
          setSummary(res.summary);
        }
      }
    } catch (err: any) {
      console.warn('Error loading attendance:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Load All Staff Members
  const loadEmployees = async () => {
    setLoading(true);
    try {
      const res = await api.staff.getAll();
      if (res.success && res.staff) {
        setEmployees(res.staff);
      }
    } catch (err: any) {
      console.warn('Error loading employees:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'attendance') {
      loadAttendance(selectedDate);
    } else {
      loadEmployees();
    }
  }, [activeTab, selectedDate]);

  // Mark attendance status or clock in/out
  const handleMark = async (
    staffId: number,
    status: 'present' | 'absent' | 'half_day' | 'on_leave',
    clockInOverride?: string,
    clockOutOverride?: string
  ) => {
    try {
      const res = await api.staff.markAttendance({
        staffId,
        date: selectedDate,
        status,
        clockIn: clockInOverride,
        clockOut: clockOutOverride,
      });

      if (res.success) {
        // Refresh attendance list
        loadAttendance(selectedDate);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update attendance');
    }
  };

  // Quick 1-tap Clock-In
  const handleClockIn = (staffId: number) => {
    const timeNow = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    handleMark(staffId, 'present', timeNow);
  };

  // Quick 1-tap Clock-Out
  const handleClockOut = (staffId: number) => {
    const timeNow = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    handleMark(staffId, 'present', undefined, timeNow);
  };

  // Create new Employee
  const handleAddEmployee = async () => {
    if (!newName.trim()) {
      Alert.alert('Validation Error', 'Please enter employee name.');
      return;
    }
    if (!newPhone.trim() || newPhone.trim().length < 10) {
      Alert.alert('Validation Error', 'Please enter a valid 10-digit phone number.');
      return;
    }
    if (!newPin.trim() || newPin.trim().length !== 4) {
      Alert.alert('Validation Error', 'Please enter a 4-digit numeric PIN for POS login.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.staff.create({
        name: newName.trim(),
        phone: newPhone.trim(),
        role: newRole,
        pin: newPin.trim(),
        canEditMenu,
        canAccessReports,
      });

      if (res.success) {
        Alert.alert('Success', `${newRole} ${newName.trim()} added successfully!`);
        setShowAddModal(false);
        setNewName('');
        setNewPhone('');
        setNewPin('');
        setNewRole('Waiter');
        setCanEditMenu(false);
        setCanAccessReports(false);
        loadEmployees();
        loadAttendance(selectedDate);
      } else {
        Alert.alert('Error', res.error || 'Failed to create employee');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle active status
  const handleToggleActive = async (id: number) => {
    try {
      const res = await api.staff.toggle(id);
      if (res.success) {
        loadEmployees();
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to toggle status');
    }
  };

  // Delete staff member
  const handleDeleteStaff = (id: number, name: string) => {
    Alert.alert(
      'Remove Employee',
      `Are you sure you want to remove ${name} from your staff?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await api.staff.delete(id);
              if (res.success) {
                loadEmployees();
                loadAttendance(selectedDate);
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to remove employee');
            }
          },
        },
      ]
    );
  };

  // Date navigation helpers
  const handleShiftDate = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    const newDateStr = current.toISOString().split('T')[0];
    setSelectedDate(newDateStr);
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'owner':
        return '#7C3AED';
      case 'manager':
        return Colors.primaryRed;
      case 'cashier':
        return Colors.navy;
      case 'chef':
        return '#D97706';
      default:
        return '#0284C7';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={20} color={Colors.navy} />
            </TouchableOpacity>
            <View>
              <Text style={styles.headerTitle}>Staff & Attendance</Text>
              <Text style={styles.headerSubtitle}>Manage Team, Shifts & Daily Check-ins</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.addHeaderBtn}
            onPress={() => setShowAddModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="person-add" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.addHeaderBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* Segmented Top Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'attendance' && styles.tabBtnActive]}
            onPress={() => setActiveTab('attendance')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="calendar-outline"
              size={17}
              color={activeTab === 'attendance' ? Colors.primaryRed : Colors.textMuted}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.tabBtnText, activeTab === 'attendance' && styles.tabBtnTextActive]}>
              Daily Attendance
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'employees' && styles.tabBtnActive]}
            onPress={() => setActiveTab('employees')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="people-outline"
              size={17}
              color={activeTab === 'employees' ? Colors.primaryRed : Colors.textMuted}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.tabBtnText, activeTab === 'employees' && styles.tabBtnTextActive]}>
              Employees ({employees.length || records.length})
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primaryRed} />
            <Text style={styles.loadingText}>Loading staff details...</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* ======================================================== */}
            {/* TAB 1: ATTENDANCE                                        */}
            {/* ======================================================== */}
            {activeTab === 'attendance' && (
              <>
                {/* Date Switcher */}
                <View style={styles.dateBar}>
                  <TouchableOpacity
                    style={styles.dateArrow}
                    onPress={() => handleShiftDate(-1)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="chevron-back" size={20} color={Colors.navy} />
                  </TouchableOpacity>

                  <View style={styles.dateCenter}>
                    <Text style={styles.dateText}>
                      {new Date(selectedDate).toLocaleDateString('en-IN', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Text>
                    {isToday && <Text style={styles.todayBadge}>TODAY</Text>}
                  </View>

                  <TouchableOpacity
                    style={styles.dateArrow}
                    onPress={() => handleShiftDate(1)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="chevron-forward" size={20} color={Colors.navy} />
                  </TouchableOpacity>
                </View>

                {/* Attendance Summary Cards */}
                <View style={styles.summaryGrid}>
                  <View style={[styles.summaryCard, { backgroundColor: '#F8FAFC' }]}>
                    <Text style={styles.summaryNumber}>{summary.totalStaff}</Text>
                    <Text style={styles.summaryLabel}>Total Staff</Text>
                  </View>

                  <View style={[styles.summaryCard, { backgroundColor: '#ECFDF5' }]}>
                    <Text style={[styles.summaryNumber, { color: Colors.successGreen }]}>
                      {summary.presentCount}
                    </Text>
                    <Text style={[styles.summaryLabel, { color: Colors.successGreen }]}>Present</Text>
                  </View>

                  <View style={[styles.summaryCard, { backgroundColor: '#FEF2F2' }]}>
                    <Text style={[styles.summaryNumber, { color: '#DC2626' }]}>
                      {summary.absentCount}
                    </Text>
                    <Text style={[styles.summaryLabel, { color: '#DC2626' }]}>Absent</Text>
                  </View>

                  <View style={[styles.summaryCard, { backgroundColor: '#FFFBEB' }]}>
                    <Text style={[styles.summaryNumber, { color: '#D97706' }]}>
                      {summary.leaveCount}
                    </Text>
                    <Text style={[styles.summaryLabel, { color: '#D97706' }]}>Leave</Text>
                  </View>
                </View>

                {/* Staff Attendance Records List */}
                <Text style={styles.sectionTitle}>Employee Check-in List</Text>

                {records.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <MaterialCommunityIcons name="account-group-outline" size={48} color="#94A3B8" />
                    <Text style={styles.emptyTitle}>No Staff Members Registered</Text>
                    <Text style={styles.emptySub}>
                      Add your restaurant staff members to start tracking daily attendance.
                    </Text>
                    <TouchableOpacity
                      style={styles.emptyAddBtn}
                      onPress={() => setShowAddModal(true)}
                    >
                      <Text style={styles.emptyAddBtnText}>+ Add First Employee</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  records.map((staff) => {
                    const isPresent = staff.status === 'present';
                    const isAbsent = staff.status === 'absent';
                    const isLeave = staff.status === 'on_leave';

                    return (
                      <View key={staff.staffId} style={styles.recordCard}>
                        {/* Top row: Name, Role, Status badge */}
                        <View style={styles.recordHeader}>
                          <View style={styles.recordHeaderLeft}>
                            <View
                              style={[
                                styles.roleAvatar,
                                { backgroundColor: getRoleBadgeColor(staff.role) },
                              ]}
                            >
                              <Text style={styles.roleAvatarText}>
                                {staff.name.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                            <View>
                              <Text style={styles.recordStaffName}>{staff.name}</Text>
                              <View style={styles.badgeRow}>
                                <View
                                  style={[
                                    styles.roleBadge,
                                    { backgroundColor: getRoleBadgeColor(staff.role) + '1A' },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.roleBadgeText,
                                      { color: getRoleBadgeColor(staff.role) },
                                    ]}
                                  >
                                    {staff.role}
                                  </Text>
                                </View>
                                <Text style={styles.phoneText}>{staff.phone}</Text>
                              </View>
                            </View>
                          </View>

                          {/* Status Badge */}
                          <View
                            style={[
                              styles.statusBadge,
                              isPresent && styles.statusBadgePresent,
                              isAbsent && styles.statusBadgeAbsent,
                              isLeave && styles.statusBadgeLeave,
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusBadgeText,
                                isPresent && { color: Colors.successGreen },
                                isAbsent && { color: '#DC2626' },
                                isLeave && { color: '#D97706' },
                              ]}
                            >
                              {staff.status === 'unmarked'
                                ? 'Unmarked'
                                : staff.status.toUpperCase()}
                            </Text>
                          </View>
                        </View>

                        {/* Clock In / Out Times */}
                        <View style={styles.timeRow}>
                          <View style={styles.timeBlock}>
                            <Ionicons name="log-in-outline" size={15} color={Colors.textMuted} />
                            <Text style={styles.timeLabel}>Clock In:</Text>
                            <Text style={styles.timeValue}>{staff.clockIn || '--:--'}</Text>
                          </View>

                          <View style={styles.timeBlock}>
                            <Ionicons name="log-out-outline" size={15} color={Colors.textMuted} />
                            <Text style={styles.timeLabel}>Clock Out:</Text>
                            <Text style={styles.timeValue}>{staff.clockOut || '--:--'}</Text>
                          </View>
                        </View>

                        {/* Action buttons: Clock In, Clock Out, Status toggles */}
                        <View style={styles.actionsRow}>
                          {!staff.clockIn ? (
                            <TouchableOpacity
                              style={styles.clockInBtn}
                              onPress={() => handleClockIn(staff.staffId)}
                              activeOpacity={0.8}
                            >
                              <Ionicons name="time-outline" size={15} color="#FFFFFF" />
                              <Text style={styles.clockInBtnText}>Clock In</Text>
                            </TouchableOpacity>
                          ) : !staff.clockOut ? (
                            <TouchableOpacity
                              style={styles.clockOutBtn}
                              onPress={() => handleClockOut(staff.staffId)}
                              activeOpacity={0.8}
                            >
                              <Ionicons name="exit-outline" size={15} color="#FFFFFF" />
                              <Text style={styles.clockOutBtnText}>Clock Out</Text>
                            </TouchableOpacity>
                          ) : (
                            <View style={styles.completedBadge}>
                              <Ionicons name="checkmark-done" size={14} color={Colors.successGreen} />
                              <Text style={styles.completedBadgeText}>Completed</Text>
                            </View>
                          )}

                          <View style={styles.statusPillsGroup}>
                            <TouchableOpacity
                              style={[
                                styles.statusPill,
                                isPresent && styles.statusPillPresentActive,
                              ]}
                              onPress={() => handleMark(staff.staffId, 'present')}
                            >
                              <Text
                                style={[
                                  styles.statusPillText,
                                  isPresent && styles.statusPillTextActive,
                                ]}
                              >
                                Present
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.statusPill, isAbsent && styles.statusPillAbsentActive]}
                              onPress={() => handleMark(staff.staffId, 'absent')}
                            >
                              <Text
                                style={[
                                  styles.statusPillText,
                                  isAbsent && styles.statusPillTextActive,
                                ]}
                              >
                                Absent
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.statusPill, isLeave && styles.statusPillLeaveActive]}
                              onPress={() => handleMark(staff.staffId, 'on_leave')}
                            >
                              <Text
                                style={[
                                  styles.statusPillText,
                                  isLeave && styles.statusPillTextActive,
                                ]}
                              >
                                Leave
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    );
                  })
                )}
              </>
            )}

            {/* ======================================================== */}
            {/* TAB 2: EMPLOYEES                                         */}
            {/* ======================================================== */}
            {activeTab === 'employees' && (
              <>
                <View style={styles.employeeHeaderRow}>
                  <Text style={styles.sectionTitle}>Registered Staff ({employees.length})</Text>
                  <TouchableOpacity
                    style={styles.addEmployeePrimaryBtn}
                    onPress={() => setShowAddModal(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add" size={18} color="#FFFFFF" />
                    <Text style={styles.addEmployeePrimaryBtnText}>Add Employee</Text>
                  </TouchableOpacity>
                </View>

                {employees.map((member) => {
                  const isOwner = member.role.toLowerCase() === 'owner';
                  return (
                    <View key={member.id} style={styles.employeeCard}>
                      <View style={styles.employeeCardTop}>
                        <View style={styles.employeeInfo}>
                          <View
                            style={[
                              styles.roleAvatar,
                              { backgroundColor: getRoleBadgeColor(member.role) },
                            ]}
                          >
                            <Text style={styles.roleAvatarText}>
                              {member.name.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <View>
                            <Text style={styles.employeeName}>{member.name}</Text>
                            <View style={styles.badgeRow}>
                              <View
                                style={[
                                  styles.roleBadge,
                                  { backgroundColor: getRoleBadgeColor(member.role) + '1A' },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.roleBadgeText,
                                    { color: getRoleBadgeColor(member.role) },
                                  ]}
                                >
                                  {member.role}
                                </Text>
                              </View>
                              <Text style={styles.phoneText}>{member.phone}</Text>
                            </View>
                          </View>
                        </View>

                        {/* PIN badge & Active switch */}
                        <View style={styles.employeeTopRight}>
                          <View style={styles.pinBadge}>
                            <Text style={styles.pinLabel}>PIN:</Text>
                            <Text style={styles.pinValue}>{member.pin || '••••'}</Text>
                          </View>
                        </View>
                      </View>

                      {/* Permissions row */}
                      <View style={styles.permissionsRow}>
                        <View style={styles.permItem}>
                          <Ionicons
                            name={member.canEditMenu ? 'checkmark-circle' : 'close-circle'}
                            size={16}
                            color={member.canEditMenu ? Colors.successGreen : '#94A3B8'}
                          />
                          <Text style={styles.permText}>Edit Menu</Text>
                        </View>

                        <View style={styles.permItem}>
                          <Ionicons
                            name={member.canAccessReports ? 'checkmark-circle' : 'close-circle'}
                            size={16}
                            color={member.canAccessReports ? Colors.successGreen : '#94A3B8'}
                          />
                          <Text style={styles.permText}>View Reports & Sales</Text>
                        </View>
                      </View>

                      {/* Footer Actions: Active Toggle & Delete */}
                      <View style={styles.employeeCardFooter}>
                        <View style={styles.statusToggleRow}>
                          <Text style={styles.statusToggleLabel}>
                            {member.active ? 'Active' : 'Inactive'}
                          </Text>
                          <Switch
                            value={member.active}
                            onValueChange={() => handleToggleActive(member.id)}
                            trackColor={{ false: '#CBD5E1', true: Colors.successGreen }}
                            thumbColor="#FFFFFF"
                          />
                        </View>

                        {!isOwner && (
                          <TouchableOpacity
                            style={styles.deleteBtn}
                            onPress={() => handleDeleteStaff(member.id, member.name)}
                            activeOpacity={0.7}
                          >
                            <Feather name="trash-2" size={16} color="#DC2626" />
                            <Text style={styles.deleteBtnText}>Remove</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
              </>
            )}
          </ScrollView>
        )}

        {/* ======================================================== */}
        {/* ADD EMPLOYEE MODAL ("adding employe")                     */}
        {/* ======================================================== */}
        <Modal visible={showAddModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Add New Employee</Text>
                  <Text style={styles.modalSubtitle}>Create credentials for staff or manager</Text>
                </View>
                <TouchableOpacity onPress={() => setShowAddModal(false)} style={styles.modalCloseBtn}>
                  <Ionicons name="close" size={22} color={Colors.navy} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Full Name */}
                <Text style={styles.inputLabel}>FULL NAME *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Ramesh Kumar"
                  placeholderTextColor="#94A3B8"
                  value={newName}
                  onChangeText={setNewName}
                />

                {/* Phone */}
                <Text style={styles.inputLabel}>PHONE NUMBER (10 DIGITS) *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 9876543210"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={newPhone}
                  onChangeText={setNewPhone}
                />

                {/* 4-digit PIN */}
                <Text style={styles.inputLabel}>4-DIGIT LOGIN PIN *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 2345"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry={false}
                  value={newPin}
                  onChangeText={setNewPin}
                />

                {/* Role Selector */}
                <Text style={styles.inputLabel}>ASSIGN ROLE *</Text>
                <View style={styles.roleSelectorGrid}>
                  {(['Manager', 'Cashier', 'Waiter', 'Chef'] as const).map((r) => {
                    const isSelected = newRole === r;
                    return (
                      <TouchableOpacity
                        key={r}
                        style={[
                          styles.roleSelectCard,
                          isSelected && styles.roleSelectCardActive,
                        ]}
                        onPress={() => {
                          setNewRole(r);
                          if (r === 'Manager') {
                            setCanEditMenu(true);
                            setCanAccessReports(true);
                          } else if (r === 'Cashier') {
                            setCanEditMenu(false);
                            setCanAccessReports(false);
                          } else {
                            setCanEditMenu(false);
                            setCanAccessReports(false);
                          }
                        }}
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

                {/* Permissions Switches */}
                <Text style={[styles.inputLabel, { marginTop: 16 }]}>PERMISSIONS</Text>
                <View style={styles.permissionToggleCard}>
                  <View style={styles.permToggleRow}>
                    <View>
                      <Text style={styles.permToggleTitle}>Can Edit Menu & Prices</Text>
                      <Text style={styles.permToggleSub}>Add items, update categories & toggle availability</Text>
                    </View>
                    <Switch
                      value={canEditMenu}
                      onValueChange={setCanEditMenu}
                      trackColor={{ false: '#CBD5E1', true: Colors.successGreen }}
                    />
                  </View>

                  <View style={styles.permDivider} />

                  <View style={styles.permToggleRow}>
                    <View>
                      <Text style={styles.permToggleTitle}>Can View Sales & Reports</Text>
                      <Text style={styles.permToggleSub}>Access daily revenue, sales trends & analytics</Text>
                    </View>
                    <Switch
                      value={canAccessReports}
                      onValueChange={setCanAccessReports}
                      trackColor={{ false: '#CBD5E1', true: Colors.successGreen }}
                    />
                  </View>
                </View>

                {/* Submit button */}
                <TouchableOpacity
                  style={[styles.saveBtn, isSubmitting && { opacity: 0.7 }]}
                  onPress={handleAddEmployee}
                  disabled={isSubmitting}
                  activeOpacity={0.85}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save & Create Employee</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.navy,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  addHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryRed,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: Colors.primaryRed,
  },
  tabBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  tabBtnTextActive: {
    color: Colors.primaryRed,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: Colors.textMuted,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  dateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateArrow: {
    padding: 6,
  },
  dateCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.navy,
  },
  todayBadge: {
    marginLeft: 8,
    fontSize: 10,
    fontWeight: '800',
    color: Colors.primaryRed,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.navy,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.navy,
    marginBottom: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.navy,
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 18,
  },
  emptyAddBtn: {
    backgroundColor: Colors.primaryRed,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyAddBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  recordCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recordHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  roleAvatarText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  recordStaffName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.navy,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  phoneText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  statusBadgePresent: {
    backgroundColor: '#ECFDF5',
  },
  statusBadgeAbsent: {
    backgroundColor: '#FEF2F2',
  },
  statusBadgeLeave: {
    backgroundColor: '#FFFBEB',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textMuted,
  },
  timeRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  timeBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginLeft: 4,
    marginRight: 6,
  },
  timeValue: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.navy,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  clockInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successGreen,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  clockInBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  clockOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EA580C',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  clockOutBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  completedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.successGreen,
    marginLeft: 4,
  },
  statusPillsGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  statusPillPresentActive: {
    backgroundColor: '#ECFDF5',
    borderColor: Colors.successGreen,
  },
  statusPillAbsentActive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#DC2626',
  },
  statusPillLeaveActive: {
    backgroundColor: '#FFFBEB',
    borderColor: '#D97706',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  statusPillTextActive: {
    color: Colors.navy,
  },
  employeeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addEmployeePrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryRed,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  addEmployeePrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  employeeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  employeeCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  employeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  employeeName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.navy,
  },
  employeeTopRight: {
    alignItems: 'flex-end',
  },
  pinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pinLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginRight: 4,
  },
  pinValue: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.navy,
    letterSpacing: 1,
  },
  permissionsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  permItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  permText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginLeft: 6,
  },
  employeeCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  statusToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusToggleLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    marginRight: 8,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  deleteBtnText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.navy,
  },
  modalSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.navy,
    marginBottom: 14,
  },
  roleSelectorGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  roleSelectCard: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  roleSelectCardActive: {
    borderColor: Colors.primaryRed,
    backgroundColor: '#FEF2F2',
  },
  roleSelectText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.navy,
  },
  roleSelectTextActive: {
    color: Colors.primaryRed,
    fontWeight: '700',
  },
  permissionToggleCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 20,
  },
  permToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  permToggleTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.navy,
  },
  permToggleSub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
    maxWidth: 240,
  },
  permDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 10,
  },
  saveBtn: {
    backgroundColor: Colors.primaryRed,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
