import { MenuItem } from '@/types';

export interface LocalIngredient {
  _id: string;
  name: string;
  unit: string;
  costPerUnit: number;
  stock: number;
}

export interface BusinessPlan {
  // Basic Info
  name: string;
  location: string;
  startDate: string;
  endDate: string;
  numberOfDays: number;
  rentCost: number;
  openingStart: string;
  openingEnd: string;
  staffUsername: string;
  staffPassword: string;
  employees: { name: string; salary: string; position: string; }[];
  equipmentSetId?: string;

  // Menu & Calculations
  selectedMenuItems: MenuItem[];
  menuItemProportions: { [menuItemId: string]: number }; // Percentage of total sales for each menu item
  fixedCosts: {
    rent: number;
    staff: number;
    equipment: number;
    total: number;
  };
  breakEven: {
    unitsNeeded: number;
    revenueNeeded: number;
    dailyTarget: number;
  };
  profitBreakEven: {
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
  reserveFund: number;

  // Initial Stock
  initialStock?: { [ingredientId: string]: number };

  // Target (Required)
  targetProfit: {
    type: 'percentage' | 'amount';
    value: number;
    unitsNeeded: number;
    revenueNeeded: number;
    additionalIngredients: number;
    totalCapitalWithProfit: number;
  };
}