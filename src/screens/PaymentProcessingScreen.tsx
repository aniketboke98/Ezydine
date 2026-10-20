import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

interface PaymentProcessingScreenProps {
  onBack: () => void;
  onAdvanceToVerification?: () => void;
  onAdvanceToSuccess?: () => void;
}

export const PaymentProcessingScreen: React.FC<PaymentProcessingScreenProps> = ({
  onBack,
  onAdvanceToVerification,
  onAdvanceToSuccess,
}) => {
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

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
              <Text style={styles.title}>Processing payment</Text>
              <Text style={styles.breadcrumb}>
                STATE EXAMPLE · PROCESSING
              </Text>
            </View>
          </View>

          {/* Spinner Graphic */}
          <View style={styles.centerGraphic}>
            <View style={styles.spinnerCircleBg}>
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <MaterialCommunityIcons
                  name="loading"
                  size={42}
                  color={Colors.warningOrange}
                />
              </Animated.View>
            </View>

            <Text style={styles.headline}>Please wait a moment</Text>
            <Text style={styles.subtext}>
              We’re waiting for your payment result. Keep this screen open; do not pay again.
            </Text>
          </View>

          {/* Details Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.planName}>Growth · Monthly</Text>
              <View style={styles.processingBadge}>
                <Text style={styles.processingBadgeText}>Processing</Text>
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

            <Text style={styles.timeMeta}>18 Oct 2026 · Checking now...</Text>
          </View>

          {/* Warning Banner */}
          <View style={styles.warningCard}>
            <Ionicons
              name="time-outline"
              size={20}
              color="#B45309"
              style={{ marginRight: 8, marginTop: 1 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.warningTitle}>Your plan is not active yet</Text>
              <Text style={styles.warningDesc}>
                We’ll confirm your subscription only after your payment is verified.
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Button (Checking payment...) */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.checkingBtn}
            activeOpacity={0.8}
            onPress={onAdvanceToVerification || onAdvanceToSuccess}
          >
            <Text style={styles.checkingBtnText}>Checking payment...</Text>
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
  spinnerCircleBg: {
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
  processingBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  processingBadgeText: {
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
  warningCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  warningTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 2,
  },
  warningDesc: {
    fontSize: 12,
    color: '#B45309',
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
  },
  checkingBtn: {
    backgroundColor: '#E2E8F0',
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkingBtnText: {
    color: Colors.secondaryText,
    fontSize: 15,
    fontWeight: '600',
  },
});
