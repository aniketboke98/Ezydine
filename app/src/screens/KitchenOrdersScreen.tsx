import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { api } from '../services/api';

interface KOTOrder {
  id: string | number;
  dbId?: number;
  table: string;
  time: string;
  status: 'Pending' | 'Preparing' | 'Ready' | 'Served';
  items: string[];
}

interface KitchenOrdersScreenProps {
  onBack: () => void;
}

export const KitchenOrdersScreen: React.FC<KitchenOrdersScreenProps> = ({
  onBack,
}) => {
  const [filter, setFilter] = useState<'All' | 'Pending' | 'Preparing' | 'Ready'>('All');
  const [orders, setOrders] = useState<KOTOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchKot = async () => {
      try {
        const res = await api.kot.getAll();
        if (res.success && res.orders && res.orders.length > 0) {
          const mapped: KOTOrder[] = res.orders.map((o: any) => {
            const rawStatus = (o.status || 'pending').toLowerCase();
            const formattedStatus: 'Pending' | 'Preparing' | 'Ready' | 'Served' =
              rawStatus === 'preparing'
                ? 'Preparing'
                : rawStatus === 'ready'
                ? 'Ready'
                : rawStatus === 'served'
                ? 'Served'
                : 'Pending';

            let itemsList: string[] = [];
            if (Array.isArray(o.items)) {
              itemsList = o.items.map((i: any) => `${i.qty || i.quantity || 1} × ${i.name}`);
            } else if (typeof o.items === 'string') {
              try {
                const parsed = JSON.parse(o.items);
                itemsList = parsed.map((i: any) => `${i.qty || 1} × ${i.name}`);
              } catch {
                itemsList = [o.items];
              }
            }

            return {
              id: o.kotNumber || `#K${o.id}`,
              dbId: o.id,
              table: o.tableNumber || 'T1',
              time: `${o.createdAt || 'Just now'} · ${o.timeElapsed || 'few mins ago'}`,
              status: formattedStatus,
              items: itemsList.length > 0 ? itemsList : ['1 × Chef Special Item'],
            };
          });
          setOrders(mapped);
        } else {
          setOrders([
            {
              id: 'KOT #108',
              table: 'T1',
              time: '2:38 pm · 4m ago',
              status: 'Preparing',
              items: ['1 × Paneer Butter Masala', '2 × Butter Naan'],
            },
            {
              id: 'KOT #109',
              table: 'T5',
              time: '2:41 pm · 1m ago',
              status: 'Pending',
              items: ['1 × Chicken Biryani', '2 × Masala Chai'],
            },
          ]);
        }
      } catch (err) {
        setOrders([
          {
            id: 'KOT #108',
            table: 'T1',
            time: '2:38 pm · 4m ago',
            status: 'Preparing',
            items: ['1 × Paneer Butter Masala', '2 × Butter Naan'],
          },
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchKot();
  }, []);

  const advanceStatus = async (id: string | number) => {
    const order = orders.find((o) => o.id === id);
    if (!order) return;

    const next =
      order.status === 'Pending'
        ? 'Preparing'
        : order.status === 'Preparing'
        ? 'Ready'
        : 'Served';

    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: next } : o))
    );

    if (order.dbId) {
      try {
        await api.kot.updateStatus(order.dbId, next.toLowerCase());
      } catch (e) {
        // silent sync
      }
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (filter === 'All') return o.status !== 'Served';
    return o.status === filter;
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
            <View style={styles.headerLeft}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={onBack}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={20} color={Colors.navy} />
              </TouchableOpacity>
              <View>
                <Text style={styles.title}>Kitchen orders</Text>
                <Text style={styles.subtitle}>
                  Live KOT queue · {filteredOrders.length} active tickets
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.printerBtn}
              onPress={() => Alert.alert('Printer Queue', 'Kitchen thermal printer connected (Bluetooth).')}
              activeOpacity={0.7}
            >
              <Ionicons name="print-outline" size={20} color={Colors.navy} />
            </TouchableOpacity>
          </View>

          {/* Filter Pills */}
          <View style={styles.filterRow}>
            {[
              { id: 'All', label: 'All · 3' },
              { id: 'Pending', label: 'Pending · 1' },
              { id: 'Preparing', label: 'Preparing · 1' },
              { id: 'Ready', label: 'Ready · 1' },
            ].map((tab) => {
              const isActive = filter === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[
                    styles.filterPill,
                    isActive && styles.filterPillActive,
                  ]}
                  onPress={() => setFilter(tab.id as any)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      isActive && styles.filterPillTextActive,
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Orders List */}
          <View style={styles.ordersList}>
            {filteredOrders.map((ord) => (
              <View key={ord.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardIdTable}>
                    {ord.id} · {ord.table}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      ord.status === 'Pending'
                        ? styles.statusBadgePending
                        : ord.status === 'Preparing'
                        ? styles.statusBadgePreparing
                        : styles.statusBadgeReady,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        ord.status === 'Pending'
                          ? styles.statusTextPending
                          : ord.status === 'Preparing'
                          ? styles.statusTextPreparing
                          : styles.statusTextReady,
                      ]}
                    >
                      {ord.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.timeRow}>
                  <Ionicons
                    name="time-outline"
                    size={14}
                    color={Colors.secondaryText}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.timeText}>{ord.time}</Text>
                </View>

                {/* Items */}
                <View style={styles.itemsBlock}>
                  {ord.items.map((it, idx) => (
                    <Text key={idx} style={styles.itemText}>
                      {it}
                    </Text>
                  ))}
                </View>

                {/* Card Actions */}
                <View style={styles.cardActionsRow}>
                  {ord.status === 'Pending' && (
                    <TouchableOpacity
                      style={styles.actionBtnPrimary}
                      onPress={() => advanceStatus(ord.id)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.actionBtnPrimaryText}>
                        Start preparing
                      </Text>
                    </TouchableOpacity>
                  )}

                  {ord.status === 'Preparing' && (
                    <TouchableOpacity
                      style={styles.actionBtnPrimary}
                      onPress={() => advanceStatus(ord.id)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.actionBtnPrimaryText}>
                        Mark ready
                      </Text>
                    </TouchableOpacity>
                  )}

                  {ord.status === 'Ready' && (
                    <TouchableOpacity
                      style={styles.actionBtnSecondary}
                      onPress={() => advanceStatus(ord.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.actionBtnSecondaryText}>
                        Mark served
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.ticketPrintBtn}
                    onPress={() =>
                      Alert.alert('Printing KOT', `Reprinting KOT Ticket ${ord.id}`)
                    }
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="print-outline"
                      size={18}
                      color={Colors.navy}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>

          {/* Connected Bluetooth status */}
          <View style={styles.bluetoothStatusRow}>
            <Ionicons
              name="bluetooth"
              size={15}
              color={Colors.successGreen}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.bluetoothStatusText}>
              Kitchen printer connected · Tap printer for KOT
            </Text>
          </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
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
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.navy,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  printerBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterPill: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  filterPillActive: {
    backgroundColor: Colors.primaryRed,
    borderColor: Colors.primaryRed,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.navy,
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  ordersList: {
    gap: 14,
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 18,
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
    marginBottom: 6,
  },
  cardIdTable: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.navy,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgePending: {
    backgroundColor: '#FFE4E6',
  },
  statusBadgePreparing: {
    backgroundColor: '#FEF3C7',
  },
  statusBadgeReady: {
    backgroundColor: '#DCFCE7',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusTextPending: {
    color: '#B91C1C',
  },
  statusTextPreparing: {
    color: '#B45309',
  },
  statusTextReady: {
    color: Colors.successGreen,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeText: {
    fontSize: 12,
    color: Colors.secondaryText,
  },
  itemsBlock: {
    gap: 4,
    marginBottom: 16,
  },
  itemText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.navy,
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  actionBtnPrimary: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: Colors.primaryRed,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  actionBtnSecondary: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnSecondaryText: {
    color: Colors.navy,
    fontSize: 14,
    fontWeight: '600',
  },
  ticketPrintBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bluetoothStatusRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  bluetoothStatusText: {
    fontSize: 12,
    color: Colors.secondaryText,
  },
});
