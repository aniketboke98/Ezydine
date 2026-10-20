import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Switch,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

interface ReceiptSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (settings: ReceiptConfig) => void;
  connectedPrinter?: string | null;
  restaurantLogo?: string | null;
  onPickLogo?: () => void;
}

export interface ReceiptConfig {
  showLogo: boolean;
  showGst: boolean;
  showFssai: boolean;
  headerText: string;
  footerText: string;
  paperWidth: '58mm' | '80mm';
}

export const ReceiptSettingsModal: React.FC<ReceiptSettingsModalProps> = ({
  visible,
  onClose,
  onSave,
  connectedPrinter,
  restaurantLogo,
  onPickLogo,
}) => {
  const [showLogo, setShowLogo] = useState(true);
  const [showGst, setShowGst] = useState(true);
  const [showFssai, setShowFssai] = useState(true);
  const [headerText, setHeaderText] = useState('The Curry House · Authentic Flavors');
  const [footerText, setFooterText] = useState('Thank you for dining with us! Visit again.');
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>('58mm');

  const handleTestPrint = () => {
    Alert.alert(
      'Test Receipt Output',
      `Printing test receipt with configured settings:\n\n• Logo: ${showLogo ? (restaurantLogo ? 'Custom Logo' : 'Default EzyDine Icon') : 'Disabled'}\n• GST Details: ${showGst ? 'Enabled' : 'Disabled'}\n• Width: ${paperWidth}\n• Footer: "${footerText}"\n\nSent to: ${connectedPrinter || 'Default Thermal Bluetooth Printer'}`,
      [{ text: 'OK' }]
    );
  };

  const handleSave = () => {
    onSave({
      showLogo,
      showGst,
      showFssai,
      headerText,
      footerText,
      paperWidth,
    });
    Alert.alert('Saved', 'Receipt & print settings updated successfully.');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <Ionicons name="receipt-outline" size={20} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.title}>Receipt & Print Settings</Text>
                <Text style={styles.subtitle}>Customize thermal bill slip format</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color={Colors.navy} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
            {/* Toggle: Show Logo */}
            <View style={styles.settingRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingTitle}>Print Logo on Receipt</Text>
                <Text style={styles.settingDesc}>
                  {restaurantLogo
                    ? 'Using custom uploaded restaurant brand logo'
                    : 'Display EzyDine chef hat icon on top of thermal slip'}
                </Text>
              </View>
              <Switch
                value={showLogo}
                onValueChange={setShowLogo}
                trackColor={{ false: '#E2E8F0', true: Colors.successGreen }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Logo Preview & Upload Section */}
            {showLogo && (
              <View style={styles.logoUploadCard}>
                <View style={styles.logoPreviewWrap}>
                  {restaurantLogo ? (
                    <Image source={{ uri: restaurantLogo }} style={styles.receiptLogoImg} />
                  ) : (
                    <Ionicons name="restaurant" size={22} color={Colors.primaryRed} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.logoUploadTitle}>
                    {restaurantLogo ? 'Custom Logo Active' : 'Default Logo'}
                  </Text>
                  <Text style={styles.logoUploadSubtitle}>
                    1-bit monochrome thermal print
                  </Text>
                </View>
                {onPickLogo && (
                  <TouchableOpacity
                    style={styles.logoPickerBtn}
                    onPress={onPickLogo}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="camera-outline" size={15} color="#FFFFFF" />
                    <Text style={styles.logoPickerBtnText}>
                      {restaurantLogo ? 'Change' : 'Upload'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <View style={styles.divider} />

            {/* Toggle: GST Details */}
            <View style={styles.settingRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingTitle}>Print GST Details</Text>
                <Text style={styles.settingDesc}>Include GSTIN 29AABCT1332L1Z4 & tax breakdown</Text>
              </View>
              <Switch
                value={showGst}
                onValueChange={setShowGst}
                trackColor={{ false: '#E2E8F0', true: Colors.successGreen }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.divider} />

            {/* Toggle: FSSAI License */}
            <View style={styles.settingRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingTitle}>Print FSSAI License</Text>
                <Text style={styles.settingDesc}>Display FSSAI No. 11223344556677</Text>
              </View>
              <Switch
                value={showFssai}
                onValueChange={setShowFssai}
                trackColor={{ false: '#E2E8F0', true: Colors.successGreen }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.divider} />

            {/* Paper Width Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Thermal Paper Width</Text>
              <View style={styles.widthOptions}>
                <TouchableOpacity
                  style={[styles.widthBtn, paperWidth === '58mm' && styles.widthBtnActive]}
                  onPress={() => setPaperWidth('58mm')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.widthBtnText, paperWidth === '58mm' && styles.widthBtnTextActive]}>
                    58mm Standard
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.widthBtn, paperWidth === '80mm' && styles.widthBtnActive]}
                  onPress={() => setPaperWidth('80mm')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.widthBtnText, paperWidth === '80mm' && styles.widthBtnTextActive]}>
                    80mm Wide Slip
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Header Text Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Receipt Sub-Header Tagline</Text>
              <TextInput
                style={styles.textInput}
                value={headerText}
                onChangeText={setHeaderText}
                placeholder="e.g. Authentic Flavors & Fine Dining"
                placeholderTextColor={Colors.secondaryText}
              />
            </View>

            {/* Custom Footer Message Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Custom Footer Message</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={footerText}
                onChangeText={setFooterText}
                placeholder="e.g. Thank you for dining with us! Visit again."
                placeholderTextColor={Colors.secondaryText}
                multiline
                numberOfLines={2}
              />
            </View>

            {/* Live Preview Card */}
            <View style={styles.previewBox}>
              <Text style={styles.previewHeading}>Thermal Receipt Preview</Text>
              <View style={styles.previewSlip}>
                {showLogo && <Text style={styles.previewLogo}>[ EzyDine Logo ]</Text>}
                <Text style={styles.previewStoreName}>The Curry House</Text>
                <Text style={styles.previewAddress}>Indiranagar, Bengaluru</Text>
                {showFssai && <Text style={styles.previewMeta}>FSSAI: 11223344556677</Text>}
                {showGst && <Text style={styles.previewMeta}>GSTIN: 29AABCT1332L1Z4</Text>}
                <Text style={styles.previewDivider}>--------------------------------</Text>
                <Text style={styles.previewItem}>1x Paneer Butter Masala   280.00</Text>
                <Text style={styles.previewItem}>2x Butter Naan             90.00</Text>
                <Text style={styles.previewDivider}>--------------------------------</Text>
                {showGst && <Text style={styles.previewMeta}>CGST 2.5% + SGST 2.5%      18.50</Text>}
                <Text style={styles.previewTotal}>TOTAL:                  ₹388.50</Text>
                <Text style={styles.previewDivider}>--------------------------------</Text>
                <Text style={styles.previewFooter}>{footerText}</Text>
              </View>
            </View>
          </ScrollView>

          {/* Bottom Actions */}
          <View style={styles.footerRow}>
            <TouchableOpacity
              style={styles.testBtn}
              onPress={handleTestPrint}
              activeOpacity={0.8}
            >
              <Ionicons name="print-outline" size={18} color={Colors.navy} style={{ marginRight: 6 }} />
              <Text style={styles.testBtnText}>Print Test Slip</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
              <Text style={styles.saveBtnText}>Save Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 27, 41, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
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
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryRed,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.navy,
  },
  subtitle: {
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
  scroll: {
    maxHeight: 460,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.navy,
  },
  settingDesc: {
    fontSize: 12,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  logoUploadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    marginTop: 4,
    marginBottom: 8,
    gap: 12,
  },
  logoPreviewWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  receiptLogoImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  logoUploadTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.navy,
  },
  logoUploadSubtitle: {
    fontSize: 11,
    color: Colors.secondaryText,
    marginTop: 1,
  },
  logoPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryRed,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  logoPickerBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  inputGroup: {
    marginVertical: 10,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.navy,
    marginBottom: 8,
  },
  widthOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  widthBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  widthBtnActive: {
    backgroundColor: Colors.navy,
    borderColor: Colors.navy,
  },
  widthBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.secondaryText,
  },
  widthBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    fontSize: 14,
    color: Colors.navy,
  },
  textArea: {
    height: 64,
    paddingVertical: 10,
  },
  previewBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 10,
    marginBottom: 20,
  },
  previewHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.secondaryText,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewSlip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  previewLogo: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primaryRed,
    marginBottom: 2,
  },
  previewStoreName: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.navy,
  },
  previewAddress: {
    fontSize: 11,
    color: Colors.secondaryText,
    marginBottom: 2,
  },
  previewMeta: {
    fontSize: 10,
    color: Colors.secondaryText,
  },
  previewDivider: {
    fontSize: 10,
    color: '#CBD5E1',
    letterSpacing: 1,
    marginVertical: 4,
  },
  previewItem: {
    fontSize: 10,
    color: Colors.navy,
    fontFamily: 'monospace',
    alignSelf: 'stretch',
    textAlign: 'center',
  },
  previewTotal: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.navy,
    alignSelf: 'stretch',
    textAlign: 'center',
  },
  previewFooter: {
    fontSize: 11,
    color: Colors.secondaryText,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 4,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  testBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  testBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.navy,
  },
  saveBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.primaryRed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
