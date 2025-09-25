import React, { useState, useEffect } from 'react';
import { Archive, X, Package } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { EquipmentSet, EquipmentTemplate } from '@/types';

interface EquipmentSetModalProps {
  equipmentSet?: EquipmentSet | null;
  selectedTemplate?: EquipmentTemplate | null;
  templates: EquipmentTemplate[];
  onClose: () => void;
  onSave: () => void;
}

export function EquipmentSetModal({
  equipmentSet,
  selectedTemplate,
  templates,
  onClose,
  onSave
}: EquipmentSetModalProps) {
  const [formData, setFormData] = useState({
    templateId: '',
    setName: '',
    purchaseDate: '',
    status: 'available' as const,
    notes: ''
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (equipmentSet) {
      setFormData({
        templateId: equipmentSet.templateId,
        setName: equipmentSet.setName,
        purchaseDate: new Date(equipmentSet.purchaseDate).toISOString().split('T')[0],
        status: equipmentSet.status,
        notes: equipmentSet.notes || ''
      });
    } else if (selectedTemplate) {
      const existingSetsCount = templates
        .filter(t => t._id === selectedTemplate._id)
        .reduce((count, _) => {
          // This would normally count existing sets from the template
          return count + 1;
        }, 0);

      setFormData({
        templateId: selectedTemplate._id!,
        setName: `${selectedTemplate.name} #${existingSetsCount + 1}`,
        purchaseDate: new Date().toISOString().split('T')[0],
        status: 'available',
        notes: ''
      });
    }
  }, [equipmentSet, selectedTemplate, templates]);

  const selectedTemplateData = templates.find(t => t._id === formData.templateId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.templateId || !formData.setName || !formData.purchaseDate) {
      alert('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
      return;
    }

    setLoading(true);

    try {
      const setData = {
        ...formData,
        purchaseDate: new Date(formData.purchaseDate)
      };

      const url = equipmentSet
        ? `/api/equipment/sets/${equipmentSet._id}`
        : '/api/equipment/sets';

      const method = equipmentSet ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(setData)
      });

      if (response.ok) {
        onSave();
      } else {
        const error = await response.json();
        alert(error.message || 'เกิดข้อผิดพลาด');
      }
    } catch (error) {
      console.error('Error saving equipment set:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกชุดอุปกรณ์');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Archive className="w-6 h-6" />
            <h2 className="text-xl font-medium">
              {equipmentSet ? 'แก้ไขชุดอุปกรณ์' : 'เพิ่มชุดอุปกรณ์'}
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
            {/* Template Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                แม่แบบอุปกรณ์ *
              </label>
              <select
                value={formData.templateId}
                onChange={(e) => setFormData(prev => ({ ...prev, templateId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded"
                required
                disabled={!!selectedTemplate}
              >
                <option value="">เลือกแม่แบบ</option>
                {templates.map(template => (
                  <option key={template._id} value={template._id}>
                    {template.name} (฿{template.totalPrice.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            {/* Template Preview */}
            {selectedTemplateData && (
              <div className="border border-gray-200 p-4 bg-gray-50">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-4 h-4 text-gray-600" />
                  <h3 className="font-medium text-black">{selectedTemplateData.name}</h3>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                  <div>
                    <span className="text-gray-600">ราคารวม:</span>
                    <div className="font-medium">฿{selectedTemplateData.totalPrice.toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">อายุการใช้งาน:</span>
                    <div className="font-medium">{Math.round(selectedTemplateData.estimatedLifespanDays / 365 * 10) / 10} ปี</div>
                  </div>
                  <div>
                    <span className="text-gray-600">ต้นทุนต่อวัน:</span>
                    <div className="font-medium">฿{selectedTemplateData.dailyCost.toFixed(2)}</div>
                  </div>
                </div>
                <div>
                  <span className="text-gray-600 text-sm">อุปกรณ์ในชุด:</span>
                  <div className="mt-1">
                    {selectedTemplateData.items.map((item, index) => (
                      <div key={index} className="text-sm text-gray-700">
                        • {item.name} - ฿{item.price.toLocaleString()}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Set Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ชื่อชุด *
                </label>
                <Input
                  value={formData.setName}
                  onChange={(e) => setFormData(prev => ({ ...prev, setName: e.target.value }))}
                  placeholder="เช่น ชุดกาแฟ #1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  วันที่ซื้อ *
                </label>
                <Input
                  type="date"
                  value={formData.purchaseDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, purchaseDate: e.target.value }))}
                  required
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                สถานะ *
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-200 rounded"
                required
              >
                <option value="available">พร้อมใช้งาน</option>
                <option value="in_use">กำลังใช้งาน</option>
                <option value="maintenance">ซ่อมบำรุง</option>
                <option value="broken">เสียหาย</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                หมายเหตุ
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded resize-none"
                rows={3}
                placeholder="หมายเหตุเพิ่มเติม (ไม่บังคับ)"
              />
            </div>
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
              disabled={loading}
            >
              {loading ? 'กำลังบันทึก...' : (equipmentSet ? 'อัพเดท' : 'เพิ่มชุด')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}