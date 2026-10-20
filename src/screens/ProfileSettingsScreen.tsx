import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Switch,
  Alert,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { EzyDineLogo } from '../components/EzyDineLogo';
import { BluetoothPrinterModal, BluetoothDevice } from '../components/BluetoothPrinterModal';
import { ReceiptSettingsModal, ReceiptConfig } from '../components/ReceiptSettingsModal';
import { GSTConfigurationModal, GSTConfig } from '../components/GSTConfigurationModal';
import { StaffManagementModal } from '../components/StaffManagementModal';
import { api } from '../services/api';

interface ProfileSettingsScreenProps {
  onBack: () => void;
  onLogout: () => void;
  onOpenSubscription?: () => void;
  onOpenStaffAttendance?: () => void;
}

export const ProfileSettingsScreen: React.FC<ProfileSettingsScreenProps> = ({
  onBack,
  onLogout,
  onOpenSubscription,
  onOpenStaffAttendance,
}) => {
  // Modals state
  const [isBluetoothModalOpen, setIsBluetoothModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isGstModalOpen, setIsGstModalOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);

  // Bluetooth Printer state
  const [connectedPrinter, setConnectedPrinter] = useState<BluetoothDevice | null>({
    id: 'dev_1',
    name: 'MPT-II (Bluetooth)',
    mac: '66:32:B1:8E:12:44',
    type: '58mm',
    paired: true,
  });
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>('58mm');
  const [kotPrintingEnabled, setKotPrintingEnabled] = useState(true);

  // GST Config State
  const [gstConfig, setGstConfig] = useState<GSTConfig>({
    enabled: true,
    gstRate: 5,
    gstin: '29AABCT1332L1Z4',
    showBreakdownOnBill: true,
    hsnCode: '9963',
  });

  // Receipt Config State
  const [receiptConfig, setReceiptConfig] = useState<ReceiptConfig>({
    showLogo: true,
    showGst: true,
    showFssai: true,
    headerText: 'The Curry House · Authentic Flavors',
    footerText: 'Thank you for dining with us! Visit again.',
    paperWidth: '58mm',
  });

  const [profile, setProfile] = useState<any>({
    name: 'Restaurant',
    location: '',
    phone: '',
    gstRate: '5.0',
    gstNumber: '',
  });

  useEffect(() => {
    // Quick load from local cache
    api.getRestaurant().then((cached) => {
      if (cached) {
        setProfile((prev: any) => ({
          ...prev,
          name: cached.name || cached.restaurant_name || prev.name,
          location: cached.location || cached.address || prev.location,
          phone: cached.phone || prev.phone,
          gstNumber: cached.gstNumber || cached.gst_number || prev.gstNumber,
        }));
      }
    }).catch(() => null);

    const fetchProfile = async () => {
      try {
        const res = await api.restaurant.getProfile();
        const p = res?.profile || res?.restaurant;
        if (res?.success && p) {
          setProfile(p);
          if (p.thermalPaperWidth || p.thermal_paper_width) {
            setPaperWidth(p.thermalPaperWidth || p.thermal_paper_width);
          }
          if (p.kotEnabled !== undefined || p.kot_enabled !== undefined) {
            setKotPrintingEnabled(p.kotEnabled !== undefined ? p.kotEnabled : p.kot_enabled);
          }
        }
      } catch (e) {
        // Fallback
      }
    };
    fetchProfile();
  }, []);

  const handleUpdatePrinterWidth = async (width: '58mm' | '80mm') => {
    setPaperWidth(width);
    try {
      await api.restaurant.updateProfile({ thermalPaperWidth: width });
    } catch (e) {
      // silent sync
    }
  };

  const handleToggleKot = async (enabled: boolean) => {
    setKotPrintingEnabled(enabled);
    try {
      await api.restaurant.updateProfile({ kotEnabled: enabled });
    } catch (e) {
      // silent sync
    }
  };

  const handleSaveGst = async (config: GSTConfig) => {
    setGstConfig(config);
    try {
      await api.restaurant.updateProfile({
        gstRate: config.enabled ? config.gstRate.toString() : '0',
        gstNumber: config.gstin,
      });
    } catch (e) {
      // silent sync
    }
  };

  const handlePickLogo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Please allow photo library access to upload your restaurant logo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const logoData = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        setProfile((prev: any) => ({ ...prev, logoUrl: logoData, logo: logoData }));
        await api.restaurant.updateProfile({ logo: logoData, logoUrl: logoData });
        Alert.alert('Success', 'Restaurant logo uploaded successfully!');
      }
    } catch (err: any) {
      Alert.alert('Error', 'Failed to pick image: ' + err.message);
    }
  };

  const handleLogout = async () => {
    try {
      await api.auth.logout();
    } catch (e) {
      // ignore
    }
    onLogout();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={onBack}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={20} color={Colors.navy} />
              </TouchableOpacity>
              <View>
                <Text style={styles.title}>Profile & settings</Text>
                <Text style={styles.subtitle}>Arjun Sharma · Owner</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.helpBtn}
              onPress={() => Alert.alert('Help & FAQ', 'EzyDine Knowledgebase & 24/7 Support line: 1800-EZY-DINE')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="help-circle-outline"
                size={22}
                color={Colors.navy}
              />
            </TouchableOpacity>
          </View>

          {/* Restaurant Outlet Card with Logo Upload */}
          <View style={styles.outletCard}>
            <View style={styles.outletLeft}>
              <TouchableOpacity
                style={styles.outletMonogram}
                onPress={handlePickLogo}
                activeOpacity={0.8}
              >
                {profile.logoUrl || profile.logo ? (
                  <Image source={{ uri: profile.logoUrl || profile.logo }} style={styles.outletLogoImage} />
                ) : (
                  <Ionicons name="restaurant" size={20} color="#FFFFFF" />
                )}
                <View style={styles.cameraIconBadge}>
                  <Ionicons name="camera" size={10} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <View style={styles.nameLockRow}>
                  <Text style={styles.outletName}>{profile.name || 'The Curry House'}</Text>
                  <View style={styles.verifiedPill}>
                    <Ionicons name="shield-checkmark" size={12} color={Colors.successGreen} />
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                </View>
                <Text style={styles.outletPhone}>
                  {profile.location || 'Indiranagar, Bengaluru'} · {profile.phone || '080 4123 4567'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.changeLogoPill}
              onPress={handlePickLogo}
              activeOpacity={0.8}
            >
              <Ionicons name="cloud-upload-outline" size={14} color="#FFFFFF" />
              <Text style={styles.changeLogoPillText}>
                {profile.logoUrl || profile.logo ? 'Change' : 'Upload'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Section 1: GST & Staff */}
          <View style={styles.card}>
            {/* GST */}
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => setIsGstModalOpen(true)}
              activeOpacity={0.7}
            >
              <View style={styles.rowIconCircle}>
                <MaterialCommunityIcons
                  name="percent-circle-outline"
                  size={20}
                  color={Colors.navy}
                />
              </View>
              <View style={styles.rowCenter}>
                <View style={styles.rowTitleWithBadge}>
                  <Text style={styles.rowTitle}>GST configuration</Text>
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor: gstConfig.enabled ? '#DCFCE7' : '#F1F5F9',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        {
                          color: gstConfig.enabled
                            ? Colors.successGreen
                            : Colors.secondaryText,
                        },
                      ]}
                    >
                      {gstConfig.enabled ? `${gstConfig.gstRate}% Active` : 'Exempt / Off'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.rowSubtitle}>
                  {gstConfig.enabled
                    ? `CGST ${(gstConfig.gstRate / 2).toFixed(1)}% + SGST ${(gstConfig.gstRate / 2).toFixed(1)}% · ${gstConfig.gstin}`
                    : 'Tax invoice calculation disabled'}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={Colors.secondaryText}
              />
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Staff & Attendance */}
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => {
                if (onOpenStaffAttendance) {
                  onOpenStaffAttendance();
                } else {
                  setIsStaffModalOpen(true);
                }
              }}
              activeOpacity={0.7}
            >
              <View style={styles.rowIconCircle}>
                <Ionicons
                  name="people-outline"
                  size={20}
                  color={Colors.navy}
                />
              </View>
              <View style={styles.rowCenter}>
                <View style={styles.rowTitleWithBadge}>
                  <Text style={styles.rowTitle}>Staff & Attendance</Text>
                  <View style={[styles.statusPill, { backgroundColor: '#EEF2F6' }]}>
                    <Text style={[styles.statusPillText, { color: Colors.navy }]}>
                      Daily Check-ins
                    </Text>
                  </View>
                </View>
                <Text style={styles.rowSubtitle}>
                  Employees, Roles, PIN & Daily Attendance Tracking
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={Colors.secondaryText}
              />
            </TouchableOpacity>
          </View>

          {/* Section 2: Bluetooth Thermal Printer */}
          <View style={styles.card}>
            <View style={styles.printerTopRow}>
              <View style={styles.printerLeft}>
                <View style={styles.printerIconWrapper}>
                  <Ionicons name="print-outline" size={22} color={Colors.navy} />
                  {connectedPrinter && (
                    <View style={styles.connectedDot} />
                  )}
                </View>
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.printerName}>Bluetooth Thermal Printer</Text>
                  <Text
                    style={[
                      styles.printerStatus,
                      connectedPrinter
                        ? { color: Colors.successGreen }
                        : { color: Colors.secondaryText },
                    ]}
                  >
                    {connectedPrinter
                      ? `${connectedPrinter.name} · Connected`
                      : 'No printer paired'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.connectPrinterBtn}
                onPress={() => setIsBluetoothModalOpen(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="bluetooth" size={15} color={Colors.navy} />
                <Text style={styles.connectPrinterBtnText}>
                  {connectedPrinter ? 'Change' : 'Connect'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Paper Widths */}
            <View style={styles.paperWidthSection}>
              <View style={styles.paperWidthHeader}>
                <Text style={styles.paperWidthLabel}>Receipt Paper Width</Text>
                <View style={styles.bluetoothBadge}>
                  <Text style={styles.bluetoothBadgeText}>Thermal ESC/POS</Text>
                </View>
              </View>

              <View style={styles.widthButtonsRow}>
                <TouchableOpacity
                  style={[
                    styles.widthBtn,
                    paperWidth === '58mm' && styles.widthBtnActive,
                  ]}
                  onPress={() => handleUpdatePrinterWidth('58mm')}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.widthBtnText,
                      paperWidth === '58mm' && styles.widthBtnTextActive,
                    ]}
                  >
                    58mm (2 Inch Pocket)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.widthBtn,
                    paperWidth === '80mm' && styles.widthBtnActive,
                  ]}
                  onPress={() => handleUpdatePrinterWidth('80mm')}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.widthBtnText,
                      paperWidth === '80mm' && styles.widthBtnTextActive,
                    ]}
                  >
                    80mm (3 Inch Standard)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* KOT Toggle */}
            <View style={styles.kotToggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.kotTitle}>KOT auto-printing enabled</Text>
                <Text style={styles.kotDesc}>
                  Automatically print kitchen order tickets upon bill creation
                </Text>
              </View>
              <Switch
                value={kotPrintingEnabled}
                onValueChange={handleToggleKot}
                trackColor={{ false: '#E2E8F0', true: Colors.successGreen }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          {/* Section 3: Receipt Settings */}
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => setIsReceiptModalOpen(true)}
              activeOpacity={0.7}
            >
              <View style={styles.rowIconCircle}>
                <Ionicons
                  name="receipt-outline"
                  size={20}
                  color={Colors.navy}
                />
              </View>
              <View style={styles.rowCenter}>
                <View style={styles.rowTitleWithBadge}>
                  <Text style={styles.rowTitle}>Receipt layout & formatting</Text>
                  <View style={[styles.statusPill, { backgroundColor: '#DCFCE7' }]}>
                    <Text style={[styles.statusPillText, { color: Colors.successGreen }]}>
                      Configured
                    </Text>
                  </View>
                </View>
                <Text style={styles.rowSubtitle}>
                  Logo, GST details, custom footer & test print
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={Colors.secondaryText}
              />
            </TouchableOpacity>
          </View>

          {/* Log out Button */}
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Ionicons
              name="log-out-outline"
              size={18}
              color={Colors.primaryRed}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.logoutText}>Log out</Text>
          </TouchableOpacity>

          {/* Official EzyDine Branding Footer */}
          <View style={{ alignItems: 'center', marginTop: 24, marginBottom: 8 }}>
            <EzyDineLogo width={130} />
          </View>

          {/* Version Footer */}
          <Text style={styles.versionFooter}>
            EzyDine v2.4.0 · Made for smoother service
          </Text>
        </ScrollView>

        {/* Modals */}
        <BluetoothPrinterModal
          visible={isBluetoothModalOpen}
          connectedDevice={connectedPrinter ? connectedPrinter.name : null}
          paperWidth={paperWidth}
          onClose={() => setIsBluetoothModalOpen(false)}
          onSelectDevice={(dev) => {
            setConnectedPrinter(dev);
            setPaperWidth(dev.type);
            handleUpdatePrinterWidth(dev.type);
          }}
          onDisconnect={() => setConnectedPrinter(null)}
          onPaperWidthChange={handleUpdatePrinterWidth}
        />

        <ReceiptSettingsModal
          visible={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          onSave={(newSettings) => setReceiptConfig(newSettings)}
          connectedPrinter={connectedPrinter ? connectedPrinter.name : undefined}
          restaurantLogo={profile.logoUrl || profile.logo}
          onPickLogo={handlePickLogo}
        />

        <GSTConfigurationModal
          visible={isGstModalOpen}
          onClose={() => setIsGstModalOpen(false)}
          onSave={handleSaveGst}
          initialRate={gstConfig.gstRate}
          initialGstin={gstConfig.gstin}
          initialEnabled={gstConfig.enabled}
        />

        <StaffManagementModal
          visible={isStaffModalOpen}
          onClose={() => setIsStaffModalOpen(false)}
        />
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 110,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.navy,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  helpBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outletCard: {
    backgroundColor: Colors.navy,
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  outletLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  outletMonogram: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    position: 'relative',
  },
  outletLogoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 11,
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    backgroundColor: Colors.primaryRed,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.navy,
  },
  changeLogoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  changeLogoPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  outletName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  outletPhone: {
    fontSize: 12,
    color: '#94A3B8',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 16,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  rowIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rowCenter: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.navy,
    marginBottom: 2,
  },
  rowSubtitle: {
    fontSize: 12,
    color: Colors.secondaryText,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  printerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  printerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  printerName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.navy,
    marginBottom: 2,
  },
  printerStatus: {
    fontSize: 12,
    color: Colors.secondaryText,
  },
  paperWidthSection: {
    marginBottom: 16,
  },
  paperWidthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  paperWidthLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.navy,
  },
  bluetoothBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  bluetoothBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.successGreen,
  },
  widthButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  widthBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  widthBtnActive: {
    backgroundColor: Colors.primaryRed,
    borderColor: Colors.primaryRed,
  },
  widthBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.navy,
  },
  widthBtnTextActive: {
    color: '#FFFFFF',
  },
  kotToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  kotTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.navy,
    marginBottom: 2,
  },
  kotDesc: {
    fontSize: 12,
    color: Colors.secondaryText,
  },
  logoutBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    marginBottom: 16,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primaryRed,
  },
  versionFooter: {
    fontSize: 12,
    color: Colors.secondaryText,
    textAlign: 'center',
    marginBottom: 20,
  },
  nameLockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.successGreen,
  },
  adminLockBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowTitleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  printerIconWrapper: {
    position: 'relative',
  },
  connectedDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.successGreen,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  connectPrinterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  connectPrinterBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.navy,
  },
});
