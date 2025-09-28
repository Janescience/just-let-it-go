export interface User {
  _id: string;
  username: string;
  email?: string;
  name: string;
  password: string;
  role: 'admin' | 'staff';
  brandId: string;
  boothId?: string; // สำหรับ staff - booth ที่ผูกไว้
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Brand {
  _id: string;
  name: string;
  logo?: string;
  ownerId: string;
  paymentInfo?: {
    type?: 'phone' | 'idCard' | 'eWallet' | 'paotang';
    value?: string;
    qrCodeImage?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Ingredient {
  _id: string;
  name: string;
  unit: string;
  costPerUnit: number;
  stock: number;
  minimumStock: number;
  brandId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MenuItem {
  _id: string;
  name: string;
  price: number;
  description?: string;
  image?: string;
  ingredients: {
    ingredientId: string;
    quantity: number;
  }[];
  brandId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BoothStock {
  ingredientId: string;
  allocatedQuantity: number;
  usedQuantity: number;
  remainingQuantity: number;
}

export interface IngredientStockStatus {
  ingredientId: string;
  name: string;
  unit: string;
  allocated: number;
  used: number;
  remaining: number;
  percentage: number;
  status: 'sufficient' | 'low' | 'critical' | 'out';
  usedInMenus: string[];
}

export interface MenuWithStock {
  _id: string;
  name: string;
  price: number;
  ingredients: {
    ingredientId: string;
    name: string;
    unit: string;
    quantityNeeded: number;
    allocated: number;
    used: number;
    remaining: number;
    percentage: number;
    possibleServings: number;
    status: 'sufficient' | 'low' | 'critical' | 'out';
  }[];
  maxServings: number;
  limitingIngredient?: string;
}

export interface StockAdjustment {
  ingredientId: string;
  adjustment: number;
  reason?: string;
}

export interface StockPurchase {
  ingredientId: string;
  quantity: number;
  costPerUnit: number;
  totalCost: number;
  reason: 'booth_allocation' | 'regular_restock';
  boothId?: string;
  timestamp: Date;
}

export interface Booth {
  _id: string;
  name: string;
  location: string;
  startDate: Date;
  endDate: Date;
  rentCost: number;
  openingHours: {
    start: string; // เช่น "08:00"
    end: string;   // เช่น "22:00"
  };
  staff: {
    username: string;
    password: string;
    userId?: string; // เมื่อ user ถูกสร้างแล้ว
  };
  employees: {
    name: string;
    salary: number;
    position?: string;
  }[];
  menuItems: string[];
  boothStock: BoothStock[];
  brandId: string;
  isActive: boolean;
  totalCost: number;
  businessPlan?: {
    fixedCosts: {
      rent: number;
      staff: number;
      equipment: number;
      additionalExpenses: number;
      total: number;
    };
    breakEven: {
      unitsNeeded: number;
      revenueNeeded: number;
      dailyTarget: number;
    };
    ingredients: {
      name: string;
      quantity: number;
      unit: string;
      cost: number;
    }[];
    totalCapital: number;
    equipmentId?: string;
    additionalExpenses?: {
      description: string;
      amount: number;
    }[];
    targetProfit?: {
      type: 'percentage' | 'amount';
      value: number;
      unitsNeeded: number;
      revenueNeeded: number;
      additionalIngredients: number;
      totalCapitalWithProfit: number;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Sale {
  _id: string;
  boothId: string;
  items: {
    menuItemId: string;
    quantity: number;
    price: number;
  }[];
  totalAmount: number;
  paymentMethod: 'cash' | 'transfer';
  paymentStatus: 'pending' | 'completed';
  qrCodeId?: string;
  employeeId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface QRPayment {
  _id: string;
  saleId: string;
  qrCode: string;
  amount: number;
  status: 'pending' | 'completed' | 'expired';
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DailySummary {
  _id: string;
  boothId: string;
  date: Date;
  totalSales: number;
  totalCost: number;
  totalProfit: number;
  itemsSold: {
    menuItemId: string;
    quantity: number;
    revenue: number;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MonthlySummary {
  _id: string;
  boothId: string;
  year: number;
  month: number;
  totalSales: number;
  totalCost: number;
  totalProfit: number;
  dailySummaries: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface StockMovement {
  _id: string;
  ingredientId: string;
  type: 'purchase' | 'use' | 'waste' | 'adjustment';
  quantity: number;
  cost?: number;
  reason?: string;
  boothId?: string;
  saleId?: string;
  createdAt: Date;
}

export interface AuthSession {
  user: {
    id: string;
    username: string;
    name: string;
    role: 'admin' | 'staff';
    brandId: string;
    boothId?: string;
  };
  expires: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

// Equipment types
export * from './equipment';
export type { Equipment, EquipmentUsageHistory } from './equipment';

// Accounting types
export * from './accounting';