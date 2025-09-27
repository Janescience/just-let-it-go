import React from 'react';
import { Package, Edit, Trash2, Copy, AlertCircle, CheckCircle, Wrench, X } from 'lucide-react';
import { Equipment } from '@/types';

interface EquipmentListTabProps {
  equipment: Equipment[];
  onCreateEquipment: () => void;
  onEditEquipment: (equipment: Equipment) => void;
  onDeleteEquipment: (equipmentId: string) => void;
  onCopyEquipment: (equipment: Equipment) => void;
}

export function EquipmentListTab({
  equipment,
  onCreateEquipment,
  onEditEquipment,
  onDeleteEquipment,
  onCopyEquipment
}: EquipmentListTabProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available': return <CheckCircle className="w-4 h-4 text-gray-400" />;
      case 'in_use': return <Package className="w-4 h-4 text-gray-400" />;
      case 'maintenance': return <Wrench className="w-4 h-4 text-gray-400" />;
      case 'broken': return <X className="w-4 h-4 text-gray-400" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'text-gray-600';
      case 'in_use': return 'text-black';
      case 'maintenance': return 'text-gray-600';
      case 'broken': return 'text-gray-600';
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

  const getDepreciationColor = (percentage: number) => {
    if (percentage >= 80) return 'text-red-600';
    if (percentage >= 50) return 'text-orange-600';
    if (percentage >= 25) return 'text-gray-600';
    return 'text-gray-600';
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-12">
        <div>
          <div className="text-lg font-thin text-black tracking-wide">อุปกรณ์</div>
          <div className="text-sm font-light text-gray-400 mt-1">{equipment.length} รายการ</div>
        </div>
        <button
          onClick={onCreateEquipment}
          className="px-6 py-2 border border-gray-200 text-sm font-light text-black hover:bg-gray-50 transition-colors duration-200 tracking-wide"
        >
          เพิ่มอุปกรณ์
        </button>
      </div>

      {equipment.length === 0 ? (
        <div className="text-center py-24">
          <div className="w-16 h-16 border border-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <Package className="w-6 h-6 text-gray-300" />
          </div>
          <div className="text-lg font-thin text-gray-600 mb-2 tracking-wide">ไม่มีอุปกรณ์</div>
          <div className="text-sm font-light text-gray-400 mb-8">เริ่มต้นด้วยการเพิ่มอุปกรณ์แรก</div>
          <button
            onClick={onCreateEquipment}
            className="px-8 py-3 bg-black text-white text-sm font-light hover:bg-gray-800 transition-colors duration-200 tracking-wide"
          >
            เริ่มต้น
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {equipment.map((item) => (
            <div key={item._id} className="border-b border-gray-100 pb-8 last:border-b-0">
              {/* Mobile Layout - Stack vertically */}
              <div className="block md:hidden space-y-4 mb-6">
                {/* Row 1: Name and Status */}
                <div className="flex items-center gap-3">
                  {getStatusIcon(item.status)}
                  <h3 className="text-lg font-thin text-black tracking-wide flex-1 truncate">{item.name}</h3>
                </div>

                {/* Row 2: Status and Price */}
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-light ${getStatusColor(item.status)}`}>
                    {getStatusText(item.status)}
                  </span>
                  <div className="text-right">
                    <div className="text-lg font-thin text-black">฿{item.currentValue.toLocaleString()}</div>
                    <div className="text-xs font-light text-gray-400">
                      จาก ฿{item.totalPrice.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Row 3: Description and Usage Info */}
                <div className="space-y-2">
                  {item.description && (
                    <p className="text-sm font-light text-gray-500">{item.description}</p>
                  )}
                  {item.status === 'in_use' && item.currentBoothName && (
                    <div className="text-xs font-light text-gray-500">
                      กำลังใช้งานที่: {item.currentBoothName}
                    </div>
                  )}
                  <div className="text-xs font-light text-gray-400">
                    {item.items.length} รายการ · ฿{item.dailyCost.toFixed(2)}/วัน · ใช้งานแล้ว {item.totalDaysUsed} วัน
                  </div>
                </div>

                {/* Row 4: Action Buttons */}
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => onCopyEquipment(item)}
                    className="p-2 text-gray-300 hover:text-gray-600 transition-colors duration-200"
                    title="คัดลอก"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onEditEquipment(item)}
                    className="p-2 text-gray-300 hover:text-gray-600 transition-colors duration-200"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDeleteEquipment(item._id!)}
                    className="p-2 text-gray-300 hover:text-red-400 transition-colors duration-200"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Desktop Layout - Single row */}
              <div className="hidden md:flex md:items-start md:justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusIcon(item.status)}
                    <h3 className="text-lg font-thin text-black tracking-wide">{item.name}</h3>
                    <span className={`text-sm font-light ${getStatusColor(item.status)}`}>
                      {getStatusText(item.status)}
                    </span>
                  </div>
                  {item.description && (
                    <p className="text-sm font-light text-gray-500 mb-4">{item.description}</p>
                  )}

                  {/* Current usage info */}
                  {item.status === 'in_use' && item.currentBoothName && (
                    <div className="text-xs font-light text-gray-500 mb-4">
                      กำลังใช้งานที่: {item.currentBoothName}
                    </div>
                  )}

                  <div className="text-xs font-light text-gray-400">
                    {item.items.length} รายการ · ฿{item.dailyCost.toFixed(2)}/วัน · ใช้งานแล้ว {item.totalDaysUsed} วัน
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-6">
                  <div className="text-right mr-4">
                    <div className="text-lg font-thin text-black">฿{item.currentValue.toLocaleString()}</div>
                    <div className="text-xs font-light text-gray-400">
                      จาก ฿{item.totalPrice.toLocaleString()}
                    </div>
                  </div>
                  <button
                    onClick={() => onCopyEquipment(item)}
                    className="p-2 text-gray-300 hover:text-gray-600 transition-colors duration-200"
                    title="คัดลอก"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onEditEquipment(item)}
                    className="p-2 text-gray-300 hover:text-gray-600 transition-colors duration-200"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDeleteEquipment(item._id!)}
                    className="p-2 text-gray-300 hover:text-red-400 transition-colors duration-200"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-6 md:space-y-0 md:grid md:grid-cols-3 md:gap-6">
                {/* Equipment Items */}
                <div className="md:col-span-1">
                  <div className="text-xs font-light text-gray-400 mb-3 tracking-wide">รายการอุปกรณ์</div>
                  <div className="space-y-1 md:space-y-2">
                    {item.items.slice(0, 3).map((equipItem, index) => (
                      <div key={index} className="flex justify-between text-xs md:text-sm">
                        <span className="font-light text-gray-600 truncate mr-2">{equipItem.name}</span>
                        <span className="font-light text-black flex-shrink-0">฿{equipItem.price.toLocaleString()}</span>
                      </div>
                    ))}
                    {item.items.length > 3 && (
                      <div className="text-xs font-light text-gray-400 mt-2">
                        +{item.items.length - 3} รายการอื่น
                      </div>
                    )}
                  </div>
                </div>

                {/* Depreciation Progress */}
                <div className="md:col-span-1">
                  <div className="text-xs font-light text-gray-400 mb-3 tracking-wide">ค่าเสื่อมราคา</div>
                  <div className="mb-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-light text-gray-600">ความเสื่อมโทรม</span>
                      <span className={`text-xs font-light ${getDepreciationColor(item.depreciationPercentage)}`}>
                        {item.depreciationPercentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 h-2">
                      <div
                        className={`h-2 transition-all duration-300 ${
                          item.depreciationPercentage >= 80 ? 'bg-red-600' :
                          item.depreciationPercentage >= 50 ? 'bg-orange-600' :
                          'bg-gray-600'
                        }`}
                        style={{ width: `${Math.min(item.depreciationPercentage, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-xs font-light text-gray-500">
                    อายุการใช้งาน: {Math.round(item.estimatedLifespanDays / 365 * 10) / 10} ปี
                  </div>
                </div>

                {/* Purchase Info */}
                <div className="text-left md:text-right md:col-span-1">
                  <div className="text-xs font-light text-gray-400 mb-3 tracking-wide">วันที่ซื้อ</div>
                  <div className="text-sm font-light text-black">
                    {new Date(item.purchaseDate).toLocaleDateString('th-TH')}
                  </div>
                  {item.notes && (
                    <div className="text-xs font-light text-gray-500 mt-2">
                      {item.notes}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}