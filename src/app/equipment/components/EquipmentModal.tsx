import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Modal, Input, ModalActionButton } from '@/components/ui';
import { Equipment, EquipmentItem } from '@/types';

interface EquipmentModalProps {
  equipment?: Equipment | null;
  copyFrom?: Equipment | null;
  onClose: () => void;
  onSave: () => void;
}

export function EquipmentModal({
  equipment,
  copyFrom,
  onClose,
  onSave
}: EquipmentModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    estimatedLifespanDays: 730, // 2 ปี
    purchaseDate: new Date().toISOString().split('T')[0],
    status: 'available' as const,
    notes: '',
    items: [] as EquipmentItem[]
  });

  const [loading, setLoading] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    price: 0,
    description: ''
  });

  useEffect(() => {
    if (equipment) {
      setFormData({
        name: equipment.name,
        description: equipment.description || '',
        estimatedLifespanDays: equipment.estimatedLifespanDays,
        purchaseDate: new Date(equipment.purchaseDate).toISOString().split('T')[0],
        status: equipment.status,
        notes: equipment.notes || '',
        items: [...equipment.items]
      });
    } else if (copyFrom) {
      setFormData({
        name: `${copyFrom.name} (สำเนา)`,
        description: copyFrom.description || '',
        estimatedLifespanDays: copyFrom.estimatedLifespanDays,
        purchaseDate: new Date().toISOString().split('T')[0],
        status: 'available',
        notes: '',
        items: [...copyFrom.items]
      });
    }
  }, [equipment, copyFrom]);

  const totalPrice = formData.items.reduce((sum, item) => sum + item.price, 0);
  const dailyCost = totalPrice / formData.estimatedLifespanDays;

  const handleAddItem = () => {
    if (!newItem.name || newItem.price <= 0) {
      alert('กรุณากรอกชื่อและราคาอุปกรณ์');
      return;
    }

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { ...newItem }]
    }));

    setNewItem({ name: '', price: 0, description: '' });
  };

  const handleRemoveItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.purchaseDate) {
      alert('กรุณากรอกชื่อและวันที่ซื้อ');
      return;
    }

    if (formData.items.length === 0) {
      alert('กรุณาเพิ่มอุปกรณ์อย่างน้อย 1 รายการ');
      return;
    }

    setLoading(true);

    try {
      const equipmentData = {
        ...formData,
        totalPrice,
        dailyCost,
        currentValue: totalPrice,
        depreciationPercentage: 0,
        totalDaysUsed: 0,
        usageHistory: [],
        purchaseDate: new Date(formData.purchaseDate)
      };

      const url = equipment
        ? `/api/equipment/${equipment._id}`
        : '/api/equipment';

      const method = equipment ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(equipmentData)
      });

      if (response.ok) {
        onSave();
      } else {
        const error = await response.json();
        alert(error.message || 'เกิดข้อผิดพลาด');
      }
    } catch (error) {
      console.error('Error saving equipment:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกอุปกรณ์');
    } finally {
      setLoading(false);
    }
  };

  const actions: ModalActionButton[] = [
    {
      label: 'ยกเลิก',
      onClick: onClose,
      variant: 'secondary',
      disabled: loading
    },
    {
      label: loading ? 'กำลังบันทึก...' : (equipment ? 'อัพเดท' : 'บันทึก'),
      onClick: () => {
        const form = document.querySelector('form');
        if (form) {
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }
      },
      variant: 'primary',
      disabled: loading || !formData.name || formData.items.length === 0,
      loading: loading
    }
  ];

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={equipment ? 'แก้ไขอุปกรณ์' : copyFrom ? 'คัดลอกอุปกรณ์' : 'เพิ่มอุปกรณ์'}
      size="xl"
      actions={actions}
      className="h-[90vh]"
    >
      <div className="p-8 space-y-8">
        <form onSubmit={handleSubmit} className="space-y-12">
          {/* Basic Info */}
          <div>
            <div className="text-lg font-thin text-black tracking-wide mb-6">ข้อมูลพื้นฐาน</div>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <label className="block text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">
                    ชื่ออุปกรณ์
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="เช่น ชุดขายกาแฟ"
                    className="border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">
                    วันที่ซื้อ
                  </label>
                  <Input
                    type="date"
                    value={formData.purchaseDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, purchaseDate: e.target.value }))}
                    className="border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div>
                  <label className="block text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">
                    อายุการใช้งาน (ปี)
                  </label>
                  <Input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={formData.estimatedLifespanDays / 365}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      estimatedLifespanDays: Math.round(parseFloat(e.target.value || '0') * 365)
                    }))}
                    className="border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">
                    สถานะ
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black focus:outline-none"
                    required
                  >
                    <option value="available">พร้อมใช้งาน</option>
                    <option value="maintenance">ซ่อมบำรุง</option>
                    <option value="broken">เสียหาย</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">
                  คำอธิบาย
                </label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black"
                  placeholder="อธิบายเกี่ยวกับอุปกรณ์นี้"
                />
              </div>

              <div>
                <label className="block text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">
                  หมายเหตุ
                </label>
                <Input
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black"
                  placeholder="หมายเหตุเพิ่มเติม (ไม่บังคับ)"
                />
              </div>
            </div>
          </div>

          {/* Equipment Items */}
          <div>
            <div className="text-lg font-thin text-black tracking-wide mb-6">รายการอุปกรณ์</div>

            {/* Add New Item */}
            <div className="border-b border-gray-100 pb-6 mb-6">
              <div className="text-sm font-light text-gray-600 mb-4">เพิ่มอุปกรณ์ใหม่</div>
              <div className="grid grid-cols-12 gap-4 items-end">
                <div className="col-span-5">
                  <Input
                    value={newItem.name}
                    onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="ชื่ออุปกรณ์"
                    className="border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black"
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    min="0"
                    value={newItem.price || ''}
                    onChange={(e) => setNewItem(prev => ({ ...prev, price: parseFloat(e.target.value || '0') }))}
                    placeholder="ราคา"
                    className="border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black"
                  />
                </div>
                <div className="col-span-4">
                  <Input
                    value={newItem.description}
                    onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="หมายเหตุ"
                    className="border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black"
                  />
                </div>
                <div className="col-span-1">
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="w-8 h-8 bg-black text-white flex items-center justify-center hover:bg-gray-800 transition-colors duration-200"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Items List */}
            {formData.items.length > 0 ? (
              <div className="space-y-4">
                {formData.items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-4 border-b border-gray-100 last:border-b-0">
                    <div className="flex-1">
                      <div className="font-light text-black tracking-wide">{item.name}</div>
                      {item.description && (
                        <div className="text-xs font-light text-gray-400 mt-1">{item.description}</div>
                      )}
                    </div>
                    <div className="text-right mr-6">
                      <div className="font-light text-black">฿{item.price.toLocaleString()}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="p-2 text-gray-300 hover:text-red-400 transition-colors duration-200"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="text-sm font-light text-gray-400">
                  ยังไม่มีอุปกรณ์ กรุณาเพิ่มอุปกรณ์อย่างน้อย 1 รายการ
                </div>
              </div>
            )}
          </div>

          {/* Summary */}
          {formData.items.length > 0 && (
            <div className="border-t border-gray-100 pt-8">
              <div className="text-lg font-thin text-black tracking-wide mb-6">สรุป</div>
              <div className="grid grid-cols-3 gap-12">
                <div>
                  <div className="text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">ราคารวม</div>
                  <div className="text-2xl font-thin text-black">฿{totalPrice.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">อายุการใช้งาน</div>
                  <div className="text-2xl font-thin text-black">{Math.round(formData.estimatedLifespanDays / 365 * 10) / 10} ปี</div>
                </div>
                <div>
                  <div className="text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">ต้นทุนต่อวัน</div>
                  <div className="text-2xl font-thin text-black">฿{dailyCost.toFixed(2)}</div>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </Modal>
  );
}