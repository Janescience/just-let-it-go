import React, { useState, useEffect } from 'react';
import { Package, CheckCircle, AlertCircle } from 'lucide-react';
import { Input, Select, Button } from '@/components/ui';
import { Booth, EquipmentSet, EquipmentTemplate } from '@/types';

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
  equipmentSetId?: string;
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
  availableEquipmentSets: EquipmentSet[];
  equipmentTemplates: EquipmentTemplate[];
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
  availableEquipmentSets,
  equipmentTemplates
}: Step1BasicInfoProps) {
  const selectedEquipmentSet = availableEquipmentSets.find(set => set._id === businessPlan.equipmentSetId);

  // Handle both populated and unpopulated templateId
  const getTemplateId = (templateId: any) => {
    return typeof templateId === 'object' && templateId?._id ? templateId._id : templateId;
  };

  const selectedTemplate = selectedEquipmentSet
    ? equipmentTemplates.find(t => t._id === getTemplateId(selectedEquipmentSet.templateId))
    : null;
  return (
    <div className="space-y-4">
      {/* Copy from existing booth */}
      {!isEditing && booths.length > 0 && (
        <div className="border border-gray-200 p-4 rounded-none bg-gray-50">
          <h4 className="text-xl font-medium text-gray-900 mb-3">คัดลอกข้อมูลจากหน้าร้านเดิม</h4>
          <Select
            options={[
              ...booths.map(booth => ({
                value: booth._id,
                label: `${booth.name} - ${booth.location}`
              }))
            ]}
            placeholder="เลือกหน้าร้านที่ต้องการคัดลอก..."
            onChange={(e) => {
              if (e.target.value) {
                onCopyFromBooth(e.target.value);
                e.target.value = ''; // Reset select
              }
            }}
            defaultValue=""
          />
          <p className="text-sm text-gray-600 mt-2">
            จะคัดลอกข้อมูลทั้งหมดยกเว้นชื่อ สถานที่ และ Username
          </p>
        </div>
      )}

      <h3 className="text-lg">ข้อมูลพื้นฐาน</h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Input
          label="ชื่อร้าน"
          value={businessPlan.name}
          onChange={(e) => onUpdateBasicInfo('name', e.target.value)}
          placeholder="เช่น ร้านผัดไทยโบราณ"
        />
        <Input
          label="สถานที่"
          value={businessPlan.location}
          onChange={(e) => onUpdateBasicInfo('location', e.target.value)}
          placeholder="เช่น ตลาดนัดจตุจักร"
        />
        <Input
          label="วันเริ่ม"
          type="date"
          value={businessPlan.startDate}
          onChange={(e) => onUpdateBasicInfo('startDate', e.target.value)}
        />
        <Input
          label="จำนวนวัน"
          type="number"
          value={businessPlan.numberOfDays}
          onChange={(e) => onUpdateBasicInfo('numberOfDays', parseInt(e.target.value) || 10)}
          placeholder="10"
          min="1"
        />
        <Input
          label="วันสิ้นสุด"
          type="date"
          value={businessPlan.endDate}
          onChange={(e) => onUpdateBasicInfo('endDate', e.target.value)}
          readOnly
          className="bg-gray-50"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input
          label="ค่าเช่า (บาท)"
          type="number"
          value={businessPlan.rentCost}
          onChange={(e) => onUpdateBasicInfo('rentCost', parseFloat(e.target.value) || 0)}
          placeholder="0"
        />
        <Input
          label="เวลาเปิด"
          type="time"
          value={businessPlan.openingStart}
          onChange={(e) => onUpdateBasicInfo('openingStart', e.target.value)}
        />
        <Input
          label="เวลาปิด"
          type="time"
          value={businessPlan.openingEnd}
          onChange={(e) => onUpdateBasicInfo('openingEnd', e.target.value)}
        />
      </div>

      {/* Equipment Selection */}
      <div className="border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="text-lg  text-black">เลือกชุดอุปกรณ์</div>
        </div>

        {availableEquipmentSets.length === 0 ? (
          <div className="text-center py-8 border border-gray-200 bg-gray-50">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <div className="text-lg text-gray-500 mb-2">ไม่มีชุดอุปกรณ์ที่พร้อมใช้งาน</div>
            <div className="text-gray-400 mb-4">สร้างชุดอุปกรณ์ก่อนเพื่อใช้งาน</div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => window.open('/equipment', '_blank')}
            >
              จัดการอุปกรณ์
            </Button>
          </div>
        ) : (
          <div>
            <select
              value={businessPlan.equipmentSetId || ''}
              onChange={(e) => onUpdateBasicInfo('equipmentSetId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded mb-3"
            >
              <option value="">ไม่ใช้อุปกรณ์จากระบบ</option>
              {availableEquipmentSets.map(set => {
                const template = equipmentTemplates.find(t => t._id === getTemplateId(set.templateId));
                return (
                  <option key={set._id} value={set._id}>
                    {set.setName} - {template?.name} (฿{template?.dailyCost.toFixed(2)}/วัน)
                  </option>
                );
              })}
            </select>

            {selectedEquipmentSet && selectedTemplate && (
              <div className="border border-gray-200 p-3 bg-gray-50">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <div className="text-black">{selectedEquipmentSet.setName}</div>
                </div>
                <div className="grid grid-cols-3 gap-4  mb-3">
                  <div>
                    <span className="text-gray-600">ราคาซื้อ:</span>
                    <div className="font-medium">฿{selectedTemplate.totalPrice.toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">ต้นทุนต่อวัน:</span>
                    <div className="font-medium">฿{selectedTemplate.dailyCost.toFixed(2)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">รวม {businessPlan.numberOfDays} วัน:</span>
                    <div className="font-medium text-blue-600">฿{(selectedTemplate.dailyCost * businessPlan.numberOfDays).toFixed(2)}</div>
                  </div>
                </div>
                
              </div>
            )}
          </div>
        )}
      </div>

      

      

      <div>
        <div className="flex justify-between items-center mb-3 bg-gray-100 p-2">
          <label className="text-lg text-gray-700 ">พนักงาน</label>
          <Button
            variant="secondary"
            size="sm"
            onClick={onAddEmployee}
          >
            เพิ่มพนักงาน
          </Button>
        </div>
        <div className="space-y-3">
          {businessPlan.employees.map((employee, index) => (
            <div key={index} className="bg-gray-50 p-3">
              <div className="grid grid-cols-3 gap-3">
                <Input
                  label="ชื่อ"
                  value={employee.name}
                  onChange={(e) => onUpdateEmployee(index, 'name', e.target.value)}
                  placeholder="ชื่อพนักงาน"
                />
                <div>
                  <Input
                    label="ค่าจ้างต่อวัน"
                    type="number"
                    value={employee.salary}
                    onChange={(e) => onUpdateEmployee(index, 'salary', e.target.value)}
                    placeholder="300"
                  />
                  <div className="text-gray-500 mt-1">
                    รวม {businessPlan.numberOfDays} วัน = ฿{(parseFloat(employee.salary || '0') * businessPlan.numberOfDays).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-end">
                  {businessPlan.employees.length > 1 && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => onRemoveEmployee(index)}
                      className="w-full"
                    >
                      ลบ
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Staff Credentials Section */}
      <div className="bg-gray-50 p-4 ">
        <div className="text-lg mb-4">
          ข้อมูลเข้าสู่ระบบหน้าร้าน
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="ชื่อผู้ใช้เข้าระบบ"
            value={businessPlan.staffUsername}
            onChange={(e) => onUpdateBasicInfo('staffUsername', e.target.value)}
            placeholder="อัตโนมัติ (จะเป็นชื่อร้าน)"
          />
          <Input
            label="รหัสผ่านเข้าระบบ"
            value={businessPlan.staffPassword}
            onChange={(e) => onUpdateBasicInfo('staffPassword', e.target.value)}
            placeholder="อัตโนมัติ (123456)"
          />
        </div>
      </div>
    </div>
  );
}