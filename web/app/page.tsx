'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Printer,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  UtensilsCrossed,
  Receipt,
  X,
  ShieldCheck,
  ChefHat,
  User,
  Phone,
  HardDrive,
  Lock,
  LogOut,
  Check,
  AlertCircle,
  RefreshCw,
  Bluetooth,
  Usb,
  Cpu,
  History,
  CreditCard,
  Banknote,
  QrCode,
  ArrowLeft,
  Clock,
  Calendar,
  Filter,
  DollarSign,
  TrendingUp,
  Copy,
  Settings,
  Sliders,
  FileText,
  Sparkles,
  Key,
  Smartphone,
  UserPlus,
} from 'lucide-react';

interface MenuItem {
  id: string | number;
  name: string;
  category: string;
  price: number;
  isVeg: boolean;
  isAvailable?: boolean;
  description: string;
}

interface CartItem extends MenuItem {
  quantity: number;
}

interface Table {
  id: string | number;
  number: string;
  capacity: number;
  section: string;
  status: 'available' | 'occupied' | 'billing';
  activeItemsCount?: number;
  activeTotal?: number;
  kotToken?: number;
  placedAt?: string;
}

interface TableOrderDraft {
  cart: CartItem[];
  specialNote: string;
  customerName: string;
  customerPhone: string;
  kotToken?: number;
  paymentMethod: 'Cash' | 'UPI' | 'Card';
  status: 'available' | 'occupied' | 'billing';
  placedAt?: string;
}

export interface OrderHistoryItem {
  id: string;
  billNumber: string;
  kotToken: number;
  tableId: string | number;
  tableNumber: string;
  tableSection: string;
  customerName?: string;
  customerPhone?: string;
  serverName: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  cgst: number;
  sgst: number;
  grandTotal: number;
  paymentMethod: 'Cash' | 'UPI' | 'Card';
  createdAt: string;
  formattedDate: string;
  formattedTime: string;
  specialNote?: string;
  status: 'billed' | 'settled';
}

interface ManagerSession {
  token: string;
  name: string;
  role: string;
  identifier: string;
  restaurantId?: number;
  restaurantName?: string;
  restaurantLocation?: string;
  restaurantPhone?: string;
  gstNumber?: string;
  fssai?: string;
}

export interface RealPrinterDevice {
  id: string;
  name: string;
  connectionType: 'usb' | 'bluetooth' | 'serial' | 'system';
  paperWidth: '58mm' | '80mm';
  status: 'connected' | 'paired';
  vendorId?: number | string;
  productId?: number | string;
}

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // If accessing from localhost / 127.0.0.1 (local dev / local POS counter)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'https://api.ezydine.in/api';
    }
    // If accessing from ezydine.in domain (e.g. manager.ezydine.in)
    if (window.location.hostname.includes('ezydine.in')) {
      return `${window.location.protocol}//api.ezydine.in/api`;
    }
  }
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
  }
  return 'https://api.ezydine.in/api';
};

const apiFetch = async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const base = getApiBaseUrl();
  const primaryUrl = `${base}${path}`;

  return await fetch(primaryUrl, options);
};

// Specialized Print fetcher: First attempts local hardware agent on counter PC (for USB thermal printing), then falls back to cloud API
const printApiFetch = async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  if (typeof window !== 'undefined') {
    // 1. Try local hardware counter printer agent first (runs on local counter machine at port 5001)
    const localCandidates = [
      `https://api.ezydine.in/api${path}`,
      `https://api.ezydine.in/api${path}`,
    ];

    for (const localUrl of localCandidates) {
      try {
        const localController = new AbortController();
        const localTimeout = setTimeout(() => localController.abort(), 2500);
        const res = await fetch(localUrl, {
          ...options,
          signal: localController.signal,
        });
        clearTimeout(localTimeout);
        if (res.ok) {
          const clone = res.clone();
          try {
            const data = await clone.json();
            // If local hardware returned real result (not cloud fallback message)
            if (data && (data.printedVia || !data.fallbackToBrowser || (Array.isArray(data.printers) && data.printers.length > 0))) {
              return res;
            }
          } catch {
            return res;
          }
        }
      } catch {
        // Local agent port not responding on this candidate, try next
      }
    }
  }

  return await apiFetch(endpoint, options);
};

const FALLBACK_FLOOR_TABLES: Table[] = [
  { id: '1', number: '01', capacity: 2, section: 'Dine-In', status: 'available' },
  { id: '2', number: '02', capacity: 4, section: 'Dine-In', status: 'available' },
  { id: '3', number: '03', capacity: 4, section: 'Dine-In', status: 'available' },
  { id: '4', number: '04', capacity: 6, section: 'Dine-In', status: 'available' },
  { id: '5', number: '05', capacity: 2, section: 'Dine-In', status: 'available' },
  { id: '6', number: '06', capacity: 4, section: 'Dine-In', status: 'available' },
  { id: '7', number: 'VIP-1', capacity: 8, section: 'VIP Lounge', status: 'available' },
  { id: '8', number: 'VIP-2', capacity: 10, section: 'VIP Lounge', status: 'available' },
  { id: '9', number: 'T-01', capacity: 4, section: 'Terrace', status: 'available' },
  { id: '10', number: 'T-02', capacity: 4, section: 'Terrace', status: 'available' },
  { id: '11', number: 'TK-1', capacity: 0, section: 'Takeaway', status: 'available' },
];

