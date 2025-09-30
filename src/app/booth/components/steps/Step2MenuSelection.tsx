import React from 'react';
import { MenuItem } from '@/types';
import { BusinessPlan, LocalIngredient } from '../types/BusinessPlanTypes';
import { Utensils, Calculator } from 'lucide-react';

interface Step2MenuSelectionProps {
  businessPlan: BusinessPlan;
  availableMenuItems: MenuItem[];
  availableIngredients: LocalIngredient[];
  onToggleMenuItem: (menuItem: MenuItem) => void;
  onSetBusinessPlan: React.Dispatch<React.SetStateAction<BusinessPlan>>;
  calculateIngredientsNeeded: (unitsNeeded: number) => any[];
}

export function Step2MenuSelection({
  businessPlan,
  availableMenuItems,
  availableIngredients,
  onToggleMenuItem,
  onSetBusinessPlan,
  calculateIngredientsNeeded
}: Step2MenuSelectionProps) {
  return (
    <div className="space-y-6">
      <div className="bg-gray-100 p-4">
        <h3 className="text-lg font-light text-black tracking-wide">เลือกเมนูและสัดส่วนการขาย</h3>
      </div>

      {businessPlan.selectedMenuItems.length === 0 ? (
        <div className="border border-gray-100 p-6">
          <div className="text-center mb-6">
            <Utensils className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <div className="text-lg font-light text-gray-500 mb-2">เลือกเมนูที่ต้องการขาย</div>
            <div className="font-light text-gray-400">คลิกที่เมนูเพื่อเพิ่มลงในรายการ</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableMenuItems.map((menuItem) => (
              <div
                key={menuItem._id}
                className="p-4 border border-gray-200 hover:border-gray-300 hover:shadow-md cursor-pointer transition-all duration-200 bg-white"
                onClick={() => onToggleMenuItem(menuItem)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="font-light text-black tracking-wide text-lg">{menuItem.name}</div>
                  <div className="font-light text-black text-lg">฿{menuItem.price}</div>
                </div>
                <div className="text-sm font-light text-gray-600">
                  ต้นทุน: ฿{menuItem.ingredients?.reduce((cost, ing) => {
                    const ingredient = typeof ing.ingredientId === 'object' ? ing.ingredientId :
                      availableIngredients.find(avail => avail._id === ing.ingredientId);
                    return cost + (ingredient ? ingredient.costPerUnit * ing.quantity : 0);
                  }, 0).toFixed(2) || '0.00'}
                </div>
                <div className="text-sm font-light text-green-600">
                  กำไร: ฿{(menuItem.price - (menuItem.ingredients?.reduce((cost, ing) => {
                    const ingredient = typeof ing.ingredientId === 'object' ? ing.ingredientId :
                      availableIngredients.find(avail => avail._id === ing.ingredientId);
                    return cost + (ingredient ? ingredient.costPerUnit * ing.quantity : 0);
                  }, 0) || 0)).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Column - Add Menu Items */}
            <div className="lg:col-span-1">
              <div className="border border-gray-100 p-4">
                <div className="bg-gray-100 p-4 -m-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Utensils className="w-4 h-4 text-gray-600" />
                    <label className="text-lg font-light text-black tracking-wide">เมนูอื่นๆ</label>
                  </div>
                </div>
                <div className="space-y-2">
                  {availableMenuItems
                    .filter(item => !businessPlan.selectedMenuItems.some(selected => selected._id === item._id))
                    .map((menuItem) => (
                      <button
                        key={menuItem._id}
                        onClick={() => onToggleMenuItem(menuItem)}
                        className="w-full p-3 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm transition-all duration-200 text-left bg-white"
                      >
                        <div className="font-light text-black tracking-wide">{menuItem.name}</div>
                        <div className="font-light text-gray-600 text-sm">฿{menuItem.price}</div>
                      </button>
                    ))}
                  {availableMenuItems.filter(item => !businessPlan.selectedMenuItems.some(selected => selected._id === item._id)).length === 0 && (
                    <div className="text-center py-4 text-gray-400 font-light text-sm">
                      เลือกเมนูทั้งหมดแล้ว
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Selected Menu Items */}
            <div className="lg:col-span-3">
              <div className="border border-gray-100 p-4 mb-4">
                <div className="bg-gray-100 p-4 -m-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-gray-600" />
                      <label className="text-lg font-light text-black tracking-wide">เมนูที่เลือกและสัดส่วน</label>
                    </div>
                    <div className={`px-3 py-1 text-sm font-light border ${
                      Object.values(businessPlan.menuItemProportions).reduce((sum, prop) => sum + prop, 0) === 100
                        ? 'border-green-200 bg-green-50 text-green-700'
                        : 'border-orange-200 bg-orange-50 text-orange-700'
                    }`}>
                      รวม: {Object.values(businessPlan.menuItemProportions).reduce((sum, prop) => sum + prop, 0)}%
                      {Object.values(businessPlan.menuItemProportions).reduce((sum, prop) => sum + prop, 0) !== 100 && ' (ต้องเท่ากับ 100%)'}
                    </div>
                  </div>
                </div>
              <div className="space-y-4">
                {businessPlan.selectedMenuItems.map((menuItem) => {
                  const proportion = businessPlan.menuItemProportions[menuItem._id] || 0;

                  // Calculate units needed based on business plan (target profit)
                  const targetProfitDecimal = businessPlan.targetProfit.value / 100;
                  const actualIngredientCost = businessPlan.ingredients.reduce((sum, ing) => {
                    const stockKey = `ingredient_${ing.name}`;
                    const actualQuantity = businessPlan.initialStock?.[stockKey] || ing.quantity;
                    const actualCost = actualQuantity * (ing.cost / ing.quantity);
                    return sum + actualCost;
                  }, 0);
                  const baseCapital = businessPlan.fixedCosts.total + actualIngredientCost;
                  const reserveFund = baseCapital * 0.1;
                  const totalCapital = baseCapital + reserveFund;
                  const requiredRevenue = totalCapital / (1 - targetProfitDecimal);
                  const averagePrice = businessPlan.selectedMenuItems.reduce((sum, item) => sum + item.price, 0) / businessPlan.selectedMenuItems.length;
                  const totalUnitsNeeded = Math.ceil(requiredRevenue / averagePrice);

                  const unitsNeeded = totalUnitsNeeded > 0
                    ? Math.ceil((totalUnitsNeeded * proportion) / 100)
                    : 0;

                  return (
                    <div key={menuItem._id} className="border border-gray-200 p-6 bg-white hover:shadow-sm transition-shadow duration-200">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="text-xl font-light text-black tracking-wide mb-2">{menuItem.name}</div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-light text-gray-500">ราคาขาย:</span>
                              <span className="font-light text-black ml-2">฿{menuItem.price}</span>
                            </div>
                            <div>
                              <span className="font-light text-gray-500">ต้นทุน:</span>
                              <span className="font-light text-black ml-2">
                                ฿{menuItem.ingredients?.reduce((cost, ing) => {
                                  const ingredient = typeof ing.ingredientId === 'object' ? ing.ingredientId :
                                    availableIngredients.find(avail => avail._id === ing.ingredientId);
                                  return cost + (ingredient ? ingredient.costPerUnit * ing.quantity : 0);
                                }, 0).toFixed(2) || '0.00'}
                              </span>
                            </div>
                            <div>
                              <span className="font-light text-gray-500">กำไรต่อจาน:</span>
                              <span className="font-light text-green-600 ml-2">
                                ฿{(menuItem.price - (menuItem.ingredients?.reduce((cost, ing) => {
                                  const ingredient = typeof ing.ingredientId === 'object' ? ing.ingredientId :
                                    availableIngredients.find(avail => avail._id === ing.ingredientId);
                                  return cost + (ingredient ? ingredient.costPerUnit * ing.quantity : 0);
                                }, 0) || 0)).toFixed(2)}
                              </span>
                            </div>
                            <div>
                              <span className="font-light text-gray-500">ต้องขาย:</span>
                              <span className="font-light text-black ml-2">{unitsNeeded} จาน</span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => onToggleMenuItem(menuItem)}
                          className="font-light text-gray-400 hover:text-gray-600 text-lg ml-4"
                          title="ลบเมนูนี้"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                        <div className="text-sm font-light text-gray-600">
                          สัดส่วนการขาย
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={proportion}
                            onWheel={(e) => e.currentTarget.blur()}
                            onKeyDown={(e) => {
                              if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                                e.preventDefault();
                              }
                            }}
                            onChange={(e) => {
                              const value = parseInt(e.target.value) || 0;
                              if (value <= 100) {
                                onSetBusinessPlan(prev => ({
                                  ...prev,
                                  menuItemProportions: {
                                    ...prev.menuItemProportions,
                                    [menuItem._id]: value
                                  }
                                }));
                              }
                            }}
                            className="w-20 p-2 border border-gray-200 text-center text-sm font-light focus:border-gray-400 focus:outline-none"
                          />
                          <span className="text-sm font-light text-gray-600">%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}