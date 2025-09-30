import React, { useState, useEffect } from 'react';
import { Package, CheckCircle, AlertCircle, Plus, Trash2 } from 'lucide-react';
// No UI imports needed
import { Booth, Equipment } from '@/types';

interface BusinessPlan {
  name: string;
  location: string;
  startDate: string;
  endDate: string;
  numberOfDays: number;
  rentCost: number;
  openingStart: string;
  openingEnd: string;
  staffUsername: string;
  staffPassword: string;
  employees: { name: string; salary: string; position: string; }[];
  equipmentId?: string;
  additionalExpenses: { description: string; amount: number; }[];
}

interface Step1BasicInfoProps {
  businessPlan: BusinessPlan;
  booths: Booth[];
  isEditing: boolean;
  onUpdateBasicInfo: (field: string, value: string | number) => void;
  onCopyFromBooth: (boothId: string) => void;
  onAddEmployee: () => void;
  onRemoveEmployee: (index: number) => void;
  onUpdateEmployee: (index: number, field: string, value: string) => void;
  onAddExpense: () => void;
  onRemoveExpense: (index: number) => void;
  onUpdateExpense: (index: number, field: string, value: string | number) => void;
  equipments: Equipment[];
}

export function Step1BasicInfo({
  businessPlan,
  booths,
  isEditing,
  onUpdateBasicInfo,
  onCopyFromBooth,
  onAddEmployee,
  onRemoveEmployee,
  onUpdateEmployee,
  onAddExpense,
  onRemoveExpense,
  onUpdateExpense,
  equipments
}: Step1BasicInfoProps) {
  const selectedEquipment = equipments.find(equipment => equipment._id === businessPlan.equipmentId);

  // Show all equipment (no status filtering)
  const availableEquipments = equipments;

  return (
    <div className="space-y-4">
      {/* Copy from existing booth */}
      {!isEditing && booths.length > 0 && (
        <div className="border border-gray-100 p-6 bg-gray-50">
          <h4 className="text-lg font-light text-black tracking-wide mb-4">คัดลอกข้อมูลจากหน้าร้านเดิม</h4>
          <select
            onChange={(e) => {
              if (e.target.value) {
                onCopyFromBooth(e.target.value);
                e.target.value = ''; // Reset select
              }
            }}
            defaultValue=""
            className="border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black focus:outline-none w-full px-3 py-2"
          >
            <option value="">เลือกหน้าร้านที่ต้องการคัดลอก...</option>
            {booths.map(booth => (
              <option key={booth._id} value={booth._id}>
                {booth.name} - {booth.location}
              </option>
            ))}
          </select>
          <p className="text-sm text-gray-600 mt-2">
            จะคัดลอกข้อมูลทั้งหมดยกเว้นชื่อ สถานที่ และ Username
          </p>
        </div>
      )}

      <div className="bg-gray-100 p-4 mb-4">
        <div className="text-lg font-light text-black tracking-wide">ข้อมูลพื้นฐาน</div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div>
          <label className="text-xs font-light text-gray-400 mb-2 tracking-wider uppercase block">ชื่อร้าน</label>
          <input
            value={businessPlan.name}
            onChange={(e) => onUpdateBasicInfo('name', e.target.value)}
            placeholder="เช่น ร้านผัดไทยโบราณ"
            className="border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black focus:outline-none w-full px-3 py-2"
          />
        </div>
        <div>
          <label className="text-xs font-light text-gray-400 mb-2 tracking-wider uppercase block">สถานที่</label>
          <input
            value={businessPlan.location}
            onChange={(e) => onUpdateBasicInfo('location', e.target.value)}
            placeholder="เช่น ตลาดนัดจตุจักร"
            className="border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black focus:outline-none w-full px-3 py-2"
          />
        </div>
        <div>
          <label className="text-xs font-light text-gray-400 mb-2 tracking-wider uppercase block">วันเริ่ม</label>
          <input
            type="date"
            value={businessPlan.startDate}
            onChange={(e) => onUpdateBasicInfo('startDate', e.target.value)}
            className="border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black focus:outline-none w-full px-3 py-2"
          />
        </div>
        <div>
          <label className="text-xs font-light text-gray-400 mb-2 tracking-wider uppercase block">จำนวนวัน</label>
          <input
            type="number"
            value={businessPlan.numberOfDays}
            onChange={(e) => onUpdateBasicInfo('numberOfDays', parseInt(e.target.value) || 10)}
            onWheel={(e) => e.currentTarget.blur()}
            onKeyDown={(e) => {
              if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault();
              }
            }}
            placeholder="10"
            min="1"
            className="border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black focus:outline-none w-full px-3 py-2"
          />
        </div>
        <div>
          <label className="text-xs font-light text-gray-400 mb-2 tracking-wider uppercase block">วันสิ้นสุด</label>
          <input
            type="date"
            value={businessPlan.endDate}
            onChange={(e) => onUpdateBasicInfo('endDate', e.target.value)}
            readOnly
            className="border-0 border-b border-gray-200 rounded-none bg-gray-50 text-sm font-light focus:border-black focus:outline-none w-full px-3 py-2"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-xs font-light text-gray-400 mb-2 tracking-wider uppercase block">ค่าเช่า (บาท)</label>
          <input
            type="number"
            value={businessPlan.rentCost}
            onChange={(e) => onUpdateBasicInfo('rentCost', parseFloat(e.target.value) || 0)}
            onWheel={(e) => e.currentTarget.blur()}
            onKeyDown={(e) => {
              if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault();
              }
            }}
            placeholder="0"
            className="border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black focus:outline-none w-full px-3 py-2"
          />
        </div>
        <div>
          <label className="text-xs font-light text-gray-400 mb-2 tracking-wider uppercase block">เวลาเปิด</label>
          <input
            type="time"
            value={businessPlan.openingStart}
            onChange={(e) => onUpdateBasicInfo('openingStart', e.target.value)}
            className="border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black focus:outline-none w-full px-3 py-2"
          />
        </div>
        <div>
          <label className="text-xs font-light text-gray-400 mb-2 tracking-wider uppercase block">เวลาปิด</label>
          <input
            type="time"
            value={businessPlan.openingEnd}
            onChange={(e) => onUpdateBasicInfo('openingEnd', e.target.value)}
            className="border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black focus:outline-none w-full px-3 py-2"
          />
        </div>
      </div>

      {/* Equipment Selection */}
      <div className="border border-gray-100 p-6">
        <div className="bg-gray-100 p-4 -m-6 mb-4">
          <div className="text-lg font-light text-black tracking-wide">เลือกชุดอุปกรณ์</div>
        </div>

        {availableEquipments.length === 0 ? (
          <div className="text-center py-8 border border-gray-100 bg-gray-50">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <div className="text-lg font-light text-gray-500 mb-2">ไม่มีอุปกรณ์ที่พร้อมใช้งาน</div>
            <div className="font-light text-gray-400 mb-4">สร้างอุปกรณ์ก่อนเพื่อใช้งาน</div>
            <button
              onClick={() => window.open('/equipment', '_blank')}
              className="px-6 py-2 border border-gray-200 text-sm font-light text-black hover:bg-gray-50 transition-colors duration-200 tracking-wide"
            >
              จัดการอุปกรณ์
            </button>
          </div>
        ) : (
          <div>
            <select
              value={businessPlan.equipmentId || ''}
              onChange={(e) => onUpdateBasicInfo('equipmentId', e.target.value)}
              className="w-full px-3 py-2 border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black focus:outline-none mb-3"
            >
              <option value="">เลือกอุปกรณ์...</option>
              {availableEquipments.map(equipment => (
                <option key={equipment._id} value={equipment._id}>
                  {equipment.name} - ฿{equipment.dailyCost.toFixed(2)}/วัน
                </option>
              ))}
            </select>

            {selectedEquipment && (
              <div className="border border-gray-100 p-4 bg-gray-50">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <div className="font-light text-black">{selectedEquipment.name}</div>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div>
                    <span className="font-light text-gray-600">ราคาซื้อ:</span>
                    <div className="font-light">฿{selectedEquipment.totalPrice.toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="font-light text-gray-600">ต้นทุนต่อวัน:</span>
                    <div className="font-light">฿{selectedEquipment.dailyCost.toFixed(2)}</div>
                  </div>
                  <div>
                    <span className="font-light text-gray-600">รวม {businessPlan.numberOfDays} วัน:</span>
                    <div className="font-light text-black">฿{(selectedEquipment.dailyCost * businessPlan.numberOfDays).toFixed(2)}</div>
                  </div>
                </div>

        
              </div>
            )}
          </div>
        )}
      </div>

      

      

      <div>
        <div className="flex justify-between items-center mb-4 bg-gray-100 p-4">
          <div className="flex items-center gap-4">
            <label className="text-lg font-light text-black tracking-wide">พนักงาน</label>
            {businessPlan.employees.length > 0 && (
              <span className="text-sm font-light text-gray-600">
                (รวม ฿{businessPlan.employees.reduce((sum, emp) => sum + (parseFloat(emp.salary || '0') * businessPlan.numberOfDays), 0).toLocaleString()})
              </span>
            )}
          </div>
          <button
            onClick={onAddEmployee}
            className="px-6 py-2 border border-gray-200 text-sm font-light text-black hover:bg-gray-50 transition-colors duration-200 tracking-wide"
          >
            เพิ่มพนักงาน
          </button>
        </div>
        <div className="space-y-3">
          {businessPlan.employees.map((employee, index) => (
            <div key={index} className="bg-gray-50 p-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-light text-gray-400 mb-2 tracking-wider uppercase block">ชื่อ</label>
                  <input
                    value={employee.name}
                    onChange={(e) => onUpdateEmployee(index, 'name', e.target.value)}
                    placeholder="ชื่อพนักงาน"
                    className="border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black focus:outline-none w-full px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-xs font-light text-gray-400 mb-2 tracking-wider uppercase block">ค่าจ้างต่อวัน</label>
                  <input
                    type="number"
                    value={employee.salary}
                    onChange={(e) => onUpdateEmployee(index, 'salary', e.target.value)}
                    onWheel={(e) => e.currentTarget.blur()}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                        e.preventDefault();
                      }
                    }}
                    placeholder="300"
                    className="border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black focus:outline-none w-full px-3 py-2"
                  />
                  <div className="font-light text-gray-500 mt-1">
                    รวม {businessPlan.numberOfDays} วัน = ฿{(parseFloat(employee.salary || '0') * businessPlan.numberOfDays).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-end">
                  {businessPlan.employees.length > 1 && (
                    <button
                      onClick={() => onRemoveEmployee(index)}
                      className="w-full px-6 py-2 border border-red-200 text-sm font-light text-red-600 hover:bg-red-50 transition-colors duration-200 tracking-wide"
                    >
                      ลบ
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Additional Expenses Section */}
      <div>
        <div className="flex justify-between items-center mb-4 bg-gray-100 p-4">
          <div className="flex items-center gap-4">
            <label className="text-lg font-light text-black tracking-wide">ค่าใช้จ่ายเพิ่มเติม</label>
            {businessPlan.additionalExpenses.length > 0 && (
              <span className="text-sm font-light text-gray-600">
                (รวม ฿{businessPlan.additionalExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0).toLocaleString()})
              </span>
            )}
          </div>
          <button
            onClick={onAddExpense}
            className="px-6 py-2 border border-gray-200 text-sm font-light text-black hover:bg-gray-50 transition-colors duration-200 tracking-wide flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            เพิ่มรายการ
          </button>
        </div>
        <div className="space-y-3">
          {businessPlan.additionalExpenses.map((expense, index) => (
            <div key={index} className="bg-gray-50 p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-light text-gray-400 mb-2 tracking-wider uppercase block">รายการค่าใช้จ่าย</label>
                  <input
                    value={expense.description}
                    onChange={(e) => onUpdateExpense(index, 'description', e.target.value)}
                    placeholder="เช่น ค่าเดินทาง, ค่าขนส่ง"
                    className="border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black focus:outline-none w-full px-3 py-2"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="text-xs font-light text-gray-400 mb-2 tracking-wider uppercase block">จำนวนเงิน (บาท)</label>
                    <input
                      type="number"
                      value={expense.amount || ''}
                      onChange={(e) => onUpdateExpense(index, 'amount', parseFloat(e.target.value) || 0)}
                      onWheel={(e) => e.currentTarget.blur()}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                          e.preventDefault();
                        }
                      }}
                      placeholder="0"
                      className="border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black focus:outline-none w-full px-3 py-2"
                    />
                  </div>
                  <button
                    onClick={() => onRemoveExpense(index)}
                    className="px-4 py-2 border border-red-200 text-sm font-light text-red-600 hover:bg-red-50 transition-colors duration-200 tracking-wide"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Staff Credentials Section */}
      <div className="bg-gray-50 p-6">
        <div className="bg-gray-100 p-4 -m-6 mb-4">
          <div className="text-lg font-light text-black tracking-wide">
            ข้อมูลเข้าสู่ระบบหน้าร้าน
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-light text-gray-400 mb-2 tracking-wider uppercase block">ชื่อผู้ใช้เข้าระบบ</label>
            <input
              value={businessPlan.staffUsername}
              onChange={(e) => onUpdateBasicInfo('staffUsername', e.target.value)}
              placeholder="อัตโนมัติ (จะเป็นชื่อร้าน)"
              className="border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black focus:outline-none w-full px-3 py-2"
            />
          </div>
          <div>
            <label className="text-xs font-light text-gray-400 mb-2 tracking-wider uppercase block">รหัสผ่านเข้าระบบ</label>
            <input
              value={businessPlan.staffPassword}
              onChange={(e) => onUpdateBasicInfo('staffPassword', e.target.value)}
              placeholder="อัตโนมัติ (123456)"
              className="border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black focus:outline-none w-full px-3 py-2"
            />
          </div>
        </div>
      </div>
    </div>
  );
}