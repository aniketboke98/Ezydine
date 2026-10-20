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
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

interface GSTConfigurationModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (config: GSTConfig) => void;
  initialRate?: number;
  initialGstin?: string;
  initialEnabled?: boolean;
}

export interface GSTConfig {
  enabled: boolean;
  gstRate: number;
  gstin: string;
  showBreakdownOnBill: boolean;
  hsnCode: string;
}

export const GSTConfigurationModal: React.FC<GSTConfigurationModalProps> = ({
  visible,
  onClose,
  onSave,
  initialRate = 5,
  initialGstin = '29AABCT1332L1Z4',
  initialEnabled = true,
}) => {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [gstRate, setGstRate] = useState<number>(initialRate);
  const [gstin, setGstin] = useState(initialGstin);
  const [showBreakdown, setShowBreakdown] = useState(true);
  const [hsnCode, setHsnCode] = useState('9963');

  const halfRate = (gstRate / 2).toFixed(1);

  const handleSave = () => {
    onSave({
      enabled,
      gstRate,
      gstin: gstin.trim(),
      showBreakdownOnBill: showBreakdown,
      hsnCode: hsnCode.trim(),
    });
    Alert.alert('GST Configuration Saved', 'Tax settings updated and will apply to all subsequent POS bills.');
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
                <MaterialCommunityIcons name="percent" size={20} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.title}>GST Configuration</Text>
                <Text style={styles.subtitle}>Manage tax rates & receipt display</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color={Colors.navy} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
            {/* Enable/Disable GST Switch */}
            <View style={styles.settingRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingTitle}>Enable GST Billing</Text>
                <Text style={styles.settingDesc}>
                  {enabled ? 'GST is applied to all menu orders' : 'GST disabled (All prices inclusive / exempt)'}
                </Text>
              </View>
              <Switch
                value={enabled}
                onValueChange={setEnabled}
                trackColor={{ false: '#E2E8F0', true: Colors.successGreen }}
                thumbColor="#FFFFFF"
              />
            </View>

            {enabled && (
              <>
                <View style={styles.divider} />

                {/* GST Rate Selector */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Applicable GST Rate</Text>
                  <View style={styles.rateGrid}>
                    {[
                      { rate: 0, label: '0% (Exempt)' },
                      { rate: 5, label: '5% (Standard AC/Composite)' },
                      { rate: 12, label: '12% (Food Services)' },
                      { rate: 18, label: '18% (Luxury / Bar)' },
                    ].map((item) => (
                      <TouchableOpacity
                        key={item.rate}
                        style={[
                          styles.rateCard,
                          gstRate === item.rate && styles.rateCardActive,
                        ]}
                        onPress={() => setGstRate(item.rate)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.rateTitle, gstRate === item.rate && styles.rateTitleActive]}>
                          {item.rate}%
                        </Text>
                        <Text style={[styles.rateSub, gstRate === item.rate && styles.rateSubActive]}>
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Split breakdown preview */}
                <View style={styles.taxSplitBox}>
                  <Text style={styles.taxSplitHeading}>Tax Split Calculation</Text>
                  <View style={styles.taxSplitRow}>
                    <View style={styles.taxPill}>
                      <Text style={styles.taxPillLabel}>CGST</Text>
                      <Text style={styles.taxPillVal}>{halfRate}%</Text>
                    </View>
                    <Text style={styles.plusSign}>+</Text>
                    <View style={styles.taxPill}>
                      <Text style={styles.taxPillLabel}>SGST</Text>
                      <Text style={styles.taxPillVal}>{halfRate}%</Text>
                    </View>
                    <Text style={styles.equalSign}>=</Text>
                    <View style={[styles.taxPill, styles.totalTaxPill]}>
                      <Text style={styles.totalTaxLabel}>Total GST</Text>
                      <Text style={styles.totalTaxVal}>{gstRate}%</Text>
                    </View>
                  </View>
                </View>

                {/* GSTIN Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Registered GSTIN</Text>
                  <TextInput
                    style={styles.textInput}
                    value={gstin}
                    onChangeText={setGstin}
                    placeholder="29AABCT1332L1Z4"
                    placeholderTextColor={Colors.secondaryText}
                    autoCapitalize="characters"
                  />
                </View>

                {/* HSN Code Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>HSN / SAC Code</Text>
                  <TextInput
                    style={styles.textInput}
                    value={hsnCode}
                    onChangeText={setHsnCode}
                    placeholder="9963"
                    placeholderTextColor={Colors.secondaryText}
                    keyboardType="number-pad"
                  />
                </View>

                {/* Show breakdown on bill toggle */}
                <View style={styles.settingRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.settingTitle}>Print Tax Breakdown on Bills</Text>
                    <Text style={styles.settingDesc}>Show CGST & SGST separate line items on thermal slip</Text>
                  </View>
                  <Switch
                    value={showBreakdown}
                    onValueChange={setShowBreakdown}
                    trackColor={{ false: '#E2E8F0', true: Colors.successGreen }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </>
            )}
          </ScrollView>

          {/* Bottom Actions */}
          <View style={styles.footerRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
              <Text style={styles.saveBtnText}>Save GST Settings</Text>
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
    backgroundColor: '#0F766E',
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
  rateGrid: {
    gap: 8,
  },
  rateCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 12,
  },
  rateCardActive: {
    borderColor: '#0F766E',
    backgroundColor: '#F0FDFA',
  },
  rateTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.navy,
  },
  rateTitleActive: {
    color: '#0F766E',
  },
  rateSub: {
    fontSize: 12,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  rateSubActive: {
    color: '#115E59',
  },
  taxSplitBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginVertical: 10,
  },
  taxSplitHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.secondaryText,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  taxSplitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  taxPill: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  taxPillLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.secondaryText,
  },
  taxPillVal: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.navy,
    marginTop: 2,
  },
  plusSign: {
    marginHorizontal: 8,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.secondaryText,
  },
  equalSign: {
    marginHorizontal: 8,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.secondaryText,
  },
  totalTaxPill: {
    backgroundColor: '#0F766E',
    borderColor: '#0F766E',
  },
  totalTaxLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#CCFBF1',
  },
  totalTaxVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
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
  footerRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.navy,
  },
  saveBtn: {
    flex: 1.5,
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
