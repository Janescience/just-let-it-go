import React, { useState } from 'react';
import { History, Calendar, TrendingDown, Package } from 'lucide-react';
import { Equipment } from '@/types';

interface EquipmentHistoryTabProps {
  equipment: Equipment[];
}

export function EquipmentHistoryTab({ equipment }: EquipmentHistoryTabProps) {
  const [selectedEquipment, setSelectedEquipment] = useState<string | 'all'>('all');

  // Flatten all usage history from all equipment
  const allUsageHistory = equipment.flatMap(item =>
    item.usageHistory.map(usage => ({
      ...usage,
      equipmentId: item._id,
      equipmentName: item.name
    }))
  ).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  const filteredHistory = selectedEquipment === 'all'
    ? allUsageHistory
    : allUsageHistory.filter(usage => usage.equipmentId === selectedEquipment);

  const getTotalUsageStats = () => {
    const totalDaysUsed = equipment.reduce((sum, item) => sum + item.totalDaysUsed, 0);
    const totalDepreciation = equipment.reduce((sum, item) => sum + (item.totalPrice - item.currentValue), 0);
    const totalCurrentValue = equipment.reduce((sum, item) => sum + item.currentValue, 0);
    const totalOriginalValue = equipment.reduce((sum, item) => sum + item.totalPrice, 0);

    return {
      totalDaysUsed,
      totalDepreciation,
      totalCurrentValue,
      totalOriginalValue,
      averageDepreciationPercentage: totalOriginalValue > 0 ? ((totalOriginalValue - totalCurrentValue) / totalOriginalValue) * 100 : 0
    };
  };

  const stats = getTotalUsageStats();

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-12">
        <div>
          <div className="text-lg font-thin text-black tracking-wide">ประวัติการใช้งาน</div>
          <div className="text-sm font-light text-gray-400 mt-1">{filteredHistory.length} รายการ</div>
        </div>
        <select
          value={selectedEquipment}
          onChange={(e) => setSelectedEquipment(e.target.value)}
          className="border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light text-gray-600 focus:border-black focus:outline-none"
        >
          <option value="all">ทุกอุปกรณ์</option>
          {equipment.map(item => (
            <option key={item._id} value={item._id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-8 mb-12 pb-8 border-b border-gray-100">
        <div>
          <div className="text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">วันทั้งหมด</div>
          <div className="text-2xl font-thin text-black">{stats.totalDaysUsed}</div>
          <div className="text-xs font-light text-gray-500">วันที่ใช้งาน</div>
        </div>
        <div>
          <div className="text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">ค่าเสื่อมรวม</div>
          <div className="text-2xl font-thin text-black">฿{stats.totalDepreciation.toLocaleString()}</div>
          <div className="text-xs font-light text-gray-500">{stats.averageDepreciationPercentage.toFixed(1)}% เฉลี่ย</div>
        </div>
        <div>
          <div className="text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">มูลค่าปัจจุบัน</div>
          <div className="text-2xl font-thin text-black">฿{stats.totalCurrentValue.toLocaleString()}</div>
          <div className="text-xs font-light text-gray-500">จาก ฿{stats.totalOriginalValue.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">อุปกรณ์ทั้งหมด</div>
          <div className="text-2xl font-thin text-black">{equipment.length}</div>
          <div className="text-xs font-light text-gray-500">รายการ</div>
        </div>
      </div>

      {filteredHistory.length === 0 ? (
        <div className="text-center py-24">
          <div className="w-16 h-16 border border-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <History className="w-6 h-6 text-gray-300" />
          </div>
          <div className="text-lg font-thin text-gray-600 mb-2 tracking-wide">
            {selectedEquipment === 'all' ? 'ไม่มีประวัติการใช้งาน' : 'ไม่มีประวัติการใช้งานของอุปกรณ์นี้'}
          </div>
          <div className="text-sm font-light text-gray-400">
            ประวัติจะแสดงเมื่อมีการนำอุปกรณ์ไปใช้ในบูธ
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredHistory.map((usage, index) => (
            <div key={index} className="border-b border-gray-100 pb-6 last:border-b-0">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Package className="w-4 h-4 text-gray-400" />
                    <h4 className="font-light text-black tracking-wide">{usage.equipmentName}</h4>
                  </div>
                  <div className="text-sm font-light text-gray-600 mb-2">
                    ใช้งานที่: {usage.boothName}
                  </div>
                  <div className="flex items-center gap-4 text-xs font-light text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(usage.startDate).toLocaleDateString('th-TH')} - {new Date(usage.endDate).toLocaleDateString('th-TH')}
                    </div>
                    <div>{usage.daysUsed} วัน</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingDown className="w-4 h-4 text-gray-400" />
                    <span className="text-lg font-thin text-black">฿{usage.depreciationAmount.toLocaleString()}</span>
                  </div>
                  <div className="text-xs font-light text-gray-400">ค่าเสื่อมราคา</div>
                </div>
              </div>

              {/* Usage duration visualization */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs font-light text-gray-500 mb-1">
                  <span>ระยะเวลาการใช้งาน</span>
                  <span>{usage.daysUsed} วันจาก {equipment.find(e => e._id === usage.equipmentId)?.estimatedLifespanDays || 0} วัน</span>
                </div>
                <div className="w-full bg-gray-100 h-1">
                  <div
                    className="bg-gray-600 h-1 transition-all duration-300"
                    style={{
                      width: `${Math.min((usage.daysUsed / (equipment.find(e => e._id === usage.equipmentId)?.estimatedLifespanDays || 1)) * 100, 100)}%`
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}