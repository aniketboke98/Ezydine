import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
    TextInput,
  Image,
  Switch,
  Alert,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { api } from '../services/api';

interface MenuItemStatus {
  id: string | number;
  name: string;
  category: string;
  price: number;
  isVeg: boolean;
  image: string;
  available: boolean;
  description?: string;
}

interface MenuManagementScreenProps {
  onBack: () => void;
}

const DEFAULT_DISH_IMAGES = {
  veg: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=80',
  nonVeg: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80',
};

const SUGGESTED_CATEGORIES = ['South Indian', 'Snacks', 'Starters', 'Mains', 'Breads', 'Beverages', 'Desserts'];

export const MenuManagementScreen: React.FC<MenuManagementScreenProps> = ({
  onBack,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All items');
  const [items, setItems] = useState<MenuItemStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Add Dish Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Mains');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemIsVeg, setNewItemIsVeg] = useState(true);
  const [newItemDesc, setNewItemDesc] = useState('');
  const [isSavingItem, setIsSavingItem] = useState(false);

  // Fetch live menu items for authenticated restaurant
  const loadMenuItems = async () => {
    setIsLoading(true);
    try {
      const res = await api.menu.getAll();
      if (res.success && Array.isArray(res.items)) {
        setItems(
          res.items.map((it: any) => ({
            id: it.id,
            name: it.name,
            category: it.category || 'Mains',
            price: Number(it.price) || 0,
            isVeg: it.isVeg !== false,
            image: it.isVeg
              ? DEFAULT_DISH_IMAGES.veg
              : DEFAULT_DISH_IMAGES.nonVeg,
            available: it.isAvailable !== false,
            description: it.description,
          }))
        );
      }
    } catch (err: any) {
      console.warn('Failed to load menu items:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMenuItems();
  }, []);

  // Toggle availability in PostgreSQL
  const toggleAvailability = async (id: string | number) => {
    try {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, available: !item.available } : item
        )
      );
      await api.menu.toggleAvailability(Number(id));
    } catch (err: any) {
      Alert.alert('Error', 'Failed to update item availability in database.');
      loadMenuItems();
    }
  };

  // Add new food item to PostgreSQL database
  const handleSaveNewItem = async () => {
    if (!newItemName.trim()) {
      Alert.alert('Required', 'Please enter a dish name.');
      return;
    }
    const priceNum = parseFloat(newItemPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid price in ₹.');
      return;
    }

    setIsSavingItem(true);
    try {
      const res = await api.menu.addItem({
        name: newItemName.trim(),
        category: newItemCategory.trim() || 'Mains',
        price: priceNum,
        isVeg: newItemIsVeg,
        description: newItemDesc.trim(),
      });

      if (res.success) {
        Alert.alert(
          'Dish Added',
          `"${newItemName.trim()}" has been saved to your restaurant catalog! It will sync immediately with your POS billing and Manager Web Portal.`
        );
        setShowAddModal(false);
        setNewItemName('');
        setNewItemPrice('');
        setNewItemCategory('Mains');
        setNewItemIsVeg(true);
        setNewItemDesc('');
        await loadMenuItems();
      } else {
        Alert.alert('Error', res.error || 'Failed to add dish.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save dish to database.');
    } finally {
      setIsSavingItem(false);
    }
  };

  // Derived categories
  const dynamicCategories = Array.from(new Set(items.map((i) => i.category))).filter(Boolean);
  const allCategories = [
    'All items',
    ...Array.from(new Set([...SUGGESTED_CATEGORIES, ...dynamicCategories])),
  ];

  const filteredItems = items.filter((item) => {
    const matchesCat =
      selectedCategory === 'All items' || item.category === selectedCategory;
    const matchesSearch = item.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
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
                <Text style={styles.title}>Menu management</Text>
                <Text style={styles.subtitle}>
                  {items.length} items · {dynamicCategories.length || 1} categories
                </Text>
              </View>
            </View>

            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.actionIconBtn}
                onPress={loadMenuItems}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh-outline" size={20} color={Colors.navy} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionIconBtn}
                onPress={() => Alert.alert('Filter', 'Filter by Veg/Non-veg or In-stock status')}
                activeOpacity={0.7}
              >
                <Ionicons name="options-outline" size={20} color={Colors.navy} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Search bar */}
          <View style={styles.searchBar}>
            <Ionicons
              name="search-outline"
              size={18}
              color={Colors.secondaryText}
              style={{ marginRight: 8 }}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search dishes or categories..."
              placeholderTextColor={Colors.secondaryText}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={Colors.secondaryText} />
              </TouchableOpacity>
            )}
          </View>

          {/* Category Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesRow}
          >
            {allCategories.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.catPill,
                    isActive && styles.catPillActive,
                  ]}
                  onPress={() => setSelectedCategory(cat)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.catPillText,
                      isActive && styles.catPillTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Subheader */}
          <View style={styles.subHeaderRow}>
            <Text style={styles.subHeaderNotice}>
              Switch items on or off for instant billing sync
            </Text>
            <TouchableOpacity onPress={loadMenuItems}>
              <Text style={styles.editCategoriesText}>Sync Catalog</Text>
            </TouchableOpacity>
          </View>

          {/* Loading Indicator */}
          {isLoading && (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color={Colors.primaryRed} />
              <Text style={styles.loadingText}>Loading menu catalog...</Text>
            </View>
          )}

          {/* Menu Items List */}
          {!isLoading && (
            <View style={styles.itemsList}>
              {filteredItems.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons name="restaurant-outline" size={44} color="#CBD5E1" />
                  <Text style={styles.emptyTitle}>No menu items found</Text>
                  <Text style={styles.emptyDesc}>
                    {searchQuery
                      ? 'No dishes match your search query.'
                      : 'Start building your menu by adding your first food item below.'}
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyAddBtn}
                    onPress={() => setShowAddModal(true)}
                  >
                    <Ionicons name="add" size={18} color="#FFFFFF" />
                    <Text style={styles.emptyAddBtnText}>Add first dish</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                filteredItems.map((item) => (
                  <View key={item.id} style={styles.itemCard}>
                    <Image source={{ uri: item.image }} style={styles.itemImage} />

                    <View style={styles.itemInfo}>
                      <View style={styles.dietRow}>
                        <View
                          style={[
                            styles.dietBox,
                            { borderColor: item.isVeg ? Colors.successGreen : Colors.primaryRed },
                          ]}
                        >
                          <View
                            style={[
                              styles.dietCircle,
                              { backgroundColor: item.isVeg ? Colors.successGreen : Colors.primaryRed },
                            ]}
                          />
                        </View>
                        <Text style={styles.dietLabel}>
                          {item.isVeg ? 'Veg' : 'Non-veg'} · {item.category}
                        </Text>
                      </View>

                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemPrice}>₹{item.price}</Text>
                    </View>

                    {/* Right Controls: Switch & Edit */}
                    <View style={styles.itemActions}>
                      <Switch
                        value={item.available}
                        onValueChange={() => toggleAvailability(item.id)}
                        trackColor={{ false: '#E2E8F0', true: Colors.successGreen }}
                        thumbColor="#FFFFFF"
                      />
                      <TouchableOpacity
                        style={styles.editBtn}
                        onPress={() => Alert.alert('Edit Dish', `Edit pricing or availability for ${item.name}`)}
                      >
                        <Feather name="edit-2" size={17} color={Colors.navy} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {/* Footnote */}
          <Text style={styles.footnoteText}>
            Changes made here sync automatically across all linked mobile POS terminals and the manager web portal.
          </Text>
        </ScrollView>

        {/* Bottom Add Food Item Button */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setShowAddModal(true)}
            activeOpacity={0.85}
          >
            <Ionicons
              name="add"
              size={20}
              color="#FFFFFF"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.addBtnText}>Add food item</Text>
          </TouchableOpacity>
        </View>

        {/* Add Food Item Modal */}
        <Modal
          visible={showAddModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowAddModal(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalOverlay}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Add Food Item</Text>
                  <Text style={styles.modalSubtitle}>Create a new dish for your restaurant menu</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowAddModal(false)}
                  style={styles.modalCloseBtn}
                >
                  <Ionicons name="close" size={22} color={Colors.navy} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={styles.modalForm}>
                {/* Veg / Non-Veg Selector */}
                <Text style={styles.inputLabel}>Food Preference</Text>
                <View style={styles.vegToggleRow}>
                  <TouchableOpacity
                    style={[
                      styles.vegChoiceBtn,
                      newItemIsVeg && styles.vegChoiceBtnActive,
                    ]}
                    onPress={() => setNewItemIsVeg(true)}
                  >
                    <View style={[styles.dietBox, { borderColor: Colors.successGreen }]}>
                      <View style={[styles.dietCircle, { backgroundColor: Colors.successGreen }]} />
                    </View>
                    <Text
                      style={[
                        styles.vegChoiceText,
                        newItemIsVeg && { color: Colors.successGreen, fontWeight: '700' },
                      ]}
                    >
                      Pure Veg
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.vegChoiceBtn,
                      !newItemIsVeg && styles.nonVegChoiceBtnActive,
                    ]}
                    onPress={() => setNewItemIsVeg(false)}
                  >
                    <View style={[styles.dietBox, { borderColor: Colors.primaryRed }]}>
                      <View style={[styles.dietCircle, { backgroundColor: Colors.primaryRed }]} />
                    </View>
                    <Text
                      style={[
                        styles.vegChoiceText,
                        !newItemIsVeg && { color: Colors.primaryRed, fontWeight: '700' },
                      ]}
                    >
                      Non-Veg
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Dish Name */}
                <Text style={styles.inputLabel}>Dish Name *</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="e.g. Butter Chicken, Paneer Tikka"
                  placeholderTextColor={Colors.secondaryText}
                  value={newItemName}
                  onChangeText={setNewItemName}
                />

                {/* Category Selection */}
                <Text style={styles.inputLabel}>Category *</Text>
                <View style={styles.categoryChipsWrap}>
                  {SUGGESTED_CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.chipBtn,
                        newItemCategory === cat && styles.chipBtnActive,
                      ]}
                      onPress={() => setNewItemCategory(cat)}
                    >
                      <Text
                        style={[
                          styles.chipBtnText,
                          newItemCategory === cat && styles.chipBtnTextActive,
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={[styles.inputField, { marginTop: 6 }]}
                  placeholder="Or type custom category..."
                  placeholderTextColor={Colors.secondaryText}
                  value={newItemCategory}
                  onChangeText={setNewItemCategory}
                />

                {/* Price */}
                <Text style={styles.inputLabel}>Price (₹) *</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="e.g. 280"
                  placeholderTextColor={Colors.secondaryText}
                  keyboardType="numeric"
                  value={newItemPrice}
                  onChangeText={setNewItemPrice}
                />

                {/* Description (Optional) */}
                <Text style={styles.inputLabel}>Short Description (Optional)</Text>
                <TextInput
                  style={[styles.inputField, { height: 60, textAlignVertical: 'top' }]}
                  placeholder="e.g. Spiced charcoal-cooked skewers with mint chutney"
                  placeholderTextColor={Colors.secondaryText}
                  multiline
                  value={newItemDesc}
                  onChangeText={setNewItemDesc}
                />
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setShowAddModal(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveBtn, isSavingItem && { opacity: 0.7 }]}
                  onPress={handleSaveNewItem}
                  disabled={isSavingItem}
                >
                  {isSavingItem ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save Dish</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
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
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  actionIconBtn: {
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.navy,
  },
  categoriesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    paddingRight: 20,
  },
  catPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  catPillActive: {
    backgroundColor: Colors.primaryRed,
    borderColor: Colors.primaryRed,
  },
  catPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.navy,
  },
  catPillTextActive: {
    color: '#FFFFFF',
  },
  subHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  subHeaderNotice: {
    fontSize: 13,
    color: Colors.secondaryText,
    flex: 1,
  },
  editCategoriesText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primaryRed,
    marginLeft: 8,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.secondaryText,
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.navy,
    marginTop: 12,
  },
  emptyDesc: {
    fontSize: 13,
    color: Colors.secondaryText,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    maxWidth: 260,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryRed,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 18,
    gap: 6,
  },
  emptyAddBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  itemsList: {
    gap: 12,
    marginBottom: 16,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  itemInfo: {
    flex: 1,
  },
  dietRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  dietBox: {
    width: 12,
    height: 12,
    borderWidth: 1.5,
    borderRadius: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dietCircle: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  dietLabel: {
    fontSize: 11,
    color: Colors.secondaryText,
    fontWeight: '500',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.navy,
    marginBottom: 2,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.navy,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editBtn: {
    padding: 6,
  },
  footnoteText: {
    fontSize: 12,
    color: Colors.secondaryText,
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 4,
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
  addBtn: {
    backgroundColor: Colors.primaryRed,
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primaryRed,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 27, 41, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.navy,
  },
  modalSubtitle: {
    fontSize: 12,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalForm: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.navy,
    marginBottom: 6,
    marginTop: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  inputField: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.navy,
  },
  vegToggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  vegChoiceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: '#FFFFFF',
  },
  vegChoiceBtnActive: {
    borderColor: Colors.successGreen,
    backgroundColor: 'rgba(22, 163, 74, 0.08)',
  },
  nonVegChoiceBtnActive: {
    borderColor: Colors.primaryRed,
    backgroundColor: 'rgba(217, 47, 67, 0.08)',
  },
  vegChoiceText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.secondaryText,
  },
  categoryChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  chipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipBtnActive: {
    backgroundColor: Colors.navy,
    borderColor: Colors.navy,
  },
  chipBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.secondaryText,
  },
  chipBtnTextActive: {
    color: '#FFFFFF',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondaryText,
  },
  saveBtn: {
    flex: 2,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.primaryRed,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
