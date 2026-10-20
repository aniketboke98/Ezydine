import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
    Dimensions,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { EzyDineLogo } from '../components/EzyDineLogo';
import { api } from '../services/api';

const { width } = Dimensions.get('window');

interface DashboardScreenProps {
  onStartBilling: (tableNumber?: string) => void;
  onNavigateTables: () => void;
  onNavigateKitchen: () => void;
  onNavigateReports: () => void;
  onNavigateSubscription: () => void;
  onNavigateInventory?: () => void;
  onNavigateStaffAttendance: () => void;
}

interface TableSummary {
  id: number;
  tableNumber: string;
  status: string;
  seats: number;
  activeAmount: number;
  activeTime?: string;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onStartBilling,
  onNavigateTables,
  onNavigateKitchen,
  onNavigateReports,
  onNavigateSubscription,
  onNavigateInventory,
  onNavigateStaffAttendance,
}) => {
  const [salesTimeframe, setSalesTimeframe] = useState<'1day' | '7days' | '30days'>('1day');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isOwner, setIsOwner] = useState(true);

  const hasPerm = (required: string | string[]) => {
    if (isOwner) return true;
    if (Array.isArray(required)) {
      return required.some((r) => permissions.includes(r));
    }
    return permissions.includes(required);
  };

  // Real Database Metrics (Initialized strictly to 0, NO fake data)
  const [stats, setStats] = useState({
    todaySales: 0,
    todayOrders: 0,
    sevenDaysSales: 0,
    sevenDaysOrders: 0,
    thirtyDaysSales: 0,
    thirtyDaysOrders: 0,
    salesGrowth: '0%',
    activeTablesCount: 0,
    availableTablesCount: 0,
    totalTablesCount: 0,
    billsCount: 0,
    lowStockCount: 0,
    salesSummary: [] as { day: string; dateNumber?: number; amount: number; isHighlight?: boolean }[],
  });

  const [restaurantProfile, setRestaurantProfile] = useState({
    name: 'Restaurant',
    location: '',
  });

  const [tablesList, setTablesList] = useState<TableSummary[]>([]);
  const [recentBills, setRecentBills] = useState<any[]>([]);

  const loadAllData = async () => {
    try {
      // 0. Permissions & user role
      const user = await api.getUser().catch(() => null);
      const perms = await api.getPermissions().catch(() => []);
      const ownerCheck = !user || !user.role || user.role.toLowerCase() === 'owner';
      setIsOwner(ownerCheck);
      setPermissions(perms || []);

      // Instant cached restaurant info
      const cached = await api.getRestaurant().catch(() => null);
      if (cached && (cached.name || cached.restaurant_name)) {
        setRestaurantProfile({
          name: cached.name || cached.restaurant_name,
          location: cached.location || cached.address || 'India',
        });
      }

      // 1. Dashboard real stats
      const dashRes = await api.reports.getDashboard().catch(() => null);
      if (dashRes && dashRes.success && dashRes.stats) {
        setStats(dashRes.stats);
      }

      // 2. Restaurant Profile (fresh from server)
      const profRes = await api.restaurant.getProfile().catch(() => null);
      const activeProf = profRes?.profile || profRes?.restaurant;
      if (activeProf && (activeProf.name || activeProf.restaurant_name)) {
        setRestaurantProfile({
          name: activeProf.name || activeProf.restaurant_name,
          location: activeProf.location || activeProf.address || 'India',
        });
      }

      // 3. Live Tables (Occupied vs Free)
      const tablesRes = await api.tables.getAll().catch(() => null);
      if (tablesRes && tablesRes.success && tablesRes.tables) {
        const mapped: TableSummary[] = tablesRes.tables.map((t: any) => ({
          id: t.id,
          tableNumber: t.tableNumber || `T${t.id}`,
          status: (t.status || 'available').toLowerCase(),
          seats: t.seats || 4,
          activeAmount: parseFloat(t.activeAmount || 0),
          activeTime: t.activeTime,
        }));
        setTablesList(mapped);
      }

      // 4. Real Recent Bills
      const billsRes = await api.bills.getAll().catch(() => null);
      if (billsRes && billsRes.success && billsRes.bills) {
        setRecentBills(billsRes.bills.slice(0, 5));
      }
    } catch (err) {
      console.warn('Dashboard data fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // Initial quick load from local storage
    api.getRestaurant().then((cached) => {
      if (cached && (cached.name || cached.restaurant_name)) {
        setRestaurantProfile({
          name: cached.name || cached.restaurant_name,
          location: cached.location || cached.address || 'India',
        });
      }
    }).catch(() => null);

    loadAllData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadAllData();
  };

  // Determine current active sales & orders based on selected timeframe
  let displayedSales = stats.todaySales;
  let displayedOrders = stats.todayOrders;
  let timeframeLabel = "Today's Sale";

  if (salesTimeframe === '7days') {
    displayedSales = stats.sevenDaysSales;
    displayedOrders = stats.sevenDaysOrders;
    timeframeLabel = 'Last 7 Days Sale';
  } else if (salesTimeframe === '30days') {
    displayedSales = stats.thirtyDaysSales;
    displayedOrders = stats.thirtyDaysOrders;
    timeframeLabel = 'Last 30 Days Sale';
  }

  const occupiedTables = tablesList.filter((t) => t.status === 'occupied');
  const freeTables = tablesList.filter((t) => t.status !== 'occupied');

  const maxChartAmount = Math.max(
    ...stats.salesSummary.map((d) => d.amount),
    1
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primaryRed} />}
      >
        {/* Header with Official Logo */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={{ marginBottom: 6 }}>
              <EzyDineLogo width={120} />
            </View>
            <Text style={styles.restaurantName}>{restaurantProfile.name}</Text>
            <Text style={styles.restaurantSub}>
              {restaurantProfile.location} •{' '}
              {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.notificationBtn}
            onPress={onNavigateSubscription}
            activeOpacity={0.8}
          >
            <Ionicons name="sparkles-outline" size={20} color={Colors.primaryRed} />
            <View style={styles.proPill}>
              <Text style={styles.proPillText}>PRO</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ======================================================== */}
        {/* REAL SALES & ORDERS ANALYTICS (1 Day, 7 Days, 30 Days)   */}
        {/* ======================================================== */}
        {hasPerm('VIEW_REPORTS') && (
          <View style={styles.salesHeroCard}>
            {/* Timeframe Switcher Tabs */}
            <View style={styles.timeframeRow}>
              <TouchableOpacity
                style={[styles.timeframeTab, salesTimeframe === '1day' && styles.timeframeTabActive]}
                onPress={() => setSalesTimeframe('1day')}
                activeOpacity={0.8}
              >
                <Text style={[styles.timeframeTabText, salesTimeframe === '1day' && styles.timeframeTabTextActive]}>
                  Today (1 Day)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.timeframeTab, salesTimeframe === '7days' && styles.timeframeTabActive]}
                onPress={() => setSalesTimeframe('7days')}
                activeOpacity={0.8}
              >
                <Text style={[styles.timeframeTabText, salesTimeframe === '7days' && styles.timeframeTabTextActive]}>
                  Last 7 Days
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.timeframeTab, salesTimeframe === '30days' && styles.timeframeTabActive]}
                onPress={() => setSalesTimeframe('30days')}
                activeOpacity={0.8}
              >
                <Text style={[styles.timeframeTabText, salesTimeframe === '30days' && styles.timeframeTabTextActive]}>
                  Last 30 Days
                </Text>
              </TouchableOpacity>
            </View>

            {/* Sales & Orders Metric Values */}
            <View style={styles.salesMetricsRow}>
              <View style={styles.metricBlock}>
                <Text style={styles.metricLabel}>{timeframeLabel}</Text>
                <Text style={styles.metricBigValue}>
                  ₹{displayedSales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
                {salesTimeframe === '1day' && (
                  <View style={styles.growthBadge}>
                    <Ionicons name="trending-up" size={13} color={Colors.successGreen} />
                    <Text style={styles.growthText}>{stats.salesGrowth} vs yesterday</Text>
                  </View>
                )}
              </View>

              <View style={styles.metricDivider} />

              <View style={styles.metricBlock}>
                <Text style={styles.metricLabel}>Total Orders</Text>
                <Text style={styles.metricBigValue}>{displayedOrders}</Text>
                <Text style={styles.ordersSubText}>
                  {displayedOrders > 0
                    ? `Avg. ₹${(displayedSales / displayedOrders).toFixed(0)} / order`
                    : '0 orders recorded'}
                </Text>
              </View>
            </View>

            {/* Real Bar Chart for Daily Sales */}
            {stats.salesSummary.length > 0 && (
              <View style={styles.chartContainer}>
                <View style={styles.chartTitleRow}>
                  <Text style={styles.chartTitle}>Daily Sales Trend</Text>
                  <Text style={styles.chartSub}>Real Database Sums</Text>
                </View>

                <View style={styles.barsRow}>
                  {stats.salesSummary.map((item, idx) => {
                    const ratio = maxChartAmount > 0 ? item.amount / maxChartAmount : 0;
                    const barHeight = Math.max(8, ratio * 58);
                    return (
                      <View key={idx} style={styles.barItem}>
                        <View style={styles.barTrack}>
                          <View
                            style={[
                              styles.barFill,
                              {
                                height: barHeight,
                                backgroundColor: item.isHighlight ? Colors.primaryRed : '#CBD5E1',
                              },
                            ]}
                          />
                        </View>
                        <Text style={[styles.barDayText, item.isHighlight && styles.barDayHighlight]}>
                          {item.day.split(' ')[0]}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Primary Start Quick Billing Button */}
        {hasPerm('CREATE_BILL') && (
          <TouchableOpacity
            style={styles.startBillingBtn}
            onPress={() => onStartBilling()}
            activeOpacity={0.85}
          >
            <Ionicons name="receipt" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.startBillingText}>Start Quick Billing</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        )}

        {/* ======================================================== */}
        {/* QUICK ACTIONS ROW: Tables, Staff & Attendance, Reports    */}
        {/* ======================================================== */}
        <View style={styles.quickActionsGrid}>
          {/* Tables */}
          {hasPerm('VIEW_TABLES') && (
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={onNavigateTables}
              activeOpacity={0.8}
            >
              <View style={[styles.quickActionIconWrap, { backgroundColor: '#EFF6FF' }]}>
                <MaterialCommunityIcons name="table-furniture" size={22} color="#2563EB" />
              </View>
              <Text style={styles.quickActionTitle}>Tables</Text>
              <Text style={styles.quickActionSub}>
                {stats.activeTablesCount} Occupied · {stats.availableTablesCount || freeTables.length} Free
              </Text>
            </TouchableOpacity>
          )}

          {/* Staff & Attendance */}
          {hasPerm('VIEW_STAFF') && (
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={onNavigateStaffAttendance}
              activeOpacity={0.8}
            >
              <View style={[styles.quickActionIconWrap, { backgroundColor: '#FEF2F2' }]}>
                <Ionicons name="people" size={22} color={Colors.primaryRed} />
              </View>
              <Text style={styles.quickActionTitle}>Staff & Attendance</Text>
              <Text style={styles.quickActionSub}>Manage Staff & Check-ins</Text>
            </TouchableOpacity>
          )}

          {/* Kitchen Orders */}
          {hasPerm('VIEW_KOT') && (
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={onNavigateKitchen}
              activeOpacity={0.8}
            >
              <View style={[styles.quickActionIconWrap, { backgroundColor: '#FFFBEB' }]}>
                <MaterialCommunityIcons name="chef-hat" size={22} color="#D97706" />
              </View>
              <Text style={styles.quickActionTitle}>Kitchen KOT</Text>
              <Text style={styles.quickActionSub}>Live Orders Queue</Text>
            </TouchableOpacity>
          )}

          {/* Reports */}
          {hasPerm('VIEW_REPORTS') && (
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={onNavigateReports}
              activeOpacity={0.8}
            >
              <View style={[styles.quickActionIconWrap, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="bar-chart" size={22} color={Colors.successGreen} />
              </View>
              <Text style={styles.quickActionTitle}>Reports</Text>
              <Text style={styles.quickActionSub}>1d · 7d · 30d Analytics</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ======================================================== */}
        {/* TABLE OPTION: WHICH IS OCCUPIED & WHICH IS FREE          */}
        {/* ======================================================== */}
        {hasPerm('VIEW_TABLES') && (
          <View style={styles.tablesSectionCard}>
            <View style={styles.tablesSectionHeader}>
              <View>
                <Text style={styles.tablesSectionTitle}>Live Tables Status</Text>
                <Text style={styles.tablesSectionSub}>
                  {occupiedTables.length} Occupied · {freeTables.length} Free & Available
                </Text>
              </View>

              <TouchableOpacity onPress={onNavigateTables} activeOpacity={0.7}>
                <Text style={styles.viewAllTablesText}>View All Floor</Text>
              </TouchableOpacity>
            </View>

            {/* Summary Indicator Counters */}
            <View style={styles.tableStatusPillsRow}>
              <View style={[styles.tablePillBadge, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                <View style={[styles.pillDot, { backgroundColor: '#DC2626' }]} />
                <Text style={[styles.pillText, { color: '#DC2626' }]}>
                  {occupiedTables.length} Occupied
                </Text>
              </View>

              <View style={[styles.tablePillBadge, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                <View style={[styles.pillDot, { backgroundColor: Colors.successGreen }]} />
                <Text style={[styles.pillText, { color: Colors.successGreen }]}>
                  {freeTables.length} Free (Ready)
                </Text>
              </View>
            </View>

            {/* Live Horizontal Scrollable Table Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tableChipsScroll}>
              {tablesList.map((t) => {
                const isOccupied = t.status === 'occupied';
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      styles.tableChip,
                      isOccupied ? styles.tableChipOccupied : styles.tableChipFree,
                    ]}
                    onPress={() => {
                      if (isOccupied) {
                        onNavigateTables();
                      } else {
                        onStartBilling(t.tableNumber);
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.tableChipHeader}>
                      <Text style={[styles.tableChipNumber, isOccupied && { color: '#DC2626' }]}>
                        {t.tableNumber}
                      </Text>
                      <View
                        style={[
                          styles.chipStatusDot,
                          { backgroundColor: isOccupied ? '#DC2626' : Colors.successGreen },
                        ]}
                      />
                    </View>

                    <Text style={styles.tableChipStatus}>
                      {isOccupied ? 'Occupied' : 'Free'}
                    </Text>

                    {isOccupied ? (
                      <Text style={styles.tableChipAmount}>₹{t.activeAmount.toFixed(0)}</Text>
                    ) : (
                      <Text style={styles.tableChipAction}>+ Tap to Bill</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* ======================================================== */}
        {/* RECENT SETTLED BILLS (Real from PostgreSQL)              */}
        {/* ======================================================== */}
        {hasPerm('VIEW_BILLS') && (
          <View style={styles.recentSection}>
            <View style={styles.recentHeader}>
              <Text style={styles.recentTitle}>Recent Bills</Text>
              <TouchableOpacity onPress={onNavigateReports} activeOpacity={0.7}>
                <Text style={styles.viewAllText}>View All ({stats.billsCount})</Text>
              </TouchableOpacity>
            </View>

            {recentBills.length === 0 ? (
              <View style={styles.emptyBillsCard}>
                <Ionicons name="receipt-outline" size={32} color="#94A3B8" />
                <Text style={styles.emptyBillsTitle}>No Bills Generated Today</Text>
                <Text style={styles.emptyBillsSub}>
                  Start quick billing on any free table to create real bills.
                </Text>
              </View>
            ) : (
              <View style={styles.billsListCard}>
                {recentBills.map((b, idx) => (
                  <View
                    key={b.id || idx}
                    style={[
                      styles.billRow,
                      idx < recentBills.length - 1 && styles.billRowBorder,
                    ]}
                  >
                    <View style={styles.billRowLeft}>
                      <Text style={styles.billNumberText}>
                        {b.billNumber} · Table {b.tableOrType}
                      </Text>
                      <Text style={styles.billMetaText}>
                        {b.paymentMethod || 'Cash'} · {b.time || 'Today'}
                      </Text>
                    </View>

                    <View style={styles.billRowRight}>
                      <Text style={styles.billAmountText}>₹{parseFloat(b.amount || 0).toFixed(2)}</Text>
                      <View
                        style={[
                          styles.paymentStatusBadge,
                          b.paymentStatus === 'paid' ? styles.paidBadge : styles.unpaidBadge,
                        ]}
                      >
                        <Text
                          style={[
                            styles.paymentStatusText,
                            b.paymentStatus === 'paid' ? styles.paidText : styles.unpaidText,
                          ]}
                        >
                          {b.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.navy,
    letterSpacing: -0.3,
  },
  restaurantSub: {
    fontSize: 12,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  notificationBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  proPill: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  proPillText: {
    color: Colors.primaryRed,
    fontSize: 10,
    fontWeight: '800',
  },
  salesHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  timeframeRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
    marginBottom: 14,
  },
  timeframeTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 8,
  },
  timeframeTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  timeframeTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.secondaryText,
  },
  timeframeTabTextActive: {
    color: Colors.navy,
    fontWeight: '800',
  },
  salesMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  metricBlock: {
    flex: 1,
  },
  metricDivider: {
    width: 1,
    height: 48,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 12,
  },
  metricLabel: {
    fontSize: 12,
    color: Colors.secondaryText,
    fontWeight: '600',
    marginBottom: 4,
  },
  metricBigValue: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.navy,
    letterSpacing: -0.5,
  },
  growthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  growthText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.successGreen,
  },
  ordersSubText: {
    fontSize: 11,
    color: Colors.secondaryText,
    marginTop: 4,
  },
  chartContainer: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  chartTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  chartTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.navy,
  },
  chartSub: {
    fontSize: 11,
    color: Colors.secondaryText,
  },
  barsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 72,
    paddingTop: 6,
  },
  barItem: {
    flex: 1,
    alignItems: 'center',
  },
  barTrack: {
    width: 14,
    height: 56,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  barFill: {
    width: 12,
    borderRadius: 6,
  },
  barDayText: {
    fontSize: 10,
    color: Colors.secondaryText,
    marginTop: 4,
  },
  barDayHighlight: {
    fontWeight: '800',
    color: Colors.primaryRed,
  },
  startBillingBtn: {
    backgroundColor: Colors.primaryRed,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: Colors.primaryRed,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  startBillingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  quickActionCard: {
    width: (width - 42) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickActionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.navy,
  },
  quickActionSub: {
    fontSize: 11,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  tablesSectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  tablesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tablesSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.navy,
  },
  tablesSectionSub: {
    fontSize: 11,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  viewAllTablesText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryRed,
  },
  tableStatusPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tablePillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  pillDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tableChipsScroll: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  tableChip: {
    width: 90,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    marginRight: 8,
  },
  tableChipOccupied: {
    backgroundColor: '#FEF2F2',
    borderColor: '#F87171',
  },
  tableChipFree: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  tableChipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  tableChipNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.navy,
  },
  chipStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  tableChipStatus: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.secondaryText,
  },
  tableChipAmount: {
    fontSize: 12,
    fontWeight: '800',
    color: '#DC2626',
    marginTop: 4,
  },
  tableChipAction: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.successGreen,
    marginTop: 4,
  },
  recentSection: {
    marginTop: 4,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  recentTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.navy,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryRed,
  },
  emptyBillsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyBillsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.navy,
    marginTop: 8,
  },
  emptyBillsSub: {
    fontSize: 12,
    color: Colors.secondaryText,
    textAlign: 'center',
    marginTop: 4,
  },
  billsListCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  billRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  billRowLeft: {
    flex: 1,
  },
  billNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.navy,
  },
  billMetaText: {
    fontSize: 12,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  billRowRight: {
    alignItems: 'flex-end',
  },
  billAmountText: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.navy,
  },
  paymentStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 3,
  },
  paidBadge: {
    backgroundColor: '#ECFDF5',
  },
  unpaidBadge: {
    backgroundColor: '#FEF2F2',
  },
  paymentStatusText: {
    fontSize: 9,
    fontWeight: '800',
  },
  paidText: {
    color: Colors.successGreen,
  },
  unpaidText: {
    color: '#DC2626',
  },
});
