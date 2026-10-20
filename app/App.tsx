import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Colors } from './src/theme/colors';
import { ScreenType } from './src/types';
import { SplashScreen } from './src/screens/SplashScreen';
import { SignInScreen } from './src/screens/SignInScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { NewBillScreen } from './src/screens/NewBillScreen';
import { BillDetailsScreen } from './src/screens/BillDetailsScreen';
import { CollectPaymentScreen } from './src/screens/CollectPaymentScreen';
import { ReceiptScreen } from './src/screens/ReceiptScreen';
import { TablesScreen } from './src/screens/TablesScreen';
import { KitchenOrdersScreen } from './src/screens/KitchenOrdersScreen';
import { InventoryScreen } from './src/screens/InventoryScreen';
import { SalesReportsScreen } from './src/screens/SalesReportsScreen';
import { MenuManagementScreen } from './src/screens/MenuManagementScreen';
import { SubscriptionScreen } from './src/screens/SubscriptionScreen';
import { PlanDetailsScreen } from './src/screens/PlanDetailsScreen';
import { CheckoutPaymentScreen } from './src/screens/CheckoutPaymentScreen';
import { PaymentProcessingScreen } from './src/screens/PaymentProcessingScreen';
import { PaymentVerificationScreen } from './src/screens/PaymentVerificationScreen';
import { PaymentFailedScreen } from './src/screens/PaymentFailedScreen';
import { PaymentSuccessfulScreen } from './src/screens/PaymentSuccessfulScreen';
import { SubscriptionExpiredScreen } from './src/screens/SubscriptionExpiredScreen';
import { MySubscriptionScreen } from './src/screens/MySubscriptionScreen';
import { UpgradeRenewalScreen } from './src/screens/UpgradeRenewalScreen';
import { SubscriptionHistoryScreen } from './src/screens/SubscriptionHistoryScreen';
import { ProfileSettingsScreen } from './src/screens/ProfileSettingsScreen';
import { OTPVerificationScreen } from './src/screens/OTPVerificationScreen';
import { StaffAttendanceScreen } from './src/screens/StaffAttendanceScreen';
import { BottomNavBar } from './src/components/BottomNavBar';
import { Ionicons } from '@expo/vector-icons';
import { api } from './src/services/api';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('splash');
  const [showDemoSelector, setShowDemoSelector] = useState(false);
  const [activeBillTotal, setActiveBillTotal] = useState(630.0);
  const [authIdentifier, setAuthIdentifier] = useState('');
  const [authDemoOtp, setAuthDemoOtp] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('plan_starter_3000');
  const [hasAuthToken, setHasAuthToken] = useState(false);

  React.useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await api.init();
        setHasAuthToken(!!token);
      } catch {
        setHasAuthToken(false);
      }
    };
    checkAuth();
  }, []);

  // Status bar styling
  const isDarkScreen = currentScreen === 'splash';

  // Screens that show bottom tab bar
  const showBottomNav =
    currentScreen === 'dashboard' ||
    currentScreen === 'kitchen' ||
    currentScreen === 'menu_management' ||
    currentScreen === 'subscription' ||
    currentScreen === 'my_subscription' ||
    currentScreen === 'tables' ||
    currentScreen === 'inventory' ||
    currentScreen === 'reports' ||
    currentScreen === 'staff_attendance' ||
    currentScreen === 'profile';

  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <StatusBar style={isDarkScreen ? 'light' : 'dark'} />

        {/* Active Screen View */}
        <View style={styles.screenContainer}>
          {currentScreen === 'splash' && (
            <SplashScreen
              onGetStarted={() => {
                if (hasAuthToken) {
                  setCurrentScreen('dashboard');
                } else {
                  setCurrentScreen('signin');
                }
              }}
            />
          )}

          {currentScreen === 'signin' && (
            <SignInScreen
              onProceedToOtp={(identifier, demoOtp) => {
                setAuthIdentifier(identifier);
                if (demoOtp) setAuthDemoOtp(demoOtp);
                setCurrentScreen('otp_verification');
              }}
              onBackToSplash={() => setCurrentScreen('splash')}
            />
          )}

          {currentScreen === 'otp_verification' && (
            <OTPVerificationScreen
              identifier={authIdentifier}
              demoOtp={authDemoOtp}
              onVerificationSuccess={() => {
                setHasAuthToken(true);
                setCurrentScreen('dashboard');
              }}
              onBackToSignIn={() => setCurrentScreen('signin')}
            />
          )}

          {currentScreen === 'dashboard' && (
            <DashboardScreen
              onStartBilling={() => setCurrentScreen('new_bill')}
              onNavigateTables={() => setCurrentScreen('tables')}
              onNavigateKitchen={() => setCurrentScreen('kitchen')}
              onNavigateReports={() => setCurrentScreen('reports')}
              onNavigateSubscription={() => setCurrentScreen('my_subscription')}
              onNavigateInventory={() => setCurrentScreen('inventory')}
              onNavigateStaffAttendance={() => setCurrentScreen('staff_attendance')}
            />
          )}

          {/* Staff & Attendance Management */}
          {currentScreen === 'staff_attendance' && (
            <StaffAttendanceScreen
              onBack={() => setCurrentScreen('dashboard')}
            />
          )}

          {/* Tables Management */}
          {currentScreen === 'tables' && (
            <TablesScreen
              onBack={() => setCurrentScreen('dashboard')}
              onOpenBill={() => setCurrentScreen('bill_details')}
            />
          )}

          {/* POS Billing Flow */}
          {currentScreen === 'new_bill' && (
            <NewBillScreen
              onBackToDashboard={() => setCurrentScreen('dashboard')}
              onOpenOrders={() => setCurrentScreen('kitchen')}
              onProceedToBillDetails={() => setCurrentScreen('bill_details')}
            />
          )}

          {currentScreen === 'bill_details' && (
            <BillDetailsScreen
              onBack={() => setCurrentScreen('new_bill')}
              onAddItems={() => setCurrentScreen('new_bill')}
              onProceedToPayment={(total) => {
                setActiveBillTotal(total);
                setCurrentScreen('collect_payment');
              }}
            />
          )}

          {currentScreen === 'collect_payment' && (
            <CollectPaymentScreen
              totalAmount={activeBillTotal}
              onBack={() => setCurrentScreen('bill_details')}
              onPaymentComplete={() => setCurrentScreen('receipt')}
            />
          )}

          {currentScreen === 'receipt' && (
            <ReceiptScreen
              onBack={() => setCurrentScreen('dashboard')}
              onNewBill={() => setCurrentScreen('new_bill')}
            />
          )}

          {/* Menu Management */}
          {currentScreen === 'menu_management' && (
            <MenuManagementScreen
              onBack={() => setCurrentScreen('dashboard')}
            />
          )}

          {/* Inventory & Stock */}
          {currentScreen === 'inventory' && (
            <InventoryScreen
              onBack={() => setCurrentScreen('dashboard')}
            />
          )}

          {/* Sales & Reports */}
          {currentScreen === 'reports' && (
            <SalesReportsScreen
              onBack={() => setCurrentScreen('dashboard')}
              onOpenReceipt={() => setCurrentScreen('receipt')}
            />
          )}

          {/* Kitchen Orders Queue */}
          {currentScreen === 'kitchen' && (
            <KitchenOrdersScreen
              onBack={() => setCurrentScreen('dashboard')}
            />
          )}

          {/* Active Subscription Management */}
          {currentScreen === 'my_subscription' && (
            <MySubscriptionScreen
              onBack={() => setCurrentScreen('dashboard')}
              onUpgradeOrRenew={() => setCurrentScreen('upgrade_renewal')}
              onViewHistory={() => setCurrentScreen('subscription_history')}
            />
          )}

          {currentScreen === 'upgrade_renewal' && (
            <UpgradeRenewalScreen
              onBack={() => setCurrentScreen('my_subscription')}
              onUpgradeConfirmed={() => setCurrentScreen('my_subscription')}
            />
          )}

          {currentScreen === 'subscription_history' && (
            <SubscriptionHistoryScreen
              onBack={() => setCurrentScreen('my_subscription')}
            />
          )}

          {/* Subscription Expired State */}
          {currentScreen === 'sub_expired' && (
            <SubscriptionExpiredScreen
              onBack={() => setCurrentScreen('my_subscription')}
              onRenew={() => setCurrentScreen('upgrade_renewal')}
              onViewPlans={() => setCurrentScreen('subscription')}
            />
          )}

          {/* Subscription Plans Selection Flow */}
          {currentScreen === 'subscription' && (
            <SubscriptionScreen
              onBack={() => setCurrentScreen('my_subscription')}
              onSelectPlan={(planId) => {
                setSelectedPlanId(planId);
                setCurrentScreen('plan_details');
              }}
            />
          )}

          {currentScreen === 'plan_details' && (
            <PlanDetailsScreen
              planId={selectedPlanId}
              onBack={() => setCurrentScreen('subscription')}
              onContinueToPayment={(planId) => {
                setSelectedPlanId(planId);
                setCurrentScreen('sub_checkout');
              }}
            />
          )}

          {currentScreen === 'sub_checkout' && (
            <CheckoutPaymentScreen
              planId={selectedPlanId}
              onBack={() => setCurrentScreen('plan_details')}
              onPaySuccess={() => setCurrentScreen('sub_processing')}
            />
          )}

          {/* Payment States: Processing -> Verification -> Success / Failed */}
          {currentScreen === 'sub_processing' && (
            <PaymentProcessingScreen
              onBack={() => setCurrentScreen('sub_checkout')}
              onAdvanceToVerification={() => setCurrentScreen('sub_verification')}
              onAdvanceToSuccess={() => setCurrentScreen('sub_success')}
            />
          )}

          {currentScreen === 'sub_verification' && (
            <PaymentVerificationScreen
              onBack={() => setCurrentScreen('sub_processing')}
              onCheckStatus={() => setCurrentScreen('sub_success')}
            />
          )}

          {currentScreen === 'sub_failed' && (
            <PaymentFailedScreen
              onBack={() => setCurrentScreen('sub_checkout')}
              onRetryPayment={() => setCurrentScreen('sub_checkout')}
              onCheckStatus={() => setCurrentScreen('sub_verification')}
            />
          )}

          {currentScreen === 'sub_success' && (
            <PaymentSuccessfulScreen
              onBack={() => setCurrentScreen('my_subscription')}
              onGoToDashboard={() => setCurrentScreen('dashboard')}
            />
          )}

          {/* Profile & Settings */}
          {currentScreen === 'profile' && (
            <ProfileSettingsScreen
              onBack={() => setCurrentScreen('dashboard')}
              onLogout={() => setCurrentScreen('signin')}
              onOpenSubscription={() => setCurrentScreen('my_subscription')}
              onOpenStaffAttendance={() => setCurrentScreen('staff_attendance')}
            />
          )}
        </View>

        {/* Bottom Navigation for in-app main views */}
        {showBottomNav && (
          <BottomNavBar
            currentScreen={currentScreen}
            onNavigate={(screen) => setCurrentScreen(screen)}
          />
        )}

        {/* Floating Quick Screen Switcher Badge for Developer / Demo Preview */}
        <View style={styles.demoSwitcherContainer}>
          {showDemoSelector ? (
            <View style={styles.demoMenu}>
              <View style={styles.demoHeader}>
                <Text style={styles.demoTitle}>Jump to Screen</Text>
                <TouchableOpacity onPress={() => setShowDemoSelector(false)}>
                  <Ionicons name="close-circle" size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>
              <View style={styles.demoButtonsRow}>
                {[
                  { id: 'splash' as ScreenType, label: 'Splash' },
                  { id: 'signin' as ScreenType, label: 'Sign In' },
                  { id: 'otp_verification' as ScreenType, label: '2-Step OTP' },
                  { id: 'dashboard' as ScreenType, label: 'Dashboard' },
                  { id: 'tables' as ScreenType, label: 'Tables' },
                  { id: 'new_bill' as ScreenType, label: 'POS Grid' },
                  { id: 'bill_details' as ScreenType, label: 'Bill Details' },
                  { id: 'collect_payment' as ScreenType, label: 'Collect Pay' },
                  { id: 'receipt' as ScreenType, label: 'Receipt' },
                  { id: 'kitchen' as ScreenType, label: 'Kitchen KOT' },
                  { id: 'inventory' as ScreenType, label: 'Inventory' },
                  { id: 'reports' as ScreenType, label: 'Sales Reports' },
                  { id: 'menu_management' as ScreenType, label: 'Menu Mgmt' },
                  { id: 'profile' as ScreenType, label: 'Profile' },
                  { id: 'staff_attendance' as ScreenType, label: 'Staff & Attendance' },
                  { id: 'my_subscription' as ScreenType, label: 'My Sub' },
                  { id: 'upgrade_renewal' as ScreenType, label: 'Upgrade' },
                  { id: 'sub_expired' as ScreenType, label: 'Sub Expired' },
                  { id: 'subscription_history' as ScreenType, label: 'Sub History' },
                  { id: 'subscription' as ScreenType, label: 'Plans List' },
                  { id: 'plan_details' as ScreenType, label: 'Plan Details' },
                  { id: 'sub_checkout' as ScreenType, label: 'Sub Checkout' },
                  { id: 'sub_processing' as ScreenType, label: 'Processing' },
                  { id: 'sub_verification' as ScreenType, label: 'Pending Verif' },
                  { id: 'sub_failed' as ScreenType, label: 'Failed Pay' },
                  { id: 'sub_success' as ScreenType, label: 'Sub Success' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.demoPill,
                      currentScreen === item.id && styles.demoPillActive,
                    ]}
                    onPress={() => {
                      setCurrentScreen(item.id);
                      setShowDemoSelector(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.demoPillText,
                        currentScreen === item.id && styles.demoPillTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.floatingTrigger}
              onPress={() => setShowDemoSelector(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="layers-outline" size={16} color="#FFFFFF" />
              <Text style={styles.floatingTriggerText}>Screens ({currentScreen})</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  screenContainer: {
    flex: 1,
  },
  demoSwitcherContainer: {
    position: 'absolute',
    top: 50,
    right: 16,
    zIndex: 9999,
  },
  floatingTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(11, 27, 41, 0.88)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  floatingTriggerText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  demoMenu: {
    backgroundColor: '#0B1B29',
    borderRadius: 18,
    padding: 14,
    width: 270,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  demoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  demoTitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  demoButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  demoPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  demoPillActive: {
    backgroundColor: Colors.primaryRed,
  },
  demoPillText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '600',
  },
  demoPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
