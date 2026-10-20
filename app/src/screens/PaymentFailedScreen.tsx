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

interface PaymentFailedScreenProps {
  onBack: () => void;
  onRetryPayment: () => void;
  onCheckStatus?: () => void;
}

export const PaymentFailedScreen: React.FC<PaymentFailedScreenProps> = ({
  onBack,
  onRetryPayment,
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
              <Text style={styles.title}>Payment unsuccessful</Text>
              <Text style={styles.breadcrumb}>
                STATE EXAMPLE · FAILED / RETRY
              </Text>
            </View>
          </View>

          {/* Cross Graphic */}
          <View style={styles.centerGraphic}>
            <View style={styles.crossCircleBg}>
              <View style={styles.crossInnerCircle}>
                <Ionicons name="close" size={28} color="#B91C1C" />
              </View>
            </View>

            <Text style={styles.headline}>Payment didn’t go through</Text>
            <Text style={styles.subtext}>
              This attempt was not completed. Your subscription has not been activated.
            </Text>
          </View>

          {/* Details Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.planName}>Growth · Monthly</Text>
              <View style={styles.failedBadge}>
                <Text style={styles.failedBadgeText}>Failed</Text>
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
              <Text style={styles.metaVal}>ED2610180811</Text>
            </View>

            <Text style={styles.timeMeta}>18 Oct 2026 · Last checked at 9:41 am</Text>
          </View>

          {/* Debited Alert Card */}
          <View style={styles.warningCard}>
            <Ionicons
              name="alert-circle-outline"
              size={20}
              color="#B91C1C"
              style={{ marginRight: 8, marginTop: 1 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.warningTitle}>Debited but seeing this message?</Text>
              <Text style={styles.warningDesc}>
                Do not pay again. Check status first; contact support if the debit is still unresolved.
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Buttons */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={onRetryPayment}
            activeOpacity={0.85}
          >
            <Text style={styles.retryBtnText}>Retry payment</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.checkBtn}
            onPress={
              onCheckStatus ||
              (() => Alert.alert('Payment Status', 'Payment ED2610180811 was not received by bank.'))
            }
            activeOpacity={0.8}
          >
            <Text style={styles.checkBtnText}>Check payment status first</Text>
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
    textTransform: 'uppercase',
  },
  centerGraphic: {
    alignItems: 'center',
    marginVertical: 24,
  },
  crossCircleBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  crossInnerCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#B91C1C',
    justifyContent: 'center',
    alignItems: 'center',
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
  failedBadge: {
    backgroundColor: '#FFE4E6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  failedBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B91C1C',
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
  warningCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  warningTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#991B1B',
    marginBottom: 2,
  },
  warningDesc: {
    fontSize: 12,
    color: '#B91C1C',
    lineHeight: 18,
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
  retryBtn: {
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
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  checkBtn: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkBtnText: {
    color: Colors.navy,
    fontSize: 15,
    fontWeight: '600',
  },
});
