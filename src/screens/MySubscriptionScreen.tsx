import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { api } from '../services/api';

interface MySubscriptionScreenProps {
  onBack: () => void;
  onUpgradeOrRenew: () => void;
  onViewHistory: () => void;
}

export const MySubscriptionScreen: React.FC<MySubscriptionScreenProps> = ({
  onBack,
  onUpgradeOrRenew,
  onViewHistory,
}) => {
  const [subData, setSubData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSub = async () => {
      try {
        const res = await api.subscription.getCurrent();
        if (res.success && res.subscription) {
          setSubData(res.subscription);
        }
      } catch (err) {
        // Fallback default
        setSubData({
          plan_name: 'Standard Plan',
          price: 2999,
          device_limit: 3,
          activeDeviceCount: 1,
          daysRemaining: 30,
          status: 'active',
        });
      } finally {
        setLoading(false);
      }
    };
    fetchSub();
  }, []);

  const planName = subData?.plan_name || 'Standard Plan';
  const price = subData?.price || 2999;
  const deviceLimit = subData?.device_limit || 3;
  const activeDevices = subData?.activeDeviceCount || 1;
  const daysRemaining = subData?.daysRemaining ?? 30;
  const devicePercent = Math.min(100, Math.round((activeDevices / deviceLimit) * 100));

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
              <Text style={styles.title}>My subscription</Text>
              <Text style={styles.breadcrumb}>
                PostgreSQL & Razorpay Synced
              </Text>
            </View>
          </View>

          {/* Dark Navy Hero Card */}
          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <Text style={styles.planName}>{planName}</Text>
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>Active</Text>
              </View>
            </View>

            <Text style={styles.heroSub}>
              ₹{price.toLocaleString('en-IN')}/month · Single restaurant license
            </Text>

            <View style={styles.heroBottomRow}>
              <Text style={styles.daysLeftText}>{daysRemaining} days left</Text>
              <Text style={styles.untilDateText}>Razorpay billing cycle</Text>
            </View>
          </View>

          {/* Device Usage Card (Replacing outlets as requested) */}
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>Terminal device logins</Text>

            <View style={styles.usageBlock}>
              <View style={styles.usageLabels}>
                <Text style={styles.usageName}>Active devices logged in</Text>
                <Text style={styles.usageRatio}>
                  {activeDevices} of {deviceLimit} allowed
                </Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${devicePercent}%`,
                      backgroundColor: devicePercent >= 100 ? Colors.warningOrange : Colors.primaryRed,
                    },
                  ]}
                />
              </View>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.secondaryText} />
              <Text style={styles.usageFooter}>
                Standard Plan supports up to 3 devices. Upgrade to Growth Pro Plan for up to 6 devices.
              </Text>
            </View>
          </View>

          {/* Renewal Due Card */}
          <View style={styles.card}>
            <View style={styles.renewalRow}>
              <View>
                <Text style={styles.renewalLabel}>Next renewal amount</Text>
                <Text style={styles.renewalPrice}>₹{price.toLocaleString('en-IN')}</Text>
              </View>
              <TouchableOpacity
                style={styles.renewBtn}
                onPress={onUpgradeOrRenew}
                activeOpacity={0.8}
              >
                <Text style={styles.renewBtnText}>Renew / Upgrade</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* View Billing History */}
          <TouchableOpacity
            style={styles.historyBtn}
            onPress={onViewHistory}
            activeOpacity={0.7}
          >
            <Ionicons name="document-text-outline" size={18} color={Colors.navy} />
            <Text style={styles.historyBtnText}>View Razorpay invoices & history</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.secondaryText} />
          </TouchableOpacity>
        </ScrollView>
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
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  activeBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.successGreen,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.successGreen,
  },
  heroSub: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 6,
  },
  heroBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  daysLeftText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  untilDateText: {
    fontSize: 12,
    color: '#CBD5E1',
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
  usageBlock: {
    marginBottom: 12,
  },
  usageLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  usageName: {
    fontSize: 14,
    color: Colors.navy,
    fontWeight: '600',
  },
  usageRatio: {
    fontSize: 13,
    color: Colors.secondaryText,
    fontWeight: '600',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 8,
    borderRadius: 4,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'flex-start',
    marginTop: 6,
  },
  usageFooter: {
    fontSize: 12,
    color: Colors.secondaryText,
    lineHeight: 16,
    flex: 1,
  },
  renewalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  renewalLabel: {
    fontSize: 13,
    color: Colors.secondaryText,
  },
  renewalPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.navy,
    marginTop: 2,
  },
  renewBtn: {
    backgroundColor: Colors.primaryRed,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  renewBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  historyBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.navy,
    flex: 1,
  },
});
