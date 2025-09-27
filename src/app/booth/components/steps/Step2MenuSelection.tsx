import React from 'react';
import { MenuItem } from '@/types';
import { BusinessPlan, LocalIngredient } from '../types/BusinessPlanTypes';
import { Store, Utensils, Calculator, DollarSign, Package } from 'lucide-react';

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
    <div className="space-y-4">
      <h3 className="text-lg">เลือกเมนูและสัดส่วนการขาย</h3>

      {businessPlan.selectedMenuItems.length === 0 ? (
        <div className="flex ">
          <div className="text-center text-gray-400">
            
            <div className="">
              {availableMenuItems.map((menuItem) => (
                <div
                  key={menuItem._id}
                  className="p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-blue-300 hover:shadow-sm"
                  onClick={() => onToggleMenuItem(menuItem)}
                >
                  <div className="font-medium text-gray-800">{menuItem.name}</div>
                  <div className="text-blue-600 font-semibold">฿{menuItem.price}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Left Column - Add Menu Items */}
            <div className="col-span-1">
              <div className="border border-gray-200 p-3">
                <div className="flex items-center gap-2 mb-3">
                  <Utensils className="w-4 h-4 text-gray-600" />
                  <label className="text-lg text-gray-700">เมนูอื่นๆ</label>
                </div>
                <div className="space-y-2">
                  {availableMenuItems
                    .filter(item => !businessPlan.selectedMenuItems.some(selected => selected._id === item._id))
                    .map((menuItem) => (
                      <button
                        key={menuItem._id}
                        onClick={() => onToggleMenuItem(menuItem)}
                        className="w-full p-3 border border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors text-left"
                      >
                        <div className="font-medium">{menuItem.name}</div>
                        <div className="text-blue-600 text-sm">฿{menuItem.price}</div>
                      </button>
                    ))}
                </div>
              </div>
            </div>

            {/* Right Column - Selected Menu Items */}
            <div className="col-span-2">
              <div className={`mb-3 text-center p-2 border ${
                Object.values(businessPlan.menuItemProportions).reduce((sum, prop) => sum + prop, 0) === 100
                  ? 'border-green-300 bg-green-50 text-green-800'
                  : 'border-red-300 bg-red-50 text-red-800'
              }`}>
                รวมสัดส่วน: {Object.values(businessPlan.menuItemProportions).reduce((sum, prop) => sum + prop, 0)}%
                {Object.values(businessPlan.menuItemProportions).reduce((sum, prop) => sum + prop, 0) !== 100 && ' (ต้องเท่ากับ 100%)'}
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
                    <div key={menuItem._id} className="border border-gray-200 p-3 ">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 ">
                        <div className="grid grid-cols-2">
                            <div className="text-xl  text-gray-800">{menuItem.name}</div>
                            <div className="font-medium">฿{menuItem.price}</div>
                            <div className="font-light text-sm text-gray-600">
                              ต้นทุน: ฿{menuItem.ingredients?.reduce((cost, ing) => {
                                const ingredient = typeof ing.ingredientId === 'object' ? ing.ingredientId :
                                  availableIngredients.find(avail => avail._id === ing.ingredientId);
                                return cost + (ingredient ? ingredient.costPerUnit * ing.quantity : 0);
                              }, 0).toFixed(2) || '0.00'}
                            </div>
                            <div className="font-light text-sm text-gray-600">
                              กำไร: ฿{(menuItem.price - (menuItem.ingredients?.reduce((cost, ing) => {
                                const ingredient = typeof ing.ingredientId === 'object' ? ing.ingredientId :
                                  availableIngredients.find(avail => avail._id === ing.ingredientId);
                                return cost + (ingredient ? ingredient.costPerUnit * ing.quantity : 0);
                              }, 0) || 0)).toFixed(2)}
                            </div>
                            
                        </div>
                        <div className="flex justify-end items-center gap-4">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={proportion}
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
                              className="w-16 p-2 border rounded text-center"
                            />
                            <span>%</span>
                          </div>
                          <div className="font-medium">
                            = {unitsNeeded} จาน
                          </div>
                          <button
                            onClick={() => onToggleMenuItem(menuItem)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}