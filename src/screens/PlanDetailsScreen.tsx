import { SafeAreaView } from 'react-native-safe-area-context';
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  } from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

interface PlanDetailsScreenProps {
  planId?: string;
  onBack: () => void;
  onContinueToPayment: (planId: string) => void;
}

export const PlanDetailsScreen: React.FC<PlanDetailsScreenProps> = ({
  planId = 'plan_starter_3000',
  onBack,
  onContinueToPayment,
}) => {
  const isPro = planId === 'plan_growth_6000';
  const planName = isPro ? 'Growth Pro Plan' : 'Standard Plan';
  const basePrice = isPro ? 5999 : 2999;
  const gstAmount = Math.round(basePrice * 0.18);
  const totalAmount = basePrice + gstAmount;
  const deviceLimit = isPro ? 6 : 3;

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
              <Text style={styles.title}>Plan details</Text>
              <Text style={styles.breadcrumb}>
                Subscription / {planName}
              </Text>
            </View>
          </View>

          {/* Dark Navy Hero Card */}
          <View style={styles.heroCard}>
            <View style={styles.heroRow}>
              <View style={styles.heroLeft}>
                <Text style={styles.heroTitle}>{planName} · Monthly</Text>
                <Text style={styles.heroSubtitle}>
                  Device-based restaurant POS & billing
                </Text>
                <Text style={styles.heroDates}>
                  30 days active access · Instant Razorpay activation
                </Text>
              </View>
              <Text style={styles.heroPrice}>₹{basePrice.toLocaleString('en-IN')}</Text>
            </View>
          </View>

          {/* Features Included */}
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>Everything your restaurant needs</Text>
            <View style={styles.featureList}>
              <View style={styles.featureItem}>
                <Ionicons
                  name="phone-portrait-outline"
                  size={19}
                  color={Colors.primaryRed}
                  style={styles.featureIcon}
                />
                <Text style={styles.featureText}>
                  Up to <Text style={{ fontWeight: '700' }}>{deviceLimit} active device logins</Text> simultaneously
                </Text>
              </View>

              <View style={styles.featureItem}>
                <Ionicons
                  name="receipt-outline"
                  size={19}
                  color={Colors.secondaryText}
                  style={styles.featureIcon}
                />
                <Text style={styles.featureText}>
                  Unlimited POS orders, billing & thermal printing
                </Text>
              </View>

              <View style={styles.featureItem}>
                <MaterialCommunityIcons
                  name="silverware-fork-knife"
                  size={19}
                  color={Colors.secondaryText}
                  style={styles.featureIcon}
                />
                <Text style={styles.featureText}>
                  Live kitchen order ticket (KOT) display
                </Text>
              </View>

              <View style={styles.featureItem}>
                <Feather
                  name="box"
                  size={19}
                  color={Colors.secondaryText}
                  style={styles.featureIcon}
                />
                <Text style={styles.featureText}>
                  Inventory tracking & automatic low-stock alerts
                </Text>
              </View>

              <View style={styles.featureItem}>
                <Ionicons
                  name="bar-chart-outline"
                  size={19}
                  color={Colors.secondaryText}
                  style={styles.featureIcon}
                />
                <Text style={styles.featureText}>
                  Comprehensive sales & GST summary reports
                </Text>
              </View>
            </View>
          </View>

          {/* Payment Breakdown Card */}
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>Payment breakdown</Text>

            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>{planName} (1 Month)</Text>
              <Text style={styles.breakdownValue}>₹{basePrice.toFixed(2)}</Text>
            </View>

            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>GST (18%)</Text>
              <Text style={styles.breakdownValue}>₹{gstAmount.toFixed(2)}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.breakdownRowTotal}>
              <Text style={styles.totalLabel}>Total payable</Text>
              <Text style={styles.totalValue}>₹{totalAmount.toFixed(2)}</Text>
            </View>
          </View>

          {/* Razorpay Assurance */}
          <View style={styles.guaranteeBox}>
            <Ionicons name="shield-checkmark" size={18} color="#0284C7" />
            <Text style={styles.guaranteeText}>
              Secured with Razorpay 256-bit SSL encryption. Auto-activates on completion.
            </Text>
          </View>
        </ScrollView>

        {/* Floating CTA */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.continueBtn}
            onPress={() => onContinueToPayment(planId)}
            activeOpacity={0.85}
          >
            <Text style={styles.continueBtnText}>
              Continue to Razorpay Checkout (₹{totalAmount.toFixed(2)})
            </Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
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
    paddingBottom: 100,
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
  heroCard: {
    backgroundColor: Colors.navy,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroLeft: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
  },
  heroDates: {
    fontSize: 12,
    color: '#CBD5E1',
    marginTop: 6,
  },
  heroPrice: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  cardSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.navy,
    marginBottom: 14,
  },
  featureList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIcon: {
    marginRight: 10,
  },
  featureText: {
    fontSize: 14,
    color: Colors.navy,
    flex: 1,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  breakdownLabel: {
    fontSize: 14,
    color: Colors.secondaryText,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.navy,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  breakdownRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.navy,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primaryRed,
  },
  guaranteeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    marginBottom: 20,
  },
  guaranteeText: {
    fontSize: 13,
    color: '#0369A1',
    flex: 1,
    lineHeight: 18,
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
  continueBtn: {
    backgroundColor: Colors.primaryRed,
    borderRadius: 16,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: Colors.primaryRed,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  continueBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
