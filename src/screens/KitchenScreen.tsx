import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
    ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { api } from '../services/api';

interface KitchenScreenProps {
  onBack: () => void;
}

interface KOTTicket {
  id: string;
  table: string;
  time: string;
  status: 'Preparing' | 'Ready' | 'Served';
  items: { name: string; qty: number; note?: string }[];
}

export const KitchenScreen: React.FC<KitchenScreenProps> = ({ onBack }) => {
  const [tickets, setTickets] = useState<KOTTicket[]>([]);

  useEffect(() => {
    api.kot.getAll().then((res) => {
      if (res.success && Array.isArray(res.orders)) {
        const loaded: KOTTicket[] = res.orders.map((o: any, idx: number) => {
          let parsedItems: { name: string; qty: number; note?: string }[] = [];
          if (Array.isArray(o.items)) {
            parsedItems = o.items.map((it: any) => ({
              name: it.name || 'Item',
              qty: it.qty || it.quantity || 1,
              note: it.note || '',
            }));
          }
          return {
            id: `KOT #${o.token || o.kotToken || idx + 1}`,
            table: o.tableNumber || o.table || `Table 0${idx + 1}`,
            time: o.time || 'Just now',
            status: (o.status === 'Ready' || o.status === 'Served') ? o.status : 'Preparing',
            items: parsedItems,
          };
        });
        setTickets(loaded);
      }
    }).catch(() => null);
  }, []);

  const toggleStatus = (id: string) => {
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const nextStatus =
            t.status === 'Preparing'
              ? 'Ready'
              : t.status === 'Ready'
              ? 'Served'
              : 'Preparing';
          return { ...t, status: nextStatus };
        }
        return t;
      })
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Ionicons name="arrow-back" size={20} color={Colors.navy} />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Kitchen Display & KOT</Text>
            <Text style={styles.subtitle}>Active orders in kitchen</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {tickets.map((ticket) => (
            <View key={ticket.id} style={styles.ticketCard}>
              <View style={styles.ticketHeader}>
                <View>
                  <Text style={styles.ticketTable}>{ticket.table}</Text>
                  <Text style={styles.ticketMeta}>
                    {ticket.id} • {ticket.time}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.statusBadge,
                    ticket.status === 'Preparing'
                      ? styles.statusPreparing
                      : ticket.status === 'Ready'
                      ? styles.statusReady
                      : styles.statusServed,
                  ]}
                  onPress={() => toggleStatus(ticket.id)}
                >
                  <Text
                    style={[
                      styles.statusText,
                      ticket.status === 'Preparing'
                        ? styles.statusTextPreparing
                        : ticket.status === 'Ready'
                        ? styles.statusTextReady
                        : styles.statusTextServed,
                    ]}
                  >
                    {ticket.status}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.itemsList}>
                {ticket.items.map((it, idx) => (
                  <View key={idx} style={styles.itemRow}>
                    <View style={styles.itemQtyCircle}>
                      <Text style={styles.itemQtyText}>{it.qty}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName}>{it.name}</Text>
                      {it.note && (
                        <Text style={styles.itemNote}>Note: {it.note}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={styles.markReadyBtn}
                onPress={() => toggleStatus(ticket.id)}
              >
                <MaterialCommunityIcons
                  name="check-circle-outline"
                  size={18}
                  color={Colors.navy}
                />
                <Text style={styles.markReadyText}>
                  {ticket.status === 'Preparing'
                    ? 'Mark as Ready'
                    : ticket.status === 'Ready'
                    ? 'Mark as Served'
                    : 'Re-open Order'}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.navy,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.secondaryText,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  ticketCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  ticketTable: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.navy,
  },
  ticketMeta: {
    fontSize: 12,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statusPreparing: {
    backgroundColor: '#FEF3C7',
  },
  statusReady: {
    backgroundColor: '#DCFCE7',
  },
  statusServed: {
    backgroundColor: '#F1F5F9',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusTextPreparing: {
    color: Colors.warningDark,
  },
  statusTextReady: {
    color: Colors.successGreen,
  },
  statusTextServed: {
    color: Colors.secondaryText,
  },
  itemsList: {
    gap: 10,
    marginBottom: 16,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemQtyCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemQtyText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.navy,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.navy,
  },
  itemNote: {
    fontSize: 11,
    color: Colors.primaryRed,
    fontStyle: 'italic',
  },
  markReadyBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 10,
    borderRadius: 10,
  },
  markReadyText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.navy,
  },
});
