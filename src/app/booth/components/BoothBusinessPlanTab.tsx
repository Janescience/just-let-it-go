import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, Package, DollarSign } from 'lucide-react';
import { Booth } from '@/types';

interface BoothBusinessPlanTabProps {
  businessPlan: NonNullable<Booth['businessPlan']>;
  booth: Booth;
  preloadedStats?: any;
}

export function BoothBusinessPlanTab({ businessPlan, booth, preloadedStats }: BoothBusinessPlanTabProps) {
  const [statsData, setStatsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (preloadedStats) {
      // Use preloaded data
      setStatsData(preloadedStats.booth);
      setLoading(false);
    } else {
      // Fallback to fetch data
      fetchBoothStats();
    }
  }, [booth._id, preloadedStats]);

  const fetchBoothStats = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/booths/${booth._id}/stats`);
      if (response.ok) {
        const data = await response.json();
        setStatsData(data.booth);
      }
    } catch (error) {
      console.error('Error fetching booth stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateIngredientsNeeded = (totalUnits: number) => {
    // For now, use the base ingredients and scale them proportionally
    const baseUnits = businessPlan.breakEven?.unitsNeeded || 1;
    const scaleFactor = totalUnits / baseUnits;

    return businessPlan.ingredients.map(ingredient => ({
      name: ingredient.name,
      quantity: Math.ceil(ingredient.quantity * scaleFactor),
      unit: ingredient.unit,
      cost: ingredient.cost * scaleFactor,
      costPerUnit: ingredient.cost / ingredient.quantity
    }));
  };
  if (loading) {
    return (
      <div className="space-y-6">
        {/* Progress bars skeleton */}
        <div className="space-y-4">
          <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
          <div className="h-6 bg-gray-100 rounded animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-1/3"></div>
          <div className="h-6 bg-gray-100 rounded animate-pulse"></div>
        </div>

        {/* Cards grid skeleton */}
        <div className="grid grid-cols-1 tablet:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="border border-gray-200 p-4 rounded space-y-3">
              <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
              <div className="h-8 bg-gray-100 rounded animate-pulse"></div>
              <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4"></div>
            </div>
          ))}
        </div>

        {/* Chart skeleton */}
        <div className="space-y-4">
          <div className="h-4 bg-gray-200 rounded animate-pulse w-1/3"></div>
          <div className="h-48 bg-gray-100 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  const totalSoldUnits = statsData?.menuStats?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;
  const totalSales = statsData?.totalSales || 0;
  const breakEvenProgress = businessPlan.breakEven?.unitsNeeded ? (totalSoldUnits / businessPlan.breakEven.unitsNeeded) * 100 : 0;
  const targetProfitProgress = businessPlan.targetProfit?.unitsNeeded ? (totalSoldUnits / businessPlan.targetProfit.unitsNeeded) * 100 : 0;

  return (
    <div className="space-y-4">

      {/* Break Even Comparison */}
      <div className="border border-gray-100 p-6">
        <div className="flex items-center gap-4 mb-4">
          <Target className="w-8 h-8 text-gray-700" />
          <h4 className="text-lg font-light text-black tracking-wide">จุดคุ้มทุน</h4>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="border border-gray-100 p-6 text-center bg-white">
            <div className="text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">เป้าหมาย</div>
            <div className="text-3xl font-light text-black mb-2">{businessPlan.breakEven?.unitsNeeded || 0} จาน</div>
            <div className="text-xl font-light text-gray-600">฿{businessPlan.breakEven?.revenueNeeded?.toLocaleString() || '0'}</div>
          </div>
          <div className="border border-gray-100 p-6 text-center bg-gray-50">
            <div className="text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">ความเป็นจริง</div>
            <div className="text-3xl font-light text-black mb-2">{totalSoldUnits} จาน</div>
            <div className="text-xl font-light text-gray-600 mb-3">฿{totalSales.toLocaleString()}</div>
            <div className={`text-2xl font-light ${breakEvenProgress >= 100 ? 'text-black' : 'text-gray-500'}`}>
              {Math.round(breakEvenProgress)}%
            </div>
          </div>
        </div>
      </div>

      {/* Target Profit Comparison */}
      {businessPlan.targetProfit && (
        <div className="border border-gray-100 p-6">
          <div className="flex items-center gap-4 mb-4">
            <TrendingUp className="w-8 h-8 text-gray-700" />
            <h4 className="text-lg font-light text-black tracking-wide">เป้าหมายกำไร {businessPlan.targetProfit.value}%</h4>
          </div>
          <div className="grid grid-cols-3 gap-8">
            <div className="border border-gray-100 p-6 text-center bg-white">
              <div className="text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">เป้าหมาย</div>
              <div className="text-3xl font-light text-black mb-2">{businessPlan.targetProfit.unitsNeeded} จาน</div>
              <div className="text-xl font-light text-gray-600">฿{businessPlan.targetProfit.revenueNeeded.toLocaleString()}</div>
            </div>
            <div className="border border-gray-100 p-6 text-center bg-gray-50">
              <div className="text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">ความเป็นจริง</div>
              <div className="text-3xl font-light text-black mb-2">{totalSoldUnits} จาน</div>
              <div className="text-xl font-light text-gray-600">฿{totalSales.toLocaleString()}</div>
            </div>
            <div className="border border-gray-100 p-6 text-center bg-white">
              <div className="text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">ความคืบหน้า</div>
              <div className={`text-3xl font-light mb-2 ${targetProfitProgress >= 100 ? 'text-black' : 'text-gray-500'}`}>
                {Math.round(targetProfitProgress)}%
              </div>
              <div className="text-xl font-light text-gray-600">
                {targetProfitProgress >= 100 ? 'บรรลุเป้าหมาย!' : `เหลืออีก ${businessPlan.targetProfit.unitsNeeded - totalSoldUnits} จาน`}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ingredients Usage vs Plan */}
      <div className="border border-gray-100">
        <div className="p-6 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8" />
            <h4 className="text-lg font-light text-black tracking-wide">
              เป้าหมายการใช้วัตถุดิบ
            </h4>
          </div>
        </div>
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-xl">
            <thead className="bg-black text-white sticky top-0">
              <tr>
                <th className="text-left p-4 font-light">วัตถุดิบ</th>
                <th className="text-center p-4 font-light">
                  {businessPlan.targetProfit ?
                    `เป้าหมายกำไร (${businessPlan.targetProfit.value}%)` :
                    'เป้าหมายคุ้มทุน'
                  }
                </th>
                <th className="text-center p-4 font-light">ใช้จริง</th>
                <th className="text-center p-4 font-light">เหลือ</th>
                <th className="text-right p-4 font-light">%</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const targetUnits = businessPlan.targetProfit?.unitsNeeded || businessPlan.breakEven?.unitsNeeded || 0;
                const plannedIngredients = calculateIngredientsNeeded(targetUnits);

                if (plannedIngredients.length === 0) {
                  return (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-500 text-xl">
                        ไม่มีข้อมูลวัตถุดิบ
                      </td>
                    </tr>
                  );
                }

                return plannedIngredients.map((ingredient, index) => {
                  // Calculate usage based on actual sales vs planned units
                  const plannedQuantity = ingredient.quantity;
                  const usedQuantity = targetUnits > 0 ? Math.round((plannedQuantity * totalSoldUnits) / targetUnits) : 0;
                  const remainingQuantity = Math.max(0, plannedQuantity - usedQuantity);
                  const usagePercentage = plannedQuantity > 0 ? (usedQuantity / plannedQuantity) * 100 : 0;

                  return (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-100'}>
                      <td className="p-4 font-light text-black">{ingredient.name}</td>
                      <td className="p-4 text-center font-light text-gray-600">{ingredient.quantity} {ingredient.unit}</td>
                      <td className="p-4 text-center font-light text-black">
                        {usedQuantity} {ingredient.unit}
                      </td>
                      <td className="p-4 text-center font-light text-gray-600">
                        {remainingQuantity} {ingredient.unit}
                      </td>
                      <td className="p-4 text-right font-light">
                        <span className={usagePercentage >= 100 ? 'text-black' : usagePercentage >= 80 ? 'text-gray-600' : 'text-gray-500'}>
                          {Math.round(usagePercentage)}%
                        </span>
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="border border-gray-100 bg-black text-white p-8">
        <div className="flex items-center gap-4 mb-6">
          <DollarSign className="w-8 h-8 text-white" />
          <div className="text-lg font-light text-white tracking-wide">สรุปการเงิน</div>
        </div>
        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="text-lg font-light border-b border-gray-600 pb-3 text-white tracking-wide">แผนที่วางไว้</div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="font-light text-gray-300">เงินทุนคุ้มทุน:</span>
                <span className="font-light text-white">฿{businessPlan.totalCapital?.toLocaleString()}</span>
              </div>
              {businessPlan.targetProfit && (
                <div className="flex justify-between text-sm">
                  <span className="font-light text-gray-300">เงินทุนเป้าหมาย:</span>
                  <span className="font-light text-white">฿{businessPlan.targetProfit.totalCapitalWithProfit.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="font-light text-gray-300">ยอดขายคุ้มทุน:</span>
                <span className="font-light text-white">฿{businessPlan.breakEven?.revenueNeeded?.toLocaleString()}</span>
              </div>
              {businessPlan.targetProfit && (
                <div className="flex justify-between text-sm">
                  <span className="font-light text-gray-300">ยอดขายเป้าหมาย:</span>
                  <span className="font-light text-white">฿{businessPlan.targetProfit.revenueNeeded.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-4">
            <div className="text-lg font-light border-b border-gray-600 pb-3 text-white tracking-wide">ผลลัพธ์จริง</div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="font-light text-gray-300">ยอดขายปัจจุบัน:</span>
                <span className="font-light text-white">฿{totalSales.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-light text-gray-300">จานที่ขายได้:</span>
                <span className="font-light text-white">{totalSoldUnits} จาน</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-light text-gray-300">ความคืบหน้าคุ้มทุน:</span>
                <span className={`font-light ${breakEvenProgress >= 100 ? 'text-white' : 'text-gray-400'}`}>
                  {Math.round(breakEvenProgress)}%
                </span>
              </div>
              {businessPlan.targetProfit && (
                <div className="flex justify-between text-sm">
                  <span className="font-light text-gray-300">ความคืบหน้าเป้าหมาย:</span>
                  <span className={`font-light ${targetProfitProgress >= 100 ? 'text-white' : 'text-gray-400'}`}>
                    {Math.round(targetProfitProgress)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}