export default function ManagerOrderPortal() {
  // Navigation & View Mode: 'pos' (floor billing) | 'history' (order history & reprint) | 'master' (App Logins & OTPs)
  const [currentView, setCurrentView] = useState<'pos' | 'history' | 'master'>('pos');

  // Master Admin State (Creating App Login & Live App Requested OTPs)
  const [masterSubTab, setMasterSubTab] = useState<'otps' | 'create_login' | 'logins'>('otps');
  const [masterOtps, setMasterOtps] = useState<any[]>([]);
  const [masterAppLogins, setMasterAppLogins] = useState<any[]>([]);
  const [isMasterLoading, setIsMasterLoading] = useState(false);
  const [masterOtpCopied, setMasterOtpCopied] = useState<string | null>(null);
  const [createLoginPhone, setCreateLoginPhone] = useState('');
  const [createLoginName, setCreateLoginName] = useState('');
  const [createLoginRestName, setCreateLoginRestName] = useState('');
  const [createLoginLocation, setCreateLoginLocation] = useState('');
  const [createLoginPin, setCreateLoginPin] = useState('1234');
  const [createLoginPlan, setCreateLoginPlan] = useState('plan_starter_3000');
  const [isCreatingLogin, setIsCreatingLogin] = useState(false);
  const [createLoginError, setCreateLoginError] = useState('');
  const [createdLoginSuccess, setCreatedLoginSuccess] = useState<any | null>(null);

  // Direct Hardware Print State (No Browser System Dialog Pop-up)
  const [isDirectPrinting, setIsDirectPrinting] = useState(false);

  // Authentication State
  const [managerSession, setManagerSession] = useState<ManagerSession | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Login Form State
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Database-Synced Menu Items for this Manager's Restaurant
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isMenuLoading, setIsMenuLoading] = useState(false);

  // Tables State & Table Orders Map (Stores active draft/placed order per table)
  const [floorTables, setFloorTables] = useState<Table[]>(FALLBACK_FLOOR_TABLES);
  const [tableOrders, setTableOrders] = useState<Record<string, TableOrderDraft>>({});
  const [selectedTable, setSelectedTable] = useState<Table>(FALLBACK_FLOOR_TABLES[0]);

  // Order & Cart State (Active table's draft)
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [specialNote, setSpecialNote] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'Cash' | 'UPI' | 'Card'>('UPI');

  // Order History State (Persisted in localStorage)
  const [orderHistory, setOrderHistory] = useState<OrderHistoryItem[]>([]);
  const [historyFilterPayment, setHistoryFilterPayment] = useState<'all' | 'Cash' | 'UPI' | 'Card'>('all');
  const [historySearchQuery, setHistorySearchQuery] = useState('');

  // Hardware Printer State
  const [pairedPrinters, setPairedPrinters] = useState<RealPrinterDevice[]>([]);
  const [activePrinter, setActivePrinter] = useState<RealPrinterDevice>({
    id: 'sys_Printe_KPrinte',
    name: 'Printe_KPrinte',
    connectionType: 'usb',
    paperWidth: '58mm',
    status: 'connected',
  });
  const [isPrinterModalOpen, setIsPrinterModalOpen] = useState(false);
  const [isScanningPrinter, setIsScanningPrinter] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [customPrinterName, setCustomPrinterName] = useState('');

  // Print Mode State ('bill' | 'kot') & Print Target Data
  const [activePrintMode, setActivePrintMode] = useState<'bill' | 'kot'>('bill');
  const [kotTokenNumber, setKotTokenNumber] = useState<number>(0);
  const [printStatusMessage, setPrintStatusMessage] = useState<string | null>(null);
  const [reprintTargetOrder, setReprintTargetOrder] = useState<OrderHistoryItem | null>(null);

  // Owner-Saved Receipt Template Configuration
  const [ownerTemplate, setOwnerTemplate] = useState<{
    showLogo: boolean;
    showGst: boolean;
    showFssai: boolean;
    showCashier: boolean;
    headerText: string;
    footerText: string;
    paperWidth: '58mm' | '80mm';
  }>({
    showLogo: true,
    showGst: true,
    showFssai: true,
    showCashier: false,
    headerText: 'Authentic Flavors · Fresh Ingredients',
    footerText: 'Thank you for dining with us! Visit again.',
    paperWidth: '80mm',
  });

  // Dedicated "Generate Print" View in Owner-Saved Template (Replaces automatic system print dialog)
  const [isGeneratePrintOpen, setIsGeneratePrintOpen] = useState(false);
  const [generatedPrintData, setGeneratedPrintData] = useState<{
    mode: 'bill' | 'kot';
    order: any;
  } | null>(null);
  const [isTemplateEditorOpen, setIsTemplateEditorOpen] = useState(false);
  const [copiedSlip, setCopiedSlip] = useState(false);

  const isInitialLoadedRef = useRef(false);

  // Storage Key Helpers (strictly isolated by restaurant ID)
  const getTableOrdersKey = (restId?: number | string) =>
    `ezydine_table_orders_${restId || 'default'}`;
  const getSelectedTableIdKey = (restId?: number | string) =>
    `ezydine_selected_table_id_${restId || 'default'}`;
  const getOwnerTemplateKey = (restId?: number | string) =>
    `ezydine_owner_template_${restId || 'default'}`;

  // Load saved session, printers, order history, and ACTIVE TABLE ORDERS on mount
  useEffect(() => {
    try {
      const storedSession = localStorage.getItem('ezydine_manager_session');
      let currentRestId: number | string | undefined = undefined;

      if (storedSession) {
        const parsed = JSON.parse(storedSession);
        setManagerSession(parsed);
        currentRestId = parsed.restaurantId;
        fetchRestaurantMenu(parsed.token);
        fetchRestaurantTables(parsed.token, parsed.restaurantId);
        fetchOrderHistory(parsed.token, parsed.restaurantId);

        // Load order history for this restaurant
        const historyKey = `ezydine_order_history_${parsed.restaurantId || 'default'}`;
        const storedHistory = localStorage.getItem(historyKey);
        if (storedHistory) {
          try {
            setOrderHistory(JSON.parse(storedHistory));
          } catch {
            // ignore
          }
        }
      }

      // 1. Load saved table orders from localStorage
      const ordersKey = getTableOrdersKey(currentRestId);
      const storedTableOrders = localStorage.getItem(ordersKey);
      let loadedTableOrders: Record<string, TableOrderDraft> = {};
      if (storedTableOrders) {
        try {
          loadedTableOrders = JSON.parse(storedTableOrders);
          setTableOrders(loadedTableOrders);
        } catch (e) {
          console.warn('Failed to parse stored table orders:', e);
        }
      }

      // 2. Load saved selected table
      const selKey = getSelectedTableIdKey(currentRestId);
      const storedSelectedId = localStorage.getItem(selKey);
      let initialTable = FALLBACK_FLOOR_TABLES[0];
      if (storedSelectedId) {
        const found = FALLBACK_FLOOR_TABLES.find((t) => String(t.id) === String(storedSelectedId));
        if (found) initialTable = found;
      }
      setSelectedTable(initialTable);

      // 3. Restore cart and details for the selected table
      const draft = loadedTableOrders[initialTable.id];
      if (draft) {
        setCart(draft.cart || []);
        setSpecialNote(draft.specialNote || '');
        setCustomerName(draft.customerName || '');
        setCustomerPhone(draft.customerPhone || '');
        setSelectedPaymentMethod(draft.paymentMethod || 'UPI');
      }

      // 4. Update floor tables so all tables with items show as occupied with correct count & amount!
      setFloorTables(
        FALLBACK_FLOOR_TABLES.map((t) => {
          const d = loadedTableOrders[t.id];
          const hasItems = d && d.cart && d.cart.length > 0;
          const count = hasItems ? d.cart.reduce((sum, item) => sum + item.quantity, 0) : 0;
          const sub = hasItems ? d.cart.reduce((sum, item) => sum + item.price * item.quantity, 0) : 0;
          const disc = sub > 500 ? 40 : 0;
          const tax = Math.max(0, sub - disc);
          const tot = Math.round(tax + tax * 0.05);

          return {
            ...t,
            status: (hasItems ? 'occupied' : 'available') as 'occupied' | 'available',
            activeItemsCount: count,
            activeTotal: tot,
            kotToken: d?.kotToken,
            placedAt: d?.placedAt,
          };
        })
      );

      // Load saved real paired printers
      const storedPrinters = localStorage.getItem('ezydine_real_printers');
      if (storedPrinters) {
        const parsedPrinters: RealPrinterDevice[] = JSON.parse(storedPrinters);
        if (Array.isArray(parsedPrinters) && parsedPrinters.length > 0) {
          setPairedPrinters(parsedPrinters);
        }
      }

      const storedActive = localStorage.getItem('ezydine_active_printer');
      if (storedActive) {
        setActivePrinter(JSON.parse(storedActive));
      }

      // 5. Load saved Owner Receipt Template
      const templateKey = getOwnerTemplateKey(currentRestId);
      const storedTemplate = localStorage.getItem(templateKey);
      if (storedTemplate) {
        try {
          const parsedTemplate = JSON.parse(storedTemplate);
          setOwnerTemplate(parsedTemplate);
        } catch {
          // ignore
        }
      }
      loadSystemPrinters();
    } catch {
      // fallback
    } finally {
      setIsAuthChecking(false);
      // Mark as loaded so subsequent modifications trigger auto-saving
      setTimeout(() => {
        isInitialLoadedRef.current = true;
      }, 50);
    }
  }, []);

  // Refresh hardware printers when modal is opened
  useEffect(() => {
    if (isPrinterModalOpen) {
      loadSystemPrinters();
    }
  }, [isPrinterModalOpen]);

  // Synchronize cart & draft when selectedTable changes
  const handleSelectTable = (table: Table) => {
    // 1. Immediately save current table draft before switching
    if (selectedTable) {
      const currentDraft: TableOrderDraft = {
        cart,
        specialNote,
        customerName,
        customerPhone,
        paymentMethod: selectedPaymentMethod,
        status: (cart.length > 0 ? 'occupied' : 'available') as 'occupied' | 'available',
        kotToken: tableOrders[selectedTable.id]?.kotToken,
        placedAt: tableOrders[selectedTable.id]?.placedAt,
      };
      const updated = {
        ...tableOrders,
        [selectedTable.id]: currentDraft,
      };
      setTableOrders(updated);
      const ordersKey = getTableOrdersKey(managerSession?.restaurantId);
      localStorage.setItem(ordersKey, JSON.stringify(updated));
    }

    // 2. Switch to new table
    setSelectedTable(table);
    const selKey = getSelectedTableIdKey(managerSession?.restaurantId);
    localStorage.setItem(selKey, String(table.id));

    // 3. Load new table's draft
    const nextDraft = tableOrders[table.id];
    if (nextDraft) {
      setCart(nextDraft.cart || []);
      setSpecialNote(nextDraft.specialNote || '');
      setCustomerName(nextDraft.customerName || '');
      setCustomerPhone(nextDraft.customerPhone || '');
      setSelectedPaymentMethod(nextDraft.paymentMethod || 'UPI');
    } else {
      setCart([]);
      setSpecialNote('');
      setCustomerName('');
      setCustomerPhone('');
      setSelectedPaymentMethod('UPI');
    }
  };

  // Live Auto-Save to localStorage whenever cart, notes, or customer details change
  useEffect(() => {
    if (!isInitialLoadedRef.current) return;

    const tableId = selectedTable.id;
    const hasItems = cart.length > 0;
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const tableSubtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tableDiscount = tableSubtotal > 500 ? 40 : 0;
    const tableTaxable = Math.max(0, tableSubtotal - tableDiscount);
    const tableTotal = Math.round(tableTaxable + tableTaxable * 0.05);

    setTableOrders((prev) => {
      let updated: Record<string, TableOrderDraft>;
      if (!hasItems && !specialNote.trim() && !customerName.trim() && !customerPhone.trim()) {
        updated = { ...prev };
        delete updated[tableId];
      } else {
        updated = {
          ...prev,
          [tableId]: {
            cart,
            specialNote,
            customerName,
            customerPhone,
            paymentMethod: selectedPaymentMethod,
            status: (hasItems ? 'occupied' : 'available') as 'occupied' | 'available',
            kotToken: prev[tableId]?.kotToken,
            placedAt: prev[tableId]?.placedAt,
          },
        };
      }
      const ordersKey = getTableOrdersKey(managerSession?.restaurantId);
      localStorage.setItem(ordersKey, JSON.stringify(updated));
      return updated;
    });

    // Update floor table status live
    setFloorTables((prev) =>
      prev.map((t) => {
        if (t.id === tableId) {
          return {
            ...t,
            status: (hasItems ? 'occupied' : 'available') as 'occupied' | 'available',
            activeItemsCount: count,
            activeTotal: hasItems ? tableTotal : 0,
          };
        }
        return t;
      })
    );

    const selKey = getSelectedTableIdKey(managerSession?.restaurantId);
    localStorage.setItem(selKey, String(tableId));
  }, [cart, specialNote, customerName, customerPhone, selectedPaymentMethod, selectedTable.id, managerSession?.restaurantId]);

  // Save order history helper
  const saveOrderHistory = (orders: OrderHistoryItem[]) => {
    setOrderHistory(orders);
    const historyKey = `ezydine_order_history_${managerSession?.restaurantId || 'default'}`;
    localStorage.setItem(historyKey, JSON.stringify(orders));
  };

  // Fetch PostgreSQL Menu Items specifically belonging to this Restaurant
  const fetchRestaurantMenu = async (token: string) => {
    setIsMenuLoading(true);
    try {
      const res = await apiFetch('/menu', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        setMenuItems(data.items);
      } else {
        setMenuItems([]);
      }
    } catch (e) {
      console.warn('Failed to fetch menu items from backend:', e);
      setMenuItems([]);
    } finally {
      setIsMenuLoading(false);
    }
  };

  // Fetch PostgreSQL Floor Tables for this Restaurant
  const fetchRestaurantTables = async (token: string, restId?: number) => {
    try {
      const res = await apiFetch('/tables', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.tables) && data.tables.length > 0) {
        const ordersKey = getTableOrdersKey(restId);
        const storedTableOrders = localStorage.getItem(ordersKey);
        let loadedOrders: Record<string, TableOrderDraft> = {};
        if (storedTableOrders) {
          try {
            loadedOrders = JSON.parse(storedTableOrders);
          } catch { }
        }

        const mappedTables: Table[] = data.tables.map((t: any) => {
          const tableIdStr = String(t.id);
          const d = loadedOrders[tableIdStr];
          const hasItems = d && d.cart && d.cart.length > 0;
          const count = hasItems ? d.cart.reduce((sum, item) => sum + item.quantity, 0) : (t.activeAmount > 0 ? 1 : 0);
          const sub = hasItems ? d.cart.reduce((sum, item) => sum + item.price * item.quantity, 0) : Number(t.activeAmount || 0);

          return {
            id: tableIdStr,
            number: String(t.tableNumber || t.id).replace(/^Table\s*/i, ''),
            capacity: t.seats || 4,
            section: t.section || 'Dine-In',
            status: (hasItems || t.status === 'occupied' ? 'occupied' : 'available') as 'available' | 'occupied',
            activeItemsCount: count,
            activeTotal: sub,
            kotToken: d?.kotToken,
            placedAt: d?.placedAt || t.activeTime,
          };
        });

        setFloorTables(mappedTables);
        setSelectedTable((prev) => {
          const found = mappedTables.find((mt) => String(mt.id) === String(prev.id));
          return found || mappedTables[0];
        });
      }
    } catch (e) {
      console.warn('Failed to fetch tables from backend:', e);
    }
  };

  // Fetch PostgreSQL Completed Bills (Order Done Data) for Manager View
  const fetchOrderHistory = async (token: string, restId?: number) => {
    try {
      const res = await apiFetch('/bills', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.bills)) {
        const formattedBills: OrderHistoryItem[] = data.bills.map((b: any, idx: number) => {
          const createdAt = b.date ? new Date(b.date) : new Date();
          const cleanNum = b.billNumber ? String(b.billNumber).replace(/^(Order\s*#?|#)/i, '').trim() : String(data.bills.length - idx);
          const tokenNum = parseInt(cleanNum, 10) || (data.bills.length - idx);

          return {
            id: String(b.id || `bill_${idx}`),
            billNumber: `Order #${cleanNum || (data.bills.length - idx)}`,
            kotToken: tokenNum,
            tableId: String(b.tableNumber || '01'),
            tableNumber: String(b.tableNumber || '01').replace(/^Table\s*/i, ''),
            tableSection: b.orderType || 'Dine-In',
            customerName: b.customerName || undefined,
            customerPhone: b.customerPhone || undefined,
            serverName: 'Manager',
            items: (b.items || []).map((it: any) => ({
              id: it.id,
              name: it.name,
              price: Number(it.price || 0),
              quantity: Number(it.quantity || 1),
              category: it.category || 'Mains',
              isVeg: it.isVeg !== false,
            })),
            subtotal: Number(b.subtotal || 0),
            discount: Number(b.discount || 0),
            cgst: Number(b.gstAmount ? b.gstAmount / 2 : 0),
            sgst: Number(b.gstAmount ? b.gstAmount / 2 : 0),
            grandTotal: Number(b.totalAmount || b.amount || 0),
            paymentMethod: (b.paymentMethod || 'UPI') as any,
            createdAt: b.date || createdAt.toISOString(),
            formattedDate: b.date || createdAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
            formattedTime: b.time || createdAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
            status: 'billed',
          };
        });

        setOrderHistory(formattedBills);
        const historyKey = `ezydine_order_history_${restId || 'default'}`;
        localStorage.setItem(historyKey, JSON.stringify(formattedBills));
      }
    } catch (e) {
      console.warn('Failed to fetch bills from server:', e);
    }
  };

  // Handle Manager Login strictly against PostgreSQL database
  const handleManagerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier.trim()) {
      setLoginError('Please enter your registered manager phone or email.');
      return;
    }
    if (loginPin.length < 4) {
      setLoginError('Please enter your 4-digit Manager Access PIN.');
      return;
    }

    setLoginError('');
    setIsLoggingIn(true);

    try {
      const res = await apiFetch('/auth/manager-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: loginIdentifier.trim(), pin: loginPin.trim() }),
      });
      const data = await res.json();

      if (data.success && data.manager) {
        const session: ManagerSession = {
          token: data.token,
          name: data.manager.name,
          role: data.manager.role,
          identifier: loginIdentifier.trim(),
          restaurantId: data.restaurant?.id,
          restaurantName: data.restaurant?.name || 'Restaurant',
          restaurantLocation: data.restaurant?.location || '',
          restaurantPhone: data.restaurant?.phone || '',
          gstNumber: data.restaurant?.gstNumber || '',
          fssai: data.restaurant?.fssai || '',
        };
        setManagerSession(session);
        localStorage.setItem('ezydine_manager_session', JSON.stringify(session));

        // Load order history for this specific logged-in restaurant
        const historyKey = `ezydine_order_history_${session.restaurantId || 'default'}`;
        const storedHistory = localStorage.getItem(historyKey);
        if (storedHistory) {
          try {
            setOrderHistory(JSON.parse(storedHistory));
          } catch {
            // ignore
          }
        }

        // Load table orders for this restaurant
        const ordersKey = getTableOrdersKey(session.restaurantId);
        const storedTableOrders = localStorage.getItem(ordersKey);
        let loadedOrders: Record<string, TableOrderDraft> = {};
        if (storedTableOrders) {
          try {
            loadedOrders = JSON.parse(storedTableOrders);
            setTableOrders(loadedOrders);
          } catch {
            // ignore
          }
        }

        const selKey = getSelectedTableIdKey(session.restaurantId);
        const storedSelId = localStorage.getItem(selKey);
        let curTable = FALLBACK_FLOOR_TABLES[0];
        if (storedSelId) {
          const found = FALLBACK_FLOOR_TABLES.find((t) => String(t.id) === String(storedSelId));
          if (found) curTable = found;
        }
        setSelectedTable(curTable);
        const draft = loadedOrders[curTable.id];
        if (draft) {
          setCart(draft.cart || []);
          setSpecialNote(draft.specialNote || '');
          setCustomerName(draft.customerName || '');
          setCustomerPhone(draft.customerPhone || '');
          setSelectedPaymentMethod(draft.paymentMethod || 'UPI');
        } else {
          setCart([]);
          setSpecialNote('');
          setCustomerName('');
          setCustomerPhone('');
          setSelectedPaymentMethod('UPI');
        }

        setFloorTables(
          FALLBACK_FLOOR_TABLES.map((t) => {
            const d = loadedOrders[t.id];
            const hasItems = d && d.cart && d.cart.length > 0;
            const count = hasItems ? d.cart.reduce((sum, item) => sum + item.quantity, 0) : 0;
            const sub = hasItems ? d.cart.reduce((sum, item) => sum + item.price * item.quantity, 0) : 0;
            const disc = sub > 500 ? 40 : 0;
            const tax = Math.max(0, sub - disc);
            const tot = Math.round(tax + tax * 0.05);

            return {
              ...t,
              status: (hasItems ? 'occupied' : 'available') as 'occupied' | 'available',
              activeItemsCount: count,
              activeTotal: tot,
              kotToken: d?.kotToken,
              placedAt: d?.placedAt,
            };
          })
        );

        // Load saved Owner Receipt Template
        const templateKey = getOwnerTemplateKey(session.restaurantId);
        const storedTemplate = localStorage.getItem(templateKey);
        if (storedTemplate) {
          try {
            setOwnerTemplate(JSON.parse(storedTemplate));
          } catch {
            // ignore
          }
        }

        fetchRestaurantMenu(data.token);
        fetchRestaurantTables(data.token, session.restaurantId);
        fetchOrderHistory(data.token, session.restaurantId);
      } else {
        setLoginError(
          data.error ||
          'Manager account not found or invalid PIN. Please verify credentials or set up Manager PIN in mobile app Staff Management.'
        );
      }
    } catch (err: any) {
      console.warn('Manager login network issue:', err);
      setLoginError('Connection error contacting database server. Please check backend connection.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    if (confirm('Log out from Manager POS portal?')) {
      setManagerSession(null);
      localStorage.removeItem('ezydine_manager_session');
      setCart([]);
      setTableOrders({});
      setFloorTables(FALLBACK_FLOOR_TABLES);
      setSelectedTable(FALLBACK_FLOOR_TABLES[0]);
      setMenuItems([]);
      setLoginPin('');
    }
  };

  // Hardware Printer Helper
  const saveAndActivatePrinter = (device: RealPrinterDevice) => {
    setPairedPrinters((prev) => {
      const filtered = prev.filter((p) => p.id !== device.id);
      const updated = [device, ...filtered];
      localStorage.setItem('ezydine_real_printers', JSON.stringify(updated));
      return updated;
    });
    setActivePrinter(device);
    localStorage.setItem('ezydine_active_printer', JSON.stringify(device));
    setScanMessage(`Connected printer: ${device.name}`);
    setPrintStatusMessage(`Active Printer: ${device.name}`);
    setTimeout(() => {
      setScanMessage(null);
      setPrintStatusMessage(null);
    }, 3500);
  };

  // Real USB Printer Scan using WebUSB API
  const handleScanUsbPrinter = async () => {
    setIsScanningPrinter(true);
    setScanError(null);
    try {
      if ('usb' in navigator) {
        const device = await (navigator as any).usb.requestDevice({ filters: [] });
        const name = device.productName || device.manufacturerName || `USB POS Printer (VID: ${device.vendorId})`;

        // Test if Windows OS allows opening this device directly in browser
        let canOpenDirectly = true;
        try {
          await device.open();
          await device.close();
        } catch (openErr: any) {
          if (openErr.name === 'SecurityError' || openErr.message?.includes('Access denied')) {
            canOpenDirectly = false;
            console.warn('Windows has exclusive lock on this printer via usbprint.sys driver.');
          }
        }

        const newPrinter: RealPrinterDevice = {
          id: `usb_${device.vendorId}_${device.productId}_${Date.now()}`,
          name,
          connectionType: 'usb',
          paperWidth: '80mm',
          status: 'connected',
          vendorId: device.vendorId,
          productId: device.productId,
        };
        saveAndActivatePrinter(newPrinter);
        if (!canOpenDirectly) {
          setScanMessage(`Paired ${name}. (Windows Driver is locking raw USB. Spooling via printer service or Kiosk mode).`);
        }
      } else {
        setScanError('WebUSB is not supported in this browser. Please use Chrome or select System Printer.');
      }
    } catch (err: any) {
      if (err.name !== 'NotFoundError') {
        if (err.name === 'SecurityError' || err.message?.includes('Access denied')) {
          setScanError('Windows has locked this USB printer with its system driver. On Windows, please use "Serial / COM" or use Chrome Kiosk Silent Print mode.');
        } else {
          setScanError(err.message || 'Failed to detect USB device.');
        }
      }
    } finally {
      setIsScanningPrinter(false);
    }
  };

  // Real Bluetooth Printer Scan using Web Bluetooth API
  const handleScanBluetoothPrinter = async () => {
    setIsScanningPrinter(true);
    setScanError(null);
    try {
      if ('bluetooth' in navigator) {
        const device = await (navigator as any).bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'],
        });
        const name = device.name || 'Bluetooth Receipt Printer';
        const newPrinter: RealPrinterDevice = {
          id: `bt_${device.id || Date.now()}`,
          name,
          connectionType: 'bluetooth',
          paperWidth: '58mm',
          status: 'connected',
        };
        saveAndActivatePrinter(newPrinter);
      } else {
        setScanError('Web Bluetooth is not available in this browser. Please use Chrome/Edge on macOS/Windows/Android.');
      }
    } catch (err: any) {
      if (err.name !== 'NotFoundError') {
        setScanError(err.message || 'Failed to connect Bluetooth device.');
      }
    } finally {
      setIsScanningPrinter(false);
    }
  };

  // Real Serial / COM Port Printer Scan using Web Serial API
  const handleScanSerialPrinter = async () => {
    setIsScanningPrinter(true);
    setScanError(null);
    try {
      if ('serial' in navigator) {
        const port = await (navigator as any).serial.requestPort();
        const info = port.getInfo ? port.getInfo() : {};
        const name = `Serial/COM Port Printer (VID: ${info.usbVendorId || 'COM'})`;
        const newPrinter: RealPrinterDevice = {
          id: `serial_${Date.now()}`,
          name,
          connectionType: 'serial',
          paperWidth: '80mm',
          status: 'connected',
        };
        saveAndActivatePrinter(newPrinter);
      } else {
        setScanError('Web Serial is not available in this browser. Please use Chrome or Edge.');
      }
    } catch (err: any) {
      if (err.name !== 'NotFoundError') {
        setScanError(err.message || 'Failed to connect Serial port.');
      }
    } finally {
      setIsScanningPrinter(false);
    }
  };

  const handleAddSystemPrinter = () => {
    const name = customPrinterName.trim() || 'Default OS System Printer (Spooler)';
    const newPrinter: RealPrinterDevice = {
      id: `sys_${Date.now()}`,
      name,
      connectionType: 'system',
      paperWidth: activePrinter.paperWidth || '80mm',
      status: 'connected',
    };
    saveAndActivatePrinter(newPrinter);
    setCustomPrinterName('');
  };

  const handleRemovePrinter = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = pairedPrinters.filter((p) => p.id !== id);
    setPairedPrinters(updated);
    localStorage.setItem('ezydine_real_printers', JSON.stringify(updated));
    if (activePrinter.id === id) {
      const fallback: RealPrinterDevice = updated[0] || {
        id: 'default_system_printer',
        name: 'Default System Spooler (USB/Network)',
        connectionType: 'system',
        paperWidth: '80mm',
        status: 'connected',
      };
      setActivePrinter(fallback);
      localStorage.setItem('ezydine_active_printer', JSON.stringify(fallback));
    }
  };

  const handleUpdatePaperWidth = (width: '58mm' | '80mm') => {
    const updated: RealPrinterDevice = { ...activePrinter, paperWidth: width };
    setActivePrinter(updated);
    localStorage.setItem('ezydine_active_printer', JSON.stringify(updated));
    setPairedPrinters((prev) =>
      prev.map((p) => (p.id === activePrinter.id ? { ...p, paperWidth: width } : p))
    );
  };

  // Auto-discover and connect real CUPS / OS hardware thermal printers
  const loadSystemPrinters = async () => {
    try {
      const res = await printApiFetch('/print/printers');
      const data = await res.json();
      if (data.success && Array.isArray(data.printers) && data.printers.length > 0) {
        const discoveredPrinters: RealPrinterDevice[] = data.printers.map((p: any) => ({
          id: `sys_${p.name}`,
          name: p.name,
          connectionType: 'system',
          paperWidth: p.name.toLowerCase().includes('80') ? '80mm' : '58mm',
          status: p.status === 'idle' ? 'connected' : 'disconnected',
        }));

        setPairedPrinters(discoveredPrinters);
        localStorage.setItem('ezydine_real_printers', JSON.stringify(discoveredPrinters));

        // Prioritize physically connected USB device (e.g. KPrint / Printe_KPrinte)
        const connectedUsb = data.usbPrinters && data.usbPrinters.length > 0 ? data.usbPrinters[0] : null;
        const defaultSys = data.printers.find((p: any) => p.isDefault) || data.printers[0];
        let chosenPrinter = defaultSys;

        if (connectedUsb) {
          const usbName = connectedUsb.name.replace(/[^a-zA-Z0-9]/g, '_');
          const matchedUsbQueue = discoveredPrinters.find(p => p.name === usbName || p.name.includes('Printe') || p.name.includes('KPrint'));
          if (matchedUsbQueue) {
            chosenPrinter = matchedUsbQueue;
          }
        }

        setActivePrinter((prev) => {
          const match = discoveredPrinters.find((dp) => dp.name === prev.name);
          if (match && !match.name.includes('Default System Spooler')) return match;
          const defaultDev: RealPrinterDevice = {
            id: `sys_${chosenPrinter.name}`,
            name: chosenPrinter.name,
            connectionType: 'usb',
            paperWidth: chosenPrinter.name.toLowerCase().includes('80') ? '80mm' : '58mm',
            status: 'connected',
          };
          localStorage.setItem('ezydine_active_printer', JSON.stringify(defaultDev));
          return defaultDev;
        });
      }
    } catch (err) {
      console.warn('System printers query error:', err);
    }
  };

  // Cart operations
  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string | number, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.id === id) {
            const nextQty = i.quantity + delta;
            return nextQty > 0 ? { ...i, quantity: nextQty } : null;
          }
          return i;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const clearCart = () => {
    if (cart.length > 0 && confirm('Clear current order items for this table?')) {
      setCart([]);
      setSpecialNote('');
      setCustomerName('');
      setCustomerPhone('');

      const updated = { ...tableOrders };
      delete updated[selectedTable.id];
      setTableOrders(updated);
      const ordersKey = getTableOrdersKey(managerSession?.restaurantId);
      localStorage.setItem(ordersKey, JSON.stringify(updated));

      setFloorTables((prev) =>
        prev.map((t) =>
          t.id === selectedTable.id
            ? { ...t, status: 'available', activeItemsCount: 0, activeTotal: 0, kotToken: undefined, placedAt: undefined }
            : t
        )
      );
    }
  };

  // Dynamic Calculations for Active Cart (GST is disabled and not applicable if ownerTemplate.showGst === false)
  const isGstActive = ownerTemplate.showGst !== false;
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = subtotal > 500 ? 40 : 0;
  const taxable = Math.max(0, subtotal - discount);
  const cgst = isGstActive ? taxable * 0.025 : 0;
  const sgst = isGstActive ? taxable * 0.025 : 0;
  const total = Math.round(taxable + (isGstActive ? (cgst + sgst) : 0));

  // Mark Order as Placed on Table & Print KOT
  const handlePrintKOT = () => {
    if (cart.length === 0) {
      alert('Order is empty. Please add items before placing order & printing KOT.');
      return;
    }
    const existingToken = tableOrders[selectedTable.id]?.kotToken;
    const token = existingToken || (orderHistory.length + 1);
    setKotTokenNumber(token);

    // 1. Update Table Status to Occupied with active item count and amount
    const nowTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    setFloorTables((prev) =>
      prev.map((t) =>
        t.id === selectedTable.id
          ? {
            ...t,
            status: 'occupied',
            activeItemsCount: cart.reduce((s, i) => s + i.quantity, 0),
            activeTotal: total,
            kotToken: token,
            placedAt: nowTime,
          }
          : t
      )
    );

    // 2. Persist in tableOrders
    setTableOrders((prev) => ({
      ...prev,
      [selectedTable.id]: {
        cart,
        specialNote,
        customerName,
        customerPhone,
        kotToken: token,
        paymentMethod: selectedPaymentMethod,
        status: 'occupied' as const,
        placedAt: nowTime,
      },
    }));

    // 3. Open Generate Print view in Owner-Saved Template (instead of opening system print option!)
    const printPayload = {
      billNumber: `KOT #${token}`,
      kotToken: token,
      tableNumber: selectedTable.number,
      tableSection: selectedTable.section,
      customerName,
      customerPhone,
      serverName: managerSession?.name || 'Manager',
      items: [...cart],
      subtotal,
      discount,
      cgst,
      sgst,
      grandTotal: total,
      paymentMethod: selectedPaymentMethod,
      formattedDate: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      formattedTime: nowTime,
      specialNote,
    };
    setReprintTargetOrder(null);
    setActivePrintMode('kot');
    setGeneratedPrintData({ mode: 'kot', order: printPayload });
    setIsGeneratePrintOpen(true);
    setPrintStatusMessage(`KOT #${token} generated in Owner Saved Template`);
    setTimeout(() => setPrintStatusMessage(null), 3000);
  };

  // 1-CLICK BILL RECEIPT GENERATE + AUTO MOVE TO ORDER HISTORY (Owner Saved Template)
  const handleBillAndPrint = async () => {
    if (cart.length === 0) {
      alert('Order is empty. Please add items before generating receipt.');
      return;
    }

    const nextOrderNumber = orderHistory.length + 1;
    const billNum = `Order #${nextOrderNumber}`;
    const token = tableOrders[selectedTable.id]?.kotToken || nextOrderNumber;
    setKotTokenNumber(token);

    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const formattedTime = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    const newOrder: OrderHistoryItem = {
      id: `ord_${Date.now()}`,
      billNumber: billNum,
      kotToken: token,
      tableId: selectedTable.id,
      tableNumber: selectedTable.number,
      tableSection: selectedTable.section,
      customerName: customerName.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      serverName: managerSession?.name || 'Manager',
      items: [...cart],
      subtotal,
      discount,
      cgst,
      sgst,
      grandTotal: total,
      paymentMethod: selectedPaymentMethod,
      createdAt: now.toISOString(),
      formattedDate,
      formattedTime,
      specialNote: specialNote.trim() || undefined,
      status: 'billed',
    };

    // 1. Add to Order History (persisted)
    const updatedHistory = [newOrder, ...orderHistory];
    saveOrderHistory(updatedHistory);

    // 2. Clear this table's occupied status on floor plan and storage
    setFloorTables((prev) =>
      prev.map((t) =>
        t.id === selectedTable.id
          ? { ...t, status: 'available', activeItemsCount: 0, activeTotal: 0, kotToken: undefined }
          : t
      )
    );
    const updatedOrders = { ...tableOrders };
    delete updatedOrders[selectedTable.id];
    setTableOrders(updatedOrders);
    const ordersKey = getTableOrdersKey(managerSession?.restaurantId);
    localStorage.setItem(ordersKey, JSON.stringify(updatedOrders));

    // 3. Clear active cart
    setCart([]);
    setSpecialNote('');
    setCustomerName('');
    setCustomerPhone('');

    // 4. Set reprint target & switch to history
    setReprintTargetOrder(newOrder);
    setActivePrintMode('bill');
    setCurrentView('history');

    // 5. Open Generate Print in Owner Saved Template (No intrusive system print dialog!)
    setGeneratedPrintData({ mode: 'bill', order: newOrder });
    setIsGeneratePrintOpen(true);
    setPrintStatusMessage(`Bill ${billNum} generated in Owner Saved Template`);
    setTimeout(() => setPrintStatusMessage(null), 3000);

    // Sync bill to backend and refresh order history
    if (managerSession) {
      try {
        apiFetch('/bills', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${managerSession.token}`,
          },
          body: JSON.stringify({
            billNumber: newOrder.billNumber,
            kotNumber: `KOT #${newOrder.kotToken}`,
            tableNumber: selectedTable.number,
            items: newOrder.items,
            subtotal: newOrder.subtotal,
            discount: newOrder.discount,
            gstAmount: newOrder.cgst + newOrder.sgst,
            totalAmount: newOrder.grandTotal,
            paymentStatus: 'paid',
            paymentMethod: newOrder.paymentMethod,
          }),
        }).then(() => {
          fetchOrderHistory(managerSession.token, managerSession.restaurantId);
        }).catch((err) => console.warn('Could not sync bill to backend:', err));
      } catch (e) {
        // non-blocking
      }
    }
  };

  // Reprint Bill from Order History in Owner Saved Template
  const handleReprintBill = (order: OrderHistoryItem) => {
    setReprintTargetOrder(order);
    setActivePrintMode('bill');
    setGeneratedPrintData({ mode: 'bill', order });
    setIsGeneratePrintOpen(true);
  };

  // Reprint KOT from Order History in Owner Saved Template
  const handleReprintKOT = (order: OrderHistoryItem) => {
    setReprintTargetOrder(order);
    setActivePrintMode('kot');
    setGeneratedPrintData({ mode: 'kot', order });
    setIsGeneratePrintOpen(true);
  };

  // Save Owner Receipt Template helper
  const handleSaveOwnerTemplate = (updated: typeof ownerTemplate) => {
    setOwnerTemplate(updated);
    const key = getOwnerTemplateKey(managerSession?.restaurantId);
    localStorage.setItem(key, JSON.stringify(updated));
    setPrintStatusMessage('Owner receipt template saved successfully');
    setTimeout(() => setPrintStatusMessage(null), 3000);
    setIsTemplateEditorOpen(false);
  };

  // Copy Clean Receipt Text to Clipboard
  const handleCopyReceiptText = () => {
    if (!generatedPrintData || !managerSession) return;
    const { mode, order } = generatedPrintData;
    let text = '';
    if (mode === 'kot') {
      text = `*** KITCHEN ORDER TICKET ***\nTOKEN #${order.kotToken}\n${managerSession.restaurantName}\n` +
        `Table: ${order.tableNumber} (${order.tableSection})\n` +
        `Time: ${order.formattedTime} · ${order.formattedDate}\n` +
        `--------------------------------\n` +
        order.items.map((i: any) => `[${i.quantity}]  ${i.name} (${i.isVeg ? 'VEG' : 'NON-VEG'})`).join('\n') +
        `\n--------------------------------\n` +
        (order.specialNote ? `Chef Note: ${order.specialNote}\n` : '') +
        `*** SEND TO KITCHEN PREPARATION ***`;
    } else {
      text = `${managerSession.restaurantName}\n${managerSession.restaurantLocation ? managerSession.restaurantLocation + '\n' : ''}${managerSession.restaurantPhone ? `Ph: ${managerSession.restaurantPhone}\n` : ''}` +
        (ownerTemplate.showGst && managerSession.gstNumber ? `GSTIN: ${managerSession.gstNumber}\n` : '') +
        (ownerTemplate.showFssai && managerSession.fssai ? `FSSAI: ${managerSession.fssai}\n` : '') +
        `--------------------------------\n` +
        `${order.billNumber} | Table ${order.tableNumber} (${order.tableSection})\n` +
        `Date: ${order.formattedDate} ${order.formattedTime}\n` +
        (order.customerName ? `Guest: ${order.customerName}\n` : '') +
        `--------------------------------\n` +
        order.items.map((i: any) => `${i.name} x ${i.quantity} = ₹${(i.price * i.quantity).toFixed(2)}`).join('\n') +
        `\n--------------------------------\n` +
        `Subtotal: ₹${order.subtotal.toFixed(2)}\n` +
        (order.discount > 0 ? `Discount: -₹${order.discount.toFixed(2)}\n` : '') +
        (ownerTemplate.showGst ? `CGST (2.5%): ₹${order.cgst.toFixed(2)}\nSGST (2.5%): ₹${order.sgst.toFixed(2)}\n` : '') +
        `GRAND TOTAL: ₹${order.grandTotal.toFixed(2)}\n` +
        `Payment Mode: ${order.paymentMethod}\n` +
        `--------------------------------\n` +
        `${ownerTemplate.footerText}\n`;
    }
    navigator.clipboard.writeText(text);
    setCopiedSlip(true);
    setTimeout(() => setCopiedSlip(false), 2000);
  };

  // Play soft thermal receipt chime
  const playReceiptChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    } catch {
      // Audio fallback
    }
  };

  // Format raw ESC/POS binary buffer directly in the browser (for direct WebUSB & WebSerial printing without dialog)
  const formatBrowserEscPosBuffer = (
    mode: 'bill' | 'kot' | 'test',
    order: any,
    template: any,
    width: '58mm' | '80mm' = '58mm'
  ): Uint8Array => {
    // 58mm printers have 384 dots width = 30-32 chars max. 30 chars guarantees ZERO word wrapping or spillage.
    // 80mm printers have 576 dots width = 42-48 chars max. 42 chars guarantees clean formatting.
    const is80mm = width === '80mm';
    const lineWidth = is80mm ? 42 : 30;

    const ESC = 0x1B;
    const GS = 0x1D;
    const bytes: number[] = [];

    // Helper: word-wrap text at space boundaries so words are never cut in half
    const wrapWords = (text: string, maxLen: number): string[] => {
      if (!text) return [];
      const words = String(text).trim().split(/\s+/);
      const result: string[] = [];
      let current = '';
      for (const w of words) {
        if (!current) {
          current = w;
        } else if ((current + ' ' + w).length <= maxLen) {
          current += ' ' + w;
        } else {
          result.push(current);
          current = w;
        }
      }
      if (current) result.push(current);
      return result;
    };

    // Helper: Center text cleanly
    const center = (text: string, maxLen: number = lineWidth): string => {
      const clean = String(text).trim().slice(0, maxLen);
      const pad = Math.max(0, Math.floor((maxLen - clean.length) / 2));
      return ' '.repeat(pad) + clean;
    };

    // Helper: Justify text (left and right aligned) within exact maxLen
    const justify = (left: string, right: string, maxLen: number = lineWidth): string => {
      const l = String(left).trim();
      const r = String(right).trim();
      const space = maxLen - l.length - r.length;
      if (space <= 0) {
        const cutLeft = Math.max(1, maxLen - r.length - 1);
        return l.slice(0, cutLeft) + ' ' + r;
      }
      return l + ' '.repeat(space) + r;
    };

    // Add string as single-byte ASCII
    const addText = (str: string) => {
      for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        // Map any non-ASCII character to ASCII to prevent multi-byte garbage on thermal printer
        bytes.push(code <= 127 ? code : 0x20);
      }
    };

    const addLine = (str: string = '') => {
      addText(str + '\n');
    };

    // Initialize printer
    bytes.push(ESC, 0x40);

    // ==========================================
    // 1. HARDWARE TEST SLIP
    // ==========================================
    if (mode === 'test') {
      bytes.push(ESC, 0x61, 0x01); // Center
      bytes.push(ESC, 0x45, 0x01); // Bold ON
      addLine((template.storeName || 'EZYDINE POS').toUpperCase().slice(0, lineWidth));
      bytes.push(ESC, 0x45, 0x00); // Bold OFF
      addLine('='.repeat(lineWidth));
      addLine('** HARDWARE TEST SLIP **');
      addLine('='.repeat(lineWidth));
      bytes.push(ESC, 0x61, 0x00); // Left
      addLine(justify('Printer Status:', 'ONLINE / READY'));
      addLine(justify('Paper Roll:', is80mm ? '80mm (42 Col)' : '58mm (30 Col)'));
      addLine(justify('Date:', new Date().toLocaleDateString('en-IN')));
      addLine(justify('Time:', new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })));
      addLine('-'.repeat(lineWidth));
      bytes.push(ESC, 0x61, 0x01); // Center
      addLine('Direct Hardware Link OK!');
      addLine('='.repeat(lineWidth));
      bytes.push(ESC, 0x64, 0x03); // Feed 3 lines
      bytes.push(GS, 0x56, 0x00);  // Full cut
      return new Uint8Array(bytes);
    }

    // ==========================================
    // 2. STORE HEADER (Center Aligned, Word Wrapped)
    // ==========================================
    bytes.push(ESC, 0x61, 0x01); // Center
    bytes.push(ESC, 0x45, 0x01); // Bold ON

    const storeName = (template.storeName || 'EZYDINE RESTOBAR').toUpperCase();
    if (storeName.length <= 15) {
      bytes.push(GS, 0x21, 0x11); // Double size for short titles
      addLine(storeName);
      bytes.push(GS, 0x21, 0x00); // Reset normal size
    } else {
      // For longer titles, print bold at normal size so it never spills over
      for (const line of wrapWords(storeName, lineWidth)) {
        addLine(line);
      }
    }
    bytes.push(ESC, 0x45, 0x00); // Bold OFF

    if (template.address) {
      for (const line of wrapWords(template.address, lineWidth)) {
        addLine(line);
      }
    }
    if (template.phone) addLine(`Ph: ${template.phone}`);
    if (template.gstNo && mode !== 'kot') addLine(`GSTIN: ${template.gstNo}`);
    addLine('-'.repeat(lineWidth));

    // ==========================================
    // 3. KITCHEN ORDER TICKET (KOT)
    // ==========================================
    if (mode === 'kot') {
      bytes.push(ESC, 0x61, 0x01); // Center
      bytes.push(ESC, 0x45, 0x01); // Bold ON
      addLine('*** KITCHEN ORDER TICKET ***');
      addLine(`KOT TOKEN #${order.kotToken || 1}`);
      bytes.push(ESC, 0x45, 0x00); // Bold OFF
      bytes.push(ESC, 0x61, 0x00); // Left align
      addLine('-'.repeat(lineWidth));

      const tableText = `TABLE: ${order.tableNumber || '01'}${order.tableSection ? ` (${order.tableSection})` : ''}`;
      addLine(justify(tableText, 'DINE-IN'));

      const dateStr = order.formattedDate || new Date().toLocaleDateString('en-IN');
      const timeStr = order.formattedTime || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      addLine(justify(`Date: ${dateStr}`, timeStr));
      addLine('-'.repeat(lineWidth));

      // Items list (NO PRICES on KOT - strictly preparation copy)
      addLine(justify('ITEM (PREPARATION)', 'QTY'));
      addLine('-'.repeat(lineWidth));

      bytes.push(ESC, 0x45, 0x01); // Bold ON for Chef
      for (const it of (order.items || [])) {
        const qty = it.quantity || 1;
        const name = (it.name || 'Item').trim();
        addLine(justify(name, `x${qty}`));
        if (it.notes || it.specialNote) {
          bytes.push(ESC, 0x45, 0x00);
          addLine(` * Note: ${String(it.notes || it.specialNote).trim()}`);
          bytes.push(ESC, 0x45, 0x01);
        }
      }
      bytes.push(ESC, 0x45, 0x00); // Bold OFF
      addLine('-'.repeat(lineWidth));

      bytes.push(ESC, 0x61, 0x01); // Center
      addLine('-- Expedite Kitchen Order --');
      bytes.push(ESC, 0x64, 0x03); // Feed 3 lines
      bytes.push(GS, 0x56, 0x00);  // Full cut
      return new Uint8Array(bytes);
    }

    // ==========================================
    // 4. CUSTOMER TAX INVOICE / CASH BILL
    // ==========================================
    bytes.push(ESC, 0x61, 0x00); // Left align
    const billNum = order.billNumber || 'Order #1';
    const tableText = `Table: ${order.tableNumber || '01'}${order.tableSection ? ` (${order.tableSection})` : ''}`;
    addLine(justify(billNum, tableText));

    const dateStr = order.formattedDate || new Date().toLocaleDateString('en-IN');
    const timeStr = order.formattedTime || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    addLine(justify(`Date: ${dateStr}`, timeStr));

    if (order.customerName) {
      addLine(`Guest: ${order.customerName.trim().slice(0, lineWidth - 7)}`);
    }
    addLine('-'.repeat(lineWidth));

    // Column Headers
    addLine(justify('ITEM', 'QTY    AMOUNT'));
    addLine('-'.repeat(lineWidth));

    // Items List (Clean formatting, NO multi-byte Rupee glyphs)
    for (const it of (order.items || [])) {
      const qty = it.quantity || 1;
      const price = Number(it.price || 0) * qty;
      const name = (it.name || 'Item').trim();

      // 30-col layout: Name max 15 chars + Qty 5 chars + Amount 10 chars = 30 chars
      const nameLimit = Math.max(12, lineWidth - 15);
      const colName = name.slice(0, nameLimit).padEnd(nameLimit);
      const colQty = `x${qty}`.padStart(5);
      const colAmt = price.toFixed(2).padStart(10);
      addLine(`${colName}${colQty}${colAmt}`);
    }
    addLine('-'.repeat(lineWidth));

    // Financials & Summary (100% Standard ASCII - Completely fixes Γé╣)
    const subtotal = Number(order.subtotal || 0);
    const discount = Number(order.discount || 0);
    const cgst = Number(order.cgst || 0);
    const sgst = Number(order.sgst || 0);
    const grandTotal = Number(order.grandTotal || 0);

    addLine(justify('Subtotal:', subtotal.toFixed(2)));
    if (discount > 0) {
      addLine(justify('Discount:', `-${discount.toFixed(2)}`));
    }
    if (template.showGst && cgst > 0) {
      addLine(justify('CGST (2.5%):', cgst.toFixed(2)));
    }
    if (template.showGst && sgst > 0) {
      addLine(justify('SGST (2.5%):', sgst.toFixed(2)));
    }

    addLine('='.repeat(lineWidth));
    bytes.push(ESC, 0x45, 0x01); // Bold ON
    addLine(justify('GRAND TOTAL:', `Rs. ${grandTotal.toFixed(2)}`));
    bytes.push(ESC, 0x45, 0x00); // Bold OFF
    addLine('='.repeat(lineWidth));

    const payMode = (order.paymentMethod || 'CASH').toUpperCase();
    addLine(justify(`Payment: ${payMode}`, 'Status: PAID'));
    addLine('-'.repeat(lineWidth));

    // Closing Footer
    if (template.footerMsg) {
      bytes.push(ESC, 0x61, 0x01); // Center
      for (const line of wrapWords(template.footerMsg, lineWidth)) {
        addLine(line);
      }
    }
    bytes.push(ESC, 0x61, 0x01); // Center
    addLine('Powered by EzyDine POS');

    // Feed & Cut Paper
    bytes.push(ESC, 0x64, 0x03); // Feed 3 lines
    bytes.push(GS, 0x56, 0x00);  // Full cut

    return new Uint8Array(bytes);
  };

  // Helper: Print directly via WebUSB in the browser (Windows / Chrome without any dialog)
  const printViaBrowserWebUsb = async (data: Uint8Array): Promise<{ success: boolean; isWindowsLock?: boolean }> => {
    if (typeof window === 'undefined' || !('usb' in navigator)) return { success: false };
    try {
      const devices = await (navigator as any).usb.getDevices();
      if (!devices || devices.length === 0) return { success: false };
      const device = devices[0];
      await device.open();
      if (device.configuration === null) {
        await device.selectConfiguration(1);
      }
      let targetIface = 0;
      for (const iface of device.configuration.interfaces) {
        for (const alt of iface.alternates) {
          if (alt.interfaceClass === 7) {
            targetIface = iface.interfaceNumber;
            break;
          }
        }
      }
      await device.claimInterface(targetIface);

      const iface = device.configuration.interfaces.find((i: any) => i.interfaceNumber === targetIface) || device.configuration.interfaces[0];
      const alt = iface.alternates[0];
      const outEndpoint = alt.endpoints.find((e: any) => e.direction === 'out');
      const epNum = outEndpoint ? outEndpoint.endpointNumber : 1;

      await device.transferOut(epNum, data);
      return { success: true };
    } catch (e: any) {
      if (e?.name === 'SecurityError' || e?.message?.includes('Access denied')) {
        console.warn('[EzyDine] Windows kernel driver (usbprint.sys) has exclusive lock on this USB printer. Handing off to Spooler / Serial.');
        return { success: false, isWindowsLock: true };
      }
      console.warn('WebUSB transfer error:', e);
      return { success: false };
    }
  };

  // Helper: Print directly via Web Serial (COM port) in the browser
  const printViaBrowserWebSerial = async (data: Uint8Array): Promise<boolean> => {
    if (typeof window === 'undefined' || !('serial' in navigator)) return false;
    try {
      const ports = await (navigator as any).serial.getPorts();
      if (!ports || ports.length === 0) return false;
      const port = ports[0];
      await port.open({ baudRate: 9600 });
      const writer = port.writable.getWriter();
      await writer.write(data);
      writer.releaseLock();
      await port.close();
      return true;
    } catch (e) {
      console.warn('WebSerial transfer error:', e);
      return false;
    }
  };

  // TRUE DIRECT PRINTING TO PHYSICAL HARDWARE (Zero Browser Pop-up / Dialog)
  const handleDirectHardwarePrint = async () => {
    setIsDirectPrinting(true);
    playReceiptChime();

    try {
      const currentOrder = generatedPrintData?.order;
      if (!currentOrder) {
        setPrintStatusMessage('⚠️ No active order data to print.');
        setIsDirectPrinting(false);
        return;
      }

      // Check if browser has a direct WebUSB device or WebSerial COM port available
      const rawEscpos = formatBrowserEscPosBuffer(
        generatedPrintData.mode,
        currentOrder,
        {
          storeName: managerSession?.restaurantName || 'EZYDINE RESTOBAR',
          phone: managerSession?.restaurantPhone || managerSession?.identifier || '',
          address: managerSession?.restaurantLocation || '',
          gstNo: ownerTemplate.showGst ? (managerSession?.gstNumber || '') : '',
          showGst: ownerTemplate.showGst,
          footerMsg: ownerTemplate.footerText,
        },
        activePrinter.paperWidth || '58mm'
      );

      // Attempt 1: WebUSB Direct (Chrome on Windows/Mac without dialog or server)
      if (activePrinter.connectionType === 'usb' && 'usb' in navigator) {
        const usbResult = await printViaBrowserWebUsb(rawEscpos);
        if (usbResult.success) {
          setPrintStatusMessage(`✓ Printed directly via WebUSB to ${activePrinter.name}`);
          setIsDirectPrinting(false);
          setTimeout(() => {
            setIsGeneratePrintOpen(false);
            setPrintStatusMessage(null);
          }, 2500);
          return;
        }
        if (usbResult.isWindowsLock) {
          setPrintStatusMessage(`Windows driver has USB locked. Routing to system spooler...`);
        }
      }

      // Attempt 2: WebSerial Direct (COM port on Windows)
      if (activePrinter.connectionType === 'serial' && 'serial' in navigator) {
        const serialOk = await printViaBrowserWebSerial(rawEscpos);
        if (serialOk) {
          setPrintStatusMessage(`✓ Printed directly via Serial COM to ${activePrinter.name}`);
          setIsDirectPrinting(false);
          setTimeout(() => {
            setIsGeneratePrintOpen(false);
            setPrintStatusMessage(null);
          }, 2500);
          return;
        }
      }

      // Attempt 3: Local/Server Hardware Print Spooler
      const res = await printApiFetch('/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          printerName: activePrinter.name,
          type: generatedPrintData.mode,
          width: activePrinter.paperWidth || '58mm',
          order: currentOrder,
          template: {
            storeName: managerSession?.restaurantName || 'EZYDINE RESTOBAR',
            phone: managerSession?.restaurantPhone || managerSession?.identifier || '9876543210',
            address: managerSession?.restaurantLocation || 'Bengaluru, India',
            gstNo: managerSession?.gstNumber || '',
            footerMsg: ownerTemplate.footerText,
          },
        }),
      });

      const data = await res.json();
      if (data.success && data.printer) {
        setPrintStatusMessage(`✓ Printed directly to ${data.printer} (${data.printedVia || 'Hardware'})`);
      } else if (data.fallbackToBrowser) {
        setPrintStatusMessage(`⚠️ Windows driver locked USB. Use Chrome '--kiosk-printing' or Serial COM.`);
      } else {
        setPrintStatusMessage(`⚠️ Direct print error: ${data.error || 'Failed to dispatch to hardware'}`);
      }
    } catch (err: any) {
      console.warn('Direct print backend unreachable:', err);
      setPrintStatusMessage(`⚠️ Print error: Pair USB printer via "Hardware Printer Setup" or click "System Dialog".`);
    } finally {
      setIsDirectPrinting(false);
      setTimeout(() => {
        setIsGeneratePrintOpen(false);
        setPrintStatusMessage(null);
      }, 3500);
    }
  };

  const handleDirectTestPrint = async () => {
    playReceiptChime();
    setPrintStatusMessage(`Sending test slip to ${activePrinter.name}...`);
    try {
      const testOrder = {
        billNumber: 'Test Slip',
        tableNumber: '01',
        tableSection: 'Counter',
        formattedDate: new Date().toLocaleDateString('en-IN'),
        formattedTime: new Date().toLocaleTimeString('en-IN'),
        items: [{ name: 'Test Line', quantity: 1, price: 0 }],
        subtotal: 0,
        grandTotal: 0,
        paymentMethod: 'TEST',
      };
      const rawEscpos = formatBrowserEscPosBuffer('test', testOrder, {
        storeName: managerSession?.restaurantName || 'EZYDINE POS',
        footerMsg: 'Direct Hardware Test Print OK!',
      }, activePrinter.paperWidth || '58mm');

      if (activePrinter.connectionType === 'usb' && 'usb' in navigator) {
        const usbResult = await printViaBrowserWebUsb(rawEscpos);
        if (usbResult.success) {
          setPrintStatusMessage(`✓ Test slip printed directly via WebUSB!`);
          setTimeout(() => setPrintStatusMessage(null), 3500);
          return;
        }
      }

      if (activePrinter.connectionType === 'serial' && 'serial' in navigator) {
        const serialOk = await printViaBrowserWebSerial(rawEscpos);
        if (serialOk) {
          setPrintStatusMessage(`✓ Test slip printed directly via Serial COM to ${activePrinter.name}!`);
          setTimeout(() => setPrintStatusMessage(null), 3500);
          return;
        }
      }

      const res = await printApiFetch('/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          printerName: activePrinter.name,
          type: 'test',
          width: activePrinter.paperWidth || '58mm',
        }),
      });
      const data = await res.json();
      if (data.success && (data.printer || data.printedVia)) {
        setPrintStatusMessage(`✓ Test slip printed directly on ${data.printer || activePrinter.name} (${data.printedVia || 'USB'})`);
      } else if (data.fallbackToBrowser) {
        setPrintStatusMessage(`⚠️ Windows driver locked USB. Use Chrome '--kiosk-printing' or Serial COM.`);
      } else {
        setPrintStatusMessage(`⚠️ Test failed: ${data.error || 'Could not print'}`);
      }
    } catch (err: any) {
      setPrintStatusMessage(`⚠️ Error: ${err.message}`);
    }
    setTimeout(() => setPrintStatusMessage(null), 3500);
  };

  // Master Admin API Handlers
  const loadMasterOtps = async () => {
    try {
      const res = await apiFetch('/master/otps');
      const data = await res.json();
      if (data.success && data.otps) {
        setMasterOtps(data.otps);
      }
    } catch (err) {
      console.warn('Error loading master OTPs:', err);
    }
  };

  const loadMasterAppLogins = async () => {
    setIsMasterLoading(true);
    try {
      const res = await apiFetch('/master/app-logins');
      const data = await res.json();
      if (data.success && data.logins) {
        setMasterAppLogins(data.logins);
      }
    } catch (err) {
      console.warn('Error loading master app logins:', err);
    } finally {
      setIsMasterLoading(false);
    }
  };

  const handleCreateAppLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoginError('');
    if (!createLoginPhone || createLoginPhone.trim().length < 10) {
      setCreateLoginError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!createLoginName.trim()) {
      setCreateLoginError('Please enter Owner / Manager Full Name.');
      return;
    }
    if (!createLoginRestName.trim()) {
      setCreateLoginError('Please enter Restaurant / Business Name.');
      return;
    }

    setIsCreatingLogin(true);
    try {
      const res = await apiFetch('/master/create-app-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: createLoginPhone.trim(),
          fullName: createLoginName.trim(),
          restaurantName: createLoginRestName.trim(),
          location: createLoginLocation.trim() || 'Bengaluru',
          pin: createLoginPin.trim() || '1234',
          planId: createLoginPlan,
        }),
      });

      const data = await res.json();
      if (data.success && data.appLogin) {
        setCreatedLoginSuccess(data.appLogin);
        setCreateLoginPhone('');
        setCreateLoginName('');
        setCreateLoginRestName('');
        setCreateLoginLocation('');
        setCreateLoginPin('1234');
        loadMasterAppLogins();
        loadMasterOtps();
      } else {
        setCreateLoginError(data.error || 'Failed to create app login.');
      }
    } catch (err: any) {
      setCreateLoginError(err.message || 'Failed to create app login.');
    } finally {
      setIsCreatingLogin(false);
    }
  };

  const handleDeleteAppLogin = async (userId: number, name: string) => {
    if (!confirm(`Are you sure you want to remove app login for ${name}?`)) return;
    try {
      const res = await apiFetch(`/master/app-logins/${userId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setPrintStatusMessage(`App login removed.`);
        loadMasterAppLogins();
      }
    } catch (err) {
      console.warn('Error deleting login:', err);
    }
  };

  // Poll Master data periodically when in Master view
  useEffect(() => {
    if (currentView === 'master') {
      loadMasterOtps();
      loadMasterAppLogins();
      const interval = setInterval(() => {
        loadMasterOtps();
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [currentView]);

  // Live Listener for Completed ("Order Done") Bills for Manager - auto-syncs every 4s and on view change
  useEffect(() => {
    if (!managerSession?.token) return;
    fetchOrderHistory(managerSession.token, managerSession.restaurantId);
    const interval = setInterval(() => {
      fetchOrderHistory(managerSession.token, managerSession.restaurantId);
    }, 4000);
    return () => clearInterval(interval);
  }, [managerSession?.token, managerSession?.restaurantId, currentView]);

  // Update Payment Method for an existing order in Order History (Cash / UPI / Card)
  const handleUpdateOrderPaymentMethod = (orderId: string, newMethod: 'Cash' | 'UPI' | 'Card') => {
    const updated = orderHistory.map((order) => {
      if (order.id === orderId) {
        return { ...order, paymentMethod: newMethod };
      }
      return order;
    });
    saveOrderHistory(updated);
    setPrintStatusMessage(`Order payment method updated to ${newMethod}`);
    setTimeout(() => setPrintStatusMessage(null), 2500);
  };

  // Categories - Always include South Indian & Snacks prominently
  const defaultCategories = ['all', 'South Indian', 'Snacks', 'Starters', 'Mains', 'Breads', 'Beverages', 'Desserts'];
  const dynamicCategories = Array.from(new Set(menuItems.map((m) => m.category))).filter(Boolean);
  const categoryMap = new Map<string, string>();
  [...defaultCategories, ...dynamicCategories].forEach((c) => {
    const key = c.toLowerCase();
    if (!categoryMap.has(key)) categoryMap.set(key, c);
  });
  const categories = Array.from(categoryMap.values());

  // Quick add dish
  const handleQuickAddDish = async (dishName: string) => {
    if (!dishName.trim() || !managerSession) return;
    const priceStr = prompt(`Enter price in ₹ for "${dishName.trim()}":`, '250');
    if (!priceStr) return;
    const price = parseFloat(priceStr);
    if (isNaN(price) || price <= 0) {
      alert('Please enter a valid price.');
      return;
    }
    const isVeg = confirm(`Is "${dishName.trim()}" Vegetarian?\nClick OK for Pure Veg, Cancel for Non-Veg.`);
    try {
      const res = await apiFetch('/menu', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${managerSession.token}`,
        },
        body: JSON.stringify({
          name: dishName.trim(),
          category: selectedCategory === 'all' ? 'Mains' : selectedCategory,
          price,
          isVeg,
          description: '',
        }),
      });
      const data = await res.json();
      if (data.success && data.item) {
        await fetchRestaurantMenu(managerSession.token);
        addToCart({
          id: data.item.id,
          name: data.item.name,
          category: data.item.category,
          price: Number(data.item.price),
          isVeg: data.item.isVeg,
          description: data.item.description || '',
        });
        setSearchQuery('');
      } else {
        alert(data.error || 'Failed to add dish');
      }
    } catch (e: any) {
      alert('Error creating dish: ' + e.message);
    }
  };

  // Filter items
  const filteredItems = menuItems.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category.toLowerCase() === selectedCategory.toLowerCase();
    const query = searchQuery.trim().toLowerCase();
    if (!query) return matchesCategory;

    const matchesName = item.name.toLowerCase().includes(query);
    const matchesId = item.id.toString() === query || `#${item.id}` === query;
    const matchesDesc = item.description && item.description.toLowerCase().includes(query);
    return matchesCategory && (matchesName || matchesId || matchesDesc);
  });

  // Filter Order History
  const filteredOrderHistory = orderHistory.filter((order) => {
    const matchesPayment = historyFilterPayment === 'all' || order.paymentMethod === historyFilterPayment;
    const query = historySearchQuery.trim().toLowerCase();
    if (!query) return matchesPayment;

    const matchesBill = order.billNumber.toLowerCase().includes(query);
    const matchesTable = `table ${order.tableNumber}`.toLowerCase().includes(query) || order.tableNumber.toLowerCase().includes(query);
    const matchesGuest = order.customerName && order.customerName.toLowerCase().includes(query);
    const matchesItem = order.items.some((i) => i.name.toLowerCase().includes(query));
    return matchesPayment && (matchesBill || matchesTable || matchesGuest || matchesItem);
  });

  // Total History Metrics
  const totalRevenue = orderHistory.reduce((sum, ord) => sum + ord.grandTotal, 0);
  const totalCash = orderHistory.filter((o) => o.paymentMethod === 'Cash').reduce((s, o) => s + o.grandTotal, 0);
  const totalUPI = orderHistory.filter((o) => o.paymentMethod === 'UPI').reduce((s, o) => s + o.grandTotal, 0);
  const totalCard = orderHistory.filter((o) => o.paymentMethod === 'Card').reduce((s, o) => s + o.grandTotal, 0);
  const occupiedTablesList = floorTables.filter((t) => t.status === 'occupied');

  // Loading spinner
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-[#D92F43] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // 1. Manager Authentication Screen
  if (!managerSession) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-[#E2E8F0] p-8">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-[#D92F43] flex items-center justify-center text-white font-extrabold text-2xl shadow-lg mb-3">
              ED
            </div>
            <h1 className="text-2xl font-extrabold text-[#0B1B29] tracking-tight">EzyDine Manager POS</h1>
            <p className="text-xs text-[#64748B] mt-1">Multi-Tenant Cloud Billing & Floor Order Management</p>
          </div>

          <form onSubmit={handleManagerLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#0B1B29] uppercase tracking-wider mb-1.5">
                Manager Mobile or Email
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Enter registered mobile (e.g. 9845111222)"
                  value={loginIdentifier}
                  onChange={(e) => {
                    setLoginIdentifier(e.target.value);
                    if (loginError) setLoginError('');
                  }}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-[#0B1B29] focus:outline-hidden focus:border-[#D92F43] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0B1B29] uppercase tracking-wider mb-1.5">
                4-Digit POS Access PIN
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  maxLength={4}
                  placeholder="••••"
                  value={loginPin}
                  onChange={(e) => {
                    setLoginPin(e.target.value.replace(/[^0-9]/g, ''));
                    if (loginError) setLoginError('');
                  }}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-10 pr-3.5 py-2.5 text-base tracking-[0.5em] font-bold text-[#0B1B29] focus:outline-hidden focus:border-[#D92F43] transition-colors"
                />
              </div>
            </div>

            {loginError && (
              <div className="flex items-start gap-2 p-3 bg-[#FEE2E2] rounded-xl text-xs text-[#D92F43] font-medium leading-relaxed">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-[#D92F43] hover:bg-[#B82035] disabled:opacity-60 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-md mt-2 flex items-center justify-center gap-2"
            >
              {isLoggingIn ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Authorizing...</span>
                </>
              ) : (
                <span>Log In to Floor Manager POS</span>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[#F1F5F9] text-center text-[11px] text-[#64748B] leading-relaxed">
            Only manager accounts registered in Staff Management from the mobile app are authorized for this restaurant.
          </div>
        </div>
      </div>
    );
  }

  // Active print data source (either reprint target or currently active cart)
  const activeOrderForPrint = reprintTargetOrder || {
    billNumber: `BILL #${Math.floor(1000 + Math.random() * 9000)}`,
    kotToken: kotTokenNumber,
    tableNumber: selectedTable.number,
    tableSection: selectedTable.section,
    customerName,
    customerPhone,
    serverName: managerSession.name,
    items: cart,
    subtotal,
    discount,
    cgst,
    sgst,
    grandTotal: total,
    paymentMethod: selectedPaymentMethod,
    formattedDate: new Date().toLocaleDateString('en-IN'),
    formattedTime: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    specialNote,
  };

  // 2. Manager Order Taking & History Dashboard
  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col text-[#0B1B29]">
      {/* Top Navbar */}
      <header className="bg-white border-b border-[#E2E8F0] sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Outlet info */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#D92F43] flex items-center justify-center text-white font-extrabold text-lg shadow-sm">
                ED
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-xl tracking-tight text-[#0B1B29]">EzyDine</span>
                  <span className="px-2 py-0.5 text-[11px] font-bold bg-[#DCFCE7] text-[#16A34A] rounded-md">
                    Manager Portal
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
                  <span className="font-bold text-[#0B1B29]">{managerSession.restaurantName}</span>
                  <span>•</span>
                  <span>{managerSession.restaurantLocation}</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-[#16A34A]" />
                </div>
              </div>
            </div>

            {/* Main Tabs Navigation: POS Floor Billing vs Order History & Reprints */}
            <div className="hidden md:flex items-center bg-[#F1F5F9] p-1 rounded-xl ml-4">
              <button
                onClick={() => setCurrentView('pos')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${currentView === 'pos'
                  ? 'bg-white text-[#0B1B29] shadow-xs'
                  : 'text-[#64748B] hover:text-[#0B1B29]'
                  }`}
              >
                <UtensilsCrossed className="w-4 h-4 text-[#D92F43]" />
                <span>POS Floor & Tables</span>
                {occupiedTablesList.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#D92F43] text-white">
                    {occupiedTablesList.length} Active
                  </span>
                )}
              </button>

              <button
                onClick={() => setCurrentView('history')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${currentView === 'history'
                  ? 'bg-white text-[#0B1B29] shadow-xs'
                  : 'text-[#64748B] hover:text-[#0B1B29]'
                  }`}
              >
                <History className="w-4 h-4 text-[#2563EB]" />
                <span>Order History & Reprints</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#EEF2FF] text-[#4338CA] font-bold">
                  {orderHistory.length}
                </span>
              </button>

              <button
                onClick={() => {
                  setCurrentView('master');
                  loadMasterOtps();
                  loadMasterAppLogins();
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${currentView === 'master'
                  ? 'bg-white text-[#0B1B29] shadow-xs'
                  : 'text-[#64748B] hover:text-[#0B1B29]'
                  }`}
              >
                <Key className="w-4 h-4 text-[#D97706]" />
                <span>Master Admin</span>
                {masterOtps.filter((o) => o.status === 'ACTIVE').length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#FEF3C7] text-[#D97706] font-extrabold animate-pulse">
                    {masterOtps.filter((o) => o.status === 'ACTIVE').length} OTP
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Right Action Icons: Printer device, Sync, Profile */}
          <div className="flex items-center gap-3">
            {/* Status Toast */}
            {printStatusMessage && (
              <div className="hidden lg:flex items-center gap-2 bg-[#DCFCE7] text-[#16A34A] px-3 py-1.5 rounded-lg text-xs font-semibold animate-pulse-slow">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="truncate max-w-[280px]">{printStatusMessage}</span>
              </div>
            )}

            {/* Hardware Printer Pill */}
            <button
              onClick={() => setIsPrinterModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] text-[#16A34A] hover:bg-[#DCFCE7] text-xs font-semibold transition-all shadow-xs"
              title="Search and Connect Real Hardware Printer"
            >
              <Printer className="w-4 h-4 text-[#16A34A]" />
              <span className="font-bold truncate max-w-[170px]">
                {activePrinter.name} ({activePrinter.paperWidth})
              </span>
              <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
            </button>

            {/* Refresh Menu button */}
            <button
              onClick={() => fetchRestaurantMenu(managerSession.token)}
              disabled={isMenuLoading}
              title="Sync menu from database"
              className="p-2 text-[#64748B] hover:text-[#0B1B29] rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isMenuLoading ? 'animate-spin text-[#D92F43]' : ''}`} />
            </button>

            {/* Manager Profile & Logout */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-[#E2E8F0]">
              <div className="w-8 h-8 rounded-full bg-[#0B1B29] text-white flex items-center justify-center font-bold text-xs">
                {managerSession.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="hidden sm:block text-left text-xs">
                <div className="font-bold text-[#0B1B29]">{managerSession.name}</div>
                <div className="text-[#64748B]">{managerSession.role}</div>
              </div>
              <button
                onClick={handleLogout}
                title="Log Out"
                className="p-1.5 text-[#64748B] hover:text-[#D92F43] transition-colors rounded-lg hover:bg-[#FEE2E2]"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile View Switcher */}
        <div className="flex md:hidden border-t border-[#E2E8F0] bg-[#F8FAFC] p-2 gap-2">
          <button
            onClick={() => setCurrentView('pos')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold text-center ${currentView === 'pos' ? 'bg-[#0B1B29] text-white' : 'text-[#64748B]'
              }`}
          >
            Floor Tables ({occupiedTablesList.length})
          </button>
          <button
            onClick={() => setCurrentView('history')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold text-center ${currentView === 'history' ? 'bg-[#0B1B29] text-white' : 'text-[#64748B]'
              }`}
          >
            History ({orderHistory.length})
          </button>
          <button
            onClick={() => {
              setCurrentView('master');
              loadMasterOtps();
              loadMasterAppLogins();
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold text-center ${currentView === 'master' ? 'bg-[#0B1B29] text-white' : 'text-[#64748B]'
              }`}
          >
            Master Admin
          </button>
        </div>
      </header>

      {/* VIEW 1: POS FLOOR PLAN & BILLING */}
      {currentView === 'pos' && (
        <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row gap-6">
          {/* Left Column: Tables & Menu Catalog (2/3 width) */}
          <div className="flex-1 flex flex-col gap-6">
            {/* Table Selector Strip with Real-Time "Order Placed on Table" Status */}
            <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <UtensilsCrossed className="w-4 h-4 text-[#D92F43]" />
                  <span className="font-bold text-sm text-[#0B1B29]">Floor Plan Tables</span>
                  <span className="text-xs text-[#64748B]">({floorTables.length} tables)</span>
                </div>

                {/* Legend & Occupied Summary */}
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#16A34A]" /> Available
                  </span>
                  <span className="flex items-center gap-1.5 font-bold text-[#D92F43]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#D92F43] animate-pulse" />
                    {occupiedTablesList.length} Occupied with Active Orders
                  </span>
                </div>
              </div>

              {/* Table Buttons Grid */}
              <div className="flex gap-2.5 overflow-x-auto pb-1">
                {floorTables.map((t) => {
                  const isSelected = selectedTable.id === t.id;
                  const isOccupied = t.status === 'occupied' || (t.activeItemsCount && t.activeItemsCount > 0);

                  return (
                    <button
                      key={t.id}
                      onClick={() => handleSelectTable(t)}
                      className={`shrink-0 flex flex-col items-center justify-center px-4 py-2.5 rounded-xl border text-xs transition-all relative ${isSelected
                        ? 'border-[#0B1B29] bg-[#0B1B29] text-white shadow-md'
                        : isOccupied
                          ? 'border-[#FECDD3] bg-[#FFF1F2] text-[#0B1B29] hover:border-[#D92F43]'
                          : 'border-[#E2E8F0] bg-white text-[#0B1B29] hover:border-[#CBD5E1]'
                        }`}
                    >
                      {/* Active Order Indicator Dot */}
                      {isOccupied && !isSelected && (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#D92F43] animate-ping" />
                      )}

                      <div className="flex items-center gap-1">
                        <span className="font-extrabold text-sm">{t.number}</span>
                      </div>

                      <span className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-[#64748B]'}`}>
                        {t.section}
                      </span>

                      {/* Display Active Items Count & Amount placed on this table to the manager */}
                      {isOccupied && (
                        <div
                          className={`mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-[#D92F43] text-white'
                            }`}
                        >
                          {t.activeItemsCount} items • ₹{t.activeTotal}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Menu Catalog Section dynamically loaded from PostgreSQL */}
            <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-xs flex-1 flex flex-col">
              {/* Search and Category Tabs */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between mb-5">
                {/* Category Pills */}
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all capitalize whitespace-nowrap ${selectedCategory === cat
                        ? 'bg-[#D92F43] text-white shadow-xs'
                        : 'bg-[#F1F5F9] text-[#64748B] hover:text-[#0B1B29] hover:bg-[#E2E8F0]'
                        }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Search Bar */}
                <div className="relative min-w-[200px]">
                  <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search dish, code (e.g. Paneer Tikka, #12)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#0B1B29] placeholder-[#94A3B8] focus:outline-hidden focus:border-[#D92F43]"
                  />
                </div>
              </div>

              {/* Quick Add helper when searching */}
              {searchQuery.trim() && (
                <div className="mb-4 flex items-center justify-between bg-[#FFF1F2] border border-[#FECDD3] px-3.5 py-2 rounded-xl text-xs">
                  <span className="text-[#0B1B29] font-medium">Adding custom dish?</span>
                  <button
                    onClick={() => handleQuickAddDish(searchQuery)}
                    className="flex items-center gap-1 text-[#D92F43] font-bold hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Quick Add "{searchQuery.trim()}" to Menu & Bill</span>
                  </button>
                </div>
              )}

              {/* Menu Items Grid */}
              {isMenuLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-[#94A3B8]">
                  <RefreshCw className="w-8 h-8 animate-spin text-[#D92F43] mb-3" />
                  <p className="text-xs font-semibold">Loading menu items from PostgreSQL database...</p>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-[#94A3B8]">
                  <UtensilsCrossed className="w-8 h-8 mb-2 stroke-1" />
                  <p className="text-xs font-semibold">
                    {searchQuery ? `No dishes match "${searchQuery}"` : 'No menu items found for this restaurant.'}
                  </p>
                  {searchQuery ? (
                    <button
                      onClick={() => handleQuickAddDish(searchQuery)}
                      className="mt-3 flex items-center gap-1.5 bg-[#D92F43] text-white px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-[#B82035] transition-all shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create "{searchQuery.trim()}" & Add to Order</span>
                    </button>
                  ) : (
                    <p className="text-[11px] mt-1">Add dishes in the mobile app Menu Management to display them here.</p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 flex-1 overflow-y-auto max-h-[560px] pr-1">
                  {filteredItems.map((dish) => {
                    const inCart = cart.find((c) => c.id === dish.id);
                    return (
                      <div
                        key={dish.id}
                        className="border border-[#E2E8F0] rounded-xl p-3.5 flex flex-col justify-between hover:border-[#CBD5E1] transition-all bg-white hover:shadow-xs group"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`w-3 h-3 rounded-full border flex items-center justify-center ${dish.isVeg ? 'border-[#16A34A]' : 'border-[#D92F43]'
                                  }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${dish.isVeg ? 'bg-[#16A34A]' : 'bg-[#D92F43]'
                                    }`}
                                />
                              </span>
                              <span className="font-bold text-xs text-[#0B1B29] group-hover:text-[#D92F43] transition-colors">
                                {dish.name}
                              </span>
                            </div>
                            <span className="font-extrabold text-sm text-[#0B1B29]">₹{dish.price}</span>
                          </div>
                          <p className="text-[11px] text-[#64748B] line-clamp-2 mb-3">{dish.description}</p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-[#F1F5F9]">
                          <span className="text-[10px] uppercase font-bold text-[#94A3B8] tracking-wider">
                            {dish.category}
                          </span>

                          {inCart ? (
                            <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-2 py-1">
                              <button
                                onClick={() => updateQuantity(dish.id, -1)}
                                className="text-[#64748B] hover:text-[#D92F43] transition-colors"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="font-bold text-xs text-[#0B1B29] w-4 text-center">
                                {inCart.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(dish.id, 1)}
                                className="text-[#64748B] hover:text-[#16A34A] transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => addToCart(dish)}
                              className="flex items-center gap-1 bg-[#0B1B29] hover:bg-[#D92F43] text-white px-2.5 py-1 rounded-lg text-xs font-bold transition-all shadow-xs"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Active Cart / Table Order Billing Panel (1/3 width) */}
          <div className="w-full lg:w-[400px] bg-white rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-col">
            {/* Cart Header */}
            <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#FEE2E2] text-[#D92F43] flex items-center justify-center font-bold">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-[#0B1B29]">Table {selectedTable.number}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#F1F5F9] text-[#64748B]">
                      {selectedTable.section}
                    </span>
                    {cart.length > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#FEE2E2] text-[#D92F43]">
                        Order Placed
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-[#64748B]">Capacity: {selectedTable.capacity} Seats</div>
                </div>
              </div>

              <button
                onClick={clearCart}
                title="Clear Cart"
                disabled={cart.length === 0}
                className="p-1.5 text-[#94A3B8] hover:text-[#D92F43] disabled:opacity-40 transition-colors rounded-lg hover:bg-[#FEE2E2]"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Customer Info (Optional) */}
            <div className="p-3 bg-[#F8FAFC] border-b border-[#E2E8F0] grid grid-cols-2 gap-2">
              <div className="relative">
                <User className="w-3 h-3 text-[#94A3B8] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Guest Name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-white border border-[#E2E8F0] rounded-lg pl-7 pr-2 py-1 text-xs text-[#0B1B29] focus:outline-hidden"
                />
              </div>
              <div className="relative">
                <Phone className="w-3 h-3 text-[#94A3B8] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Phone (optional)"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full bg-white border border-[#E2E8F0] rounded-lg pl-7 pr-2 py-1 text-xs text-[#0B1B29] focus:outline-hidden"
                />
              </div>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[220px] max-h-[300px]">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#94A3B8]">
                  <UtensilsCrossed className="w-8 h-8 mb-2 stroke-1" />
                  <p className="text-xs font-semibold">No items placed for this table yet.</p>
                  <p className="text-[11px]">Click "+ Add" on any menu dish to start the order.</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-[#0B1B29] truncate">{item.name}</div>
                      <div className="text-[#64748B] text-[11px]">₹{item.price} each</div>
                    </div>

                    <div className="flex items-center gap-1.5 bg-[#F1F5F9] rounded-lg px-2 py-1">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="text-[#64748B] hover:text-[#D92F43]"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-bold text-[#0B1B29] w-4 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="text-[#64748B] hover:text-[#16A34A]"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="font-bold text-[#0B1B29] w-14 text-right">
                      ₹{item.price * item.quantity}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Special Instructions Note */}
            <div className="px-4 pb-2">
              <input
                type="text"
                placeholder="Cooking note for Kitchen Chef (e.g. less spicy, crisp)..."
                value={specialNote}
                onChange={(e) => setSpecialNote(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-1.5 text-xs text-[#0B1B29] focus:outline-hidden"
              />
            </div>

            {/* Payment Method Selector (Cash, UPI, or Card Option) */}
            <div className="p-3 border-t border-[#E2E8F0] bg-white">
              <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block mb-1.5">
                Payment Option (Cash / UPI / Card)
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPaymentMethod('Cash')}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all border ${selectedPaymentMethod === 'Cash'
                    ? 'border-[#16A34A] bg-[#F0FDF4] text-[#16A34A] shadow-xs'
                    : 'border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] hover:text-[#0B1B29]'
                    }`}
                >
                  <Banknote className="w-3.5 h-3.5" />
                  <span>Cash</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPaymentMethod('UPI')}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all border ${selectedPaymentMethod === 'UPI'
                    ? 'border-[#2563EB] bg-[#EFF6FF] text-[#2563EB] shadow-xs'
                    : 'border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] hover:text-[#0B1B29]'
                    }`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>UPI / QR</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPaymentMethod('Card')}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all border ${selectedPaymentMethod === 'Card'
                    ? 'border-[#7C3AED] bg-[#F5F3FF] text-[#7C3AED] shadow-xs'
                    : 'border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] hover:text-[#0B1B29]'
                    }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Card</span>
                </button>
              </div>
            </div>

            {/* Totals & Breakdown */}
            <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] space-y-1.5 text-xs">
              <div className="flex justify-between text-[#64748B]">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>

              {discount > 0 && (
                <div className="flex justify-between text-[#D92F43] font-medium">
                  <span>Promo Discount</span>
                  <span>- ₹{discount.toFixed(2)}</span>
                </div>
              )}

              {isGstActive && (
                <>
                  <div className="flex justify-between text-[#64748B]">
                    <span>CGST (2.5% HSN 9963)</span>
                    <span>₹{cgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[#64748B]">
                    <span>SGST (2.5% HSN 9963)</span>
                    <span>₹{sgst.toFixed(2)}</span>
                  </div>
                </>
              )}

              <div className="pt-2 border-t border-[#E2E8F0] flex justify-between items-center text-sm font-extrabold text-[#0B1B29]">
                <span>Grand Total</span>
                <span className="text-lg text-[#D92F43]">₹{total.toFixed(2)}</span>
              </div>
            </div>

            {/* 1-Click Action Buttons: Direct KOT Print vs Direct Bill Print */}
            <div className="p-4 border-t border-[#E2E8F0] grid grid-cols-2 gap-2">
              <button
                onClick={handlePrintKOT}
                disabled={cart.length === 0}
                className="flex items-center justify-center gap-1.5 bg-[#0B1B29] hover:bg-[#1E293B] disabled:opacity-50 text-white py-2.5 rounded-xl font-bold text-xs transition-all shadow-xs"
                title="Place Order on Table & Print Kitchen Order Ticket (Token only, No prices)"
              >
                <ChefHat className="w-4 h-4" />
                <span>Print KOT</span>
              </button>

              <button
                onClick={handleBillAndPrint}
                disabled={cart.length === 0}
                className="flex items-center justify-center gap-1.5 bg-[#D92F43] hover:bg-[#B82035] disabled:opacity-50 text-white py-2.5 rounded-xl font-bold text-xs transition-all shadow-xs"
                title="Print Customer Tax Invoice Receipt & Move to Order History"
              >
                <Printer className="w-4 h-4" />
                <span>Bill & Print</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: ORDER HISTORY & REPRINT OPTIONS (Shown to Manager Once Print is Done) */}
      {currentView === 'history' && (
        <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
          {/* Top Banner & Quick Return to Floor */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-[#2563EB]" />
                <h2 className="text-lg font-extrabold text-[#0B1B29]">Manager Order History & Reprints</h2>
                <span className="px-2 py-0.5 text-xs font-bold bg-[#EEF2FF] text-[#2563EB] rounded-md">
                  {orderHistory.length} Total Orders
                </span>
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>LIVE LISTENER</span>
                </span>
              </div>
              <p className="text-xs text-[#64748B] mt-1">
                Print completed bills, reprint KOTs, or update payment mode (Cash, UPI, Card).
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => {
                  if (managerSession) fetchOrderHistory(managerSession.token, managerSession.restaurantId);
                }}
                className="flex items-center gap-1.5 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0B1B29] px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs"
                title="Refresh Completed Orders from Server"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#64748B]" />
                <span>Refresh Orders</span>
              </button>

              <button
                onClick={() => setCurrentView('pos')}
                className="flex items-center gap-2 bg-[#D92F43] hover:bg-[#B82035] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Take New Order / Floor Plan</span>
              </button>
            </div>
          </div>

          {/* KPI Metrics Strip (Total Sales, Cash, UPI, Card breakdown) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-[#64748B] uppercase">Total Billed</span>
                <div className="text-xl font-extrabold text-[#0B1B29] mt-0.5">₹{totalRevenue.toFixed(2)}</div>
                <div className="text-[11px] text-[#16A34A] mt-0.5 font-medium">{orderHistory.length} Orders</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#F1F5F9] text-[#0B1B29] flex items-center justify-center font-bold">
                <Receipt className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-[#16A34A] uppercase">Cash Collected</span>
                <div className="text-xl font-extrabold text-[#16A34A] mt-0.5">₹{totalCash.toFixed(2)}</div>
                <div className="text-[11px] text-[#64748B] mt-0.5">
                  {orderHistory.filter((o) => o.paymentMethod === 'Cash').length} Cash Bills
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center font-bold">
                <Banknote className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-[#2563EB] uppercase">UPI / QR Payment</span>
                <div className="text-xl font-extrabold text-[#2563EB] mt-0.5">₹{totalUPI.toFixed(2)}</div>
                <div className="text-[11px] text-[#64748B] mt-0.5">
                  {orderHistory.filter((o) => o.paymentMethod === 'UPI').length} UPI Bills
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center font-bold">
                <QrCode className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-[#7C3AED] uppercase">Card Swipes</span>
                <div className="text-xl font-extrabold text-[#7C3AED] mt-0.5">₹{totalCard.toFixed(2)}</div>
                <div className="text-[11px] text-[#64748B] mt-0.5">
                  {orderHistory.filter((o) => o.paymentMethod === 'Card').length} Card Bills
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#F5F3FF] text-[#7C3AED] flex items-center justify-center font-bold">
                <CreditCard className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Filter Bar & Search */}
          <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Payment Method Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                onClick={() => setHistoryFilterPayment('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${historyFilterPayment === 'all'
                  ? 'bg-[#0B1B29] text-white shadow-xs'
                  : 'bg-[#F1F5F9] text-[#64748B] hover:text-[#0B1B29]'
                  }`}
              >
                All Orders ({orderHistory.length})
              </button>

              <button
                onClick={() => setHistoryFilterPayment('Cash')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${historyFilterPayment === 'Cash'
                  ? 'bg-[#16A34A] text-white shadow-xs'
                  : 'bg-[#F1F5F9] text-[#64748B] hover:text-[#16A34A]'
                  }`}
              >
                <Banknote className="w-3.5 h-3.5" />
                <span>Cash Only</span>
              </button>

              <button
                onClick={() => setHistoryFilterPayment('UPI')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${historyFilterPayment === 'UPI'
                  ? 'bg-[#2563EB] text-white shadow-xs'
                  : 'bg-[#F1F5F9] text-[#64748B] hover:text-[#2563EB]'
                  }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>UPI Only</span>
              </button>

              <button
                onClick={() => setHistoryFilterPayment('Card')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${historyFilterPayment === 'Card'
                  ? 'bg-[#7C3AED] text-white shadow-xs'
                  : 'bg-[#F1F5F9] text-[#64748B] hover:text-[#7C3AED]'
                  }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Card Only</span>
              </button>
            </div>

            {/* History Search Bar */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Bill #, Table, Guest or Dish..."
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#0B1B29] placeholder-[#94A3B8] focus:outline-hidden focus:border-[#D92F43]"
              />
            </div>
          </div>

          {/* Orders History List */}
          {filteredOrderHistory.length === 0 ? (
            <div className="bg-white rounded-2xl p-16 text-center border border-[#E2E8F0] shadow-xs flex flex-col items-center justify-center">
              <History className="w-12 h-12 text-[#94A3B8] mb-3 stroke-1" />
              <h3 className="text-base font-bold text-[#0B1B29]">No Orders in History</h3>
              <p className="text-xs text-[#64748B] max-w-sm mt-1">
                {historySearchQuery
                  ? `No orders matching "${historySearchQuery}".`
                  : 'Complete an order in POS Billing to see print history and reprint slips.'}
              </p>
              <button
                onClick={() => setCurrentView('pos')}
                className="mt-4 bg-[#D92F43] hover:bg-[#B82035] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs"
              >
                Go to POS Floor Tables
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrderHistory.map((order) => {
                const isCash = order.paymentMethod === 'Cash';
                const isUPI = order.paymentMethod === 'UPI';
                const isCard = order.paymentMethod === 'Card';

                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs hover:border-[#CBD5E1] transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-5"
                  >
                    {/* Left: Bill Details & Table Info */}
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2.5 mb-2">
                        <span className="font-extrabold text-base text-[#0B1B29]">{order.billNumber}</span>
                        <span className="px-2 py-0.5 rounded-md bg-[#0B1B29] text-white text-xs font-bold">
                          Table {order.tableNumber}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-[#F1F5F9] text-[#64748B] text-xs font-bold">
                          {order.tableSection}
                        </span>
                        <span className="text-xs font-semibold text-[#16A34A] bg-[#DCFCE7] px-2 py-0.5 rounded-md">
                          KOT #{order.kotToken}
                        </span>
                        <span className="text-xs font-semibold text-[#16A34A] bg-[#DCFCE7] px-2 py-0.5 rounded-md flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-[#16A34A]" />
                          <span>ORDER DONE</span>
                        </span>
                      </div>

                      {/* Timestamps & Cashier */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-[#64748B] mb-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-[#94A3B8]" />
                          <span>{order.formattedDate}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-[#94A3B8]" />
                          <span>{order.formattedTime}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-[#94A3B8]" />
                          <span>Cashier: {order.serverName}</span>
                        </span>
                        {order.customerName && (
                          <span className="font-bold text-[#0B1B29]">Guest: {order.customerName}</span>
                        )}
                      </div>

                      {/* Itemized summary chips */}
                      <div className="flex flex-wrap gap-1.5">
                        {order.items.map((i, idx) => (
                          <span
                            key={idx}
                            className="text-xs bg-[#F8FAFC] border border-[#E2E8F0] text-[#0B1B29] px-2.5 py-1 rounded-lg font-medium"
                          >
                            <span className="font-bold text-[#D92F43]">[{i.quantity}]</span> {i.name}
                          </span>
                        ))}
                      </div>

                      {order.specialNote && (
                        <div className="text-[11px] text-[#64748B] italic mt-2">
                          Note: "{order.specialNote}"
                        </div>
                      )}
                    </div>

                    {/* Middle: Amount & Payment Mode Selector (Cash / UPI / Card Options) */}
                    <div className="lg:border-l lg:border-r border-[#E2E8F0] lg:px-6 py-2 flex flex-col justify-center items-start lg:items-center min-w-[220px]">
                      <div className="text-[11px] font-bold text-[#64748B] uppercase">Amount & Payment Mode</div>
                      <div className="text-2xl font-extrabold text-[#D92F43] my-1">
                        ₹{order.grandTotal.toFixed(2)}
                      </div>

                      {/* Amount Payment Method Options: Manager can click to change mode directly in history */}
                      <div className="flex items-center gap-1.5 mt-1 bg-[#F8FAFC] p-1 rounded-xl border border-[#E2E8F0]">
                        <button
                          onClick={() => handleUpdateOrderPaymentMethod(order.id, 'Cash')}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${isCash
                            ? 'bg-[#16A34A] text-white shadow-xs'
                            : 'text-[#64748B] hover:text-[#0B1B29]'
                            }`}
                          title="Set payment mode as Cash"
                        >
                          <Banknote className="w-3.5 h-3.5" />
                          <span>Cash</span>
                        </button>

                        <button
                          onClick={() => handleUpdateOrderPaymentMethod(order.id, 'UPI')}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${isUPI
                            ? 'bg-[#2563EB] text-white shadow-xs'
                            : 'text-[#64748B] hover:text-[#0B1B29]'
                            }`}
                          title="Set payment mode as UPI"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>UPI</span>
                        </button>

                        <button
                          onClick={() => handleUpdateOrderPaymentMethod(order.id, 'Card')}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${isCard
                            ? 'bg-[#7C3AED] text-white shadow-xs'
                            : 'text-[#64748B] hover:text-[#0B1B29]'
                            }`}
                          title="Set payment mode as Card"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Card</span>
                        </button>
                      </div>
                    </div>

                    {/* Right: Reprint Action Buttons */}
                    <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0">
                      <button
                        onClick={() => handleReprintBill(order)}
                        className="flex items-center justify-center gap-2 bg-[#D92F43] hover:bg-[#B82035] text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-xs"
                        title="Reprint Full Customer Tax Invoice Bill"
                      >
                        <Printer className="w-4 h-4" />
                        <span>Reprint Bill</span>
                      </button>

                      <button
                        onClick={() => handleReprintKOT(order)}
                        className="flex items-center justify-center gap-2 bg-[#0B1B29] hover:bg-[#1E293B] text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-xs"
                        title="Reprint Kitchen Order Ticket (Token only, No prices)"
                      >
                        <ChefHat className="w-4 h-4" />
                        <span>Reprint KOT</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Master Admin Panel: Create App Login & Live App Requested OTPs */}
      {currentView === 'master' && (
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Top Hero Card */}
          <div className="bg-[#0B1B29] text-white rounded-3xl p-6 sm:p-8 mb-8 relative overflow-hidden shadow-xl border border-white/10">
            <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-[#D92F43]/20 blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Master Terminal Control & Live OTP
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  Restaurant App Provisioning & OTP Feed
                </h1>
                <p className="text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
                  Provision new restaurant accounts for mobile app access, retrieve real-time OTP verification codes, and manage active tenant devices.
                </p>
              </div>

              {/* Master Universal OTP Quick Card */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 shrink-0 min-w-[280px]">
                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    Universal Master OTP
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-black">
                    ALWAYS ACTIVE
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 mt-2">
                  <span className="font-mono text-2xl font-black text-white tracking-widest bg-black/40 px-3 py-1.5 rounded-xl border border-white/10">
                    123456
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('123456');
                      setMasterOtpCopied('123456');
                      setTimeout(() => setMasterOtpCopied(null), 2000);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all text-xs font-bold"
                    title="Copy Universal OTP"
                  >
                    {masterOtpCopied === '123456' ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-300">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-2">Bypasses SMS on any mobile login for instant testing</p>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t border-white/10">
              <div className="flex items-center gap-4 bg-white/5 rounded-2xl p-4 border border-white/5">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-black text-white">
                    {masterOtps.filter((o) => o.status === 'ACTIVE').length}
                  </div>
                  <div className="text-xs text-slate-400 font-medium">Active OTPs (Live Feed)</div>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-white/5 rounded-2xl p-4 border border-white/5">
                <div className="w-12 h-12 rounded-xl bg-[#D92F43]/20 text-[#D92F43] flex items-center justify-center shrink-0">
                  <UserPlus className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-black text-white">{masterAppLogins.length}</div>
                  <div className="text-xs text-slate-400 font-medium">Registered App Accounts</div>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-white/5 rounded-2xl p-4 border border-white/5">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <HardDrive className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-black text-white">
                    {masterAppLogins.reduce((acc, curr) => acc + (parseInt(curr.activeDevices, 10) || 1), 0)}
                  </div>
                  <div className="text-xs text-slate-400 font-medium">Connected Terminals</div>
                </div>
              </div>
            </div>
          </div>

          {/* Sub Navigation Bar */}
          <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
            <div className="flex items-center gap-2 p-1 bg-white border border-[#E2E8F0] rounded-2xl shadow-xs">
              <button
                onClick={() => setMasterSubTab('otps')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${masterSubTab === 'otps'
                  ? 'bg-[#0B1B29] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#0B1B29] hover:bg-[#F8FAFC]'
                  }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>Live App Requested OTPs</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${masterSubTab === 'otps' ? 'bg-amber-400 text-black' : 'bg-amber-100 text-amber-800'
                    }`}
                >
                  {masterOtps.filter((o) => o.status === 'ACTIVE').length} Active
                </span>
              </button>

              <button
                onClick={() => {
                  setMasterSubTab('create_login');
                  setCreatedLoginSuccess(null);
                }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${masterSubTab === 'create_login'
                  ? 'bg-[#0B1B29] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#0B1B29] hover:bg-[#F8FAFC]'
                  }`}
              >
                <UserPlus className="w-4 h-4" />
                <span>Create App Login</span>
              </button>

              <button
                onClick={() => setMasterSubTab('logins')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${masterSubTab === 'logins'
                  ? 'bg-[#0B1B29] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#0B1B29] hover:bg-[#F8FAFC]'
                  }`}
              >
                <HardDrive className="w-4 h-4" />
                <span>Registered App Accounts ({masterAppLogins.length})</span>
              </button>
            </div>

            <button
              onClick={() => {
                loadMasterOtps();
                loadMasterAppLogins();
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0B1B29] rounded-xl text-xs font-bold shadow-xs transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isMasterLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Feed</span>
            </button>
          </div>

          {/* TAB 1: Live Requested OTPs */}
          {masterSubTab === 'otps' && (
            <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-xs overflow-hidden">
              <div className="p-6 border-b border-[#F1F5F9] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F8FAFC]">
                <div>
                  <h3 className="font-black text-lg text-[#0B1B29] flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-[#D92F43]" />
                    Real-time App OTP Verification Feed
                  </h3>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Every OTP requested on the Ezydine Mobile App appears here instantly. Click any OTP to copy.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl self-start sm:self-auto">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Auto-syncing every 4s
                </div>
              </div>

              {masterOtps.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-4">
                    <Smartphone className="w-8 h-8" />
                  </div>
                  <h4 className="font-bold text-base text-[#0B1B29]">No App OTP Requests Yet</h4>
                  <p className="text-xs text-[#64748B] max-w-md mx-auto mt-1">
                    When someone requests a login OTP in the mobile app, it will display here with 1-click copy.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#F1F5F9] text-[11px] font-bold text-[#64748B] uppercase tracking-wider bg-white">
                        <th className="py-3.5 px-6">Mobile Number</th>
                        <th className="py-3.5 px-6">OTP Code</th>
                        <th className="py-3.5 px-6">Status</th>
                        <th className="py-3.5 px-6">Requested Time</th>
                        <th className="py-3.5 px-6 text-right">Quick Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9]">
                      {masterOtps.map((otp) => {
                        const isCopied = masterOtpCopied === otp.otpCode;
                        return (
                          <tr
                            key={otp.id}
                            className={`hover:bg-[#F8FAFC] transition-colors ${otp.status === 'ACTIVE' ? 'bg-amber-50/20' : ''
                              }`}
                          >
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-[#0B1B29]/5 text-[#0B1B29] flex items-center justify-center font-bold text-xs">
                                  <Phone className="w-4 h-4 text-[#0B1B29]" />
                                </div>
                                <span className="font-mono font-bold text-sm text-[#0B1B29]">
                                  +91 {otp.phone}
                                </span>
                              </div>
                            </td>

                            <td className="py-4 px-6">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xl font-black text-[#D92F43] tracking-widest bg-red-50 border border-red-100 px-3 py-1 rounded-xl">
                                  {otp.otpCode}
                                </span>
                              </div>
                            </td>

                            <td className="py-4 px-6">
                              {otp.status === 'ACTIVE' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  ACTIVE (Valid)
                                </span>
                              ) : otp.status === 'USED' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                  ✓ Used
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  Expired
                                </span>
                              )}
                            </td>

                            <td className="py-4 px-6 text-xs text-[#64748B] font-medium">
                              {otp.requestedAt || new Date(otp.createdAt).toLocaleTimeString()}
                            </td>

                            <td className="py-4 px-6 text-right">
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(otp.otpCode);
                                  setMasterOtpCopied(otp.otpCode);
                                  setTimeout(() => setMasterOtpCopied(null), 2000);
                                }}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs ${isCopied
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-[#0B1B29] hover:bg-[#1E293B] text-white'
                                  }`}
                              >
                                {isCopied ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Copy OTP</span>
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Create App Login */}
          {masterSubTab === 'create_login' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Form: Provisioning */}
              <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-[#E2E8F0] shadow-xs">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#F1F5F9]">
                  <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#D92F43] flex items-center justify-center font-bold">
                    <UserPlus className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-[#0B1B29]">Create App Login for Restaurant</h3>
                    <p className="text-xs text-[#64748B]">
                      Provision a new restaurant account. Credentials can be used immediately on the mobile app.
                    </p>
                  </div>
                </div>

                {createLoginError && (
                  <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{createLoginError}</span>
                  </div>
                )}

                <form onSubmit={handleCreateAppLogin} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-[#0B1B29] block mb-1.5">
                      Owner Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        value={createLoginPhone}
                        onChange={(e) => setCreateLoginPhone(e.target.value)}
                        placeholder="e.g. 9876543210"
                        maxLength={10}
                        required
                        className="w-full pl-10 pr-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] focus:border-[#D92F43] focus:bg-white rounded-xl text-sm font-semibold outline-hidden transition-all"
                      />
                    </div>
                    <p className="text-[11px] text-[#64748B] mt-1">This will be the primary login identifier for the mobile app.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-[#0B1B29] block mb-1.5">
                        Owner / Manager Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={createLoginName}
                        onChange={(e) => setCreateLoginName(e.target.value)}
                        placeholder="e.g. Ramesh Kumar"
                        required
                        className="w-full px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] focus:border-[#D92F43] focus:bg-white rounded-xl text-sm font-semibold outline-hidden transition-all"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-[#0B1B29] block mb-1.5">
                        Initial Staff PIN <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={createLoginPin}
                        onChange={(e) => setCreateLoginPin(e.target.value)}
                        placeholder="1234"
                        maxLength={6}
                        required
                        className="w-full px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] focus:border-[#D92F43] focus:bg-white rounded-xl text-sm font-mono font-bold outline-hidden transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#0B1B29] block mb-1.5">
                      Restaurant / Outlet Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={createLoginRestName}
                      onChange={(e) => setCreateLoginRestName(e.target.value)}
                      placeholder="e.g. Royal Punjab Dhaba"
                      required
                      className="w-full px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] focus:border-[#D92F43] focus:bg-white rounded-xl text-sm font-semibold outline-hidden transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-[#0B1B29] block mb-1.5">Location / City</label>
                      <input
                        type="text"
                        value={createLoginLocation}
                        onChange={(e) => setCreateLoginLocation(e.target.value)}
                        placeholder="e.g. MG Road, Bengaluru"
                        className="w-full px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] focus:border-[#D92F43] focus:bg-white rounded-xl text-sm font-semibold outline-hidden transition-all"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-[#0B1B29] block mb-1.5">Subscription Plan</label>
                      <select
                        value={createLoginPlan}
                        onChange={(e) => setCreateLoginPlan(e.target.value)}
                        className="w-full px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] focus:border-[#D92F43] focus:bg-white rounded-xl text-sm font-semibold outline-hidden transition-all"
                      >
                        <option value="plan_starter_3000">Starter Plan (₹2,999/mo - 2 Devices)</option>
                        <option value="plan_growth_6000">Growth Plan (₹5,999/mo - 5 Devices)</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={isCreatingLogin}
                      className="w-full py-3.5 bg-[#D92F43] hover:bg-[#B82035] disabled:opacity-50 text-white rounded-xl font-black text-sm transition-all shadow-md flex items-center justify-center gap-2"
                    >
                      {isCreatingLogin ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Provisioning Account & Generating Access...</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          <span>Provision & Create App Login</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Right: Created Credentials & Information */}
              <div className="lg:col-span-5 space-y-6">
                {createdLoginSuccess ? (
                  <div className="bg-emerald-50 border-2 border-emerald-400 rounded-3xl p-6 shadow-md animate-in fade-in duration-300">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold">
                        <Check className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-black text-base text-emerald-900">App Login Ready!</h4>
                        <p className="text-xs text-emerald-700">Account successfully provisioned</p>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl p-4 border border-emerald-200 space-y-3 mb-4">
                      <div className="flex justify-between items-center text-xs pb-2 border-b border-emerald-100">
                        <span className="text-slate-500">Restaurant:</span>
                        <span className="font-bold text-slate-800">{createdLoginSuccess.restaurantName}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs pb-2 border-b border-emerald-100">
                        <span className="text-slate-500">Owner Name:</span>
                        <span className="font-bold text-slate-800">{createdLoginSuccess.fullName}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs pb-2 border-b border-emerald-100">
                        <span className="text-slate-500">App Login Phone:</span>
                        <span className="font-mono font-bold text-slate-900">+91 {createdLoginSuccess.phone}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs pb-2 border-b border-emerald-100">
                        <span className="text-slate-500">Universal Master OTP:</span>
                        <span className="font-mono font-black text-[#D92F43] bg-red-50 px-2 py-0.5 rounded">
                          {createdLoginSuccess.masterOtp}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Staff PIN:</span>
                        <span className="font-mono font-bold text-slate-800">{createdLoginSuccess.initialPin}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        const text = `Ezydine Mobile App Login Details:\n• Restaurant: ${createdLoginSuccess.restaurantName}\n• Mobile: +91 ${createdLoginSuccess.phone}\n• Master OTP: ${createdLoginSuccess.masterOtp}\n• Staff PIN: ${createdLoginSuccess.initialPin}`;
                        navigator.clipboard.writeText(text);
                        setMasterOtpCopied('full_details');
                        setTimeout(() => setMasterOtpCopied(null), 2500);
                      }}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs"
                    >
                      {masterOtpCopied === 'full_details' ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Credentials Copied to Clipboard!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copy WhatsApp / SMS Message</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="bg-white rounded-3xl p-6 border border-[#E2E8F0] shadow-xs">
                    <h4 className="font-black text-sm text-[#0B1B29] mb-2 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      App Provisioning Instructions
                    </h4>
                    <p className="text-xs text-[#64748B] leading-relaxed mb-4">
                      When you create an app login here:
                    </p>
                    <ol className="text-xs text-[#64748B] space-y-2.5 list-decimal pl-4">
                      <li>The user record is instantly created in the master database.</li>
                      <li>A 30-day active subscription is assigned automatically.</li>
                      <li>
                        The owner can enter this phone number on the Mobile App, request OTP, and use either the live
                        generated OTP or the universal master OTP <strong className="text-[#0B1B29]">123456</strong>.
                      </li>
                      <li>The initial PIN is set to <strong className="text-[#0B1B29]">1234</strong> (or your custom value).</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Registered App Accounts */}
          {masterSubTab === 'logins' && (
            <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-xs overflow-hidden">
              <div className="p-6 border-b border-[#F1F5F9] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F8FAFC]">
                <div>
                  <h3 className="font-black text-lg text-[#0B1B29] flex items-center gap-2">
                    <HardDrive className="w-5 h-5 text-[#0B1B29]" />
                    Registered Restaurant Mobile App Logins
                  </h3>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    All accounts created in the system with active credentials and device allocations.
                  </p>
                </div>
                <div className="text-xs font-bold text-[#64748B]">
                  Total: <span className="text-[#0B1B29]">{masterAppLogins.length} accounts</span>
                </div>
              </div>

              {masterAppLogins.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
                    <User className="w-8 h-8" />
                  </div>
                  <h4 className="font-bold text-base text-[#0B1B29]">No Registered Logins Found</h4>
                  <p className="text-xs text-[#64748B] mt-1">Use "Create App Login" above to register the first restaurant.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#F1F5F9] text-[11px] font-bold text-[#64748B] uppercase tracking-wider bg-white">
                        <th className="py-3.5 px-6">Restaurant & Owner</th>
                        <th className="py-3.5 px-6">Login Phone</th>
                        <th className="py-3.5 px-6">Subscription Plan</th>
                        <th className="py-3.5 px-6">Device Usage</th>
                        <th className="py-3.5 px-6">Registered On</th>
                        <th className="py-3.5 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9]">
                      {masterAppLogins.map((item) => (
                        <tr key={item.userId} className="hover:bg-[#F8FAFC] transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-[#0B1B29] text-white flex items-center justify-center font-bold text-sm shrink-0">
                                {item.fullName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold text-sm text-[#0B1B29]">{item.restaurantName}</div>
                                <div className="text-xs text-[#64748B]">
                                  {item.fullName} • {item.location}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-sm text-[#0B1B29]">
                                +91 {item.phone}
                              </span>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(item.phone);
                                  setMasterOtpCopied(`phone_${item.userId}`);
                                  setTimeout(() => setMasterOtpCopied(null), 2000);
                                }}
                                className="text-slate-400 hover:text-slate-600 p-1"
                                title="Copy Phone Number"
                              >
                                {masterOtpCopied === `phone_${item.userId}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>

                          <td className="py-4 px-6">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              {item.planName}
                            </span>
                          </td>

                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2 text-xs font-semibold text-[#0B1B29]">
                              <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                              <span>{item.activeDevices || 1} / {item.deviceLimit} Devices</span>
                            </div>
                          </td>

                          <td className="py-4 px-6 text-xs text-[#64748B]">
                            {item.createdAt}
                          </td>

                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={() => handleDeleteAppLogin(item.userId, item.restaurantName)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                              title="Delete Account"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Real Hardware Printer Device Connect Modal */}
      {isPrinterModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0B1B29]/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#E2E8F0]">
            <div className="flex items-center justify-between pb-4 border-b border-[#F1F5F9]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0B1B29] text-white flex items-center justify-center">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#0B1B29]">Real Hardware Printer Setup</h3>
                  <p className="text-xs text-[#64748B]">
                    Active: <span className="font-bold text-[#16A34A]">{activePrinter.name}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPrinterModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#F1F5F9] text-[#64748B] hover:text-[#0B1B29] flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Paper Width Selector */}
            <div className="mt-4">
              <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block mb-1.5">
                Thermal Roll Width
              </label>
              <div className="grid grid-cols-2 gap-2 bg-[#F1F5F9] p-1 rounded-xl">
                <button
                  onClick={() => handleUpdatePaperWidth('58mm')}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${activePrinter.paperWidth === '58mm'
                    ? 'bg-[#0B1B29] text-white shadow-xs'
                    : 'text-[#64748B] hover:text-[#0B1B29]'
                    }`}
                >
                  58mm (2-inch Pocket Roll)
                </button>
                <button
                  onClick={() => handleUpdatePaperWidth('80mm')}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${activePrinter.paperWidth === '80mm'
                    ? 'bg-[#0B1B29] text-white shadow-xs'
                    : 'text-[#64748B] hover:text-[#0B1B29]'
                    }`}
                >
                  80mm (3-inch Counter Roll)
                </button>
              </div>
            </div>

            {/* Hardware Connect Actions */}
            <div className="mt-5">
              <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-2">
                Discover Connected Hardware
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={handleScanUsbPrinter}
                  disabled={isScanningPrinter}
                  className="flex flex-col items-center justify-center p-3 rounded-xl border border-[#E2E8F0] hover:border-[#D92F43] hover:bg-[#FFF1F2] transition-all text-center gap-1.5 group"
                >
                  <Usb className="w-5 h-5 text-[#0B1B29] group-hover:text-[#D92F43]" />
                  <span className="text-xs font-bold text-[#0B1B29]">USB Thermal</span>
                  <span className="text-[10px] text-[#64748B]">Scan WebUSB</span>
                </button>

                <button
                  onClick={handleScanBluetoothPrinter}
                  disabled={isScanningPrinter}
                  className="flex flex-col items-center justify-center p-3 rounded-xl border border-[#E2E8F0] hover:border-[#2563EB] hover:bg-[#EFF6FF] transition-all text-center gap-1.5 group"
                >
                  <Bluetooth className="w-5 h-5 text-[#0B1B29] group-hover:text-[#2563EB]" />
                  <span className="text-xs font-bold text-[#0B1B29]">Bluetooth POS</span>
                  <span className="text-[10px] text-[#64748B]">Scan Wireless</span>
                </button>

                <button
                  onClick={handleScanSerialPrinter}
                  disabled={isScanningPrinter}
                  className="flex flex-col items-center justify-center p-3 rounded-xl border border-[#E2E8F0] hover:border-[#7C3AED] hover:bg-[#F5F3FF] transition-all text-center gap-1.5 group"
                >
                  <Cpu className="w-5 h-5 text-[#0B1B29] group-hover:text-[#7C3AED]" />
                  <span className="text-xs font-bold text-[#0B1B29]">Serial / COM</span>
                  <span className="text-[10px] text-[#64748B]">RS-232 / USB</span>
                </button>
              </div>

              {scanMessage && (
                <div className="mt-3 p-2.5 bg-[#DCFCE7] text-[#16A34A] rounded-xl text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{scanMessage}</span>
                </div>
              )}
              {scanError && (
                <div className="mt-3 p-2.5 bg-[#FEE2E2] text-[#D92F43] rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{scanError}</span>
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-[#F1F5F9]">
                <label className="text-[11px] font-bold text-[#64748B] block mb-1">
                  Or Add System Driver / Network Printer Name:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Epson TM-T82, TVS RP-3160, LAN Printer..."
                    value={customPrinterName}
                    onChange={(e) => setCustomPrinterName(e.target.value)}
                    className="flex-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs text-[#0B1B29] focus:outline-hidden"
                  />
                  <button
                    onClick={handleAddSystemPrinter}
                    className="bg-[#0B1B29] text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-[#1E293B] shrink-0"
                  >
                    Add Device
                  </button>
                </div>
              </div>
            </div>

            {/* Connected Real Devices List */}
            <div className="mt-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#0B1B29]">Connected Printers</span>
                <span className="text-[11px] text-[#64748B]">Auto-saved</span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {pairedPrinters.length === 0 ? (
                  <div className="p-4 border border-dashed border-[#CBD5E1] rounded-xl text-center text-xs text-[#94A3B8]">
                    No hardware printers paired yet. Scan for USB/Bluetooth above or add your system printer.
                  </div>
                ) : (
                  pairedPrinters.map((printer) => {
                    const isSelected = activePrinter.id === printer.id;
                    return (
                      <div
                        key={printer.id}
                        onClick={() => saveAndActivatePrinter(printer)}
                        className={`cursor-pointer border rounded-xl p-3 flex items-center justify-between transition-all ${isSelected
                          ? 'border-[#16A34A] bg-[#F0FDF4]'
                          : 'border-[#E2E8F0] hover:border-[#CBD5E1] bg-white'
                          }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center ${isSelected ? 'bg-[#DCFCE7] text-[#16A34A]' : 'bg-[#F1F5F9] text-[#0B1B29]'
                              }`}
                          >
                            <Printer className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-[#0B1B29]">{printer.name}</span>
                              <span className="text-[10px] bg-[#EEF2FF] text-[#4338CA] px-1.5 py-0.5 rounded-sm font-bold uppercase">
                                {printer.connectionType}
                              </span>
                            </div>
                            <div className="text-[11px] text-[#64748B]">
                              Width: {printer.paperWidth} • Status: Ready
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {isSelected ? (
                            <span className="flex items-center gap-1 text-xs font-bold text-[#16A34A]">
                              <Check className="w-4 h-4" />
                              <span>Active</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => saveAndActivatePrinter(printer)}
                              className="text-xs font-bold text-[#0B1B29] bg-[#F1F5F9] hover:bg-[#E2E8F0] px-2.5 py-1 rounded-lg"
                            >
                              Select
                            </button>
                          )}
                          <button
                            onClick={(e) => handleRemovePrinter(printer.id, e)}
                            className="p-1 text-[#94A3B8] hover:text-[#D92F43]"
                            title="Remove Device"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Windows 1-Click Silent Printing Helper */}
            <div className="mt-4 p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-left">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#0B1B29] mb-1">
                <Sparkles className="w-3.5 h-3.5 text-[#D92F43]" />
                <span>Windows Silent Printing Tip</span>
              </div>
              <p className="text-[11px] text-[#64748B] leading-relaxed">
                If Windows says <span className="font-semibold text-[#D92F43]">"Access Denied"</span> on USB, Windows OS has claimed the printer with its kernel driver.
              </p>
              <div className="mt-2 text-[11px] bg-white p-2 rounded-lg border border-[#E2E8F0] font-mono text-[#0B1B29] select-all">
                chrome.exe --kiosk-printing http://localhost:3000
              </div>
              <p className="text-[10px] text-[#64748B] mt-1.5">
                • <strong>Kiosk Silent Mode:</strong> Launch Chrome with the flag above to print silently with zero popups.<br />
                • <strong>Serial / COM:</strong> Or click "Serial / COM" above to connect to your printer's virtual COM port.
              </p>
            </div>

            <div className="mt-5 pt-4 border-t border-[#F1F5F9] grid grid-cols-2 gap-2">
              <button
                onClick={handleDirectTestPrint}
                className="border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0B1B29] py-2.5 rounded-xl font-bold text-xs transition-colors"
              >
                Test Direct Print
              </button>
              <button
                onClick={() => setIsPrinterModalOpen(false)}
                className="bg-[#D92F43] hover:bg-[#B82035] text-white py-2.5 rounded-xl font-bold text-xs transition-colors shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GENERATE PRINT MODAL (Owner Saved Template Preview - Replaces Automatic System Print Dialog) */}
      {isGeneratePrintOpen && generatedPrintData && (
        <div className="fixed inset-0 z-50 bg-[#0B1B29]/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-[#E2E8F0] my-8 flex flex-col gap-4 max-h-[92vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#D92F43] text-white flex items-center justify-center shadow-xs">
                  {generatedPrintData.mode === 'kot' ? <ChefHat className="w-5 h-5" /> : <Printer className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base text-[#0B1B29]">Generate Print</h3>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-[#DCFCE7] text-[#16A34A] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
                      Auto-Printer: {activePrinter.name}
                    </span>
                  </div>
                  <p className="text-xs text-[#64748B]">
                    {generatedPrintData.mode === 'kot'
                      ? `KOT Kitchen Slip • Token #${generatedPrintData.order.kotToken} (Zero Prices)`
                      : `Customer Tax Invoice • ${generatedPrintData.order.billNumber}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsTemplateEditorOpen((prev) => !prev)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${isTemplateEditorOpen
                    ? 'border-[#D92F43] bg-[#FFF1F2] text-[#D92F43]'
                    : 'border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] hover:text-[#0B1B29]'
                    }`}
                  title="Customize Owner Saved Template"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Template Settings</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsGeneratePrintOpen(false);
                    setIsTemplateEditorOpen(false);
                  }}
                  className="w-8 h-8 rounded-full bg-[#F1F5F9] text-[#64748B] hover:text-[#0B1B29] flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Collapsible Owner Template Customizer Settings */}
            {isTemplateEditorOpen && (
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4 text-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
                  <span className="font-bold text-[#0B1B29] flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-[#D92F43]" />
                    <span>Owner Receipt Template Settings</span>
                  </span>
                  <span className="text-[10px] text-[#64748B]">Auto-saved to restaurant profile</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-[#64748B] uppercase block mb-1">
                      Header Tagline / Slogan
                    </label>
                    <input
                      type="text"
                      value={ownerTemplate.headerText}
                      onChange={(e) => setOwnerTemplate((prev) => ({ ...prev, headerText: e.target.value }))}
                      className="w-full bg-white border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 text-xs text-[#0B1B29] focus:outline-hidden"
                      placeholder="e.g. Authentic Flavors · Fresh Ingredients"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-[#64748B] uppercase block mb-1">
                      Footer Closing Note
                    </label>
                    <input
                      type="text"
                      value={ownerTemplate.footerText}
                      onChange={(e) => setOwnerTemplate((prev) => ({ ...prev, footerText: e.target.value }))}
                      className="w-full bg-white border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 text-xs text-[#0B1B29] focus:outline-hidden"
                      placeholder="e.g. Thank you for dining with us! Visit again."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-xl border border-[#E2E8F0]">
                    <input
                      type="checkbox"
                      checked={ownerTemplate.showLogo}
                      onChange={(e) => setOwnerTemplate((prev) => ({ ...prev, showLogo: e.target.checked }))}
                      className="rounded text-[#D92F43]"
                    />
                    <span className="text-[11px] font-medium text-[#0B1B29]">Show Logo</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-xl border border-[#E2E8F0]">
                    <input
                      type="checkbox"
                      checked={ownerTemplate.showGst}
                      onChange={(e) => setOwnerTemplate((prev) => ({ ...prev, showGst: e.target.checked }))}
                      className="rounded text-[#D92F43]"
                    />
                    <span className="text-[11px] font-medium text-[#0B1B29]">Show GSTIN</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-xl border border-[#E2E8F0]">
                    <input
                      type="checkbox"
                      checked={ownerTemplate.showFssai}
                      onChange={(e) => setOwnerTemplate((prev) => ({ ...prev, showFssai: e.target.checked }))}
                      className="rounded text-[#D92F43]"
                    />
                    <span className="text-[11px] font-medium text-[#0B1B29]">Show FSSAI</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-xl border border-[#E2E8F0]">
                    <input
                      type="checkbox"
                      checked={ownerTemplate.showCashier}
                      onChange={(e) => setOwnerTemplate((prev) => ({ ...prev, showCashier: e.target.checked }))}
                      className="rounded text-[#D92F43]"
                    />
                    <span className="text-[11px] font-medium text-[#0B1B29]">Show Cashier</span>
                  </label>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0]">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-[#64748B] uppercase">Thermal Roll:</span>
                    <button
                      type="button"
                      onClick={() => setOwnerTemplate((prev) => ({ ...prev, paperWidth: '58mm' }))}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${ownerTemplate.paperWidth === '58mm' ? 'bg-[#0B1B29] text-white' : 'bg-white text-[#64748B] border border-[#E2E8F0]'
                        }`}
                    >
                      58mm (Pocket)
                    </button>
                    <button
                      type="button"
                      onClick={() => setOwnerTemplate((prev) => ({ ...prev, paperWidth: '80mm' }))}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${ownerTemplate.paperWidth === '80mm' ? 'bg-[#0B1B29] text-white' : 'bg-white text-[#64748B] border border-[#E2E8F0]'
                        }`}
                    >
                      80mm (Counter)
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSaveOwnerTemplate(ownerTemplate)}
                    className="bg-[#16A34A] hover:bg-[#15803D] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs"
                  >
                    Save & Apply Template
                  </button>
                </div>
              </div>
            )}

            {/* Generated Receipt Slip Preview (Visual Thermal Roll in Owner Template) */}
            <div className="flex-1 overflow-y-auto flex justify-center py-2 bg-[#F1F5F9] rounded-2xl border border-[#E2E8F0] p-4 max-h-[500px]">
              <div
                className={`bg-white text-black font-mono shadow-md border-t-4 border-b-4 border-dashed border-[#CBD5E1] p-5 transition-all text-xs leading-relaxed ${ownerTemplate.paperWidth === '58mm' ? 'w-[300px]' : 'w-[380px]'
                  }`}
              >
                {generatedPrintData.mode === 'kot' ? (
                  /* KOT Kitchen Order Ticket Template */
                  <div>
                    <div className="text-center mb-2">
                      <div className="font-extrabold text-base tracking-tight">*** KITCHEN ORDER TICKET ***</div>
                      <div className="text-xl font-black my-1 bg-[#0B1B29] text-white py-0.5 rounded-sm">
                        TOKEN #{generatedPrintData.order.kotToken}
                      </div>
                      <div className="text-xs font-bold">{managerSession.restaurantName}</div>
                    </div>

                    <div className="border-t-2 border-dashed border-black my-2" />

                    <div className="flex justify-between font-bold text-xs">
                      <span>TABLE: {generatedPrintData.order.tableNumber} ({generatedPrintData.order.tableSection})</span>
                      <span>TIME: {generatedPrintData.order.formattedTime}</span>
                    </div>

                    {ownerTemplate.showCashier && (
                      <div className="text-[11px] text-[#475569]">
                        Server: {generatedPrintData.order.serverName} • {generatedPrintData.order.formattedDate}
                      </div>
                    )}

                    {generatedPrintData.order.customerName && (
                      <div className="text-[11px]">Guest: {generatedPrintData.order.customerName}</div>
                    )}

                    <div className="border-t-2 border-dashed border-black my-2" />

                    <div className="flex justify-between font-bold text-xs uppercase mb-1">
                      <span>QTY  ITEM</span>
                      <span>STATUS</span>
                    </div>

                    <div className="border-t border-black mb-2" />

                    <div className="space-y-1.5">
                      {generatedPrintData.order.items.map((c: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-baseline font-bold text-sm">
                          <span>[{c.quantity}] {c.name}</span>
                          <span className="text-[10px] px-1 py-0.2 rounded border border-black">
                            {c.isVeg ? 'VEG' : 'NON-VEG'}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="border-t-2 border-dashed border-black my-2.5" />

                    {generatedPrintData.order.specialNote ? (
                      <div className="text-xs bg-[#F8FAFC] p-1.5 rounded border border-black mb-2">
                        <span className="font-bold">CHEF NOTE:</span> {generatedPrintData.order.specialNote}
                      </div>
                    ) : null}

                    <div className="text-center font-bold text-[11px] mt-2">
                      *** SEND TO KITCHEN PREPARATION ***
                    </div>
                  </div>
                ) : (
                  /* Customer Bill Tax Invoice Template */
                  <div>
                    <div className="text-center mb-2">
                      {ownerTemplate.showLogo && (
                        <div className="flex justify-center mb-1">
                          <div className="w-10 h-10 rounded-xl bg-[#D92F43] text-white flex items-center justify-center font-extrabold text-sm shadow-xs">
                            ED
                          </div>
                        </div>
                      )}
                      <div className="font-extrabold text-base tracking-tight">{managerSession.restaurantName}</div>
                      {ownerTemplate.headerText && (
                        <div className="text-[11px] text-[#64748B] italic">{ownerTemplate.headerText}</div>
                      )}
                      {managerSession.restaurantLocation ? <div className="text-[11px]">{managerSession.restaurantLocation}</div> : null}
                      {managerSession.restaurantPhone ? <div className="text-[11px]">Ph: {managerSession.restaurantPhone}</div> : null}
                      <div className="text-[10px] text-[#475569]">
                        {ownerTemplate.showGst && managerSession.gstNumber ? `GSTIN: ${managerSession.gstNumber}` : ''}
                        {ownerTemplate.showGst && managerSession.gstNumber && ownerTemplate.showFssai && managerSession.fssai ? ' • ' : ''}
                        {ownerTemplate.showFssai && managerSession.fssai ? `FSSAI: ${managerSession.fssai}` : ''}
                      </div>
                    </div>

                    <div className="border-t border-dashed border-black my-2" />

                    <div className="flex justify-between font-bold text-xs">
                      <span>{generatedPrintData.order.billNumber}</span>
                      <span>TABLE: {generatedPrintData.order.tableNumber} ({generatedPrintData.order.tableSection})</span>
                    </div>

                    <div className="flex justify-between text-[11px]">
                      <span>TABLE: {generatedPrintData.order.tableNumber} ({generatedPrintData.order.tableSection})</span>
                      <span>{generatedPrintData.order.formattedDate} {generatedPrintData.order.formattedTime}</span>
                    </div>

                    <div className="flex justify-between font-bold text-[11px]">
                      <span>Payment: {generatedPrintData.order.paymentMethod.toUpperCase()}</span>
                      <span>KOT Token #{generatedPrintData.order.kotToken}</span>
                    </div>

                    {generatedPrintData.order.customerName && (
                      <div className="text-[11px]">
                        Guest: {generatedPrintData.order.customerName}{' '}
                        {generatedPrintData.order.customerPhone ? `(${generatedPrintData.order.customerPhone})` : ''}
                      </div>
                    )}

                    <div className="border-t border-dashed border-black my-2" />

                    <div className="flex justify-between font-bold text-xs uppercase mb-1">
                      <span className="flex-1">ITEM</span>
                      <span className="w-8 text-center">QTY</span>
                      <span className="w-16 text-right">AMOUNT</span>
                    </div>

                    <div className="border-t border-black mb-1.5" />

                    <div className="space-y-1">
                      {generatedPrintData.order.items.map((c: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-baseline text-xs">
                          <span className="flex-1 truncate">{c.name}</span>
                          <span className="w-8 text-center">{c.quantity}</span>
                          <span className="w-16 text-right font-medium">₹{(c.price * c.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-dashed border-black my-2" />

                    <div className="space-y-0.5 text-xs">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>₹{generatedPrintData.order.subtotal.toFixed(2)}</span>
                      </div>
                      {generatedPrintData.order.discount > 0 && (
                        <div className="flex justify-between">
                          <span>Discount:</span>
                          <span>-₹{generatedPrintData.order.discount.toFixed(2)}</span>
                        </div>
                      )}
                      {ownerTemplate.showGst && (
                        <>
                          <div className="flex justify-between">
                            <span>CGST (2.5%):</span>
                            <span>₹{generatedPrintData.order.cgst.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>SGST (2.5%):</span>
                            <span>₹{generatedPrintData.order.sgst.toFixed(2)}</span>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="border-t border-black my-2" />

                    <div className="flex justify-between font-black text-sm my-1">
                      <span>GRAND TOTAL:</span>
                      <span>₹{generatedPrintData.order.grandTotal.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between text-[11px]">
                      <span>PAID VIA:</span>
                      <span className="font-bold">{generatedPrintData.order.paymentMethod.toUpperCase()}</span>
                    </div>

                    <div className="border-t border-dashed border-black my-2.5" />

                    <div className="text-center font-medium text-[11px] italic">
                      {ownerTemplate.footerText || 'Thank you for dining with us! Visit again.'}
                    </div>

                    <div className="text-center text-[9px] text-[#64748B] mt-1">
                      Powered by EzyDine Cloud POS
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Bottom Action Controls */}
            <div className="pt-2 border-t border-[#F1F5F9] flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleCopyReceiptText}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] text-xs font-bold text-[#0B1B29] transition-all"
              >
                {copiedSlip ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSlip ? 'Copied to Clipboard' : 'Copy Slip Text'}</span>
              </button>

              <div className="flex items-center gap-2">
                {/* DIRECT AUTOMATIC THERMAL HARDWARE PRINT (Zero Browser Pop-up!) */}
                <button
                  type="button"
                  disabled={isDirectPrinting}
                  onClick={handleDirectHardwarePrint}
                  className="flex items-center gap-2 bg-[#D92F43] hover:bg-[#B82035] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md disabled:opacity-75"
                  title={`Direct automatic hardware printing to ${activePrinter.name}`}
                >
                  <Printer className={`w-4 h-4 ${isDirectPrinting ? 'animate-bounce text-[#10B981]' : ''}`} />
                  <span>{isDirectPrinting ? 'Sending to Hardware...' : `Direct Print: ${activePrinter.name}`}</span>
                </button>

                {/* Optional Fallback for System Browser Dialog if Needed */}
                <button
                  type="button"
                  onClick={() => {
                    playReceiptChime();
                    window.print();
                  }}
                  className="px-3 py-2 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[11px] font-semibold text-[#64748B] transition-all"
                  title="Open browser system print menu (for PDF export or AirPrint)"
                >
                  System Dialog
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsGeneratePrintOpen(false);
                    setIsTemplateEditorOpen(false);
                  }}
                  className="bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0B1B29] px-4 py-2 rounded-xl text-xs font-bold transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DEDICATED THERMAL PRINT AREA (Formatted strictly with Owner Saved Template for Physical Spooling) */}
      <div id="thermal-print-area" className="hidden font-mono text-[12px] p-2 leading-relaxed text-black">
        {activePrintMode === 'kot' ? (
          /* KOT TOKEN PRINT (NO PRICES, NO GST, STRICTLY CHEF PREPARATION COPY) */
          <div>
            <div style={{ textAlign: 'center', marginBottom: '6px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '16px' }}>*** KITCHEN ORDER TICKET ***</div>
              <div style={{ fontWeight: 'extrabold', fontSize: '18px', margin: '4px 0' }}>
                TOKEN #{activeOrderForPrint.kotToken}
              </div>
              <div style={{ fontSize: '11px' }}>{managerSession.restaurantName}</div>
            </div>
            <div style={{ borderTop: '2px dashed #000', margin: '6px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
              <span>TABLE: {activeOrderForPrint.tableNumber} ({activeOrderForPrint.tableSection})</span>
              <span>TIME: {activeOrderForPrint.formattedTime}</span>
            </div>
            {ownerTemplate.showCashier && (
              <div style={{ fontSize: '11px', color: '#333' }}>
                Server: {activeOrderForPrint.serverName} • {activeOrderForPrint.formattedDate}
              </div>
            )}
            {activeOrderForPrint.customerName && (
              <div style={{ fontSize: '11px' }}>Guest: {activeOrderForPrint.customerName}</div>
            )}
            <div style={{ borderTop: '2px dashed #000', margin: '6px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginBottom: '4px' }}>
              <span>QTY  ITEM</span>
              <span>STATUS</span>
            </div>
            <div style={{ borderTop: '1px solid #000', margin: '2px 0 6px 0' }} />
            {activeOrderForPrint.items.map((c, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  margin: '4px 0',
                  fontSize: '14px',
                  fontWeight: 'bold',
                }}
              >
                <span>[{c.quantity}]  {c.name}</span>
                <span>{c.isVeg ? 'VEG' : 'NON-VEG'}</span>
              </div>
            ))}
            <div style={{ borderTop: '2px dashed #000', margin: '8px 0 6px 0' }} />
            {activeOrderForPrint.specialNote ? (
              <div style={{ padding: '4px 0', fontSize: '12px' }}>
                <span style={{ fontWeight: 'bold' }}>COOKING INSTRUCTIONS:</span> {activeOrderForPrint.specialNote}
              </div>
            ) : null}
            <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '12px', marginTop: '6px' }}>
              *** SEND TO KITCHEN PREPARATION ***
            </div>
          </div>
        ) : (
          /* BILL PRINT (CUSTOMER TAX INVOICE WITH OWNER SAVED TEMPLATE) */
          <div>
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{managerSession.restaurantName}</div>
              {ownerTemplate.headerText && <div style={{ fontSize: '11px', fontStyle: 'italic' }}>{ownerTemplate.headerText}</div>}
              {managerSession.restaurantLocation ? <div>{managerSession.restaurantLocation}</div> : null}
              {managerSession.restaurantPhone ? <div>Ph: {managerSession.restaurantPhone}</div> : null}
              <div>
                {ownerTemplate.showGst && managerSession.gstNumber ? `GSTIN: ${managerSession.gstNumber}` : ''}
                {ownerTemplate.showGst && managerSession.gstNumber && ownerTemplate.showFssai && managerSession.fssai ? ' • ' : ''}
                {ownerTemplate.showFssai && managerSession.fssai ? `FSSAI: ${managerSession.fssai}` : ''}
              </div>
            </div>
            <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{activeOrderForPrint.billNumber}</span>
              <span>TABLE: {activeOrderForPrint.tableNumber} ({activeOrderForPrint.tableSection})</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Date & Time:</span>
              <span>{activeOrderForPrint.formattedDate} {activeOrderForPrint.formattedTime}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
              <span>Payment Mode: {activeOrderForPrint.paymentMethod.toUpperCase()}</span>
              <span>KOT Token #{activeOrderForPrint.kotToken}</span>
            </div>
            {activeOrderForPrint.customerName && (
              <div>
                Guest: {activeOrderForPrint.customerName}{' '}
                {activeOrderForPrint.customerPhone ? `(${activeOrderForPrint.customerPhone})` : ''}
              </div>
            )}
            <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
              <span>ITEM</span>
              <span>QTY</span>
              <span>AMOUNT</span>
            </div>
            <div style={{ borderTop: '1px solid #000', margin: '2px 0 4px 0' }} />
            {activeOrderForPrint.items.map((c, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
                <span style={{ flex: 1 }}>{c.name}</span>
                <span style={{ width: '30px', textAlign: 'center' }}>{c.quantity}</span>
                <span style={{ width: '60px', textAlign: 'right' }}>{(c.price * c.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Subtotal:</span>
              <span>{activeOrderForPrint.subtotal.toFixed(2)}</span>
            </div>
            {activeOrderForPrint.discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Discount:</span>
                <span>-{activeOrderForPrint.discount.toFixed(2)}</span>
              </div>
            )}
            {ownerTemplate.showGst && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>CGST (2.5%):</span>
                  <span>{activeOrderForPrint.cgst.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>SGST (2.5%):</span>
                  <span>{activeOrderForPrint.sgst.toFixed(2)}</span>
                </div>
              </>
            )}
            <div style={{ borderTop: '1px solid #000', margin: '4px 0' }} />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontWeight: 'bold',
                fontSize: '14px',
                marginTop: '2px',
              }}
            >
              <span>GRAND TOTAL:</span>
              <span>Rs. {activeOrderForPrint.grandTotal.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '2px' }}>
              <span>PAID VIA:</span>
              <span style={{ fontWeight: 'bold' }}>{activeOrderForPrint.paymentMethod.toUpperCase()}</span>
            </div>
            <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />
            <div style={{ textAlign: 'center', fontStyle: 'italic', fontSize: '11px' }}>
              {ownerTemplate.footerText || 'Thank you for dining with us! Visit again.'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
