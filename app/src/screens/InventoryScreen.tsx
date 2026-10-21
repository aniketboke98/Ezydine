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
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { api } from '../services/api';

interface InventoryItem {
  id: number;
  name: string;
  category: string;
  quantity: number | string;
  unit: string;
  minThreshold: number | string;
  costPerUnit: number | string;
  totalValue: number | string;
  isLowStock: boolean;
}

interface InventoryScreenProps {
  onBack: () => void;
}

export const InventoryScreen: React.FC<InventoryScreenProps> = ({ onBack }) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [totalValue, setTotalValue] = useState<number>(0);
  const [lowStockCount, setLowStockCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const fetchInventory = async () => {
    try {
      const res = await api.inventory.getAll();
      if (res.success && res.items) {
        setItems(res.items);
        if (res.summary) {
          setTotalValue(res.summary.totalStockValue || 0);
          setLowStockCount(res.summary.lowStockAlertsCount || 0);
        }
      }
    } catch (e) {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleAdjustStock = (item: InventoryItem) => {
    Alert.alert(
      `Adjust ${item.name}`,
      `Current stock: ${item.quantity} ${item.unit}. Select adjustment:`,
      [
        {
          text: '+5 Units',
          onPress: async () => {
            await api.inventory.adjustStock(item.id, 5);
            fetchInventory();
          },
        },
        {
          text: '-1 Wastage',
          style: 'destructive',
          onPress: async () => {
            await api.inventory.adjustStock(item.id, -1);
            fetchInventory();
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

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
                <Text style={styles.title}>Inventory & stock</Text>
                <Text style={styles.subtitle}>
                  PostgreSQL live stock · {items.length} items
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.searchBtn}
              onPress={fetchInventory}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh" size={20} color={Colors.navy} />
            </TouchableOpacity>
          </View>

          {/* Metric Cards Row */}
          <View style={styles.metricRow}>
            {/* Stock Value */}
            <View style={styles.stockValueCard}>
              <Text style={styles.stockValueLabel}>Stock value</Text>
              <Text style={styles.stockValueAmount}>₹{totalValue.toLocaleString('en-IN')}</Text>
            </View>

            {/* Low Stock */}
            <View style={styles.lowStockCard}>
              <Text style={styles.lowStockLabel}>Low stock</Text>
              <Text style={styles.lowStockCount}>{lowStockCount} items</Text>
            </View>
          </View>

          {/* Quick Action Buttons */}
          <View style={styles.actionBtnsRow}>
            <TouchableOpacity
              style={styles.addPurchaseBtn}
              onPress={() => Alert.alert('Add Purchase', 'Record new raw material purchase')}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.addPurchaseText}>Add purchase</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.adjustStockBtn}
              onPress={() => {
                if (items.length > 0) handleAdjustStock(items[0]);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="options-outline" size={18} color={Colors.navy} style={{ marginRight: 6 }} />
              <Text style={styles.adjustStockText}>Quick audit</Text>
            </TouchableOpacity>
          </View>

          {/* Raw Material Inventory List */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Stock details</Text>
            <Text style={styles.viewAllText}>Tap item to adjust</Text>
          </View>

          {loading ? (
            <ActivityIndicator color={Colors.primaryRed} style={{ marginTop: 24 }} />
          ) : (
            <View style={styles.card}>
              {items.map((item, idx) => (
                <React.Fragment key={item.id}>
                  <TouchableOpacity
                    style={styles.ingredientRow}
                    onPress={() => handleAdjustStock(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.ingLeft}>
                      <Text style={styles.ingName}>{item.name}</Text>
                      <Text style={styles.ingSub}>
                        Min. {item.minThreshold} {item.unit} · ₹{parseFloat(item.costPerUnit as any).toFixed(0)} / {item.unit}
                      </Text>
                    </View>
                    <View style={styles.ingRight}>
                      <Text style={styles.ingQty}>
                        {parseFloat(item.quantity as any).toFixed(1)} {item.unit}
                      </Text>
                      {item.isLowStock && (
                        <View style={styles.lowBadge}>
                          <Text style={styles.lowBadgeText}>Low stock</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                  {idx < items.length - 1 && <View style={styles.divider} />}
                </React.Fragment>
              ))}
            </View>
          )}
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
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.navy,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  searchBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  stockValueCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stockValueLabel: {
    fontSize: 12,
    color: Colors.secondaryText,
    marginBottom: 4,
  },
  stockValueAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.navy,
  },
  lowStockCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  lowStockLabel: {
    fontSize: 12,
    color: Colors.secondaryText,
    marginBottom: 4,
  },
  lowStockCount: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.primaryRed,
  },
  actionBtnsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  addPurchaseBtn: {
    flex: 1,
    backgroundColor: Colors.primaryRed,
    height: 46,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPurchaseText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  adjustStockBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    height: 46,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustStockText: {
    color: Colors.navy,
    fontSize: 14,
    fontWeight: '600',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.navy,
  },
  viewAllText: {
    fontSize: 12,
    color: Colors.secondaryText,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  ingredientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  ingLeft: {
    flex: 1,
  },
  ingName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.navy,
  },
  ingSub: {
    fontSize: 12,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  ingRight: {
    alignItems: 'flex-end',
  },
  ingQty: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.navy,
  },
  lowBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  lowBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primaryRed,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
});
