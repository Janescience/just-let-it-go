import React, { useState, useEffect } from 'react';
import { MenuItem, Equipment } from '@/types';
import { Store, Users, Clock, MapPin, DollarSign, Package, User, Key } from 'lucide-react';

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
  selectedMenuItems: MenuItem[];
  menuItemProportions: { [menuItemId: string]: number };
  equipmentId?: string;
  additionalExpenses: { description: string; amount: number; }[];
  fixedCosts: {
    rent: number;
    staff: number;
    equipment: number;
    additionalExpenses: number;
    total: number;
  };
  breakEven: {
    unitsNeeded: number;
    revenueNeeded: number;
    dailyTarget: number;
  };
  ingredients: {
    name: string;
    quantity: number;
    unit: string;
    cost: number;
  }[];
  totalCapital: number;
  targetProfit: {
    type: 'percentage' | 'amount';
    value: number;
    unitsNeeded: number;
    revenueNeeded: number;
    additionalIngredients: number;
    totalCapitalWithProfit: number;
  };
  initialStock?: { [ingredientId: string]: number };
}

interface Step3SummaryProps {
  businessPlan: BusinessPlan;
  calculateIngredientsNeeded: (unitsNeeded: number) => any[];
}

export function Step3Summary({
  businessPlan,
  calculateIngredientsNeeded
}: Step3SummaryProps) {
  const [equipment, setEquipment] = useState<Equipment | null>(null);

  useEffect(() => {
    console.log('🔍 Step3Summary - businessPlan.equipmentId:', businessPlan.equipmentId);
    console.log('🔍 Step3Summary - businessPlan.fixedCosts.equipment:', businessPlan.fixedCosts.equipment);
    if (businessPlan.equipmentId) {
      fetchEquipmentData();
    }
  }, [businessPlan.equipmentId]);

  const fetchEquipmentData = async () => {
    try {
      const response = await fetch(`/api/equipment/${businessPlan.equipmentId}`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setEquipment(data.equipment);
      }
    } catch (error) {
      console.error('Error fetching equipment data:', error);
    }
  };
  return (
    <div className="space-y-4">
      <h3 className="text-lg">สรุปแผนธุรกิจบูธ</h3>

      {/* Step 1 Summary: Basic Information */}
      <div className="border border-gray-200 p-1 md:p-3">
        <div className="flex items-center gap-2 mb-3">
          <Store className="w-4 h-4 text-gray-600" />
          <label className="text-lg text-gray-700">ข้อมูลพื้นฐาน</label>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>ชื่อบูธ:</span>
              <span className="text-gray-700 font-medium">{businessPlan.name}</span>
            </div>
            <div className="flex justify-between">
              <span>สถานที่:</span>
              <span className="text-gray-700">{businessPlan.location}</span>
            </div>
            <div className="flex justify-between">
              <span>ระยะเวลา:</span>
              <span className="text-gray-700">{businessPlan.numberOfDays} วัน ({businessPlan.startDate} - {businessPlan.endDate})</span>
            </div>
            <div className="flex justify-between">
              <span>เวลาทำการ:</span>
              <span className="text-gray-700">{businessPlan.openingStart} - {businessPlan.openingEnd}</span>
            </div>
            {equipment && (
              <div className="flex justify-between">
                <span>อุปกรณ์:</span>
                <span className="text-gray-700">{equipment.name} (฿{(equipment.dailyCost * businessPlan.numberOfDays).toFixed(2)})</span>
              </div>
            )}
            {businessPlan.additionalExpenses && businessPlan.additionalExpenses.length > 0 && (
              <div>
                <span className="font-medium">ค่าใช้จ่ายเพิ่มเติม:</span>
                <div className="mt-1 space-y-1 text-sm">
                  {businessPlan.additionalExpenses.map((expense, index) => (
                    <div key={index} className="flex justify-between text-gray-600">
                      <span>- {expense.description}</span>
                      <span>฿{expense.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>ค่าเช่าบูธ:</span>
              <span className="text-gray-700 font-medium">฿{businessPlan.rentCost.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>พนักงาน:</span>
              <span className="text-gray-700">{businessPlan.employees.length} คน</span>
            </div>
            <div className="flex justify-between">
              <span>ค่าแรงรวม:</span>
              <span className="text-gray-700 font-medium">฿{businessPlan.fixedCosts.staff.toLocaleString()}</span>
            </div>
            <div className="space-y-1">
              <div>รายชื่อพนักงาน:</div>
              {businessPlan.employees.map((emp, index) => (
                <div key={index} className="text-sm text-gray-600">
                  {emp.name} ({emp.position}) - ฿{emp.salary}/วัน
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <div className="mb-2">ข้อมูลการเข้าสู่ระบบ POS</div>
            <div className="border border-gray-200 p-3">
              <div className="text-sm text-gray-600">Username:</div>
              <div className=" text-gray-800">{businessPlan.staffUsername}</div>
            </div>
            <div className="border border-gray-200 p-3">
              <div className="text-sm text-gray-600">Password:</div>
              <div className="text-gray-800">{businessPlan.staffPassword}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Step 2 Summary: Menu Selection & Initial Stock */}
      <div className="border border-gray-200 p-3">
        <div className="flex items-center gap-2 mb-3">
          <Package className="w-4 h-4 text-gray-600" />
          <label className="text-lg text-gray-700">เมนูและวัตถุดิบเริ่มต้น</label>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="mb-2">เมนูที่ขาย ({businessPlan.selectedMenuItems.length} รายการ):</div>
            <div className="max-h-32 overflow-y-auto space-y-2">
              {businessPlan.selectedMenuItems.map((item, index) => (
                <div key={index} className="flex justify-between">
                  <span className="text-gray-700">{item.name}</span>
                  <span className="text-gray-700 font-medium">฿{item.price} ({businessPlan.menuItemProportions[item._id] || 0}%)</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2">รายการวัตถุดิบที่ต้องเตรียม:</div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2">วัตถุดิบ</th>
                  <th className="text-center py-2">ปริมาณ</th>
                  <th className="text-center py-2">หน่วย</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const breakEvenUnits = businessPlan.breakEven.unitsNeeded || 0;
                  const breakEvenIngredients = breakEvenUnits > 0 ? calculateIngredientsNeeded(breakEvenUnits) : [];
                  return breakEvenIngredients.map((ingredient, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-2 text-gray-700">{ingredient.name}</td>
                      <td className="text-center py-2 text-gray-700">{ingredient.quantity.toFixed(2)}</td>
                      <td className="text-center py-2 text-gray-700">{ingredient.unit}</td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="border border-gray-200 p-3">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="w-4 h-4 text-gray-600" />
          <label className="text-lg text-gray-700">สรุปรวม</label>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">ต้นทุนคงที่:</span>
                <span className="font-medium">฿{businessPlan.fixedCosts.total.toLocaleString()}</span>
              </div>
              <div className="pl-4 space-y-1 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>- ค่าเช่าบูธ ({businessPlan.numberOfDays} วัน):</span>
                  <span>฿{businessPlan.fixedCosts.rent.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>- ค่าแรงพนักงาน ({businessPlan.numberOfDays} วัน):</span>
                  <span>฿{businessPlan.fixedCosts.staff.toLocaleString()}</span>
                </div>
                {businessPlan.fixedCosts.equipment > 0 && (
                  <div className="flex justify-between">
                    <span>- ค่าอุปกรณ์ ({businessPlan.numberOfDays} วัน):</span>
                    <span>฿{businessPlan.fixedCosts.equipment.toLocaleString()}</span>
                  </div>
                )}
                {businessPlan.fixedCosts.additionalExpenses > 0 && (
                  <div className="flex justify-between">
                    <span>- ค่าใช้จ่ายเพิ่มเติม:</span>
                    <span>฿{businessPlan.fixedCosts.additionalExpenses.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">ต้นทุนผันแปร:</span>
                <span className="font-medium">฿{businessPlan.ingredients.reduce((sum, ing) => sum + ing.cost, 0).toLocaleString()}</span>
              </div>
              <div className="pl-4 space-y-1 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>- ค่าวัตถุดิบ:</span>
                  <span>฿{businessPlan.ingredients.reduce((sum, ing) => sum + ing.cost, 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span>เงินสำรอง (10%):</span>
              <span className="font-medium">฿{((businessPlan.fixedCosts.total + businessPlan.ingredients.reduce((sum, ing) => sum + ing.cost, 0)) * 0.1).toLocaleString()}</span>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <div className="border border-gray-200 p-6 text-center">
              <div className="text-sm text-gray-600 mb-2">รวมเงินทุนที่ต้องใช้</div>
              <div className="text-3xl font-bold text-gray-800">
                ฿{businessPlan.totalCapital.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profit Ladder */}
      <div className="border border-gray-200 p-3">
        <div className="flex items-center gap-2 mb-3">
          <Package className="w-4 h-4 text-gray-600" />
          <label className="text-lg text-gray-700">เปรียบเทียบกำไร</label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-center py-2 px-2 whitespace-nowrap">เปอร์เซ็นต์กำไร</th>
                <th className="text-right py-2 px-2 whitespace-nowrap">ต้นทุนคงที่</th>
                <th className="text-right py-2 px-2 whitespace-nowrap">ต้นทุนผันแปร</th>
                <th className="text-right py-2 px-2 whitespace-nowrap">เงินทุนรวม</th>
                <th className="text-right py-2 px-2 whitespace-nowrap">กำไรที่ได้</th>
                <th className="text-right py-2 px-2 whitespace-nowrap">ขายได้</th>
                <th className="text-center py-2 px-2 whitespace-nowrap">ขายทั้งหมด (จาน)</th>
                <th className="text-center py-2 px-2 whitespace-nowrap">วันล่ะ (จาน)</th>
                <th className="text-right py-2 px-2 whitespace-nowrap">ขายได้วันล่ะ</th>
              </tr>
            </thead>
            <tbody>
              {[10, 20, 30, 40, 50, 60, 70].map(profit => {
                const targetProfitDecimal = profit / 100;
                const fixedCosts = businessPlan.fixedCosts.total;
                const averagePrice = businessPlan.selectedMenuItems.reduce((sum, item) => sum + item.price, 0) / businessPlan.selectedMenuItems.length;

                // Iterative calculation
                let totalCapital = fixedCosts;
                let requiredRevenue = 0;
                let ingredientCost = 0;

                // Iterate until convergence
                for (let i = 0; i < 10; i++) {
                  const reserveFund = totalCapital * 0.1;
                  const totalCapitalWithReserve = totalCapital + reserveFund;
                  requiredRevenue = totalCapitalWithReserve / (1 - targetProfitDecimal);

                  const unitsNeeded = Math.ceil(requiredRevenue / averagePrice);
                  const ingredientsForTarget = calculateIngredientsNeeded(unitsNeeded);
                  ingredientCost = ingredientsForTarget.reduce((sum, ing) => sum + ing.cost, 0);

                  const newTotalCapital = fixedCosts + ingredientCost;

                  // Check for convergence
                  if (Math.abs(newTotalCapital - totalCapital) < 1) break;
                  totalCapital = newTotalCapital;
                }

                const finalReserveFund = totalCapital * 0.1;
                const finalTotalCapital = totalCapital + finalReserveFund;
                const totalProfit = requiredRevenue - finalTotalCapital;

                const finalUnitsNeeded = Math.ceil(requiredRevenue / averagePrice);
                const dailyUnitsNeeded = Math.ceil(finalUnitsNeeded / businessPlan.numberOfDays);
                const dailyRevenue = Math.round(requiredRevenue / businessPlan.numberOfDays);

                return (
                  <tr key={profit} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="text-center py-2 font-medium">{profit}%</td>
                    <td className="text-right py-2">฿{Math.round(fixedCosts).toLocaleString()}</td>
                    <td className="text-right py-2">฿{Math.round(ingredientCost).toLocaleString()}</td>
                    <td className="text-right py-2">฿{Math.round(finalTotalCapital).toLocaleString()}</td>
                    <td className="text-right py-2 font-medium text-gray-800">฿{Math.round(totalProfit).toLocaleString()}</td>
                    <td className="text-right py-2">฿{Math.round(requiredRevenue).toLocaleString()}</td>
                    <td className="text-center py-2">{finalUnitsNeeded.toLocaleString()}</td>
                    <td className="text-center py-2">{dailyUnitsNeeded.toLocaleString()}</td>
                    <td className="text-right py-2">฿{dailyRevenue.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}