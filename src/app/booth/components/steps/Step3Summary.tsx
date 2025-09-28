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
      <h3 className="text-lg font-light text-black tracking-wide">สรุปแผนธุรกิจบูธ</h3>

      {/* Step 1 Summary: Basic Information */}
      <div className="border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Store className="w-4 h-4 text-gray-600" />
          <label className="text-lg font-light text-black tracking-wide">ข้อมูลพื้นฐาน</label>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="font-light">ชื่อบูธ:</span>
              <span className="font-light text-black">{businessPlan.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-light">สถานที่:</span>
              <span className="font-light text-gray-700">{businessPlan.location}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-light">ระยะเวลา:</span>
              <span className="font-light text-gray-700">{businessPlan.numberOfDays} วัน ({businessPlan.startDate} - {businessPlan.endDate})</span>
            </div>
            <div className="flex justify-between">
              <span className="font-light">เวลาทำการ:</span>
              <span className="font-light text-gray-700">{businessPlan.openingStart} - {businessPlan.openingEnd}</span>
            </div>
            {equipment && (
              <div className="flex justify-between">
                <span className="font-light">อุปกรณ์:</span>
                <span className="font-light text-gray-700">{equipment.name} (฿{(equipment.dailyCost * businessPlan.numberOfDays).toFixed(2)})</span>
              </div>
            )}
            {businessPlan.additionalExpenses && businessPlan.additionalExpenses.length > 0 && (
              <div>
                <span className="font-light">ค่าใช้จ่ายเพิ่มเติม:</span>
                <div className="mt-1 space-y-1 text-sm">
                  {businessPlan.additionalExpenses.map((expense, index) => (
                    <div key={index} className="flex justify-between font-light text-gray-600">
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
              <span className="font-light">ค่าเช่าบูธ:</span>
              <span className="font-light text-black">฿{businessPlan.rentCost.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-light">พนักงาน:</span>
              <span className="font-light text-gray-700">{businessPlan.employees.length} คน</span>
            </div>
            <div className="flex justify-between">
              <span className="font-light">ค่าแรงรวม:</span>
              <span className="font-light text-black">฿{businessPlan.fixedCosts.staff.toLocaleString()}</span>
            </div>
            <div className="space-y-1">
              <div className="font-light">รายชื่อพนักงาน:</div>
              {businessPlan.employees.map((emp, index) => (
                <div key={index} className="text-sm font-light text-gray-600">
                  {emp.name} ({emp.position}) - ฿{emp.salary}/วัน
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <div className="mb-2 font-light">ข้อมูลการเข้าสู่ระบบ POS</div>
            <div className="border border-gray-100 p-3">
              <div className="text-xs font-light text-gray-400 tracking-wider uppercase">Username:</div>
              <div className="font-light text-black">{businessPlan.staffUsername}</div>
            </div>
            <div className="border border-gray-100 p-3">
              <div className="text-xs font-light text-gray-400 tracking-wider uppercase">Password:</div>
              <div className="font-light text-black">{businessPlan.staffPassword}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Step 2 Summary: Menu Selection & Initial Stock */}
      <div className="border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Package className="w-4 h-4 text-gray-600" />
          <label className="text-lg font-light text-black tracking-wide">เมนูและวัตถุดิบเริ่มต้น</label>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="mb-2 font-light">เมนูที่ขาย ({businessPlan.selectedMenuItems.length} รายการ):</div>
            <div className="max-h-32 overflow-y-auto space-y-2">
              {businessPlan.selectedMenuItems.map((item, index) => (
                <div key={index} className="flex justify-between">
                  <span className="font-light text-gray-700">{item.name}</span>
                  <span className="font-light text-black">฿{item.price} ({businessPlan.menuItemProportions[item._id] || 0}%)</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 font-light">รายการวัตถุดิบที่ต้องเตรียม:</div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 font-light">วัตถุดิบ</th>
                  <th className="text-center py-2 font-light">ปริมาณ</th>
                  <th className="text-center py-2 font-light">หน่วย</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const breakEvenUnits = businessPlan.breakEven.unitsNeeded || 0;
                  const breakEvenIngredients = breakEvenUnits > 0 ? calculateIngredientsNeeded(breakEvenUnits) : [];
                  return breakEvenIngredients.map((ingredient, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-2 font-light text-gray-700">{ingredient.name}</td>
                      <td className="text-center py-2 font-light text-gray-700">{ingredient.quantity.toFixed(2)}</td>
                      <td className="text-center py-2 font-light text-gray-700">{ingredient.unit}</td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-4 h-4 text-gray-600" />
          <label className="text-lg font-light text-black tracking-wide">สรุปรวม</label>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-light">ต้นทุนคงที่:</span>
                <span className="font-light text-black">฿{businessPlan.fixedCosts.total.toLocaleString()}</span>
              </div>
              <div className="pl-4 space-y-1 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span className="font-light">- ค่าเช่าบูธ ({businessPlan.numberOfDays} วัน):</span>
                  <span className="font-light">฿{businessPlan.fixedCosts.rent.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-light">- ค่าแรงพนักงาน ({businessPlan.numberOfDays} วัน):</span>
                  <span className="font-light">฿{businessPlan.fixedCosts.staff.toLocaleString()}</span>
                </div>
                {businessPlan.fixedCosts.equipment > 0 && (
                  <div className="flex justify-between">
                    <span className="font-light">- ค่าอุปกรณ์ ({businessPlan.numberOfDays} วัน):</span>
                    <span className="font-light">฿{businessPlan.fixedCosts.equipment.toLocaleString()}</span>
                  </div>
                )}
                {businessPlan.fixedCosts.additionalExpenses > 0 && (
                  <div className="flex justify-between">
                    <span className="font-light">- ค่าใช้จ่ายเพิ่มเติม:</span>
                    <span className="font-light">฿{businessPlan.fixedCosts.additionalExpenses.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-light">ต้นทุนผันแปร:</span>
                <span className="font-light text-black">฿{businessPlan.ingredients.reduce((sum, ing) => sum + ing.cost, 0).toLocaleString()}</span>
              </div>
              <div className="pl-4 space-y-1 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span className="font-light">- ค่าวัตถุดิบ:</span>
                  <span className="font-light">฿{businessPlan.ingredients.reduce((sum, ing) => sum + ing.cost, 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="font-light">เงินสำรอง (10%):</span>
              <span className="font-light text-black">฿{((businessPlan.fixedCosts.total + businessPlan.ingredients.reduce((sum, ing) => sum + ing.cost, 0)) * 0.1).toLocaleString()}</span>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <div className="border border-gray-100 p-6 text-center">
              <div className="text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">รวมเงินทุนที่ต้องใช้</div>
              <div className="text-3xl font-light text-black tracking-wide">
                ฿{businessPlan.totalCapital.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profit Ladder */}
      <div className="border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Package className="w-4 h-4 text-gray-600" />
          <label className="text-lg font-light text-black tracking-wide">เปรียบเทียบกำไร</label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-center py-2 px-2 whitespace-nowrap font-light">เปอร์เซ็นต์กำไร</th>
                <th className="text-right py-2 px-2 whitespace-nowrap font-light">ต้นทุนคงที่</th>
                <th className="text-right py-2 px-2 whitespace-nowrap font-light">ต้นทุนผันแปร</th>
                <th className="text-right py-2 px-2 whitespace-nowrap font-light">เงินทุนรวม</th>
                <th className="text-right py-2 px-2 whitespace-nowrap font-light">กำไรที่ได้</th>
                <th className="text-right py-2 px-2 whitespace-nowrap font-light">ขายได้</th>
                <th className="text-center py-2 px-2 whitespace-nowrap font-light">ขายทั้งหมด (จาน)</th>
                <th className="text-center py-2 px-2 whitespace-nowrap font-light">วันล่ะ (จาน)</th>
                <th className="text-right py-2 px-2 whitespace-nowrap font-light">ขายได้วันล่ะ</th>
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
                    <td className="text-center py-2 font-light">{profit}%</td>
                    <td className="text-right py-2 font-light">฿{Math.round(fixedCosts).toLocaleString()}</td>
                    <td className="text-right py-2 font-light">฿{Math.round(ingredientCost).toLocaleString()}</td>
                    <td className="text-right py-2 font-light">฿{Math.round(finalTotalCapital).toLocaleString()}</td>
                    <td className="text-right py-2 font-light text-black">฿{Math.round(totalProfit).toLocaleString()}</td>
                    <td className="text-right py-2 font-light">฿{Math.round(requiredRevenue).toLocaleString()}</td>
                    <td className="text-center py-2 font-light">{finalUnitsNeeded.toLocaleString()}</td>
                    <td className="text-center py-2 font-light">{dailyUnitsNeeded.toLocaleString()}</td>
                    <td className="text-right py-2 font-light">฿{dailyRevenue.toLocaleString()}</td>
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