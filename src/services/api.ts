import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const BASE_URL = Platform.select({
  android: 'http://10.0.2.2:5001/api',
  default: 'http://localhost:5001/api',
});

const TOKEN_KEY = '@ezydine_auth_token';
const USER_KEY = '@ezydine_user_data';
const RESTAURANT_KEY = '@ezydine_restaurant_data';
const PLAN_KEY = '@ezydine_plan_data';
const DEVICE_KEY = '@ezydine_device_id';

// Memory fallback in case native AsyncStorage module is not linked in running binary
const memoryStore = new Map<string, string>();

const safeStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (AsyncStorage && typeof AsyncStorage.getItem === 'function') {
        const val = await AsyncStorage.getItem(key);
        if (val !== null && val !== undefined) return val;
      }
    } catch {
      // Fallback to memory
    }
    return memoryStore.get(key) || null;
  },

  async setItem(key: string, value: string): Promise<void> {
    memoryStore.set(key, value);
    try {
      if (AsyncStorage && typeof AsyncStorage.setItem === 'function') {
        await AsyncStorage.setItem(key, value);
      }
    } catch {
      // Memory fallback active
    }
  },

  async removeItem(key: string): Promise<void> {
    memoryStore.delete(key);
    try {
      if (AsyncStorage && typeof AsyncStorage.removeItem === 'function') {
        await AsyncStorage.removeItem(key);
      }
    } catch {
      // Memory fallback active
    }
  },

  async multiRemove(keys: string[]): Promise<void> {
    keys.forEach((k) => memoryStore.delete(k));
    try {
      if (AsyncStorage && typeof AsyncStorage.multiRemove === 'function') {
        await AsyncStorage.multiRemove(keys);
      }
    } catch {
      // Memory fallback active
    }
  },
};

class ApiService {
  private token: string | null = null;
  private deviceId: string | null = null;

  async init(): Promise<string | null> {
    try {
      this.token = await safeStorage.getItem(TOKEN_KEY);
      this.deviceId = await safeStorage.getItem(DEVICE_KEY);
      if (!this.deviceId) {
        this.deviceId = `terminal_${Math.random().toString(36).substring(2, 9)}`;
        await safeStorage.setItem(DEVICE_KEY, this.deviceId);
      }
      return this.token;
    } catch {
      return null;
    }
  }

  getToken(): string | null {
    return this.token;
  }

  getDeviceId(): string {
    return this.deviceId || 'terminal_main';
  }

  async saveAuth(data: { token: string; user: any; restaurant?: any; plan?: any; deviceId?: string }) {
    this.token = data.token;
    if (data.deviceId) {
      this.deviceId = data.deviceId;
      await safeStorage.setItem(DEVICE_KEY, data.deviceId);
    }
    await safeStorage.setItem(TOKEN_KEY, data.token);
    if (data.user) await safeStorage.setItem(USER_KEY, JSON.stringify(data.user));
    if (data.restaurant) await safeStorage.setItem(RESTAURANT_KEY, JSON.stringify(data.restaurant));
    if (data.plan) await safeStorage.setItem(PLAN_KEY, JSON.stringify(data.plan));
  }

  async clearAuth() {
    this.token = null;
    await safeStorage.multiRemove([TOKEN_KEY, USER_KEY, RESTAURANT_KEY, PLAN_KEY]);
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        // Token expired or invalid
        await this.clearAuth();
        throw new Error(data.error || 'Authentication token expired. Please sign in again.');
      }

      if (!response.ok) {
        throw new Error(data.error || `Request failed with status ${response.status}`);
      }

