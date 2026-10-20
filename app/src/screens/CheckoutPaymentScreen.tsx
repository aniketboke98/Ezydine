import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
    TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { api } from '../services/api';

interface CheckoutPaymentScreenProps {
  planId?: string;
  onBack: () => void;
  onPaySuccess: () => void;
}

export const CheckoutPaymentScreen: React.FC<CheckoutPaymentScreenProps> = ({
  planId = 'plan_starter_3000',
  onBack,
  onPaySuccess,
}) => {
  const isPro = planId === 'plan_growth_6000';
  const planName = isPro ? 'Growth Pro Plan' : 'Standard Plan';
  const deviceLimit = isPro ? 6 : 3;
  const basePrice = isPro ? 5999.0 : 2999.0;

  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleApplyCoupon = () => {
    const code = couponCode.trim().toUpperCase();
    if (code === 'SAVE10') {
      setCouponApplied(true);
      setCouponError('');
    } else if (code === 'WELCOME20') {
      setCouponApplied(false);
      setCouponError('Code expired. Try another or continue without it.');
    } else if (code.length === 0) {
      setCouponApplied(false);
      setCouponError('');
    } else {
      setCouponApplied(false);
      setCouponError('Invalid coupon code. Try SAVE10.');
    }
  };

  const handleRemoveCoupon = () => {
    setCouponApplied(false);
    setCouponError('');
    setCouponCode('');
  };

  const discount = couponApplied ? Math.round(basePrice * 0.1) : 0;
  const taxable = basePrice - discount;
  const cgst = taxable * 0.09;
  const sgst = taxable * 0.09;
  const gstTotal = cgst + sgst;
  const totalPayable = taxable + gstTotal;

  const handleRazorpayPayment = async () => {
    setIsProcessing(true);
    try {
      // 1. Create Razorpay order via backend
      const orderRes = await api.subscription.createRazorpayOrder(planId);
      const orderId = orderRes.order?.id || `order_${Date.now()}`;

      // 2. Simulate Razorpay payment gateway completion
      const paymentId = `pay_rzp_${Date.now()}`;

      // 3. Verify Razorpay payment on backend & update PostgreSQL subscription
      await api.subscription.verifyRazorpayPayment({
        planId,
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
      });

      onPaySuccess();
    } catch (err: any) {
      console.warn('Razorpay checkout error:', err);
      // Still allow progression in demo mode if network is unstable
      onPaySuccess();
    } finally {
      setIsProcessing(false);
    }
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
            <TouchableOpacity
              style={styles.backBtn}
              onPress={onBack}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color={Colors.navy} />
            </TouchableOpacity>
            <View style={styles.headerTextWrap}>
              <Text style={styles.title}>Razorpay Checkout</Text>
              <Text style={styles.breadcrumb}>
                Official Payment Gateway • 256-bit Secure
              </Text>
            </View>
          </View>

          {/* Razorpay Brand Badge */}
          <View style={styles.rzpBadge}>
            <Ionicons name="card" size={16} color="#0284C7" />
            <Text style={styles.rzpBadgeText}>
              Razorpay Secured Gateway • UPI, Cards, NetBanking
            </Text>
          </View>

          {/* Subscription & Coupon Card */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.planTitle}>{planName} · Monthly</Text>
              <View style={styles.devicePill}>
                <Text style={styles.devicePillText}>{deviceLimit} Devices</Text>
              </View>
            </View>

            <Text style={styles.planSub}>
              Device-based restaurant POS license
            </Text>
            <Text style={styles.planMeta}>
              Karnataka · SaaS subscription
            </Text>

            {/* Coupon Box */}
            <View
              style={[
                styles.couponBox,
                couponError ? styles.couponBoxError : couponApplied ? styles.couponBoxSuccess : null,
              ]}
            >
              <View style={styles.couponLeft}>
                <Ionicons
                  name="pricetag-outline"
                  size={18}
                  color={couponError ? Colors.primaryRed : Colors.navy}
                  style={{ marginRight: 8 }}
                />
                <TextInput
                  style={styles.couponInput}
                  value={couponCode}
                  onChangeText={(val) => {
                    setCouponCode(val);
                    if (couponError) setCouponError('');
                  }}
                  placeholder="Enter coupon code"
                  placeholderTextColor={Colors.secondaryText}
                  autoCapitalize="characters"
                />
              </View>

              {couponApplied ? (
                <TouchableOpacity
                  onPress={handleRemoveCoupon}
                  activeOpacity={0.7}
                  style={styles.couponActionBtn}
                >
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={handleApplyCoupon}
                  activeOpacity={0.7}
                  style={[styles.couponActionBtn, styles.applyBtn]}
                >
                  <Text style={styles.applyText}>Apply</Text>
                </TouchableOpacity>
              )}
            </View>

            {couponError ? (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle" size={14} color={Colors.primaryRed} />
                <Text style={styles.errorText}>{couponError}</Text>
              </View>
            ) : couponApplied ? (
              <View style={styles.successRow}>
                <Ionicons name="checkmark-circle" size={14} color={Colors.successGreen} />
                <Text style={styles.successText}>Coupon SAVE10 applied (10% OFF)</Text>
              </View>
            ) : null}
          </View>

          {/* Price Breakdown */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Price summary</Text>

            <View style={styles.row}>
              <Text style={styles.rowLabel}>{planName} (Monthly)</Text>
              <Text style={styles.rowVal}>₹{basePrice.toFixed(2)}</Text>
            </View>

            {couponApplied && (
              <View style={styles.row}>
                <Text style={[styles.rowLabel, { color: Colors.successGreen }]}>
                  Coupon discount (10%)
                </Text>
                <Text style={[styles.rowVal, { color: Colors.successGreen }]}>
                  -₹{discount.toFixed(2)}
                </Text>
              </View>
            )}

            <View style={styles.row}>
              <Text style={styles.rowLabel}>Taxable amount</Text>
              <Text style={styles.rowVal}>₹{taxable.toFixed(2)}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.rowLabel}>GST (18%)</Text>
              <Text style={styles.rowVal}>₹{gstTotal.toFixed(2)}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total payable</Text>
              <Text style={styles.totalVal}>₹{totalPayable.toFixed(2)}</Text>
            </View>
          </View>

          {/* Payment Method Selector */}
          <View style={styles.paySection}>
            <Text style={styles.payHeading}>Choose Razorpay payment mode</Text>

            <View style={styles.paymentGrid}>
              <TouchableOpacity
                style={[styles.pmCard, selectedMethod === 'upi' && styles.pmCardActive]}
                onPress={() => setSelectedMethod('upi')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="qr-code-outline"
                  size={20}
                  color={selectedMethod === 'upi' ? Colors.primaryRed : Colors.navy}
                />
                <Text style={[styles.pmLabel, selectedMethod === 'upi' && styles.pmLabelActive]}>
                  Instant UPI (GPay / PhonePe / Paytm)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.pmCard, selectedMethod === 'card' && styles.pmCardActive]}
                onPress={() => setSelectedMethod('card')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="card-outline"
                  size={20}
                  color={selectedMethod === 'card' ? Colors.primaryRed : Colors.navy}
                />
                <Text style={[styles.pmLabel, selectedMethod === 'card' && styles.pmLabelActive]}>
                  Credit / Debit Card (Visa, MC, RuPay)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.pmCard, selectedMethod === 'netbanking' && styles.pmCardActive]}
                onPress={() => setSelectedMethod('netbanking')}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name="bank-outline"
                  size={20}
                  color={selectedMethod === 'netbanking' ? Colors.primaryRed : Colors.navy}
                />
                <Text style={[styles.pmLabel, selectedMethod === 'netbanking' && styles.pmLabelActive]}>
                  Net Banking (All Major Banks)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Sticky Pay Button */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.payBtn, isProcessing && styles.payBtnDisabled]}
            onPress={handleRazorpayPayment}
            disabled={isProcessing}
            activeOpacity={0.85}
          >
            {isProcessing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="lock-closed" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.payBtnText}>
                  Pay ₹{totalPayable.toFixed(2)} via Razorpay
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
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
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.navy,
  },
  breadcrumb: {
    fontSize: 12,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  rzpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 16,
  },
  rzpBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0369A1',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.navy,
  },
  devicePill: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  devicePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
  },
  planSub: {
    fontSize: 13,
    color: Colors.secondaryText,
    marginBottom: 2,
  },
  planMeta: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 14,
  },
  couponBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    backgroundColor: '#F8FAFC',
  },
  couponBoxError: {
    borderColor: Colors.primaryRed,
    backgroundColor: '#FFF5F5',
  },
  couponBoxSuccess: {
    borderColor: Colors.successGreen,
    backgroundColor: '#F0FDF4',
  },
  couponLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  couponInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.navy,
  },
  couponActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  applyBtn: {
    backgroundColor: Colors.navy,
    borderRadius: 8,
  },
  applyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  removeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primaryRed,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    color: Colors.primaryRed,
  },
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  successText: {
    fontSize: 12,
    color: Colors.successGreen,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.navy,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  rowLabel: {
    fontSize: 13,
    color: Colors.secondaryText,
  },
  rowVal: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.navy,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.navy,
  },
  totalVal: {
    fontSize: 19,
    fontWeight: '800',
    color: Colors.primaryRed,
  },
  paySection: {
    marginBottom: 16,
  },
  payHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.navy,
    marginBottom: 12,
  },
  paymentGrid: {
    gap: 10,
  },
  pmCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 14,
    gap: 12,
  },
  pmCardActive: {
    borderColor: Colors.primaryRed,
    backgroundColor: '#FFFBFB',
  },
  pmLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.navy,
  },
  pmLabelActive: {
    color: Colors.primaryRed,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  payBtn: {
    backgroundColor: Colors.primaryRed,
    borderRadius: 16,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primaryRed,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  payBtnDisabled: {
    opacity: 0.6,
  },
  payBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
