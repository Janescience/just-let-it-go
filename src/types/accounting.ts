export interface AccountingTransaction {
  _id?: string;
  date: Date;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  boothId?: string;
  relatedId?: string; // ID ของ sale, purchase, booth ที่เกี่ยวข้อง
  relatedType?: 'sale' | 'booth_setup' | 'stock_purchase' | 'manual';
  brandId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AccountingSummary {
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  incomeByCategory: { [category: string]: number };
  expenseByCategory: { [category: string]: number };
  transactions: AccountingTransaction[];
}

// หมวดหมู่รายรับ
export const INCOME_CATEGORIES = {
  'sale_revenue': 'รายได้จากการขาย',
  'other_income': 'รายได้อื่นๆ'
} as const;

// หมวดหมู่รายจ่าย
export const EXPENSE_CATEGORIES = {
  'ingredient_cost': 'ต้นทุนวัตถุดิบ',
  'booth_rent': 'ค่าเช่าหน้าร้าน',
  'staff_salary': 'ค่าแรงพนักงาน',
  'equipment_cost': 'ค่าอุปกรณ์',
  'other_expense': 'ค่าใช้จ่ายอื่นๆ'
} as const;

export type IncomeCategory = keyof typeof INCOME_CATEGORIES;
export type ExpenseCategory = keyof typeof EXPENSE_CATEGORIES;