      return data;
    } catch (err: any) {
      console.warn(`API Error [${endpoint}]:`, err.message);
      throw err;
    }
  }

  // 1. Auth & Two-Step Verification
  auth = {
    sendOtp: async (identifier: string) => {
      return this.request('/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ identifier }),
      });
    },

    verifyOtp: async (identifier: string, otp: string, deviceName = 'Mobile POS Terminal') => {
      const deviceId = this.getDeviceId();
      const res = await this.request('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ identifier, otp, deviceId, deviceName }),
      });
      if (res.success && res.token) {
        await this.saveAuth(res);
      }
      return res;
    },

    getMe: async () => {
      return this.request('/auth/me');
    },

    logout: async () => {
      try {
        await this.request('/auth/logout', { method: 'POST' });
      } catch (e) {
        // ignore network error on logout
      }
      await this.clearAuth();
    },
  };

  // 2. Subscription & Razorpay
  subscription = {
    getPlans: async () => {
      return this.request('/subscription/plans');
    },

    getCurrent: async () => {
      return this.request('/subscription/current');
    },

    createRazorpayOrder: async (planId: string) => {
      return this.request('/subscription/create-razorpay-order', {
        method: 'POST',
        body: JSON.stringify({ planId }),
      });
    },

    verifyRazorpayPayment: async (paymentData: {
      planId: string;
      razorpayOrderId?: string;
      razorpayPaymentId?: string;
      razorpaySignature?: string;
    }) => {
      return this.request('/subscription/verify-razorpay-payment', {
        method: 'POST',
        body: JSON.stringify(paymentData),
      });
    },

    getHistory: async () => {
      return this.request('/subscription/history');
    },
  };

  // 3. Restaurant Profile & Settings
  restaurant = {
    getProfile: async () => {
      return this.request('/restaurant/profile');
    },
    updateProfile: async (profileData: any) => {
      return this.request('/restaurant/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData),
      });
    },
  };

  // 4. Tables Management
  tables = {
    getAll: async () => {
      return this.request('/tables');
    },
    updateStatus: async (id: number, data: any) => {
      return this.request(`/tables/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
  };

  // 5. Menu Items
  menu = {
    getAll: async () => {
      return this.request('/menu');
    },
    toggleAvailability: async (id: number) => {
      return this.request(`/menu/${id}/toggle`, {
        method: 'PATCH',
      });
    },
    addItem: async (item: any) => {
      return this.request('/menu', {
        method: 'POST',
        body: JSON.stringify(item),
      });
    },
  };

  // 6. Bills & Payments
  bills = {
    getAll: async () => {
      return this.request('/bills');
    },
    getById: async (id: number | string) => {
      return this.request(`/bills/${id}`);
    },
    create: async (billData: any) => {
      return this.request('/bills', {
        method: 'POST',
        body: JSON.stringify(billData),
      });
    },
    pay: async (id: number | string, paymentData: any) => {
      return this.request(`/bills/${id}/pay`, {
        method: 'POST',
        body: JSON.stringify(paymentData),
      });
    },
  };

  // 7. Kitchen Orders (KOT)
  kot = {
    getAll: async () => {
      return this.request('/kot');
    },
    updateStatus: async (id: number, status: string) => {
      return this.request(`/kot/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    },
  };

  // 8. Inventory
  inventory = {
    getAll: async () => {
      return this.request('/inventory');
    },
    adjustStock: async (id: number, adjustment: number, reason?: string) => {
      return this.request('/inventory/adjust', {
        method: 'POST',
        body: JSON.stringify({ id, adjustment, reason }),
      });
    },
  };

  // 9. Reports & Dashboard Stats
  reports = {
    getDashboard: async () => {
      return this.request('/reports/dashboard');
    },
    getSales: async (period = 'today') => {
      return this.request(`/reports/sales?period=${period}`);
    },
  };

  // 10. Staff Management (PostgreSQL synced for Manager Web Portal)
  staff = {
    getAll: async () => {
      return this.request('/staff');
    },
    create: async (member: {
      name: string;
      phone: string;
      role: string;
      pin: string;
      canEditMenu?: boolean;
      canAccessReports?: boolean;
    }) => {
      return this.request('/staff', {
        method: 'POST',
        body: JSON.stringify(member),
      });
    },
    toggle: async (id: number | string) => {
      return this.request(`/staff/${id}/toggle`, {
        method: 'PATCH',
      });
    },
    delete: async (id: number | string) => {
      return this.request(`/staff/${id}`, {
        method: 'DELETE',
      });
    },
    getAttendance: async (date?: string) => {
      const url = date ? `/staff/attendance?date=${encodeURIComponent(date)}` : '/staff/attendance';
      return this.request(url);
    },
    markAttendance: async (data: {
      staffId: number | string;
      date?: string;
      status?: string;
      clockIn?: string;
      clockOut?: string;
      shift?: string;
      notes?: string;
    }) => {
      return this.request('/staff/attendance/mark', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  };
}

export const api = new ApiService();
