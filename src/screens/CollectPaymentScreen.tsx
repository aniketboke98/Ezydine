import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
    TextInput,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { api } from '../services/api';

interface CollectPaymentScreenProps {
  onBack: () => void;
  onPaymentComplete: (savedOrder?: any) => void;
  totalAmount?: number;
  orderData?: any;
}

export const CollectPaymentScreen: React.FC<CollectPaymentScreenProps> = ({
  onBack,
  onPaymentComplete,
  totalAmount = 0,
  orderData,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card' | 'split'>('cash');
  const [amountReceived, setAmountReceived] = useState(totalAmount ? totalAmount.toFixed(2) : '');
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [restaurantProfile, setRestaurantProfile] = useState<any>({ name: 'Restaurant' });

  React.useEffect(() => {
    api.getRestaurant().then((cached) => {
      if (cached) setRestaurantProfile(cached);
    }).catch(() => null);
  }, []);

  const numericReceived = parseFloat(amountReceived) || 0;
  const changeToReturn = Math.max(0, numericReceived - totalAmount);

  const handleComplete = async () => {
    try {
      const billPayload = {
        tableNumber: orderData?.tableNumber || '01',
        items: (orderData?.items || []).map((it: any) => ({
          name: it.name,
          price: it.unitPrice || it.price,
          quantity: it.qty || it.quantity || 1,
        })),
        subtotal: orderData?.subtotal || totalAmount,
        discount: orderData?.discount || 0,
        gstAmount: orderData?.gst || 0,
        totalAmount: totalAmount,
        paymentStatus: 'paid',
        paymentMethod: paymentMethod === 'cash' ? 'Cash' : paymentMethod === 'upi' ? 'UPI' : 'Card',
      };
      await api.bills.create(billPayload).catch(() => null);
    } catch {}
    setShowReceiptModal(true);
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
                <Text style={styles.title}>Collect payment</Text>
                <Text style={styles.subtitle}>{orderData?.tableNumber ? `${orderData.tableNumber} · Dine-in` : 'Dine-in'}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.moreBtn}
              onPress={() => Alert.alert('Payment Options', 'Apply special discount or change table')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="ellipsis-horizontal"
                size={20}
                color={Colors.navy}
              />
            </TouchableOpacity>
          </View>

          {/* Big Total Payable Banner */}
          <View style={styles.totalDisplaySection}>
            <Text style={styles.totalPayableLabel}>TOTAL PAYABLE</Text>
            <Text style={styles.totalPayableAmount}>
              ₹{totalAmount.toFixed(2)}
            </Text>
            <Text style={styles.totalPayableSub}>
              {orderData?.items?.length ? `${orderData.items.length} items · ` : ''}GST applicable
            </Text>
          </View>

          {/* Choose Payment Method Grid */}
          <Text style={styles.sectionHeading}>Choose payment method</Text>
          <View style={styles.pmGrid}>
            {/* Cash */}
            <TouchableOpacity
              style={[
                styles.pmTile,
                paymentMethod === 'cash' && styles.pmTileActive,
              ]}
              onPress={() => setPaymentMethod('cash')}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name="cash-multiple"
                size={24}
                color={paymentMethod === 'cash' ? Colors.primaryRed : Colors.navy}
              />
              <Text
                style={[
                  styles.pmTileText,
                  paymentMethod === 'cash' && styles.pmTileTextActive,
                ]}
              >
                Cash
              </Text>
            </TouchableOpacity>

            {/* UPI */}
            <TouchableOpacity
              style={[
                styles.pmTile,
                paymentMethod === 'upi' && styles.pmTileActive,
              ]}
              onPress={() => setPaymentMethod('upi')}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name="qrcode-scan"
                size={22}
                color={paymentMethod === 'upi' ? Colors.primaryRed : Colors.navy}
              />
              <Text
                style={[
                  styles.pmTileText,
                  paymentMethod === 'upi' && styles.pmTileTextActive,
                ]}
              >
                UPI
              </Text>
            </TouchableOpacity>

            {/* Card */}
            <TouchableOpacity
              style={[
                styles.pmTile,
                paymentMethod === 'card' && styles.pmTileActive,
              ]}
              onPress={() => setPaymentMethod('card')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="card-outline"
                size={22}
                color={paymentMethod === 'card' ? Colors.primaryRed : Colors.navy}
              />
              <Text
                style={[
                  styles.pmTileText,
                  paymentMethod === 'card' && styles.pmTileTextActive,
                ]}
              >
                Card
              </Text>
            </TouchableOpacity>

            {/* Split */}
            <TouchableOpacity
              style={[
                styles.pmTile,
                paymentMethod === 'split' && styles.pmTileActive,
              ]}
              onPress={() => setPaymentMethod('split')}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name="call-split"
                size={22}
                color={paymentMethod === 'split' ? Colors.primaryRed : Colors.navy}
              />
              <Text
                style={[
                  styles.pmTileText,
                  paymentMethod === 'split' && styles.pmTileTextActive,
                ]}
              >
                Split
              </Text>
            </TouchableOpacity>
          </View>

          {/* Cash Payment Details Card */}
          {paymentMethod === 'cash' && (
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle}>Cash payment</Text>
                <View style={styles.selectedBadge}>
                  <Text style={styles.selectedBadgeText}>Selected</Text>
                </View>
              </View>

              <Text style={styles.inputLabel}>Amount received</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.amountInput}
                  value={amountReceived}
                  onChangeText={setAmountReceived}
                  keyboardType="decimal-pad"
                />
                <Feather name="edit-2" size={16} color={Colors.secondaryText} />
              </View>

              <View style={styles.divider} />

              <View style={styles.changeRow}>
                <Text style={styles.changeLabel}>Change to return</Text>
                <Text style={styles.changeVal}>
                  ₹{changeToReturn.toFixed(2)}
                </Text>
              </View>
            </View>
          )}

          {/* UPI Payment Display */}
          {paymentMethod === 'upi' && (
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle}>Scan UPI QR</Text>
                <View style={styles.selectedBadge}>
                  <Text style={styles.selectedBadgeText}>Active</Text>
                </View>
              </View>
              <View style={styles.upiQrBox}>
                <MaterialCommunityIcons
                  name="qrcode"
                  size={120}
                  color={Colors.navy}
                />
                <Text style={styles.upiVpaText}>
                  {restaurantProfile?.name ? `${restaurantProfile.name.toLowerCase().replace(/[^a-z0-9]/g, '')}@upi` : 'merchant@upi'}
                </Text>
                <Text style={styles.upiHintText}>
                  Ask customer to scan with GPay, PhonePe or Paytm
                </Text>
              </View>
            </View>
          )}

          {/* Card / Split placeholder */}
          {(paymentMethod === 'card' || paymentMethod === 'split') && (
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle}>
                  {paymentMethod === 'card' ? 'Swipe / Tap Card' : 'Split Payment'}
                </Text>
                <View style={styles.selectedBadge}>
                  <Text style={styles.selectedBadgeText}>Selected</Text>
                </View>
              </View>
              <Text style={styles.cardInfoText}>
                {paymentMethod === 'card'
                  ? 'Connect EDC POS machine to swipe or tap customer card.'
                  : 'Customer can split between Cash (₹300) and UPI (₹330).'}
              </Text>
            </View>
          )}

          {/* UPI Suggestion Banner */}
          <TouchableOpacity
            style={styles.upiBanner}
            onPress={() => setPaymentMethod('upi')}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name="qrcode-scan"
              size={22}
              color={Colors.navy}
            />
            <View style={styles.upiBannerContent}>
              <Text style={styles.upiBannerTitle}>
                Prefer UPI? Collect ₹{totalAmount.toFixed(2)}
              </Text>
              <Text style={styles.upiBannerSub}>
                {restaurantProfile.name || 'Restaurant'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Printer Ready Note */}
          <View style={styles.receiptNoteRow}>
            <Ionicons
              name="print-outline"
              size={16}
              color={Colors.secondaryText}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.receiptNoteText}>
              Receipt will be ready after payment
            </Text>
          </View>
        </ScrollView>

        {/* Bottom Complete Payment Button */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.completeBtn}
            onPress={handleComplete}
            activeOpacity={0.85}
          >
            <Ionicons
              name="checkmark"
              size={20}
              color="#FFFFFF"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.completeBtnText}>Complete payment</Text>
          </TouchableOpacity>
        </View>

        {/* Order Receipt Modal */}
        <Modal
          visible={showReceiptModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowReceiptModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.receiptModal}>
              <View style={styles.receiptSuccessIcon}>
                <Ionicons name="checkmark" size={32} color="#FFFFFF" />
              </View>

              <Text style={styles.receiptModalTitle}>Payment Completed!</Text>
              <Text style={styles.receiptModalSub}>
                Order for {orderData?.tableNumber || 'Table'} has been settled. Change to return: ₹{changeToReturn.toFixed(2)}.
              </Text>

              <View style={styles.receiptActionsRow}>
                <TouchableOpacity
                  style={styles.printBtn}
                  onPress={() => Alert.alert('Printing Receipt', 'Sending thermal print command to Kitchen/Counter printer.')}
                >
                  <Ionicons name="print-outline" size={18} color={Colors.navy} />
                  <Text style={styles.printBtnText}>Print Bill</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.doneBtn}
                  onPress={() => {
                    setShowReceiptModal(false);
                    onPaymentComplete({ ...orderData, totalAmount, paymentMethod });
                  }}
                >
                  <Text style={styles.doneBtnText}>View Receipt</Text>
                </TouchableOpacity>
              </View>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 110,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
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
  moreBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  totalDisplaySection: {
    alignItems: 'center',
    marginVertical: 14,
  },
  totalPayableLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.secondaryText,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  totalPayableAmount: {
    fontSize: 38,
    fontWeight: '800',
    color: Colors.navy,
    letterSpacing: -0.8,
    marginBottom: 4,
  },
  totalPayableSub: {
    fontSize: 13,
    color: Colors.secondaryText,
    fontWeight: '500',
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.navy,
    marginTop: 18,
    marginBottom: 12,
  },
  pmGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  pmTile: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pmTileActive: {
    borderColor: Colors.primaryRed,
    backgroundColor: '#FFF7F8',
  },
  pmTileText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.navy,
  },
  pmTileTextActive: {
    color: Colors.primaryRed,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 18,
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.navy,
  },
  selectedBadge: {
    backgroundColor: '#FFE4E6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  selectedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primaryRed,
  },
  inputLabel: {
    fontSize: 13,
    color: Colors.secondaryText,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
  },
  amountInput: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.navy,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 14,
  },
  changeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  changeLabel: {
    fontSize: 14,
    color: Colors.secondaryText,
  },
  changeVal: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.successGreen,
  },
  upiQrBox: {
    alignItems: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  upiVpaText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.navy,
  },
  upiHintText: {
    fontSize: 12,
    color: Colors.secondaryText,
    textAlign: 'center',
  },
  cardInfoText: {
    fontSize: 13,
    color: Colors.secondaryText,
    lineHeight: 18,
  },
  upiBanner: {
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  upiBannerContent: {
    flex: 1,
  },
  upiBannerTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.navy,
    marginBottom: 2,
  },
  upiBannerSub: {
    fontSize: 12,
    color: Colors.secondaryText,
  },
  receiptNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  receiptNoteText: {
    fontSize: 12,
    color: Colors.secondaryText,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 6,
  },
  completeBtn: {
    backgroundColor: Colors.primaryRed,
    flexDirection: 'row',
    width: '100%',
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primaryRed,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  completeBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  receiptModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 26,
    width: '100%',
    alignItems: 'center',
  },
  receiptSuccessIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.successGreen,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  receiptModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.navy,
    marginBottom: 8,
  },
  receiptModalSub: {
    fontSize: 14,
    color: Colors.secondaryText,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 22,
  },
  receiptActionsRow: {
    width: '100%',
    gap: 10,
  },
  printBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: Colors.border,
    height: 48,
    borderRadius: 12,
  },
  printBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.navy,
  },
  doneBtn: {
    backgroundColor: Colors.navy,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
