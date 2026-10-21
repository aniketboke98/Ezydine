import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { api } from '../services/api';

interface SubscriptionScreenProps {
  onBack: () => void;
  onSelectPlan?: (planId: string) => void;
}

export const SubscriptionScreen: React.FC<SubscriptionScreenProps> = ({
  onBack,
  onSelectPlan,
}) => {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch live plans from backend PostgreSQL
    const loadPlans = async () => {
      try {
        const res = await api.subscription.getPlans();
        if (res.success && res.plans && res.plans.length > 0) {
          const formatted = res.plans.map((p: any) => ({
            id: p.id,
            name: p.name,
            price: p.price,
            deviceLimit: p.device_limit,
            tagline: p.tagline,
            popular: p.popular,
            features: Array.isArray(p.features) ? p.features : JSON.parse(p.features || '[]'),
          }));
          setPlans(formatted);
        }
      } catch (err) {
        // network issue
      } finally {
        setLoading(false);
      }
    };
    loadPlans();
  }, []);

  const handleChoosePlan = (planId: string) => {
    if (onSelectPlan) {
      onSelectPlan(planId);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Back Button & Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={onBack}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={Colors.navy} />
          </TouchableOpacity>
          <View style={styles.headerTextWrap}>
            <Text style={styles.title}>Subscription plans</Text>
            <Text style={styles.breadcrumb}>
              Razorpay Secured • Device Based Pricing
            </Text>
          </View>
        </View>

        {/* Razorpay Banner */}
        <View style={styles.razorpayBanner}>
          <Ionicons name="shield-checkmark" size={16} color="#0284C7" />
          <Text style={styles.razorpayBannerText}>
            Official Razorpay Gateway Integration • Instant Activation
          </Text>
        </View>

        {/* Subtitle */}
        <Text style={styles.noteSub}>
          Select a plan according to the number of active terminal devices you need.
        </Text>

        {/* Subscription Plan Cards */}
        <View style={styles.cardsContainer}>
          {plans.map((plan) => {
            const isGrowth = plan.popular || plan.price >= 5000;

            return (
              <View
                key={plan.id}
                style={[
                  styles.card,
                  isGrowth && styles.cardRecommended,
                ]}
              >
                {/* Header with Title and Price */}
                <View style={styles.cardHeader}>
                  <View style={styles.planNameWrap}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    {isGrowth && (
                      <View style={styles.recommendedBadge}>
                        <Text style={styles.recommendedText}>Most Popular</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.priceRow}>
                    <Text style={styles.priceAmount}>
                      ₹{plan.price.toLocaleString('en-IN')}
                    </Text>
                    <Text style={styles.pricePeriod}>/month</Text>
                  </View>
                </View>

                {/* Device Badge */}
                <View style={styles.deviceLimitBadge}>
                  <Ionicons name="phone-portrait-outline" size={16} color={Colors.navy} />
                  <Text style={styles.deviceLimitText}>
                    Supports up to <Text style={{ fontWeight: '700' }}>{plan.deviceLimit} Devices</Text> Login
                  </Text>
                </View>

                {/* Features List */}
                <View style={styles.featuresList}>
                  {plan.features.map((feature: string, fIdx: number) => (
                    <View key={fIdx} style={styles.featureRow}>
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color={isGrowth ? Colors.primaryRed : Colors.successGreen}
                        style={{ marginRight: 8, marginTop: 1 }}
                      />
                      <Text style={styles.featureItem}>{feature}</Text>
                    </View>
                  ))}
                </View>

                {/* Action Button */}
                <TouchableOpacity
                  style={[
                    styles.planBtn,
                    isGrowth ? styles.planBtnPrimary : styles.planBtnSecondary,
                  ]}
                  onPress={() => handleChoosePlan(plan.id)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.planBtnText,
                      isGrowth
                        ? styles.planBtnTextPrimary
                        : styles.planBtnTextSecondary,
                    ]}
                  >
                    Select {plan.name}
                  </Text>
                  <Ionicons
                    name="arrow-forward"
                    size={16}
                    color={isGrowth ? '#FFFFFF' : Colors.navy}
                  />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* Footer Note */}
        <View style={styles.footerNoteRow}>
          <Ionicons name="lock-closed" size={14} color={Colors.secondaryText} />
          <Text style={styles.footerNote}>
            Powered by Razorpay payment gateway • Instant UPI & Card processing
          </Text>
        </View>
      </ScrollView>
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
    paddingBottom: 40,
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
    letterSpacing: -0.5,
  },
  breadcrumb: {
    fontSize: 12,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  razorpayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 16,
  },
  razorpayBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0369A1',
  },
  noteSub: {
    fontSize: 14,
    color: Colors.secondaryText,
    marginBottom: 20,
    lineHeight: 20,
  },
  cardsContainer: {
    gap: 18,
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardRecommended: {
    borderColor: Colors.primaryRed,
    borderWidth: 2,
    shadowColor: Colors.primaryRed,
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  cardHeader: {
    marginBottom: 14,
  },
  planNameWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  planName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.navy,
  },
  recommendedBadge: {
    backgroundColor: Colors.primaryRed,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  recommendedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.navy,
    letterSpacing: -0.8,
  },
  pricePeriod: {
    fontSize: 14,
    color: Colors.secondaryText,
    marginLeft: 4,
  },
  deviceLimitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 16,
  },
  deviceLimitText: {
    fontSize: 13,
    color: Colors.navy,
  },
  featuresList: {
    gap: 10,
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  featureItem: {
    fontSize: 14,
    color: Colors.navy,
    flex: 1,
    lineHeight: 20,
  },
  planBtn: {
    borderRadius: 14,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  planBtnPrimary: {
    backgroundColor: Colors.primaryRed,
  },
  planBtnSecondary: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  planBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  planBtnTextPrimary: {
    color: '#FFFFFF',
  },
  planBtnTextSecondary: {
    color: Colors.navy,
  },
  footerNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  footerNote: {
    fontSize: 12,
    color: Colors.secondaryText,
  },
});
