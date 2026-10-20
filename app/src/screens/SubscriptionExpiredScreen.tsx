import { SafeAreaView } from 'react-native-safe-area-context';
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
    Alert,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

interface SubscriptionExpiredScreenProps {
  onBack: () => void;
  onRenew: () => void;
  onViewPlans: () => void;
}

export const SubscriptionExpiredScreen: React.FC<SubscriptionExpiredScreenProps> = ({
  onBack,
  onRenew,
  onViewPlans,
}) => {
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
              <Text style={styles.title}>Subscription expired</Text>
              <Text style={styles.breadcrumb}>
                Profile / Settings / Subscription
              </Text>
            </View>
          </View>

          {/* Dark Navy Expired Card */}
          <View style={styles.expiredHeroCard}>
            <View style={styles.calendarIconCircle}>
              <MaterialCommunityIcons
                name="calendar-clock"
                size={24}
                color={Colors.warningOrange}
              />
            </View>

            <Text style={styles.expiredTitle}>Growth · Expired</Text>
            <Text style={styles.expiredDate}>Ended 17 Nov 2026</Text>
            <Text style={styles.expiredSub}>
              Keep your service running. Renew to restore your team’s paid features.
            </Text>
          </View>

          {/* What's restricted Card */}
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>What’s restricted</Text>

            <View style={styles.restrictedList}>
              <View style={styles.restrictedItem}>
                <Feather name="lock" size={17} color={Colors.secondaryText} />
                <Text style={styles.restrictedText}>
                  New bills & orders are paused
                </Text>
              </View>

              <View style={styles.restrictedItem}>
                <Feather name="lock" size={17} color={Colors.secondaryText} />
                <Text style={styles.restrictedText}>
                  Inventory changes are unavailable
                </Text>
              </View>

              <View style={styles.restrictedItem}>
                <Feather name="lock" size={17} color={Colors.secondaryText} />
                <Text style={styles.restrictedText}>
                  Kitchen display & new KOTs are paused
                </Text>
              </View>

              <View style={styles.restrictedItem}>
                <Feather name="lock" size={17} color={Colors.secondaryText} />
                <Text style={styles.restrictedText}>
                  Advanced reports are locked
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <Text style={styles.restrictedFooterNote}>
              You can still view past records, download invoices and manage your subscription.
            </Text>
          </View>

          {/* No automatic charge Card */}
          <View style={styles.infoCard}>
            <View style={styles.infoHeaderRow}>
              <Ionicons
                name="information-circle-outline"
                size={20}
                color={Colors.secondaryText}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.infoTitle}>No automatic charge</Text>
            </View>
            <Text style={styles.infoDesc}>
              Manual renewal was due on 18 Nov. Review your plan and final price before paying.
            </Text>
          </View>

          {/* Contact Support */}
          <TouchableOpacity
            style={styles.supportRow}
            onPress={() => Alert.alert('EzyDine Support', 'Calling priority support: 1800-EZY-DINE')}
            activeOpacity={0.7}
          >
            <Text style={styles.supportText}>Need help? Contact support</Text>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={18}
              color={Colors.primaryRed}
            />
          </TouchableOpacity>
        </ScrollView>

        {/* Bottom Action Buttons */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.renewBtn}
            onPress={onRenew}
            activeOpacity={0.85}
          >
            <Text style={styles.renewBtnText}>Renew Subscription</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.viewPlansBtn}
            onPress={onViewPlans}
            activeOpacity={0.8}
          >
            <Text style={styles.viewPlansBtnText}>View Plans</Text>
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
    paddingBottom: 150,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
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
  headerTextWrap: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.navy,
    letterSpacing: -0.5,
  },
  breadcrumb: {
    fontSize: 12,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  expiredHeroCard: {
    backgroundColor: Colors.navy,
    borderRadius: 20,
    padding: 22,
    marginBottom: 16,
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  calendarIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  expiredTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  expiredDate: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 12,
  },
  expiredSub: {
    fontSize: 13,
    color: '#CBD5E1',
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    marginBottom: 16,
  },
  cardSectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.navy,
    marginBottom: 16,
  },
  restrictedList: {
    gap: 14,
  },
  restrictedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  restrictedText: {
    fontSize: 14,
    color: Colors.navy,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 14,
  },
  restrictedFooterNote: {
    fontSize: 12,
    color: Colors.secondaryText,
    lineHeight: 18,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 18,
    marginBottom: 20,
  },
  infoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.navy,
  },
  infoDesc: {
    fontSize: 13,
    color: Colors.secondaryText,
    lineHeight: 18,
    paddingLeft: 28,
  },
  supportRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  supportText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primaryRed,
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
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 6,
  },
  renewBtn: {
    backgroundColor: Colors.primaryRed,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primaryRed,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  renewBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  viewPlansBtn: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  viewPlansBtnText: {
    color: Colors.navy,
    fontSize: 15,
    fontWeight: '600',
  },
});
