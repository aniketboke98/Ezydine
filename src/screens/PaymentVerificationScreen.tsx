import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

interface PaymentVerificationScreenProps {
  onBack: () => void;
  onCheckStatus?: () => void;
}

export const PaymentVerificationScreen: React.FC<PaymentVerificationScreenProps> = ({
  onBack,
  onCheckStatus,
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
              <Text style={styles.title}>Payment verification</Text>
              <Text style={styles.breadcrumb}>
                STATE EXAMPLE · PENDING VERIFICATION
              </Text>
            </View>
          </View>

          {/* Clock Graphic */}
          <View style={styles.centerGraphic}>
            <View style={styles.clockCircleBg}>
              <Ionicons
                name="time-outline"
                size={40}
                color={Colors.warningOrange}
              />
            </View>

            <Text style={styles.headline}>Your payment is being checked</Text>
            <Text style={styles.subtext}>
              If your account was debited, do not pay again. Confirmation can take a few minutes.
            </Text>
          </View>

          {/* Details Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.planName}>Growth · Monthly</Text>
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>Verification pending</Text>
              </View>
            </View>

            <View style={styles.amountRow}>
              <Text style={styles.amountLabel}>Amount</Text>
              <Text style={styles.amountVal}>₹2,122.94</Text>
            </View>

            <Text style={styles.amountSub}>
              SAVE10 included · ₹323.84 GST · UPI
            </Text>

            <View style={styles.divider} />

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Attempt reference</Text>
              <Text style={styles.metaVal}>ED2610180842</Text>
            </View>

            <Text style={styles.timeMeta}>18 Oct 2026 · Last checked at 9:41 am</Text>
          </View>

          {/* No activation yet Card */}
          <View style={styles.infoCard}>
            <Ionicons
              name="time-outline"
              size={20}
              color="#B45309"
              style={{ marginRight: 8, marginTop: 1 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>No activation yet</Text>
              <Text style={styles.infoDesc}>
                You can leave this screen. Check back here for an updated payment status.
              </Text>
            </View>
          </View>

          {/* Contact Support */}
          <TouchableOpacity
            style={styles.supportRow}
            onPress={() => Alert.alert('Payment Support', 'Calling billing support: 1800-EZY-DINE')}
            activeOpacity={0.7}
          >
            <Text style={styles.supportText}>Contact payment support</Text>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={18}
              color={Colors.primaryRed}
            />
          </TouchableOpacity>
        </ScrollView>

        {/* Bottom Button */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.checkStatusBtn}
            onPress={
              onCheckStatus ||
              (() => Alert.alert('Payment Status', 'Re-querying UPI gateway with reference ED2610180842...'))
            }
            activeOpacity={0.85}
          >
            <Text style={styles.checkStatusBtnText}>Check payment status</Text>
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
    textTransform: 'uppercase',
  },
  centerGraphic: {
    alignItems: 'center',
    marginVertical: 24,
  },
  clockCircleBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFBEB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  headline: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.navy,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtext: {
    fontSize: 14,
    color: Colors.secondaryText,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  planName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.navy,
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pendingBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  amountLabel: {
    fontSize: 14,
    color: Colors.navy,
    fontWeight: '600',
  },
  amountVal: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.navy,
  },
  amountSub: {
    fontSize: 12,
    color: Colors.secondaryText,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  metaLabel: {
    fontSize: 13,
    color: Colors.secondaryText,
  },
  metaVal: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.navy,
  },
  timeMeta: {
    fontSize: 12,
    color: Colors.secondaryText,
  },
  infoCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 2,
  },
  infoDesc: {
    fontSize: 12,
    color: '#B45309',
    lineHeight: 18,
  },
  supportRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 20,
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
  },
  checkStatusBtn: {
    backgroundColor: Colors.primaryRed,
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
  checkStatusBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
