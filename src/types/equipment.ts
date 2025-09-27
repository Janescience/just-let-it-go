export interface EquipmentItem {
  _id?: string;
  name: string;
  price: number;
  description?: string;
}

export interface EquipmentUsageHistory {
  _id?: string;
  boothId: string;
  boothName: string;
  startDate: Date;
  endDate: Date;
  daysUsed: number;
  depreciationAmount: number;
}

export interface Equipment {
  _id?: string;
  brandId: string;
  name: string;
  description?: string;
  items: EquipmentItem[];
  totalPrice: number;
  estimatedLifespanDays: number; // อายุการใช้งานเป็นวัน
  dailyCost: number; // คำนวณจาก totalPrice / estimatedLifespanDays
  purchaseDate: Date;
  status: 'available' | 'in_use' | 'maintenance' | 'broken';

  // Depreciation tracking
  totalDaysUsed: number;
  currentValue: number;
  depreciationPercentage: number;

  // Usage history
  usageHistory: EquipmentUsageHistory[];

  // Current booth if in use
  currentBoothId?: string;
  currentBoothName?: string;

  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Keep old interfaces for backward compatibility during cleanup
export interface EquipmentTemplate {
  _id?: string;
  name: string;
  description?: string;
  items: EquipmentItem[];
  totalPrice: number;
  estimatedLifespanDays: number;
  dailyCost: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface EquipmentSet {
  _id?: string;
  templateId: string;
  template?: EquipmentTemplate;
  setName: string;
  purchaseDate: Date;
  status: 'available' | 'in_use' | 'maintenance' | 'broken';
  currentBoothId?: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}