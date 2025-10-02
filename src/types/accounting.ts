export interface AccountingTransaction {
  _id?: string;
  date: Date;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  paymentMethod?: 'cash' | 'transfer' | 'mixed' | 'other';
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
  'staff_salary': 'ค่าจ้างพนักงาน',
  'equipment_cost': 'ค่าอุปกรณ์',
  'other_expense': 'ค่าใช้จ่ายอื่นๆ',
  'additional_expense': 'ค่าใช้จ่ายเพิ่มเติม',
  'manual_expense': 'ค่าใช้จ่ายที่บันทึกด้วยตนเอง',
  'sale_cost': 'ต้นทุนขาย',
} as const;

export type IncomeCategory = keyof typeof INCOME_CATEGORIES;
export type ExpenseCategory = keyof typeof EXPENSE_CATEGORIES;

// Filter Criteria Types
export type FilterCriteriaType =
  | 'by_booth'
  | 'by_month'
  | 'by_quarter'
  | 'by_half_year'
  | 'by_year'
  | 'all_time';

export interface AccountingFilterCriteria {
  type: FilterCriteriaType;

  // For by_booth
  boothId?: string;
  startDate?: string;
  endDate?: string;

  // For by_month
  month?: number; // 1-12
  year?: number;

  // For by_quarter
  quarter?: number; // 1-4
  quarterYear?: number;

  // For by_half_year
  halfYear?: 'first' | 'second'; // ครึ่งแรก/หลัง
  halfYearYear?: number;

  // For by_year
  selectedYear?: number;
}

export const FILTER_CRITERIA_LABELS = {
  'by_booth': 'ดูแบบรายบูธ',
  'by_month': 'ดูแบบรายเดือน',
  'by_quarter': 'ดูแบบทุก 3 เดือน',
  'by_half_year': 'ดูแบบครึ่งปี',
  'by_year': 'ดูแบบทั้งปี',
  'all_time': 'ดูทั้งหมดทุกปี'
} as const;

export const QUARTER_LABELS = {
  1: 'ไตรมาสที่ 1 (ม.ค.-มี.ค.)',
  2: 'ไตรมาสที่ 2 (เม.ย.-มิ.ย.)',
  3: 'ไตรมาสที่ 3 (ก.ค.-ก.ย.)',
  4: 'ไตรมาสที่ 4 (ต.ค.-ธ.ค.)'
} as const;

export const HALF_YEAR_LABELS = {
  'first': 'ครึ่งแรก (ม.ค.-มิ.ย.)',
  'second': 'ครึ่งหลัง (ก.ค.-ธ.ค.)'
} as const;

export const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
] as const;