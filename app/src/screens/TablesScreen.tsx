import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
    Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { api } from '../services/api';

interface TableItem {
  id: string;
  name: string;
  status: 'Available' | 'Occupied' | 'Reserved';
  seats: number;
  activeAmount: number;
  activeTime?: string;
  meta: string;
}

interface TablesScreenProps {
  onBack: () => void;
  onOpenBill: (tableId: string) => void;
}

export const TablesScreen: React.FC<TablesScreenProps> = ({
  onBack,
  onOpenBill,
}) => {
  const [filter, setFilter] = useState<'All' | 'Available' | 'Occupied'>('All');
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [tables, setTables] = useState<TableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTables = async () => {
    try {
      const res = await api.tables.getAll();
      if (res.success && res.tables) {
        const mapped: TableItem[] = res.tables.map((t: any) => {
          const rawStatus = (t.status || 'available').toLowerCase();
          const formattedStatus: 'Available' | 'Occupied' | 'Reserved' =
            rawStatus === 'occupied' ? 'Occupied' : rawStatus === 'reserved' ? 'Reserved' : 'Available';

          const activeAmount = parseFloat(t.activeAmount || 0);

          let meta = `${t.seats || 4} seats · Ready for guests`;
          if (formattedStatus === 'Occupied') {
            meta = `${t.seats || 4} seats · Active ₹${activeAmount.toFixed(0)}`;
          } else if (formattedStatus === 'Reserved') {
            meta = `${t.seats || 4} seats · Reserved`;
          }

          const tableId = t.tableNumber || `T${t.id}`;
          return {
            id: tableId,
            name: tableId,
            status: formattedStatus,
            seats: t.seats || 4,
            activeAmount,
            activeTime: t.activeTime,
            meta,
          };
        });

        setTables(mapped);
        if (mapped.length > 0 && !selectedTableId) {
          setSelectedTableId(mapped[0].id);
        }
      }
    } catch (err) {
      console.warn('Error fetching tables:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTables();
  };

  const availableCount = tables.filter((t) => t.status === 'Available').length;
  const occupiedCount = tables.filter((t) => t.status === 'Occupied').length;
  const reservedCount = tables.filter((t) => t.status === 'Reserved').length;

  const filteredTables = tables.filter((t) => {
    if (filter === 'All') return true;
    return t.status === filter;
  });

  const selectedTable = tables.find((t) => t.id === selectedTableId) || tables[0];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primaryRed} />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
                <Ionicons name="arrow-back" size={20} color={Colors.navy} />
              </TouchableOpacity>
              <View>
                <Text style={styles.title}>Tables Floor Plan</Text>
                <Text style={styles.subtitle}>
                  {occupiedCount} Occupied · {availableCount} Free
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.addBtn}
              onPress={() =>
                Alert.alert(
                  'Add Table',
                  'To add more tables, please configure them in Restaurant Profile Settings or Manager Web Portal.'
                )
              }
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={22} color={Colors.navy} />
            </TouchableOpacity>
          </View>

          {/* Dynamic Status Metric Counters (Strictly Real Counts) */}
          <View style={styles.counterRow}>
            {/* Free / Available */}
            <TouchableOpacity
              style={[
                styles.counterCard,
                styles.counterCardAvailable,
                filter === 'Available' && styles.counterActiveHighlight,
              ]}
              onPress={() => setFilter(filter === 'Available' ? 'All' : 'Available')}
              activeOpacity={0.8}
            >
              <Text style={[styles.counterNumber, { color: Colors.successGreen }]}>
                {availableCount}
              </Text>
              <Text style={[styles.counterLabel, { color: Colors.successGreen }]}>
                Free Tables
              </Text>
            </TouchableOpacity>

            {/* Occupied */}
            <TouchableOpacity
              style={[
                styles.counterCard,
                styles.counterCardOccupied,
                filter === 'Occupied' && styles.counterActiveHighlight,
              ]}
              onPress={() => setFilter(filter === 'Occupied' ? 'All' : 'Occupied')}
              activeOpacity={0.8}
            >
              <Text style={[styles.counterNumber, { color: '#DC2626' }]}>
                {occupiedCount}
              </Text>
              <Text style={[styles.counterLabel, { color: '#DC2626' }]}>
                Occupied
              </Text>
            </TouchableOpacity>

            {/* Total */}
            <TouchableOpacity
              style={[styles.counterCard, styles.counterCardTotal]}
              onPress={() => setFilter('All')}
              activeOpacity={0.8}
            >
              <Text style={[styles.counterNumber, { color: Colors.navy }]}>
                {tables.length}
              </Text>
              <Text style={[styles.counterLabel, { color: Colors.secondaryText }]}>
                Total Tables
              </Text>
            </TouchableOpacity>
          </View>

          {/* Filter Pills */}
          <View style={styles.filterPillsRow}>
            {(['All', 'Available', 'Occupied'] as const).map((tab) => {
              const isActive = filter === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.filterPill, isActive && styles.filterPillActive]}
                  onPress={() => setFilter(tab)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                    {tab === 'All' ? `All (${tables.length})` : tab === 'Available' ? `Free (${availableCount})` : `Occupied (${occupiedCount})`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={Colors.primaryRed} />
              <Text style={styles.loadingText}>Fetching floor tables...</Text>
            </View>
          ) : filteredTables.length === 0 ? (
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons name="table-chair" size={40} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No tables in this status</Text>
              <Text style={styles.emptySub}>
                Switch filters above to view other occupied or available tables.
              </Text>
            </View>
          ) : (
            /* Tables 2-Column Grid */
            <View style={styles.tableGrid}>
              {filteredTables.map((t) => {
                const isSelected = selectedTableId === t.id;
                const isOccupied = t.status === 'Occupied';

                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      styles.tableCard,
                      isSelected && styles.tableCardSelected,
                      isOccupied ? styles.tableCardOccupiedBorder : styles.tableCardFreeBorder,
                    ]}
                    onPress={() => setSelectedTableId(t.id)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.tableCardHeader}>
                      <Text style={styles.tableName}>Table {t.name}</Text>
                      <MaterialCommunityIcons
                        name="table-chair"
                        size={20}
                        color={isOccupied ? '#DC2626' : Colors.navy}
                      />
                    </View>

                    {/* Status Badge */}
                    <View
                      style={[
                        styles.tableBadge,
                        isOccupied ? styles.tableBadgeOccupied : styles.tableBadgeAvailable,
                      ]}
                    >
                      <View
                        style={[
                          styles.tableBadgeDot,
                          { backgroundColor: isOccupied ? '#DC2626' : Colors.successGreen },
                        ]}
                      />
                      <Text
                        style={[
                          styles.tableBadgeText,
                          isOccupied ? styles.tableBadgeTextOccupied : styles.tableBadgeTextAvailable,
                        ]}
                      >
                        {isOccupied ? 'OCCUPIED' : 'FREE'}
                      </Text>
                    </View>

                    <Text style={styles.tableMeta}>{t.meta}</Text>

                    {isOccupied && t.activeAmount > 0 && (
                      <Text style={styles.tableAmountText}>Running: ₹{t.activeAmount.toFixed(0)}</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* Selected Table Floating Bottom Action Bar */}
        {selectedTable && (
          <View style={styles.bottomBarContainer}>
            <View style={styles.selectedBanner}>
              <View>
                <Text style={styles.selectedTitle}>Table {selectedTable.name} selected</Text>
                <Text style={styles.selectedSub}>
                  {selectedTable.status === 'Occupied'
                    ? `Occupied · Active ₹${selectedTable.activeAmount.toFixed(0)}`
                    : `Free · Capacity: ${selectedTable.seats} Seats`}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.openBillBtn,
                  selectedTable.status === 'Available' && styles.startBillBtnBg,
                ]}
                onPress={() => onOpenBill(selectedTable.name)}
                activeOpacity={0.85}
              >
                <Text style={styles.openBillText}>
                  {selectedTable.status === 'Occupied' ? 'View Bill' : 'Start Billing'}
                </Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            </View>
          </View>
        )}
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 90,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.navy,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  counterCard: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  counterActiveHighlight: {
    borderColor: Colors.navy,
    borderWidth: 1.5,
  },
  counterCardAvailable: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  counterCardOccupied: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  counterCardTotal: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  counterNumber: {
    fontSize: 22,
    fontWeight: '800',
  },
  counterLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterPillActive: {
    backgroundColor: Colors.navy,
    borderColor: Colors.navy,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.secondaryText,
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: Colors.secondaryText,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.navy,
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: Colors.secondaryText,
    textAlign: 'center',
    marginTop: 4,
  },
  tableGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tableCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
  },
  tableCardSelected: {
    borderColor: Colors.navy,
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
  },
  tableCardOccupiedBorder: {
    borderColor: '#FECACA',
    backgroundColor: '#FFFBFB',
  },
  tableCardFreeBorder: {
    borderColor: '#E2E8F0',
  },
  tableCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tableName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.navy,
  },
  tableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
    gap: 4,
  },
  tableBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tableBadgeAvailable: {
    backgroundColor: '#ECFDF5',
  },
  tableBadgeOccupied: {
    backgroundColor: '#FEF2F2',
  },
  tableBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  tableBadgeTextAvailable: {
    color: Colors.successGreen,
  },
  tableBadgeTextOccupied: {
    color: '#DC2626',
  },
  tableMeta: {
    fontSize: 11,
    color: Colors.secondaryText,
  },
  tableAmountText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#DC2626',
    marginTop: 6,
  },
  bottomBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 10,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  selectedBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.navy,
  },
  selectedSub: {
    fontSize: 11,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  openBillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.navy,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  startBillBtnBg: {
    backgroundColor: Colors.primaryRed,
  },
  openBillText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
