export type ScreenType =
  | 'splash'
  | 'signin'
  | 'otp_verification'
  | 'dashboard'
  | 'new_bill'
  | 'bill_details'
  | 'collect_payment'
  | 'receipt'
  | 'tables'
  | 'inventory'
  | 'reports'
  | 'menu_management'
  | 'subscription'
  | 'plan_details'
  | 'sub_checkout'
  | 'sub_processing'
  | 'sub_verification'
  | 'sub_failed'
  | 'sub_success'
  | 'sub_expired'
  | 'my_subscription'
  | 'upgrade_renewal'
  | 'subscription_history'
  | 'profile'
  | 'kitchen'
  | 'staff_attendance';

export interface MenuItem {
  id: number | string;
  name: string;
  category: string;
  price: number;
  isVeg: boolean;
  isAvailable?: boolean;
  image?: string;
  description?: string;
}

export interface CartItem {
  item: MenuItem;
  quantity: number;
}

export interface Transaction {
  id: string | number;
  billNumber: string;
  tableOrType: string;
  paymentMethod: 'UPI' | 'Cash' | 'Card';
  time: string;
  date?: string;
  amount: number;
  itemsCount?: number;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  duration?: string;
  deviceLimit: number; // 3 for 2999 plan, 6 for 5999 plan
  tagline?: string;
  popular?: boolean;
  features: string[];
  omittedFeatures?: string[];
  support?: string;
}

export interface TableItem {
  id: number;
  tableNumber: string;
  status: 'available' | 'occupied' | 'reserved';
  seats: number;
  activeTime?: string;
  activeAmount?: number | string;
  guestCount?: number;
}

export interface DailySales {
  day: string;
  dateNumber?: number;
  amount: number;
  isHighlight?: boolean;
}
