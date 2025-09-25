import React, { useState } from 'react';
import { Archive, Plus, Edit, Trash2, Package, AlertCircle, CheckCircle, Wrench, X } from 'lucide-react';
import { Button } from '@/components/ui';
import { EquipmentSet, EquipmentTemplate } from '@/types';

interface EquipmentInventoryTabProps {
  equipmentSets: EquipmentSet[];
  templates: EquipmentTemplate[];
  onCreateSet: (template?: EquipmentTemplate) => void;
  onEditSet: (set: EquipmentSet) => void;
  onDeleteSet: (setId: string) => void;
}

export function EquipmentInventoryTab({
  equipmentSets,
  templates,
  onCreateSet,
  onEditSet,
  onDeleteSet
}: EquipmentInventoryTabProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | 'all'>('all');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'in_use': return <Package className="w-4 h-4 text-blue-600" />;
      case 'maintenance': return <Wrench className="w-4 h-4 text-yellow-600" />;
      case 'broken': return <X className="w-4 h-4 text-red-600" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'text-green-600';
      case 'in_use': return 'text-blue-600';
      case 'maintenance': return 'text-yellow-600';
      case 'broken': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available': return 'พร้อมใช้งาน';
      case 'in_use': return 'กำลังใช้งาน';
      case 'maintenance': return 'ซ่อมบำรุง';
      case 'broken': return 'เสียหาย';
      default: return status;
    }
  };

  const filteredSets = selectedTemplate === 'all'
    ? equipmentSets
    : equipmentSets.filter(set => set.templateId === selectedTemplate);

  console.log('Equipment sets:', equipmentSets);
  console.log('Templates:', templates);
  console.log('Filtered sets:', filteredSets);

  const groupedSets = filteredSets.reduce((groups, set) => {
    // Handle both string ID and populated object
    const templateId = typeof set.templateId === 'object' ? set.templateId._id : set.templateId;
    console.log('Processing set:', set, 'templateId:', templateId);
    if (!groups[templateId]) {
      groups[templateId] = [];
    }
    groups[templateId].push(set);
    return groups;
  }, {} as { [key: string]: EquipmentSet[] });

  console.log('Grouped sets:', groupedSets);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Archive className="w-5 h-5 text-gray-600" />
          <h2 className="text-xl font-medium text-black">คลังอุปกรณ์</h2>
          <span className="text-gray-500">({equipmentSets.length} ชุด)</span>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded text-sm"
          >
            <option value="all">แม่แบบทั้งหมด</option>
            {templates.map(template => (
              <option key={template._id} value={template._id}>
                {template.name}
              </option>
            ))}
          </select>
          <Button
            variant="primary"
            size="lg"
            onClick={() => onCreateSet()}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            เพิ่มชุดอุปกรณ์
          </Button>
        </div>
      </div>

      {equipmentSets.length === 0 ? (
        <div className="text-center py-12">
          <Archive className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <div className="text-xl text-gray-500 mb-2">ยังไม่มีชุดอุปกรณ์</div>
          <div className="text-gray-400 mb-6">เพิ่มชุดอุปกรณ์เพื่อเริ่มจัดการคลัง</div>
          <Button
            variant="primary"
            onClick={() => onCreateSet()}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            เพิ่มชุดแรก
          </Button>
        </div>
      ) : filteredSets.length === 0 ? (
        <div className="text-center py-12">
          <Archive className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <div className="text-xl text-gray-500 mb-2">ไม่มีชุดอุปกรณ์จากแม่แบบนี้</div>
          <div className="text-gray-400 mb-6">เลือกแม่แบบอื่นหรือเพิ่มชุดใหม่</div>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedSets).map(([templateId, sets]) => {
            const template = templates.find(t => t._id === templateId);
            if (!template) return null;

            return (
              <div key={templateId} className="border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                  <div>
                    <h3 className="text-lg font-medium text-black">{template.name}</h3>
                    <p className="text-sm text-gray-600">
                      ราคา ฿{template.totalPrice.toLocaleString()} •
                      ต้นทุนต่อวัน ฿{template.dailyCost.toFixed(2)} •
                      {sets.length} ชุด
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onCreateSet(template)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    เพิ่มชุด
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {sets.map((set) => (
                    <div key={set._id} className="border border-gray-200 p-3">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-black">{set.setName}</h4>
                        <div className="flex gap-1">
                          <button
                            onClick={() => onEditSet(set)}
                            className="p-1 text-gray-500 hover:text-black"
                            title="แก้ไข"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDeleteSet(set._id!)}
                            className="p-1 text-gray-500 hover:text-red-600"
                            title="ลบ"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(set.status)}
                          <span className={`text-sm font-medium ${getStatusColor(set.status)}`}>
                            {getStatusText(set.status)}
                          </span>
                        </div>

                        <div className="text-sm text-gray-600">
                          ซื้อเมื่อ: {new Date(set.purchaseDate).toLocaleDateString('th-TH')}
                        </div>

                        {set.currentBoothId && (
                          <div className="text-sm text-blue-600">
                            ใช้งานที่หน้าร้าน: {set.currentBoothId}
                          </div>
                        )}

                        {set.notes && (
                          <div className="text-sm text-gray-500 p-2 bg-gray-50 rounded">
                            {set.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}