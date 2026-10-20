import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
    Alert,
  Share,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { EzyDineLogo } from '../components/EzyDineLogo';
import { BluetoothPrinterModal, BluetoothDevice } from '../components/BluetoothPrinterModal';
import { ReceiptSettingsModal, ReceiptConfig } from '../components/ReceiptSettingsModal';
import { api } from '../services/api';

interface ReceiptScreenProps {
  onBack: () => void;
  onNewBill: () => void;
}

export const ReceiptScreen: React.FC<ReceiptScreenProps> = ({
  onBack,
  onNewBill,
}) => {
  const [isBluetoothModalOpen, setIsBluetoothModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [restaurantProfile, setRestaurantProfile] = useState<any>({
    name: 'Restaurant',
    location: '',
    phone: '',
    gstNumber: '',
    fssai: '',
  });

  useEffect(() => {
    api.getRestaurant().then((cached) => {
      if (cached) {
        setRestaurantProfile((prev: any) => ({
          ...prev,
          name: cached.name || cached.restaurant_name || prev.name,
          location: cached.location || cached.address || prev.location,
          phone: cached.phone || prev.phone,
          gstNumber: cached.gstNumber || cached.gst_number || prev.gstNumber,
          fssai: cached.fssai || prev.fssai,
        }));
      }
    }).catch(() => null);

    api.restaurant.getProfile().then((res) => {
      const p = res?.profile || res?.restaurant;
      if (res?.success && p) {
        setRestaurantProfile(p);
      }
    }).catch(() => null);
  }, []);

  // Bluetooth Printer state
  const [connectedPrinter, setConnectedPrinter] = useState<BluetoothDevice | null>({
    id: 'dev_1',
    name: 'MPT-II (Bluetooth)',
    mac: '66:32:B1:8E:12:44',
    type: '58mm',
    paired: true,
  });

  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>('58mm');

  // Receipt formatting state
  const [receiptConfig, setReceiptConfig] = useState<ReceiptConfig>({
    showLogo: true,
    showGst: true,
    showFssai: true,
    headerText: 'Authentic Flavors',
    footerText: 'Thank you for dining with us! Visit again.',
    paperWidth: '58mm',
  });

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${restaurantProfile.name || 'Restaurant'} - Bill #1048 for Table 04. Total: ₹630.00. Thank you for dining with us!`,
      });
    } catch (e) {
      // Ignored
    }
  };

  const handlePrint = () => {
    if (!connectedPrinter) {
      Alert.alert(
        'Printer Disconnected',
        'No Bluetooth thermal printer is currently paired. Would you like to scan and connect one now?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Connect Printer',
            onPress: () => setIsBluetoothModalOpen(true),
          },
        ]
      );
      return;
    }

    Alert.alert(
      'Receipt Printed!',
      `Receipt #1048 sent successfully to ${connectedPrinter.name} (${paperWidth} thermal paper).`,
      [{ text: 'OK' }]
    );
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
                <Text style={styles.title}>Receipt & Print</Text>
                <Text style={styles.subtitle}>Bill #1048 · Table 04</Text>
              </View>
            </View>

            <View style={styles.headerRightActions}>
              <TouchableOpacity
                style={styles.iconCircleBtn}
                onPress={() => setIsReceiptModalOpen(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="options-outline" size={20} color={Colors.navy} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.iconCircleBtn}
                onPress={handleShare}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="share-social-outline"
                  size={20}
                  color={Colors.navy}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Payment Successful Banner */}
          <View style={styles.successBanner}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark" size={18} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.successBannerTitle}>Payment successful</Text>
              <Text style={styles.successBannerSub}>
                ₹630.00 received · Cash tender
              </Text>
            </View>
          </View>

          {/* Bluetooth Thermal Printer Quick Bar */}
          <View style={styles.printerBar}>
            <TouchableOpacity
              style={styles.printerBarLeft}
              onPress={() => setIsBluetoothModalOpen(true)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.bluetoothIndicator,
                  {
                    backgroundColor: connectedPrinter
                      ? '#DCFCE7'
                      : '#FEE2E2',
                  },
                ]}
              >
                <Ionicons
                  name="bluetooth"
                  size={16}
                  color={connectedPrinter ? Colors.successGreen : Colors.primaryRed}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.printerBarTitle}>
                  {connectedPrinter
                    ? connectedPrinter.name
                    : 'No Printer Connected'}
                </Text>
                <Text style={styles.printerBarSub}>
                  {connectedPrinter
                    ? `${paperWidth} Thermal ESC/POS · Ready to print`
                    : 'Tap to scan and pair bluetooth printer'}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.printerBarBtn}
              onPress={() => setIsBluetoothModalOpen(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.printerBarBtnText}>
                {connectedPrinter ? 'Switch' : 'Scan'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Printed Bill Slip Card */}
          <View
            style={[
              styles.billSlipCard,
              paperWidth === '58mm' ? styles.billSlip58mm : styles.billSlip80mm,
            ]}
          >
            {/* Top Thermal Jagged/Notch simulation */}
            <View style={styles.thermalPaperHead} />

            {/* Restaurant Logo Header */}
            {receiptConfig.showLogo && (
              <View style={styles.slipLogoWrapper}>
                <EzyDineLogo width={110} />
              </View>
            )}

            {/* Restaurant Info */}
            <View style={styles.outletSection}>
              <Text style={styles.outletTitle}>{restaurantProfile.name || 'Restaurant'}</Text>
              {receiptConfig.headerText ? (
                <Text style={styles.outletSubheader}>
                  {receiptConfig.headerText}
                </Text>
              ) : null}
              {Boolean(restaurantProfile.location || restaurantProfile.address) && (
                <Text style={styles.outletAddress}>
                  {restaurantProfile.location || restaurantProfile.address}
                </Text>
              )}
              {receiptConfig.showGst && (
                <Text style={styles.outletGstin}>
                  {restaurantProfile.gstNumber || restaurantProfile.gst_number ? `GSTIN: ${restaurantProfile.gstNumber || restaurantProfile.gst_number}` : ''}
                  {restaurantProfile.phone ? ` · Ph: ${restaurantProfile.phone}` : ''}
                </Text>
              )}
              {receiptConfig.showFssai && Boolean(restaurantProfile.fssai) && (
                <Text style={styles.outletFssai}>
                  FSSAI Lic: {restaurantProfile.fssai}
                </Text>
              )}
            </View>

            <View style={styles.dashedDivider} />

            {/* Invoice Meta */}
            <View style={styles.metaRow}>
              <View>
                <Text style={styles.metaLabel}>TAX INVOICE #1048</Text>
                <Text style={styles.metaSub}>18 Oct 2026 · 02:41 PM</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.metaLabel}>Table 04 · Dine-in</Text>
                <Text style={styles.metaSub}>Cashier: Arjun (POS-1)</Text>
              </View>
            </View>

            <View style={styles.dashedDivider} />

            {/* Table Header */}
            <View style={styles.tableHeaderRow}>
              <Text style={styles.tableHeaderCol}>ITEM / QTY</Text>
              <Text style={styles.tableHeaderCol}>AMOUNT</Text>
            </View>

            {/* Items */}
            <View style={styles.itemsList}>
              <View style={styles.itemRow}>
                <Text style={styles.itemName}>Paneer Butter Masala × 1</Text>
                <Text style={styles.itemPrice}>₹320.00</Text>
              </View>
              <View style={styles.itemRow}>
                <Text style={styles.itemName}>Garlic Naan × 2</Text>
                <Text style={styles.itemPrice}>₹120.00</Text>
              </View>
              <View style={styles.itemRow}>
                <Text style={styles.itemName}>Sweet Lassi × 2</Text>
                <Text style={styles.itemPrice}>₹200.00</Text>
              </View>
            </View>

            <View style={styles.dashedDivider} />

            {/* Financials */}
            <View style={styles.calcRow}>
              <Text style={styles.calcLabel}>Subtotal</Text>
              <Text style={styles.calcVal}>₹640.00</Text>
            </View>

            <View style={styles.calcRow}>
              <Text style={styles.calcLabel}>Special Discount</Text>
              <Text style={styles.discountVal}>- ₹40.00</Text>
            </View>

            <View style={styles.calcRow}>
              <Text style={styles.calcLabel}>Taxable Amount</Text>
              <Text style={styles.calcVal}>₹600.00</Text>
            </View>

            {receiptConfig.showGst && (
              <View style={styles.taxSplitBox}>
                <View style={styles.calcRow}>
                  <Text style={styles.taxSub}>CGST (2.5% HSN 9963)</Text>
                  <Text style={styles.taxSub}>₹15.00</Text>
                </View>
                <View style={styles.calcRow}>
                  <Text style={styles.taxSub}>SGST (2.5% HSN 9963)</Text>
                  <Text style={styles.taxSub}>₹15.00</Text>
                </View>
              </View>
            )}

            <View style={styles.dashedDivider} />

            {/* Grand Total */}
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Grand Total</Text>
              <Text style={styles.grandTotalVal}>₹630.00</Text>
            </View>

            <View style={styles.cashTenderedRow}>
              <Text style={styles.cashTenderedText}>Cash Tendered: ₹700.00</Text>
              <Text style={styles.cashTenderedText}>Change: ₹70.00</Text>
            </View>

            <View style={styles.dashedDivider} />

            {/* Custom Footer Text */}
            <Text style={styles.thankYouText}>
              {receiptConfig.footerText || 'Thank you for dining with us!'}
            </Text>

            <Text style={styles.poweredByText}>
              Powered by EzyDine POS
            </Text>
          </View>
        </ScrollView>

        {/* Bottom Actions */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.printBtn}
            onPress={handlePrint}
            activeOpacity={0.8}
          >
            <Ionicons
              name="print-outline"
              size={18}
              color={Colors.navy}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.printBtnText}>
              {connectedPrinter ? 'Print Slip' : 'Connect & Print'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.newBillBtn}
            onPress={onNewBill}
            activeOpacity={0.85}
          >
            <Ionicons
              name="add"
              size={20}
              color="#FFFFFF"
              style={{ marginRight: 4 }}
            />
            <Text style={styles.newBillBtnText}>New Bill</Text>
          </TouchableOpacity>
        </View>

        {/* Bluetooth Thermal Printer Scanner Modal */}
        <BluetoothPrinterModal
          visible={isBluetoothModalOpen}
          connectedDevice={connectedPrinter ? connectedPrinter.name : null}
          paperWidth={paperWidth}
          onClose={() => setIsBluetoothModalOpen(false)}
          onSelectDevice={(device) => {
            setConnectedPrinter(device);
            setPaperWidth(device.type);
          }}
          onDisconnect={() => setConnectedPrinter(null)}
          onPaperWidthChange={setPaperWidth}
        />

        {/* Receipt Customizer Settings Modal */}
        <ReceiptSettingsModal
          visible={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          onSave={(cfg) => {
            setReceiptConfig(cfg);
            setPaperWidth(cfg.paperWidth);
          }}
          connectedPrinter={connectedPrinter ? connectedPrinter.name : undefined}
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
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  iconCircleBtn: {
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
    fontSize: 22,
    fontWeight: '700',
    color: Colors.navy,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 14,
    gap: 12,
  },
  successIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.successGreen,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#065F46',
  },
  successBannerSub: {
    fontSize: 13,
    color: '#047857',
    marginTop: 2,
  },
  printerBar: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  printerBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 10,
  },
  bluetoothIndicator: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  printerBarTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.navy,
  },
  printerBarSub: {
    fontSize: 11,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  printerBarBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  printerBarBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.navy,
  },
  billSlipCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
    alignSelf: 'center',
    width: '100%',
  },
  billSlip58mm: {
    maxWidth: 360,
  },
  billSlip80mm: {
    maxWidth: '100%',
  },
  thermalPaperHead: {
    height: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 2,
    marginBottom: 14,
  },
  slipLogoWrapper: {
    alignItems: 'center',
    marginBottom: 10,
  },
  outletSection: {
    alignItems: 'center',
  },
  outletTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.navy,
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  outletSubheader: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.secondaryText,
    marginBottom: 4,
  },
  outletAddress: {
    fontSize: 12,
    color: Colors.secondaryText,
    textAlign: 'center',
    marginBottom: 2,
  },
  outletGstin: {
    fontSize: 11,
    color: Colors.secondaryText,
    textAlign: 'center',
    marginBottom: 2,
  },
  outletFssai: {
    fontSize: 10,
    color: '#94A3B8',
    textAlign: 'center',
  },
  dashedDivider: {
    borderStyle: 'dashed',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginVertical: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.navy,
  },
  metaSub: {
    fontSize: 11,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  tableHeaderCol: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.secondaryText,
    letterSpacing: 0.5,
  },
  itemsList: {
    gap: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: 13,
    color: Colors.navy,
    fontWeight: '500',
  },
  itemPrice: {
    fontSize: 13,
    color: Colors.navy,
    fontWeight: '600',
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  calcLabel: {
    fontSize: 13,
    color: Colors.secondaryText,
  },
  calcVal: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.navy,
  },
  discountVal: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primaryRed,
  },
  taxSplitBox: {
    marginVertical: 2,
  },
  taxSub: {
    fontSize: 11,
    color: Colors.secondaryText,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.navy,
  },
  grandTotalVal: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.navy,
    letterSpacing: -0.4,
  },
  cashTenderedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cashTenderedText: {
    fontSize: 12,
    color: Colors.secondaryText,
  },
  thankYouText: {
    fontSize: 12,
    color: Colors.navy,
    textAlign: 'center',
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 2,
  },
  poweredByText: {
    fontSize: 10,
    color: '#94A3B8',
    textAlign: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    flexDirection: 'row',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 6,
  },
  printBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  printBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.navy,
  },
  newBillBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: Colors.primaryRed,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primaryRed,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  newBillBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
