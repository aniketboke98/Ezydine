import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
    Alert,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

interface OrderItem {
  id: string;
  name: string;
  unitPrice: number;
  qty: number;
}

interface BillDetailsScreenProps {
  onBack: () => void;
  onAddItems: () => void;
  onProceedToPayment: (total: number) => void;
}

export const BillDetailsScreen: React.FC<BillDetailsScreenProps> = ({
  onBack,
  onAddItems,
  onProceedToPayment,
}) => {
  const [items, setItems] = useState<OrderItem[]>([
    { id: '1', name: 'Paneer Butter Masala', unitPrice: 320, qty: 1 },
    { id: '2', name: 'Garlic Naan', unitPrice: 60, qty: 2 },
    { id: '3', name: 'Sweet Lassi', unitPrice: 100, qty: 2 },
  ]);

  const [discountAmount, setDiscountAmount] = useState(40);

  const updateQty = (id: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((it) => {
          if (it.id === id) {
            const newQty = it.qty + delta;
            return newQty > 0 ? { ...it, qty: newQty } : null;
          }
          return it;
        })
        .filter(Boolean) as OrderItem[]
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const totalItemsCount = items.reduce((sum, it) => sum + it.qty, 0);
  const subtotal = items.reduce((sum, it) => sum + it.unitPrice * it.qty, 0);
  const taxable = Math.max(0, subtotal - discountAmount);
  const gst = taxable * 0.05; // 5% GST
  const totalPayable = taxable + gst;

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
                <Text style={styles.title}>Bill details</Text>
                <Text style={styles.subtitle}>#1048 · Table 04 · Dine-in</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.moreBtn}
              onPress={() => Alert.alert('Bill Options', 'Split bill, Print draft, or Cancel order')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="ellipsis-horizontal"
                size={20}
                color={Colors.navy}
              />
            </TouchableOpacity>
          </View>

          {/* Section Summary Header */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.dishCountText}>
              {items.length} dishes · {totalItemsCount} items
            </Text>
            <TouchableOpacity onPress={onAddItems} activeOpacity={0.7}>
              <Text style={styles.addItemsText}>+ Add items</Text>
            </TouchableOpacity>
          </View>

          {/* Items Card */}
          <View style={styles.card}>
            {items.map((it, idx) => (
              <View
                key={it.id}
                style={[
                  styles.itemRow,
                  idx < items.length - 1 && styles.itemRowBorder,
                ]}
              >
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{it.name}</Text>
                  <Text style={styles.itemUnitPrice}>₹{it.unitPrice} each</Text>

                  {/* Quantity Stepper */}
                  <View style={styles.stepperContainer}>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => updateQty(it.id, -1)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="remove" size={16} color={Colors.navy} />
                    </TouchableOpacity>
                    <Text style={styles.stepperCount}>{it.qty}</Text>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => updateQty(it.id, 1)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="add" size={16} color={Colors.primaryRed} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.itemRight}>
                  <TouchableOpacity
                    style={styles.trashBtn}
                    onPress={() => removeItem(it.id)}
                    activeOpacity={0.7}
                  >
                    <Feather name="trash-2" size={18} color={Colors.secondaryText} />
                  </TouchableOpacity>
                  <Text style={styles.itemTotalPrice}>
                    ₹{(it.unitPrice * it.qty).toFixed(2)}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Price Breakdown Card */}
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Subtotal</Text>
              <Text style={styles.rowVal}>₹{subtotal.toFixed(2)}</Text>
            </View>

            {discountAmount > 0 && (
              <View style={styles.row}>
                <View style={styles.discountLabelRow}>
                  <MaterialCommunityIcons
                    name="percent-circle-outline"
                    size={18}
                    color={Colors.primaryRed}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.rowLabel}>Discount · flat ₹{discountAmount}</Text>
                  <TouchableOpacity
                    onPress={() =>
                      Alert.prompt
                        ? Alert.prompt('Change Discount', 'Enter flat discount amount:', (txt) => {
                            const val = parseFloat(txt);
                            if (!isNaN(val)) setDiscountAmount(val);
                          })
                        : Alert.alert('Discount', 'Flat ₹40 promotional discount applied.')
                    }
                  >
                    <Feather
                      name="edit-2"
                      size={14}
                      color={Colors.primaryRed}
                      style={{ marginLeft: 6 }}
                    />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.rowVal, styles.discountVal]}>
                  - ₹{discountAmount.toFixed(2)}
                </Text>
              </View>
            )}

            <View style={styles.row}>
              <Text style={styles.rowLabel}>GST 5% on ₹{taxable.toFixed(0)}</Text>
              <Text style={styles.rowVal}>₹{gst.toFixed(2)}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total payable</Text>
              <Text style={styles.totalVal}>₹{totalPayable.toFixed(2)}</Text>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Proceed to Payment Button */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.proceedBtn}
            onPress={() => onProceedToPayment(totalPayable)}
            activeOpacity={0.85}
          >
            <Ionicons
              name="arrow-forward"
              size={18}
              color="#FFFFFF"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.proceedBtnText}>
              Proceed to payment · ₹{totalPayable.toFixed(2)}
            </Text>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
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
  moreBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dishCountText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.navy,
  },
  addItemsText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primaryRed,
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
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  itemRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.navy,
    marginBottom: 4,
  },
  itemUnitPrice: {
    fontSize: 13,
    color: Colors.secondaryText,
    marginBottom: 10,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 12,
  },
  stepperBtn: {
    padding: 2,
  },
  stepperCount: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.navy,
    minWidth: 16,
    textAlign: 'center',
  },
  itemRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  trashBtn: {
    padding: 4,
  },
  itemTotalPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.navy,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  rowLabel: {
    fontSize: 14,
    color: Colors.secondaryText,
  },
  rowVal: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.navy,
  },
  discountLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  discountVal: {
    color: Colors.successGreen,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.navy,
  },
  totalVal: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.navy,
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
  proceedBtn: {
    backgroundColor: Colors.primaryRed,
    flexDirection: 'row',
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
  proceedBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
