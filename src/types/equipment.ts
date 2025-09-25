export interface EquipmentItem {
  _id?: string;
  name: string;
  price: number;
  description?: string;
}

export interface EquipmentTemplate {
  _id?: string;
  name: string;
  description?: string;
  items: EquipmentItem[];
  totalPrice: number;
  estimatedLifespanDays: number; // อายุการใช้งานเป็นวัน
  dailyCost: number; // คำนวณจาก totalPrice / estimatedLifespanDays
  createdAt?: Date;
  updatedAt?: Date;
}

export interface EquipmentSet {
  _id?: string;
  templateId: string;
  template?: EquipmentTemplate;
  setName: string; // เช่น "ชุดกาแฟ #1", "ชุดกาแฟ #2"
  purchaseDate: Date;
  status: 'available' | 'in_use' | 'maintenance' | 'broken';
  currentBoothId?: string; // ถ้ากำลัง in_use
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}