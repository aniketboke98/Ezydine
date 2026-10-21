import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
    Alert,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { api, safeStorage } from '../services/api';

interface PaymentSuccessfulScreenProps {
  onGoToDashboard: () => void;
  onBack: () => void;
}

export const PaymentSuccessfulScreen: React.FC<PaymentSuccessfulScreenProps> = ({
  onGoToDashboard,
  onBack,
}) => {
  const [restaurantName, setRestaurantName] = useState('Restaurant');
  const [planName, setPlanName] = useState('Standard Plan');
  const [amountPaid, setAmountPaid] = useState('2,999.00');

  useEffect(() => {
    api.getRestaurant().then((cached) => {
      if (cached && (cached.name || cached.restaurant_name)) {
        setRestaurantName(cached.name || cached.restaurant_name);
      }
    }).catch(() => null);

    safeStorage.getItem('@ezydine_plan_data').then((raw) => {
      if (raw) {
        try {
          const p = JSON.parse(raw);
          if (p.name) setPlanName(p.name);
          if (p.price) setAmountPaid(Number(p.price).toFixed(2));
        } catch {}
      }
    }).catch(() => null);
  }, []);

  const todayStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const validThroughDate = new Date();
  validThroughDate.setDate(validThroughDate.getDate() + 30);
  const validThroughStr = validThroughDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

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
              <Text style={styles.title}>Payment successful</Text>
              <Text style={styles.breadcrumb}>
                Profile / Settings / Subscription
              </Text>
            </View>
          </View>

          {/* Success Check Badge & Message */}
          <View style={styles.successHero}>
            <View style={styles.outerCircle}>
              <View style={styles.innerCircle}>
                <Ionicons name="checkmark" size={32} color="#FFFFFF" />
              </View>
            </View>

            <Text style={styles.heroTitle}>You’re ready for service.</Text>
            <Text style={styles.heroSubtitle}>
              Payment confirmed. {planName} is now active for {restaurantName}.
            </Text>
          </View>

          {/* Details Card */}
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <Text style={styles.planName}>{planName} · Monthly</Text>
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>Active</Text>
              </View>
            </View>

            <View style={styles.amountRow}>
              <Text style={styles.methodLabel}>Amount paid · UPI / Online</Text>
              <Text style={styles.amountVal}>₹{amountPaid}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Activated</Text>
              <Text style={styles.metaVal}>{todayStr}</Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Valid through</Text>
              <Text style={styles.metaVal}>{validThroughStr}</Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Transaction reference</Text>
              <Text style={styles.metaVal}>TXN-{Date.now().toString().slice(-8)}</Text>
            </View>
          </View>

          {/* Invoice Card */}
          <View style={styles.invoiceCard}>
            <Text style={styles.invoiceNote}>
              Renew manually on 18 Nov 2026. No automatic charges. Your invoice is ready.
            </Text>

            <TouchableOpacity
              style={styles.downloadRow}
              activeOpacity={0.7}
              onPress={() => Alert.alert('Downloading Invoice', 'Invoice #ED2610180842 downloaded as PDF.')}
            >
              <Text style={styles.downloadText}>Download tax invoice</Text>
              <Feather name="download" size={18} color={Colors.primaryRed} />
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Go to Dashboard Button */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.dashboardBtn}
            onPress={onGoToDashboard}
            activeOpacity={0.85}
          >
            <Text style={styles.dashboardBtnText}>Go to Dashboard</Text>
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
    marginBottom: 24,
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
  successHero: {
    alignItems: 'center',
    marginBottom: 28,
  },
  outerCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  innerCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.successGreen,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.successGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.navy,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.4,
  },
  heroSubtitle: {
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
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  planName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.navy,
  },
  activeBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.successGreen,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  methodLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.navy,
  },
  amountVal: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.navy,
  },
  taxSavingsNote: {
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
    marginBottom: 10,
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
  invoiceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 18,
    marginBottom: 20,
  },
  invoiceNote: {
    fontSize: 13,
    color: Colors.secondaryText,
    lineHeight: 18,
    marginBottom: 14,
  },
  downloadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
  },
  downloadText: {
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 6,
  },
  dashboardBtn: {
    backgroundColor: Colors.primaryRed,
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
  dashboardBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
