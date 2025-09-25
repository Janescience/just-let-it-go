import React, { useState, useEffect } from 'react';
import { Settings, Plus, Trash2, X } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { EquipmentTemplate, EquipmentItem } from '@/types';

interface EquipmentTemplateModalProps {
  template?: EquipmentTemplate | null;
  onClose: () => void;
  onSave: () => void;
}

export function EquipmentTemplateModal({
  template,
  onClose,
  onSave
}: EquipmentTemplateModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    estimatedLifespanDays: 730, // 2 ปี
    items: [] as EquipmentItem[]
  });

  const [loading, setLoading] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    price: 0,
    description: ''
  });

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        description: template.description || '',
        estimatedLifespanDays: template.estimatedLifespanDays,
        items: [...template.items]
      });
    }
  }, [template]);

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

    if (!formData.name) {
      alert('กรุณากรอกชื่อแม่แบบ');
      return;
    }

    if (formData.items.length === 0) {
      alert('กรุณาเพิ่มอุปกรณ์อย่างน้อย 1 รายการ');
      return;
    }

    setLoading(true);

    try {
      const templateData = {
        ...formData,
        totalPrice,
        dailyCost
      };

      const url = template
        ? `/api/equipment/templates/${template._id}`
        : '/api/equipment/templates';

      const method = template ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(templateData)
      });

      if (response.ok) {
        onSave();
      } else {
        const error = await response.json();
        alert(error.message || 'เกิดข้อผิดพลาด');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกแม่แบบ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Settings className="w-6 h-6" />
            <h2 className="text-xl font-medium">
              {template ? 'แก้ไขแม่แบบอุปกรณ์' : 'สร้างแม่แบบอุปกรณ์'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="border border-gray-200 p-4">
              <h3 className="text-lg font-medium mb-4">ข้อมูลพื้นฐาน</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ชื่อแม่แบบ *
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="เช่น ชุดขายกาแฟ"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    อายุการใช้งาน (ปี) *
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
                    required
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  คำอธิบาย
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded resize-none"
                  rows={3}
                  placeholder="อธิบายเกี่ยวกับแม่แบบนี้ (ไม่บังคับ)"
                />
              </div>
            </div>

            {/* Equipment Items */}
            <div className="border border-gray-200 p-4">
              <h3 className="text-lg font-medium mb-4">รายการอุปกรณ์</h3>

              {/* Add New Item */}
              <div className="border border-gray-100 p-3 mb-4">
                <h4 className="font-medium mb-3">เพิ่มอุปกรณ์ใหม่</h4>
                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-5">
                    <Input
                      value={newItem.name}
                      onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="ชื่ออุปกรณ์"
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      type="number"
                      min="0"
                      value={newItem.price || ''}
                      onChange={(e) => setNewItem(prev => ({ ...prev, price: parseFloat(e.target.value || '0') }))}
                      placeholder="ราคา (บาท)"
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      value={newItem.description}
                      onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="หมายเหตุ (ไม่บังคับ)"
                    />
                  </div>
                  <div className="col-span-1">
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={handleAddItem}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Items List */}
              {formData.items.length > 0 ? (
                <div className="space-y-2">
                  {formData.items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border border-gray-100">
                      <div className="flex-1">
                        <div className="font-medium">{item.name}</div>
                        {item.description && (
                          <div className="text-sm text-gray-600">{item.description}</div>
                        )}
                      </div>
                      <div className="text-right mr-4">
                        <div className="font-medium">฿{item.price.toLocaleString()}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  ยังไม่มีอุปกรณ์ กรุณาเพิ่มอุปกรณ์อย่างน้อย 1 รายการ
                </div>
              )}
            </div>

            {/* Summary */}
            {formData.items.length > 0 && (
              <div className="border border-gray-200 p-4 bg-gray-50">
                <h3 className="text-lg font-medium mb-4">สรุปค่าใช้จ่าย</h3>
                <div className="grid grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-black">฿{totalPrice.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">ราคารวมทั้งชุด</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-black">{Math.round(formData.estimatedLifespanDays / 365 * 10) / 10} ปี</div>
                    <div className="text-sm text-gray-600">อายุการใช้งาน</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-black">฿{dailyCost.toFixed(2)}</div>
                    <div className="text-sm text-gray-600">ต้นทุนต่อวัน</div>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose}>
              ยกเลิก
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={loading || formData.items.length === 0}
            >
              {loading ? 'กำลังบันทึก...' : (template ? 'อัพเดท' : 'สร้างแม่แบบ')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}