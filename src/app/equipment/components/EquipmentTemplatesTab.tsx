import React from 'react';
import { Settings, Plus, Edit, Trash2, Copy } from 'lucide-react';
import { Button } from '@/components/ui';
import { EquipmentTemplate } from '@/types';

interface EquipmentTemplatesTabProps {
  templates: EquipmentTemplate[];
  onCreateTemplate: () => void;
  onEditTemplate: (template: EquipmentTemplate) => void;
  onDeleteTemplate: (templateId: string) => void;
  onCreateSet: (template: EquipmentTemplate) => void;
}

export function EquipmentTemplatesTab({
  templates,
  onCreateTemplate,
  onEditTemplate,
  onDeleteTemplate,
  onCreateSet
}: EquipmentTemplatesTabProps) {
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-600" />
          <h2 className="text-xl font-medium text-black">แม่แบบอุปกรณ์</h2>
          <span className="text-gray-500">({templates.length} แม่แบบ)</span>
        </div>
        <Button
          variant="primary"
          size="lg"
          onClick={onCreateTemplate}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          สร้างแม่แบบใหม่
        </Button>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-12">
          <Settings className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <div className="text-xl text-gray-500 mb-2">ยังไม่มีแม่แบบอุปกรณ์</div>
          <div className="text-gray-400 mb-6">สร้างแม่แบบเพื่อจัดการอุปกรณ์ได้ง่ายขึ้น</div>
          <Button
            variant="primary"
            onClick={onCreateTemplate}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            สร้างแม่แบบแรก
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div key={template._id} className="border border-gray-200 p-4">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-medium text-black">{template.name}</h3>
                  <div className="flex gap-1">
                    <button
                      onClick={() => onEditTemplate(template)}
                      className="p-1 text-gray-500 hover:text-black"
                      title="แก้ไข"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteTemplate(template._id!)}
                      className="p-1 text-gray-500 hover:text-red-600"
                      title="ลบ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {template.description && (
                  <p className="text-gray-600 text-sm mb-3">{template.description}</p>
                )}
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-700">ราคารวม:</span>
                  <span className="font-medium text-black">฿{template.totalPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-700">อายุการใช้งาน:</span>
                  <span className="text-black">{Math.round(template.estimatedLifespanDays / 365 * 10) / 10} ปี</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-700">ต้นทุนต่อวัน:</span>
                  <span className="font-medium text-black">฿{template.dailyCost.toFixed(2)}</span>
                </div>
                <div className="py-2">
                  <span className="text-gray-700 text-sm">อุปกรณ์ ({template.items.length} รายการ):</span>
                  <div className="max-h-24 overflow-y-auto mt-1">
                    {template.items.map((item, index) => (
                      <div key={index} className="flex justify-between text-xs text-gray-600 py-1">
                        <span>{item.name}</span>
                        <span>฿{item.price.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => onCreateSet(template)}
                className="w-full flex items-center justify-center gap-2"
              >
                <Copy className="w-4 h-4" />
                เพิ่มชุดจากแม่แบบนี้
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}