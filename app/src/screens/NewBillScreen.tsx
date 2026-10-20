import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  Dimensions,
  Modal,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { MenuItem } from '../types';
import { MOCK_MENU_ITEMS } from '../data/mockData';
import { api, safeStorage } from '../services/api';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

interface NewBillScreenProps {
  onBackToDashboard: () => void;
  onOpenOrders?: () => void;
  onProceedToBillDetails?: () => void;
}

const DEFAULT_IMAGES = {
  veg: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=80',
  nonVeg: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80',
};

export const NewBillScreen: React.FC<NewBillScreenProps> = ({
  onBackToDashboard,
  onOpenOrders,
  onProceedToBillDetails,
}) => {
  // Menu items loaded from PostgreSQL for this restaurant
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);

  // Cart ALWAYS starts completely empty from zero (0 items)
  const [quantities, setQuantities] = useState<Record<string | number, number>>({});

  const [selectedCategory, setSelectedCategory] = useState<string>('All items');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTable, setSelectedTable] = useState('Table 01');
  const [restaurantName, setRestaurantName] = useState('Ezydine Restaurant');
  const [gstRate, setGstRate] = useState<number>(5.0);
  const [gstEnabled, setGstEnabled] = useState<boolean>(true);

  // Modals
  const [showTableModal, setShowTableModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [orderCompleteModal, setOrderCompleteModal] = useState(false);

  // Quick Add Custom Dish Modal (e.g. typing "Paneer Tikka" or code)
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [quickDishName, setQuickDishName] = useState('');
  const [quickDishCategory, setQuickDishCategory] = useState('Starters');
  const [quickDishPrice, setQuickDishPrice] = useState('');
  const [quickDishIsVeg, setQuickDishIsVeg] = useState(true);
  const [isSavingQuickDish, setIsSavingQuickDish] = useState(false);

  // Load menu items and restaurant profile from PostgreSQL database
  const loadMenuAndRestaurant = async () => {
    setIsLoadingMenu(true);
    try {
      const cached = await api.getRestaurant().catch(() => null);
      if (cached && (cached.name || cached.restaurant_name)) {
        setRestaurantName(cached.name || cached.restaurant_name);
      }

      safeStorage.getItem('@ezydine_gst_config').then((raw) => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            setGstEnabled(parsed.enabled !== false);
            if (parsed.gstRate !== undefined) setGstRate(Number(parsed.gstRate));
          } catch {}
        }
      }).catch(() => null);

      const [menuRes, profileRes] = await Promise.allSettled([
        api.menu.getAll(),
        api.restaurant.getProfile(),
      ]);

      if (menuRes.status === 'fulfilled' && menuRes.value.success && Array.isArray(menuRes.value.items)) {
        if (menuRes.value.items.length > 0) {
          setMenuItems(
            menuRes.value.items.map((it: any) => ({
              id: it.id,
              name: it.name,
              category: it.category || 'Mains',
              price: Number(it.price) || 0,
              isVeg: it.isVeg !== false,
              image: it.image || (it.isVeg !== false ? DEFAULT_IMAGES.veg : DEFAULT_IMAGES.nonVeg),
              description: it.description || '',
            }))
          );
        } else {
          // If empty DB, use default templates
          setMenuItems(MOCK_MENU_ITEMS);
        }
      } else {
        setMenuItems(MOCK_MENU_ITEMS);
      }

      if (profileRes.status === 'fulfilled' && profileRes.value?.success) {
        const prof = profileRes.value.profile || profileRes.value.restaurant;
        if (prof) {
          if (prof.name || prof.restaurant_name) {
            setRestaurantName(prof.name || prof.restaurant_name);
          }
          if (prof.gstRate !== undefined || prof.gst_rate !== undefined) {
            const rateVal = parseFloat(prof.gstRate || prof.gst_rate || '0');
            setGstEnabled(rateVal > 0);
            if (rateVal > 0) setGstRate(rateVal);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to fetch menu:', e);
      setMenuItems(MOCK_MENU_ITEMS);
    } finally {
      setIsLoadingMenu(false);
    }
  };

  useEffect(() => {
    api.getRestaurant().then((cached) => {
      if (cached && (cached.name || cached.restaurant_name)) {
        setRestaurantName(cached.name || cached.restaurant_name);
      }
    }).catch(() => null);
    loadMenuAndRestaurant();
  }, []);

  const tables = ['Table 01', 'Table 02', 'Table 03', 'Table 04', 'Table 05', 'VIP-1', 'Terrace-01', 'Takeaway #12', 'Delivery #04'];

  // Handle Increments & Decrements (Minus Option)
  const handleIncrement = (id: string | number) => {
    setQuantities((prev) => ({
      ...prev,
      [id]: (prev[id] || 0) + 1,
    }));
  };

  const handleDecrement = (id: string | number) => {
    setQuantities((prev) => {
      const current = prev[id] || 0;
      if (current <= 1) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      return {
        ...prev,
        [id]: current - 1,
      };
    });
  };

  // Quick Add Item: saves to PostgreSQL and automatically adds 1 qty to active bill
  const handleSaveQuickDish = async () => {
    if (!quickDishName.trim()) {
      Alert.alert('Required', 'Please enter a dish name.');
      return;
    }
    const priceNum = parseFloat(quickDishPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid price in ₹.');
      return;
    }

    setIsSavingQuickDish(true);
    try {
      const res = await api.menu.addItem({
        name: quickDishName.trim(),
        category: quickDishCategory.trim() || 'Starters',
        price: priceNum,
        isVeg: quickDishIsVeg,
        description: '',
      });

      const newItem: MenuItem = {
        id: res.item?.id || Date.now(),
        name: quickDishName.trim(),
        category: quickDishCategory.trim() || 'Starters',
        price: priceNum,
        isVeg: quickDishIsVeg,
        image: quickDishIsVeg ? DEFAULT_IMAGES.veg : DEFAULT_IMAGES.nonVeg,
        description: '',
      };

      // Add to menu list
      setMenuItems((prev) => [newItem, ...prev]);

      // Add to cart with quantity = 1 immediately
      setQuantities((prev) => ({
        ...prev,
        [newItem.id]: 1,
      }));

      // Close modal and reset fields
      setShowQuickAddModal(false);
      setQuickDishName('');
      setQuickDishPrice('');
      setQuickDishCategory('Starters');
      setQuickDishIsVeg(true);
      setSearchQuery('');

      Alert.alert('Dish Added', `"${newItem.name}" (₹${newItem.price}) has been added to your bill and restaurant catalog!`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save dish to database.');
    } finally {
      setIsSavingQuickDish(false);
    }
  };

  // Dynamic Categories from items
  const dynamicCats = Array.from(new Set(menuItems.map((i) => i.category))).filter(Boolean);
  const categories = ['All items', ...Array.from(new Set(['Starters', 'Mains', 'Breads', 'Drinks', ...dynamicCats]))];

  // Filter items by category, dish name, or dish code / number
  const trimmedSearch = searchQuery.trim().toLowerCase();
  const filteredItems = menuItems.filter((item) => {
    const matchesCategory =
      selectedCategory === 'All items' || item.category === selectedCategory;
    if (!trimmedSearch) return matchesCategory;

    const matchesName = item.name.toLowerCase().includes(trimmedSearch);
    const matchesId = item.id.toString() === trimmedSearch || `#${item.id}` === trimmedSearch;
    const matchesCat = (item.category || '').toLowerCase().includes(trimmedSearch);
    return matchesCategory && (matchesName || matchesId || matchesCat);
  });

  // Calculate totals strictly from cart items
  const totalItemsCount = Object.values(quantities).reduce(
    (sum, q) => sum + q,
    0
  );

  const subtotal = menuItems.reduce((sum, item) => {
    const q = quantities[item.id] || 0;
    return sum + q * item.price;
  }, 0);

  const activeGstRate = gstEnabled ? gstRate : 0;
  const halfGstPercent = activeGstRate / 2;
  const cgst = (subtotal * halfGstPercent) / 100;
  const sgst = (subtotal * halfGstPercent) / 100;
  const grandTotal = subtotal + cgst + sgst;

  // Selected items list for checkout review modal
  const selectedCartItems = menuItems
    .filter((item) => (quantities[item.id] || 0) > 0)
    .map((item) => ({
      ...item,
      qty: quantities[item.id],
      itemTotal: quantities[item.id] * item.price,
    }));

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleWrap}>
            <TouchableOpacity
              onPress={onBackToDashboard}
              style={styles.backBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={22} color={Colors.navy} />
            </TouchableOpacity>
            <View>
              <Text style={styles.headerTitle}>New bill</Text>
              <Text style={styles.headerSubtitle}>
                #1048 · {restaurantName}
              </Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.quickAddHeaderBtn}
              onPress={() => {
                setQuickDishName(searchQuery.trim());
                setShowQuickAddModal(true);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.quickAddHeaderText}>Add Dish</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.historyBtn}
              onPress={onOpenOrders}
              activeOpacity={0.8}
            >
              <Feather name="shopping-bag" size={20} color={Colors.navy} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Table selector & Cart Badge Row */}
        <View style={styles.tableRow}>
          <TouchableOpacity
            style={styles.tableSelector}
            onPress={() => setShowTableModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons
              name="restaurant-outline"
              size={18}
              color={Colors.navy}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.tableSelectorText}>
              Dine-in · {selectedTable}
            </Text>
            <Ionicons
              name="chevron-down"
              size={16}
              color={Colors.secondaryText}
              style={{ marginLeft: 4 }}
            />
          </TouchableOpacity>

          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeText}>Cart · {totalItemsCount} items</Text>
          </View>
        </View>

        {/* Search Bar with Item Name / Code Input */}
        <View style={styles.searchBarContainer}>
          <Ionicons
            name="search-outline"
            size={18}
            color={Colors.secondaryText}
            style={{ marginRight: 8 }}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search dish name, code (e.g. Paneer Tikka, #12)..."
            placeholderTextColor={Colors.secondaryText}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
              <Ionicons
                name="close-circle"
                size={18}
                color={Colors.secondaryText}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Add Banner when searching */}
        {trimmedSearch.length > 0 && (
          <TouchableOpacity
            style={styles.quickAddBanner}
            onPress={() => {
              setQuickDishName(searchQuery.trim());
              setShowQuickAddModal(true);
            }}
            activeOpacity={0.85}
          >
            <View style={styles.quickAddBannerLeft}>
              <View style={styles.quickAddIconBox}>
                <Ionicons name="sparkles" size={16} color={Colors.primaryRed} />
              </View>
              <View>
                <Text style={styles.quickAddBannerTitle}>
                  Add "{searchQuery.trim()}" directly to Bill
                </Text>
                <Text style={styles.quickAddBannerSub}>
                  Create custom dish with pricing & instant cart add
                </Text>
              </View>
            </View>
            <Ionicons name="arrow-forward-circle" size={24} color={Colors.primaryRed} />
          </TouchableOpacity>
        )}

        {/* Category Filter Pills - Fixed Container Height & Centering */}
        <View style={styles.categoryScrollContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryRow}
          >
            {categories.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryPill,
                    isActive && styles.categoryPillActive,
                  ]}
                  onPress={() => setSelectedCategory(cat)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.categoryPillText,
                      isActive && styles.categoryPillTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Food Items 2-Column Grid */}
        {isLoadingMenu ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={Colors.primaryRed} />
            <Text style={styles.loadingText}>Loading menu catalog...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredItems}
            keyExtractor={(item) => item.id.toString()}
            numColumns={2}
            columnWrapperStyle={styles.columnWrapper}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyListWrap}>
                <Ionicons name="restaurant-outline" size={40} color="#CBD5E1" />
                <Text style={styles.emptyListTitle}>No dishes found</Text>
                <Text style={styles.emptyListSub}>
                  Can't find "{searchQuery}"? Tap below to add it directly to this bill.
                </Text>
                <TouchableOpacity
                  style={styles.emptyAddBtn}
                  onPress={() => {
                    setQuickDishName(searchQuery.trim());
                    setShowQuickAddModal(true);
                  }}
                >
                  <Ionicons name="add" size={18} color="#FFFFFF" />
                  <Text style={styles.emptyAddBtnText}>Add "{searchQuery.trim() || 'New Dish'}"</Text>
                </TouchableOpacity>
              </View>
            }
            renderItem={({ item }) => {
              const qty = quantities[item.id] || 0;
              return (
                <View style={styles.card}>
                  <View style={styles.cardImageContainer}>
                    {item.image ? (
                      <Image
                        source={{ uri: item.image }}
                        style={styles.cardImage}
                        resizeMode="cover"
                      />
                    ) : null}
                    <View style={[styles.cardImageFallback, { backgroundColor: item.isVeg ? '#F0FDF4' : '#FEF2F2' }]}>
                      <Ionicons
                        name={
                          item.category === 'Breads'
                            ? 'fast-food-outline'
                            : item.category === 'Drinks' || item.category === 'Beverages'
                            ? 'cafe-outline'
                            : item.category === 'Desserts'
                            ? 'ice-cream-outline'
                            : 'restaurant-outline'
                        }
                        size={28}
                        color={item.isVeg ? Colors.successGreen : Colors.primaryRed}
                      />
                      <Text style={[styles.fallbackCategoryBadge, { color: item.isVeg ? Colors.successGreen : Colors.primaryRed }]}>
                        {item.category}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardBody}>
                    {/* Veg / Non-veg indicator + Name */}
                    <View style={styles.titleRow}>
                      <View
                        style={[
                          styles.dietBadge,
                          { borderColor: item.isVeg ? Colors.successGreen : Colors.primaryRed },
                        ]}
                      >
                        <View
                          style={[
                            styles.dietDot,
                            {
                              backgroundColor: item.isVeg
                               ? Colors.successGreen
                                : Colors.primaryRed,
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.cardName} numberOfLines={1}>
                        {item.name}
                      </Text>
                    </View>

                    {/* Price & Quantity Controls with MINUS (-) and PLUS (+) buttons */}
                    <View style={styles.cardFooter}>
                      <Text style={styles.cardPrice}>₹{item.price}</Text>

                      {qty > 0 ? (
                        <View style={styles.qtyControlContainer}>
                          {/* MINUS BUTTON */}
                          <TouchableOpacity
                            style={styles.qtyActionBtn}
                            onPress={() => handleDecrement(item.id)}
                            activeOpacity={0.7}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Ionicons name="remove" size={16} color={Colors.primaryRed} />
                          </TouchableOpacity>

                          {/* QUANTITY DISPLAY */}
                          <View style={styles.qtyNumberWrap}>
                            <Text style={styles.qtyNumberText}>{qty}</Text>
                          </View>

                          {/* PLUS BUTTON */}
                          <TouchableOpacity
                            style={styles.qtyActionBtn}
                            onPress={() => handleIncrement(item.id)}
                            activeOpacity={0.7}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Ionicons name="add" size={16} color={Colors.primaryRed} />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.addBtn}
                          onPress={() => handleIncrement(item.id)}
                          activeOpacity={0.8}
                        >
                          <Ionicons
                            name="add"
                            size={16}
                            color={Colors.primaryRed}
                          />
                          <Text style={styles.addBtnText}>ADD</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              );
            }}
          />
        )}

        {/* Sticky Bottom Bar - Starts from 0 items, ₹0.00 */}
        <View style={styles.bottomBar}>
          <View style={styles.totalWrap}>
            <Text style={styles.totalCountLabel}>
              {totalItemsCount} items · incl. GST
            </Text>
            <Text style={styles.totalAmount}>
              ₹{grandTotal.toFixed(2)}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.checkoutBtn,
              totalItemsCount === 0 && styles.checkoutBtnDisabled,
            ]}
            onPress={() => {
              if (onProceedToBillDetails) {
                onProceedToBillDetails();
              } else {
                setShowCheckoutModal(true);
              }
            }}
            disabled={totalItemsCount === 0}
            activeOpacity={0.85}
          >
            <Ionicons
              name="arrow-forward"
              size={18}
              color="#FFFFFF"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.checkoutBtnText}>Checkout</Text>
          </TouchableOpacity>
        </View>

        {/* Table Selection Modal */}
        <Modal
          visible={showTableModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowTableModal(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowTableModal(false)}
          >
            <View style={styles.modalSheet}>
              <Text style={styles.modalTitle}>Select Table or Order Type</Text>
              {tables.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.modalOption,
                    selectedTable === t && styles.modalOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedTable(t);
                    setShowTableModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      selectedTable === t && styles.modalOptionTextSelected,
                    ]}
                  >
                    {t}
                  </Text>
                  {selectedTable === t && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={Colors.primaryRed}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Quick Add Custom Dish Modal */}
        <Modal
          visible={showQuickAddModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowQuickAddModal(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalOverlay}
          >
            <View style={styles.quickAddModalCard}>
              <View style={styles.sheetHeader}>
                <View>
                  <Text style={styles.sheetTitle}>Add Custom Dish</Text>
                  <Text style={styles.sheetSubText}>
                    Add directly to current bill and menu catalog
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setShowQuickAddModal(false)}>
                  <Ionicons name="close" size={24} color={Colors.navy} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Veg / Non-Veg Selector */}
                <Text style={styles.modalInputLabel}>Food Preference</Text>
                <View style={styles.vegToggleRow}>
                  <TouchableOpacity
                    style={[
                      styles.vegChoiceBtn,
                      quickDishIsVeg && styles.vegChoiceBtnActive,
                    ]}
                    onPress={() => setQuickDishIsVeg(true)}
                  >
                    <View style={[styles.dietBadge, { borderColor: Colors.successGreen }]}>
                      <View style={[styles.dietDot, { backgroundColor: Colors.successGreen }]} />
                    </View>
                    <Text
                      style={[
                        styles.vegChoiceText,
                        quickDishIsVeg && { color: Colors.successGreen, fontWeight: '700' },
                      ]}
                    >
                      Pure Veg
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.vegChoiceBtn,
                      !quickDishIsVeg && styles.nonVegChoiceBtnActive,
                    ]}
                    onPress={() => setQuickDishIsVeg(false)}
                  >
                    <View style={[styles.dietBadge, { borderColor: Colors.primaryRed }]}>
                      <View style={[styles.dietDot, { backgroundColor: Colors.primaryRed }]} />
                    </View>
                    <Text
                      style={[
                        styles.vegChoiceText,
                        !quickDishIsVeg && { color: Colors.primaryRed, fontWeight: '700' },
                      ]}
                    >
                      Non-Veg
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Dish Name */}
                <Text style={styles.modalInputLabel}>Dish Name *</Text>
                <TextInput
                  style={styles.modalInputField}
                  placeholder="e.g. Paneer Tikka, Chicken Kebab"
                  placeholderTextColor={Colors.secondaryText}
                  value={quickDishName}
                  onChangeText={setQuickDishName}
                />

                {/* Category Selection */}
                <Text style={styles.modalInputLabel}>Category</Text>
                <View style={styles.categoryWrapRow}>
                  {['Starters', 'Mains', 'Breads', 'Drinks', 'Desserts'].map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.catTagBtn,
                        quickDishCategory === cat && styles.catTagBtnActive,
                      ]}
                      onPress={() => setQuickDishCategory(cat)}
                    >
                      <Text
                        style={[
                          styles.catTagText,
                          quickDishCategory === cat && styles.catTagTextActive,
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Price */}
                <Text style={styles.modalInputLabel}>Price (₹) *</Text>
                <TextInput
                  style={styles.modalInputField}
                  placeholder="e.g. 260"
                  placeholderTextColor={Colors.secondaryText}
                  keyboardType="numeric"
                  value={quickDishPrice}
                  onChangeText={setQuickDishPrice}
                />
              </ScrollView>

              <View style={styles.quickAddFooter}>
                <TouchableOpacity
                  style={styles.cancelModalBtn}
                  onPress={() => setShowQuickAddModal(false)}
                >
                  <Text style={styles.cancelModalBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveQuickDishBtn, isSavingQuickDish && { opacity: 0.7 }]}
                  onPress={handleSaveQuickDish}
                  disabled={isSavingQuickDish}
                >
                  {isSavingQuickDish ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveQuickDishBtnText}>Add to Bill</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Checkout Modal with Itemized List & Minus/Plus controls */}
        <Modal
          visible={showCheckoutModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowCheckoutModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.checkoutSheet}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Review Bill #1048</Text>
                <TouchableOpacity onPress={() => setShowCheckoutModal(false)}>
                  <Ionicons name="close" size={24} color={Colors.navy} />
                </TouchableOpacity>
              </View>

              <Text style={styles.sheetSub}>
                {selectedTable} • {totalItemsCount} items
              </Text>

              {/* Itemized Order List in Checkout Sheet */}
              <ScrollView style={styles.checkoutItemsList} showsVerticalScrollIndicator={false}>
                {selectedCartItems.map((cartItem) => (
                  <View key={cartItem.id} style={styles.checkoutItemRow}>
                    <View style={styles.checkoutItemLeft}>
                      <View
                        style={[
                          styles.dietBadge,
                          { borderColor: cartItem.isVeg ? Colors.successGreen : Colors.primaryRed },
                        ]}
                      >
                        <View
                          style={[
                            styles.dietDot,
                            { backgroundColor: cartItem.isVeg ? Colors.successGreen : Colors.primaryRed },
                          ]}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.checkoutItemName} numberOfLines={1}>
                          {cartItem.name}
                        </Text>
                        <Text style={styles.checkoutItemPrice}>
                          ₹{cartItem.price} each
                        </Text>
                      </View>
                    </View>

                    {/* Quantity controls with MINUS and PLUS */}
                    <View style={styles.checkoutItemRight}>
                      <View style={styles.checkoutQtyControl}>
                        <TouchableOpacity
                          style={styles.checkoutQtyBtn}
                          onPress={() => handleDecrement(cartItem.id)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="remove" size={14} color={Colors.primaryRed} />
                        </TouchableOpacity>

                        <Text style={styles.checkoutQtyVal}>{cartItem.qty}</Text>

                        <TouchableOpacity
                          style={styles.checkoutQtyBtn}
                          onPress={() => handleIncrement(cartItem.id)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="add" size={14} color={Colors.primaryRed} />
                        </TouchableOpacity>
                      </View>

                      <Text style={styles.checkoutItemSubtotal}>
                        ₹{cartItem.itemTotal}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>

              <View style={styles.summaryBox}>
                <View style={styles.summaryLine}>
                  <Text style={styles.summaryLabel}>Subtotal</Text>
                  <Text style={styles.summaryVal}>₹{subtotal.toFixed(2)}</Text>
                </View>
                <View style={styles.summaryLine}>
                  <Text style={styles.summaryLabel}>
                    {activeGstRate > 0
                      ? `CGST (${halfGstPercent.toFixed(1)}%) + SGST (${halfGstPercent.toFixed(1)}%)`
                      : 'GST Exempt / Disabled (0%)'}
                  </Text>
                  <Text style={styles.summaryVal}>₹{(cgst + sgst).toFixed(2)}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryLine}>
                  <Text style={styles.summaryTotalLabel}>Grand Total</Text>
                  <Text style={styles.summaryTotalVal}>
                    ₹{grandTotal.toFixed(2)}
                  </Text>
                </View>
              </View>

              <Text style={styles.payHeading}>Select Payment Method</Text>
              <View style={styles.paymentMethodsRow}>
                {['UPI QR', 'Cash', 'Card'].map((pm) => (
                  <TouchableOpacity
                    key={pm}
                    style={styles.pmBtn}
                    onPress={() => {
                      setShowCheckoutModal(false);
                      setOrderCompleteModal(true);
                    }}
                  >
                    <Ionicons
                      name={
                        pm === 'UPI QR'
                          ? 'qr-code-outline'
                          : pm === 'Cash'
                          ? 'cash-outline'
                          : 'card-outline'
                      }
                      size={20}
                      color={Colors.navy}
                    />
                    <Text style={styles.pmLabel}>{pm}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </Modal>

        {/* Bill Settled Success Modal */}
        <Modal
          visible={orderCompleteModal}
          transparent
          animationType="fade"
          onRequestClose={() => setOrderCompleteModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.successModal}>
              <View style={styles.successIconCircle}>
                <Ionicons name="checkmark" size={32} color="#FFFFFF" />
              </View>
              <Text style={styles.successTitle}>Bill Settled Successfully!</Text>
              <Text style={styles.successSub}>
                Bill #1048 for {selectedTable} has been printed and sent to KOT.
              </Text>

              <TouchableOpacity
                style={styles.doneBtn}
                onPress={() => {
                  setOrderCompleteModal(false);
                  setQuantities({});
                  onBackToDashboard();
                }}
              >
                <Text style={styles.doneBtnText}>Back to Dashboard</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickAddHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryRed,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 4,
  },
  quickAddHeaderText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.navy,
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  historyBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  tableSelector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tableSelectorText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.navy,
  },
  cartBadge: {
    backgroundColor: '#FFE4E6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cartBadgeText: {
    color: Colors.primaryRed,
    fontSize: 12,
    fontWeight: '700',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    marginHorizontal: 18,
    marginTop: 10,
    marginBottom: 8,
    paddingHorizontal: 14,
    height: 46,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.navy,
    paddingVertical: 0,
  },
  quickAddBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 12,
    marginHorizontal: 18,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  quickAddBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  quickAddIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickAddBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.navy,
  },
  quickAddBannerSub: {
    fontSize: 11,
    color: Colors.secondaryText,
    marginTop: 1,
  },
  categoryScrollContainer: {
    height: 44,
    marginBottom: 10,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryPillActive: {
    backgroundColor: Colors.primaryRed,
    borderColor: Colors.primaryRed,
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.navy,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.secondaryText,
  },
  listContent: {
    paddingHorizontal: 18,
    paddingBottom: 110,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  emptyListWrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 24,
    alignItems: 'center',
    marginVertical: 12,
  },
  emptyListTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.navy,
    marginTop: 10,
  },
  emptyListSub: {
    fontSize: 12,
    color: Colors.secondaryText,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryRed,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 14,
    gap: 6,
  },
  emptyAddBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardImageContainer: {
    width: '100%',
    height: 110,
    backgroundColor: '#F8FAFC',
    position: 'relative',
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
  },
  cardImageFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  fallbackCategoryBadge: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardBody: {
    padding: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  dietBadge: {
    width: 14,
    height: 14,
    borderWidth: 1.5,
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dietDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  cardName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.navy,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.navy,
  },

  // Counter with MINUS and PLUS
  qtyControlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECDD3',
    height: 32,
    paddingHorizontal: 2,
  },
  qtyActionBtn: {
    width: 26,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyNumberWrap: {
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  qtyNumberText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primaryRed,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    justifyContent: 'center',
  },
  addBtnText: {
    color: Colors.primaryRed,
    fontSize: 12,
    fontWeight: '700',
  },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 8,
  },
  totalWrap: {
    flex: 1,
  },
  totalCountLabel: {
    fontSize: 12,
    color: Colors.secondaryText,
    fontWeight: '500',
    marginBottom: 2,
  },
  totalAmount: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.navy,
    letterSpacing: -0.4,
  },
  checkoutBtn: {
    backgroundColor: Colors.primaryRed,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    height: 48,
    borderRadius: 14,
    shadowColor: Colors.primaryRed,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  checkoutBtnDisabled: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
  },
  checkoutBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.navy,
    marginBottom: 16,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalOptionSelected: {
    borderBottomColor: Colors.primaryRed,
  },
  modalOptionText: {
    fontSize: 15,
    color: Colors.navy,
    fontWeight: '500',
  },
  modalOptionTextSelected: {
    color: Colors.primaryRed,
    fontWeight: '700',
  },

  // Quick Add Modal Card
  quickAddModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    maxHeight: '85%',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.navy,
  },
  sheetSubText: {
    fontSize: 12,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  modalInputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.navy,
    marginBottom: 6,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  modalInputField: {
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
    paddingVertical: 10,
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
  categoryWrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  catTagBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  catTagBtnActive: {
    backgroundColor: Colors.navy,
    borderColor: Colors.navy,
  },
  catTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.secondaryText,
  },
  catTagTextActive: {
    color: '#FFFFFF',
  },
  quickAddFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 10,
  },
  cancelModalBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelModalBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondaryText,
  },
  saveQuickDishBtn: {
    flex: 2,
    height: 46,
    borderRadius: 12,
    backgroundColor: Colors.primaryRed,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveQuickDishBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Checkout Sheet with Items
  checkoutSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetSub: {
    fontSize: 13,
    color: Colors.secondaryText,
    marginTop: 4,
    marginBottom: 14,
  },
  checkoutItemsList: {
    maxHeight: 200,
    marginBottom: 14,
  },
  checkoutItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  checkoutItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  checkoutItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.navy,
  },
  checkoutItemPrice: {
    fontSize: 11,
    color: Colors.secondaryText,
  },
  checkoutItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkoutQtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FECDD3',
    paddingHorizontal: 2,
    height: 28,
  },
  checkoutQtyBtn: {
    width: 22,
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkoutQtyVal: {
    minWidth: 16,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryRed,
  },
  checkoutItemSubtotal: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.navy,
    minWidth: 50,
    textAlign: 'right',
  },
  summaryBox: {
    backgroundColor: Colors.background,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  summaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 13,
    color: Colors.secondaryText,
  },
  summaryVal: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.navy,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 6,
  },
  summaryTotalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.navy,
  },
  summaryTotalVal: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.primaryRed,
  },
  payHeading: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.navy,
    marginBottom: 10,
  },
  paymentMethodsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  pmBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 6,
  },
  pmLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.navy,
  },
  successModal: {
    margin: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    alignSelf: 'center',
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.successGreen,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.navy,
    textAlign: 'center',
    marginBottom: 8,
  },
  successSub: {
    fontSize: 14,
    color: Colors.secondaryText,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  doneBtn: {
    backgroundColor: Colors.navy,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
