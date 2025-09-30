'use client';

import React, { useState, useEffect } from 'react';
import { Package, BarChart3, Edit, History, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/Input';
import { Modal, ModalActionButton } from '@/components/ui';
import { TablePageLoading } from '@/components/ui';
import { Ingredient, StockMovement } from '@/types';

export default function InventoryPage() {
  const { user } = useAuth();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState({
    ingredients: false,
    stockMovements: false
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [view, setView] = useState<'list' | 'movements' | 'analysis'>('list');

  useEffect(() => {
    if (user && ingredients.length === 0 && !loading.ingredients) {
      // Load ingredients first
      fetchIngredients();
    }
  }, [user, ingredients.length, loading.ingredients]);

  useEffect(() => {
    if (user && ingredients.length > 0 && stockMovements.length === 0 && !loading.stockMovements) {
      // Load stock movements after ingredients are loaded
      setTimeout(() => {
        fetchStockMovements();
      }, 100);
    }
  }, [user, ingredients.length, stockMovements.length, loading.stockMovements]);

  const fetchIngredients = async () => {
    setLoading(prev => ({ ...prev, ingredients: true }));
    try {
      const response = await fetch('/api/ingredients');
      if (response.ok) {
        const data = await response.json();
        setIngredients(data.ingredients);
      }
    } catch (error) {
      console.error('Error fetching ingredients:', error);
    } finally {
      setLoading(prev => ({ ...prev, ingredients: false }));
    }
  };

  const fetchStockMovements = async () => {
    setLoading(prev => ({ ...prev, stockMovements: true }));
    try {
      const response = await fetch('/api/stock-movements');
      if (response.ok) {
        const data = await response.json();
        setStockMovements(data.movements);
      }
    } catch (error) {
      console.error('Error fetching stock movements:', error);
    } finally {
      setLoading(prev => ({ ...prev, stockMovements: false }));
    }
  };

  const filteredIngredients = ingredients
    .filter(ingredient =>
      ingredient.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      // เรียงตามมูลค่ารวม (stock * costPerUnit) จากมากไปน้อย
      const valueA = a.stock * a.costPerUnit;
      const valueB = b.stock * b.costPerUnit;
      return valueB - valueA;
    });

  // ABC Analysis calculation
  const getABCAnalysis = () => {
    const sortedByValue = ingredients
      .map(ingredient => {
        const totalValue = ingredient.stock * ingredient.costPerUnit;

        // Fix the filter condition - remove && m.createdAt that was causing issues
        const usageMovements = stockMovements.filter(m => {
          const ingredientId = typeof m.ingredientId === 'string' ? m.ingredientId : (m.ingredientId as any)?._id;
          return ingredientId === ingredient._id && m.type === 'use';
        });

        // Calculate monthly usage (last 30 days)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const monthlyUsage = usageMovements
          .filter(m => new Date(m.createdAt) > thirtyDaysAgo)
          .reduce((sum, m) => sum + Math.abs(m.quantity), 0);

        // If no recent usage, use all-time average monthly usage
        let adjustedMonthlyUsage = monthlyUsage;
        if (monthlyUsage === 0 && usageMovements.length > 0) {
          const totalUsage = usageMovements.reduce((sum, m) => sum + Math.abs(m.quantity), 0);
          const daysSinceFirstUsage = Math.max(1, Math.ceil(
            (Date.now() - new Date(usageMovements[usageMovements.length - 1].createdAt).getTime()) / (24 * 60 * 60 * 1000)
          ));
          adjustedMonthlyUsage = (totalUsage / daysSinceFirstUsage) * 30;
        }

        const annualUsageValue = adjustedMonthlyUsage * 12 * ingredient.costPerUnit;

        return {
          ...ingredient,
          totalValue,
          monthlyUsage: adjustedMonthlyUsage,
          annualUsageValue
        };
      })
      .sort((a, b) => b.annualUsageValue - a.annualUsageValue);

    const totalValue = sortedByValue.reduce((sum, item) => sum + item.annualUsageValue, 0);

    // Handle case when totalValue is 0
    if (totalValue === 0) {
      return sortedByValue.map(item => ({
        ...item,
        category: 'C' as 'A' | 'B' | 'C',
        cumulativePercentage: 0
      }));
    }

    let cumulativeValue = 0;
    return sortedByValue.map((item) => {
      cumulativeValue += item.annualUsageValue;
      const cumulativePercentage = (cumulativeValue / totalValue) * 100;

      let category: 'A' | 'B' | 'C';
      // ABC classification based on cumulative percentage
      if (cumulativePercentage <= 80) category = 'A';
      else if (cumulativePercentage <= 95) category = 'B';
      else category = 'C';

      return { ...item, category, cumulativePercentage };
    });
  };

  // Reorder Point calculation
  const getReorderPoint = (ingredient: Ingredient) => {
    const usageMovements = stockMovements.filter(m => {
      const ingredientId = typeof m.ingredientId === 'string' ? m.ingredientId : (m.ingredientId as any)?._id;
      return ingredientId === ingredient._id && m.type === 'use';
    });

    // If no usage history, estimate based on minimum stock
    if (usageMovements.length === 0) {
      return ingredient.minimumStock * 2; // Conservative estimate
    }

    // Calculate average daily usage (last 30 days)
    const last30Days = usageMovements.filter(
      m => new Date(m.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );

    let averageDailyUsage = 0;

    if (last30Days.length > 0) {
      const totalUsage = last30Days.reduce((sum, m) => sum + Math.abs(m.quantity), 0);
      averageDailyUsage = totalUsage / 30;
    } else {
      // If no recent usage, use all-time average but with caution
      const allTimeUsage = usageMovements.reduce((sum, m) => sum + Math.abs(m.quantity), 0);
      const daysSinceFirstUsage = Math.max(1, Math.ceil(
        (Date.now() - new Date(usageMovements[usageMovements.length - 1].createdAt).getTime()) / (24 * 60 * 60 * 1000)
      ));
      averageDailyUsage = allTimeUsage / daysSinceFirstUsage;
    }

    // Lead time (assume 3 days) + safety stock (7 days)
    const leadTime = 3;
    const safetyDays = 7;
    const calculatedReorderPoint = averageDailyUsage * (leadTime + safetyDays);

    // Ensure reorder point is meaningful and above minimum stock
    const reorderPoint = Math.max(
      calculatedReorderPoint,
      ingredient.minimumStock * 1.5 // At least 1.5x minimum stock
    );

    return reorderPoint;
  };

  const lowStockIngredients = ingredients.filter(ingredient =>
    ingredient.stock <= ingredient.minimumStock
  );

  // Calculate summary values
  const getSummaryData = () => {
    // 1. Total inventory value (current stock value)
    const totalInventoryValue = ingredients.reduce((sum, ingredient) => {
      return sum + (ingredient.stock * ingredient.costPerUnit);
    }, 0);

    // 2. Total usage value (all time)
    const totalUsageValue = stockMovements
      .filter(m => m.type === 'use')
      .reduce((sum, m) => {
        const ingredientId = typeof m.ingredientId === 'string' ? m.ingredientId : (m.ingredientId as any)?._id;
        const ingredient = ingredients.find(ing => ing._id === ingredientId);
        if (ingredient) {
          return sum + (Math.abs(m.quantity) * ingredient.costPerUnit);
        }
        return sum;
      }, 0);

    // 3. Total purchase value (all time)
    const totalPurchaseValue = stockMovements
      .filter(m => m.type === 'purchase')
      .reduce((sum, m) => {
        if (m.cost && m.quantity) {
          return sum + (Math.abs(m.quantity) * m.cost);
        }
        return sum;
      }, 0);

    return {
      totalInventoryValue,
      totalUsageValue,
      totalPurchaseValue
    };
  };

  // Show loading only if ingredients are loading and we have no ingredients yet
  if (loading.ingredients && ingredients.length === 0) {
    return <TablePageLoading title="คลังสินค้า" />;
  }

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header */}
      <div className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-thin text-black tracking-wider">วัตถุดิบ</h1>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 border border-gray-200 text-sm font-light text-black hover:bg-gray-50 transition-colors duration-200 tracking-wide"
            >
              เพิ่มวัตถุดิบ
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {/* Summary Cards */}
        {view === 'list' && (
          <div className="mb-6">
            <SummaryCards getSummaryData={getSummaryData} />
          </div>
        )}

        {/* Navigation and Search */}
        <div className="space-y-4 sm:space-y-0 sm:flex sm:items-center sm:justify-between mb-6">
          <div className="flex gap-6 sm:gap-8 border-b border-gray-100 pb-4 sm:pb-0 sm:border-b-0">
            <button
              onClick={() => setView('list')}
              className={`pb-3 text-sm font-light transition-colors ${
                view === 'list'
                  ? 'text-black border-b border-black'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                วัตถุดิบ
              </div>
            </button>
            <button
              onClick={() => setView('movements')}
              className={`pb-3 text-sm font-light transition-colors ${
                view === 'movements'
                  ? 'text-black border-b border-black'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <History className="w-4 h-4" />
                ประวัติ
              </div>
            </button>
            <button
              onClick={() => setView('analysis')}
              className={`pb-3 text-sm font-light transition-colors ${
                view === 'analysis'
                  ? 'text-black border-b border-black'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                การวิเคราะห์
              </div>
            </button>
          </div>
          <div className="w-full sm:max-w-md">
            <Input
              type="text"
              placeholder="ค้นหาวัตถุดิบ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black"
            />
          </div>
        </div>

        {/* Low Stock Alert */}
        {lowStockIngredients.length > 0 && view === 'list' && (
          <div className="border border-gray-200 p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-light text-gray-600">วัตถุดิบใกล้หมด ({lowStockIngredients.length} รายการ)</span>
            </div>
            <div className="space-y-2">
              {lowStockIngredients.map(ingredient => (
                <div key={ingredient._id} className="text-sm font-light text-gray-600">
                  {ingredient.name}: เหลือ {ingredient.stock} {ingredient.unit} (ขั้นต่ำ {ingredient.minimumStock})
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'list' ? (
          <div className="overflow-x-auto -mx-4 sm:-mx-6">
            <div className="min-w-max px-4 sm:px-6">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-2 text-xs font-light text-gray-400 tracking-wider uppercase min-w-[160px]">ชื่อวัตถุดิบ</th>
                    <th className="text-right py-3 px-2 text-xs font-light text-gray-400 tracking-wider uppercase min-w-[80px]">สต็อก</th>
                    <th className="text-right py-3 px-2 text-xs font-light text-gray-400 tracking-wider uppercase min-w-[100px]">ต้นทุน/หน่วย</th>
                    <th className="text-right py-3 px-2 text-xs font-light text-gray-400 tracking-wider uppercase min-w-[100px]">มูลค่ารวม</th>
                    <th className="text-right py-3 px-2 text-xs font-light text-gray-400 tracking-wider uppercase min-w-[80px]">ขั้นต่ำ</th>
                    <th className="text-right py-3 px-2 text-xs font-light text-gray-400 tracking-wider uppercase min-w-[100px]">จุดสั่งซื้อ</th>
                    <th className="text-center py-3 px-2 text-xs font-light text-gray-400 tracking-wider uppercase min-w-[80px]">จัดการ</th>
                  </tr>
                </thead>
              <tbody>
                {loading.ingredients && filteredIngredients.length === 0 ? (
                  // Skeleton for ingredients table
                  <>
                    {[1, 2, 3, 4, 5].map(i => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="py-4 px-2">
                          <div className="flex items-center gap-3 min-w-[140px]">
                            <div>
                              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-1"></div>
                              <div className="h-3 w-12 bg-gray-200 rounded animate-pulse"></div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-2 text-right">
                          <div className="h-4 w-16 bg-gray-200 rounded animate-pulse ml-auto"></div>
                        </td>
                        <td className="py-4 px-2 text-right">
                          <div className="h-4 w-20 bg-gray-200 rounded animate-pulse ml-auto"></div>
                        </td>
                        <td className="py-4 px-2 text-right">
                          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse ml-auto"></div>
                        </td>
                        <td className="py-4 px-2 text-right">
                          <div className="h-4 w-12 bg-gray-200 rounded animate-pulse ml-auto"></div>
                        </td>
                        <td className="py-4 px-2 text-right">
                          <div className="h-4 w-16 bg-gray-200 rounded animate-pulse ml-auto"></div>
                        </td>
                        <td className="py-4 px-2">
                          <div className="flex items-center justify-center gap-1">
                            <div className="w-7 h-7 bg-gray-200 rounded animate-pulse"></div>
                            <div className="w-7 h-7 bg-gray-200 rounded animate-pulse"></div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </>
                ) : (
                  filteredIngredients.map(ingredient => {
                    const totalValue = ingredient.stock * ingredient.costPerUnit;
                    const isLowStock = ingredient.stock <= ingredient.minimumStock;

                    return (
                      <tr key={ingredient._id} className="border-b border-gray-50 hover:bg-gray-25 transition-colors">
                        <td className="py-4 px-2">
                          <div className="flex items-center gap-3 min-w-[140px]">
                            <div>
                              <div className="font-light text-black tracking-wide text-sm whitespace-nowrap">{ingredient.name}</div>
                              <div className="text-xs font-light text-gray-400">{ingredient.unit}</div>
                            </div>
                            {isLowStock && (
                              <div className="w-2 h-2 bg-orange-400 rounded-full flex-shrink-0" title="สต็อกใกล้หมด"></div>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-2 text-right">
                          <div className={`font-light text-sm whitespace-nowrap ${isLowStock ? 'text-orange-600' : 'text-black'}`}>
                            {Number(ingredient.stock).toFixed(2)}
                          </div>
                        </td>
                        <td className="py-4 px-2 text-right">
                          <div className="font-light text-gray-600 text-sm whitespace-nowrap">
                            ฿{ingredient.costPerUnit.toLocaleString()}
                          </div>
                        </td>
                        <td className="py-4 px-2 text-right">
                          <div className="font-light text-black text-sm whitespace-nowrap">
                            ฿{totalValue.toLocaleString()}
                          </div>
                        </td>
                        <td className="py-4 px-2 text-right">
                          <div className="font-light text-gray-400 text-sm whitespace-nowrap">
                            {ingredient.minimumStock}
                          </div>
                        </td>
                        <td className="py-4 px-2 text-right">
                          <div className="font-light text-blue-600 text-sm whitespace-nowrap">
                            {loading.stockMovements ? '...' : getReorderPoint(ingredient).toFixed(2)}
                          </div>
                        </td>
                        <td className="py-4 px-2">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => { setSelectedIngredient(ingredient); setShowStockModal(true); }}
                              className="p-1.5 text-gray-500 hover:text-gray-600 transition-colors duration-200"
                              title="จัดการสต็อก"
                            >
                              <Package className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => { setSelectedIngredient(ingredient); setShowEditModal(true); }}
                              className="p-1.5 text-gray-500 hover:text-gray-600 transition-colors duration-200"
                              title="แก้ไข"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            </div>
          </div>
        ) : view === 'movements' ? (
          loading.stockMovements && stockMovements.length === 0 ? (
            <StockMovementsLoadingSkeleton />
          ) : (
            <StockMovementsView stockMovements={stockMovements} ingredients={ingredients} />
          )
        ) : (
          loading.stockMovements && stockMovements.length === 0 ? (
            <ABCAnalysisLoadingSkeleton />
          ) : (
            <ABCAnalysisView ingredients={ingredients} stockMovements={stockMovements} getABCAnalysis={getABCAnalysis} />
          )
        )}
      </div>

      {/* Add Ingredient Modal */}
      {showAddModal && (
        <AddIngredientModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            fetchIngredients();
            setShowAddModal(false);
          }}
        />
      )}

      {/* Edit Ingredient Modal */}
      {showEditModal && selectedIngredient && (
        <EditIngredientModal
          ingredient={selectedIngredient}
          onClose={() => {
            setShowEditModal(false);
            setSelectedIngredient(null);
          }}
          onSuccess={() => {
            fetchIngredients();
            setShowEditModal(false);
            setSelectedIngredient(null);
          }}
        />
      )}

      {/* Stock Management Modal */}
      {showStockModal && selectedIngredient && (
        <StockManagementModal
          ingredient={selectedIngredient}
          onClose={() => {
            setShowStockModal(false);
            setSelectedIngredient(null);
          }}
          onSuccess={() => {
            fetchIngredients();
            fetchStockMovements();
            setShowStockModal(false);
            setSelectedIngredient(null);
          }}
        />
      )}
    </div>
  );
}

// Loading Skeleton Components
function StockMovementsLoadingSkeleton() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-3 text-xs font-light text-gray-400 tracking-wider uppercase">วัน/เวลา</th>
            <th className="text-left py-3 text-xs font-light text-gray-400 tracking-wider uppercase">ประเภท/เหตุผล</th>
            <th className="text-left py-3 text-xs font-light text-gray-400 tracking-wider uppercase">วัตถุดิบที่เกี่ยวข้อง</th>
            <th className="text-right py-3 text-xs font-light text-gray-400 tracking-wider uppercase">ต้นทุนรวม</th>
          </tr>
        </thead>
        <tbody>
          {[1, 2, 3, 4, 5].map(i => (
            <tr key={i} className="border-b border-gray-50">
              <td className="py-4">
                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
              </td>
              <td className="py-4">
                <div className="h-4 w-16 bg-gray-200 rounded animate-pulse mb-1"></div>
                <div className="h-3 w-24 bg-gray-200 rounded animate-pulse"></div>
              </td>
              <td className="py-4">
                <div className="space-y-1">
                  <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 w-28 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </td>
              <td className="py-4 text-right">
                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse ml-auto"></div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ABCAnalysisLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Summary Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="border-b border-gray-100 pb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="h-5 w-16 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-6 w-8 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="h-8 w-20 bg-gray-200 rounded animate-pulse mb-1"></div>
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
          </div>
        ))}
      </div>

      {/* Table Skeleton */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left py-3 px-4 text-xs font-light text-gray-400 tracking-wider uppercase">วัตถุดิบ</th>
              <th className="text-right py-3 px-4 text-xs font-light text-gray-400 tracking-wider uppercase">การใช้/เดือน</th>
              <th className="text-right py-3 px-4 text-xs font-light text-gray-400 tracking-wider uppercase">มูลค่าใช้/ปี</th>
              <th className="text-right py-3 px-4 text-xs font-light text-gray-400 tracking-wider uppercase">สะสม %</th>
              <th className="text-center py-3 px-4 text-xs font-light text-gray-400 tracking-wider uppercase">กลุ่ม</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map(i => (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-3 px-4">
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-1"></div>
                  <div className="h-3 w-12 bg-gray-200 rounded animate-pulse"></div>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="h-4 w-20 bg-gray-200 rounded animate-pulse ml-auto"></div>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse ml-auto"></div>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="h-4 w-16 bg-gray-200 rounded animate-pulse ml-auto"></div>
                </td>
                <td className="py-3 px-4 text-center">
                  <div className="h-6 w-8 bg-gray-200 rounded animate-pulse mx-auto"></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Add Ingredient Modal Component
function AddIngredientModal({ onClose, onSuccess }: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    unit: '',
    costPerUnit: '',
    stock: '',
    minimumStock: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          costPerUnit: parseFloat(formData.costPerUnit),
          stock: parseFloat(formData.stock),
          minimumStock: parseFloat(formData.minimumStock)
        })
      });

      if (response.ok) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error adding ingredient:', error);
    } finally {
      setLoading(false);
    }
  };

  const actions: ModalActionButton[] = [
    {
      label: 'ยกเลิก',
      onClick: onClose,
      variant: 'secondary',
      disabled: loading
    },
    {
      label: loading ? 'กำลังบันทึก...' : 'บันทึก',
      onClick: () => {
        const form = document.querySelector('form');
        if (form) {
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }
      },
      variant: 'primary',
      disabled: loading || !formData.name || !formData.unit || !formData.costPerUnit || !formData.stock || !formData.minimumStock,
      loading: loading
    }
  ];

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="เพิ่มวัตถุดิบใหม่"
      size="md"
      actions={actions}
    >
      <div className="p-8 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">
              ชื่อวัตถุดิบ
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">
              หน่วย
            </label>
            <Input
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              placeholder="กก., ลิตร, ชิ้น"
              className="border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">
              ต้นทุนต่อหน่วย (บาท)
            </label>
            <Input
              type="number"
              step="0.01"
              value={formData.costPerUnit}
              onChange={(e) => setFormData({ ...formData, costPerUnit: e.target.value })}
              className="border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">
              จำนวนในสต็อก
            </label>
            <Input
              type="number"
              step="0.01"
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
              className="border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">
              สต็อกขั้นต่ำ
            </label>
            <Input
              type="number"
              step="0.01"
              value={formData.minimumStock}
              onChange={(e) => setFormData({ ...formData, minimumStock: e.target.value })}
              className="border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black"
              required
            />
          </div>
        </form>
      </div>
    </Modal>
  );
}

// Edit Ingredient Modal Component
function EditIngredientModal({ ingredient, onClose, onSuccess }: {
  ingredient: Ingredient;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: ingredient.name,
    unit: ingredient.unit,
    costPerUnit: ingredient.costPerUnit.toString(),
    minimumStock: ingredient.minimumStock.toString()
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/ingredients/${ingredient._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          costPerUnit: parseFloat(formData.costPerUnit),
          minimumStock: parseFloat(formData.minimumStock)
        })
      });

      if (response.ok) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error updating ingredient:', error);
    } finally {
      setLoading(false);
    }
  };

  const actions: ModalActionButton[] = [
    {
      label: 'ยกเลิก',
      onClick: onClose,
      variant: 'secondary',
      disabled: loading
    },
    {
      label: loading ? 'กำลังบันทึก...' : 'บันทึก',
      onClick: () => {
        const form = document.querySelector('form');
        if (form) {
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }
      },
      variant: 'primary',
      disabled: loading || !formData.name || !formData.unit || !formData.costPerUnit || !formData.minimumStock,
      loading: loading
    }
  ];

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="แก้ไขวัตถุดิบ"
      size="md"
      actions={actions}
    >
      <div className="p-8 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">
              ชื่อวัตถุดิบ
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">
              หน่วย
            </label>
            <Input
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              placeholder="กก., ลิตร, ชิ้น"
              className="border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">
              ต้นทุนต่อหน่วย (บาท)
            </label>
            <Input
              type="number"
              step="0.01"
              value={formData.costPerUnit}
              onChange={(e) => setFormData({ ...formData, costPerUnit: e.target.value })}
              className="border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">
              สต็อกขั้นต่ำ
            </label>
            <Input
              type="number"
              step="0.01"
              value={formData.minimumStock}
              onChange={(e) => setFormData({ ...formData, minimumStock: e.target.value })}
              className="border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black"
              required
            />
          </div>

          <div className="border-t border-gray-100 pt-6">
            <div className="text-sm font-light text-gray-600">
              <div>สต็อกปัจจุบัน: {ingredient.stock} {ingredient.unit}</div>
              <div className="text-xs font-light text-gray-400 mt-1">
                หมายเหตุ: การแก้ไขจะไม่เปลี่ยนแปลงจำนวนสต็อกปัจจุบัน
              </div>
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
}

// Stock Movements View Component
function StockMovementsView({ stockMovements, ingredients }: {
  stockMovements: StockMovement[];
  ingredients: Ingredient[];
}) {
  // จัดกลุ่ม movements ตาม saleId และ timestamp ใกล้เคียงกัน
  const groupedMovements = React.useMemo(() => {
    const groups: { [key: string]: StockMovement[] } = {};

    stockMovements.forEach(movement => {
      let groupKey = '';

      if (movement.saleId) {
        // จัดกลุ่มตาม saleId
        groupKey = `sale_${movement.saleId}`;
      } else {
        // สำหรับ movement ที่ไม่มี saleId ให้ใช้ timestamp และ type
        const date = new Date(movement.createdAt).toISOString().split('T')[0];
        const hour = new Date(movement.createdAt).getHours();
        groupKey = `${movement.type}_${date}_${hour}_${movement.reason || 'no_reason'}`;
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(movement);
    });

    // เรียงลำดับกลุ่มตามเวลาล่าสุด
    return Object.entries(groups)
      .map(([key, movements]) => ({
        key,
        movements: movements.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        latestTime: movements.reduce((latest, m) =>
          new Date(m.createdAt) > new Date(latest) ? m.createdAt : latest, movements[0].createdAt
        )
      }))
      .sort((a, b) => new Date(b.latestTime).getTime() - new Date(a.latestTime).getTime());
  }, [stockMovements]);

  const getIngredientName = (ingredientId: string | any, originalName?: string) => {
    const id = typeof ingredientId === 'string' ? ingredientId : ingredientId?._id || ingredientId;
    const ingredient = ingredients.find(ing => ing._id === id);
    return ingredient?.name || originalName || `วัตถุดิบที่ถูกลบ (ID: ${String(id).slice(-8)})`;
  };

  const getIngredientUnit = (ingredientId: string | any) => {
    const id = typeof ingredientId === 'string' ? ingredientId : ingredientId?._id || ingredientId;
    const ingredient = ingredients.find(ing => ing._id === id);
    return ingredient?.unit || '';
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-3 text-xs font-light text-gray-400 tracking-wider uppercase">วัน/เวลา</th>
            <th className="text-left py-3 text-xs font-light text-gray-400 tracking-wider uppercase">ประเภท/เหตุผล</th>
            <th className="text-left py-3 text-xs font-light text-gray-400 tracking-wider uppercase">วัตถุดิบที่เกี่ยวข้อง</th>
            <th className="text-right py-3 text-xs font-light text-gray-400 tracking-wider uppercase">ต้นทุนรวม</th>
          </tr>
        </thead>
        <tbody>
          {groupedMovements.map(({ key, movements }) => {
            const firstMovement = movements[0];
            const totalCost = movements.reduce((sum, m) => {
              if (m.quantity) {
                if (m.cost) {
                  // Has cost data, use it directly
                  const calculatedCost = Math.abs(m.quantity) * m.cost;
                  return sum + calculatedCost;
                } else {
                  // No cost data (like use/waste), calculate from ingredient costPerUnit
                  const ingredientId = typeof m.ingredientId === 'string' ? m.ingredientId : (m.ingredientId as any)?._id;
                  const ingredient = ingredients.find(ing => ing._id === ingredientId);
                  if (ingredient) {
                    const calculatedCost = Math.abs(m.quantity) * ingredient.costPerUnit;
                    return sum + calculatedCost;
                  }
                }
              }
              return sum;
            }, 0);

            return (
              <tr key={key} className="border-b border-gray-50 hover:bg-gray-25 transition-colors">
                <td className="py-4">
                  <div className="text-sm font-light text-gray-600">
                    {new Date(firstMovement.createdAt).toLocaleDateString('th-TH', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </td>
                <td className="py-4">
                  <div>
                    <div className="font-light text-black tracking-wide">
                      {firstMovement.type === 'purchase' && 'ซื้อเข้า'}
                      {firstMovement.type === 'use' && (firstMovement.saleId ? 'ขายเมนู' : 'ใช้ไป')}
                      {firstMovement.type === 'waste' && 'สูญเสีย'}
                    </div>
                    {firstMovement.reason && !firstMovement.saleId && (
                      <div className="text-xs font-light text-gray-500 mt-1">
                        {firstMovement.reason}
                      </div>
                    )}
                    {firstMovement.saleId && (
                      <div className="text-xs font-light text-gray-400 mt-1">
                        {(() => {
                          // Collect unique menu items with quantities from reasons
                          const menuItems = [...new Set(movements.map(m => m.reason?.replace('ขาย ', '')).filter(Boolean))];
                          return menuItems.join(', ');
                        })()}
                      </div>
                    )}
                  </div>
                </td>
                <td className="py-4">
                  <div className="space-y-1">
                    {movements.map((movement, idx) => (
                      <div key={idx} className="text-sm font-light text-gray-600">
                        {getIngredientName(movement.ingredientId, movement.ingredientName)}: {Math.abs(movement.quantity).toFixed(2)} {getIngredientUnit(movement.ingredientId) || movement.unit}
                      </div>
                    ))}
                  </div>
                </td>
                <td className="py-4 text-right">
                  {totalCost > 0 ? (
                    <div className="font-light text-black">
                      ฿{totalCost.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  ) : (
                    <div className="font-light text-gray-400">
                      -
                    </div>
                  )}
                  {firstMovement.saleId && firstMovement.saleQuantity && firstMovement.saleAmount && (
                    <div className="text-xs font-light text-gray-400 mt-1">
                      ขาย {firstMovement.saleQuantity} จาน - ฿{firstMovement.saleAmount.toLocaleString()}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Summary Cards Component
function SummaryCards({ getSummaryData }: {
  getSummaryData: () => { totalInventoryValue: number; totalUsageValue: number; totalPurchaseValue: number; };
}) {
  const { totalInventoryValue, totalUsageValue, totalPurchaseValue } = getSummaryData();

  const cards = [
    {
      title: 'มูลค่ารวมทั้งหมด',
      value: totalInventoryValue,
      subtitle: 'วัตถุดิบที่เรามี'
    },
    {
      title: 'มูลค่าที่ใช้ไป',
      value: totalUsageValue,
      subtitle: 'ทั้งหมด'
    },
    {
      title: 'มูลค่าที่ซื้อเข้า',
      value: totalPurchaseValue,
      subtitle: 'ทั้งหมด'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {cards.map((card, index) => (
        <div key={index} className="border-b border-gray-100 pb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-light text-gray-400 tracking-wider uppercase">
              {card.title}
            </div>
            <div className="text-xs font-light text-gray-400">
              {card.subtitle}
            </div>
          </div>
          <div className="text-3xl font-light text-black tracking-wider">
            ฿{card.value.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ABC Analysis View Component
function ABCAnalysisView({ getABCAnalysis }: {
  ingredients: Ingredient[];
  stockMovements: StockMovement[];
  getABCAnalysis: () => any[];
}) {
  const abcData = getABCAnalysis();

  const getCategoryColor = (category: 'A' | 'B' | 'C') => {
    switch (category) {
      case 'A': return 'text-black bg-gray-100';
      case 'B': return 'text-gray-700 bg-gray-50';
      case 'C': return 'text-gray-500 bg-gray-25';
    }
  };

  const getCategoryBadge = (category: 'A' | 'B' | 'C') => {
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${getCategoryColor(category)}`}>
        {category}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {['A', 'B', 'C'].map(category => {
          const items = abcData.filter(item => item.category === category);
          const totalValue = items.reduce((sum, item) => sum + item.annualUsageValue, 0);
          const percentage = abcData.length > 0 ? (items.length / abcData.length * 100) : 0;

          return (
            <div key={category} className="border-b border-gray-100 pb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-lg font-light text-black">กลุ่ม {category}</div>
                {getCategoryBadge(category as 'A' | 'B' | 'C')}
              </div>
              <div className="text-2xl font-light text-black mb-1">
                {items.length} รายการ
              </div>
              <div className="text-sm font-light text-gray-600">
                {percentage.toFixed(1)}% ของวัตถุดิบทั้งหมด
              </div>
              <div className="text-xs font-light text-gray-400 mt-2">
                มูลค่าใช้ต่อปี: ฿{totalValue.toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>

      {/* ABC Analysis Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left py-3 px-4 text-xs font-light text-gray-400 tracking-wider uppercase">วัตถุดิบ</th>
              <th className="text-right py-3 px-4 text-xs font-light text-gray-400 tracking-wider uppercase">การใช้/เดือน</th>
              <th className="text-right py-3 px-4 text-xs font-light text-gray-400 tracking-wider uppercase">มูลค่าใช้/ปี</th>
              <th className="text-right py-3 px-4 text-xs font-light text-gray-400 tracking-wider uppercase">สะสม %</th>
              <th className="text-center py-3 px-4 text-xs font-light text-gray-400 tracking-wider uppercase">กลุ่ม</th>
            </tr>
          </thead>
          <tbody>
            {abcData.map((item) => (
              <tr key={item._id} className="border-b border-gray-100 hover:bg-gray-25">
                <td className="py-3 px-4">
                  <div className="font-light text-black">{item.name}</div>
                  <div className="text-xs font-light text-gray-400">{item.unit}</div>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="font-light text-gray-600">
                    {item.monthlyUsage.toFixed(2)} {item.unit}
                  </div>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="font-light text-black">
                    ฿{item.annualUsageValue.toLocaleString()}
                  </div>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="font-light text-gray-600">
                    {item.cumulativePercentage.toFixed(1)}%
                  </div>
                </td>
                <td className="py-3 px-4 text-center">
                  {getCategoryBadge(item.category)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Insights */}
      <div className="border-t border-gray-100 pt-6">
        <h3 className="text-sm font-light text-gray-400 mb-4 tracking-wider uppercase">ข้อเสนอแนะ</h3>
        <div className="text-sm font-light text-gray-600 space-y-3">
          <div>กลุ่ม A: วัตถุดิบสำคัญที่ต้องควบคุมอย่างใกล้ชิด ตรวจสอบสต็อกทุกวัน</div>
          <div>กลุ่ม B: วัตถุดิบปานกลาง ตรวจสอบสต็อกสัปดาห์ละครั้ง</div>
          <div>กลุ่ม C: วัตถุดิบทั่วไป สามารถสต็อกได้มากขึ้นเพื่อประหยัดต้นทุนการสั่งซื้อ</div>
        </div>
      </div>
    </div>
  );
}

// Stock Management Modal Component
function StockManagementModal({ ingredient, onClose, onSuccess }: {
  ingredient: Ingredient;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    type: 'purchase' as 'purchase' | 'use' | 'waste',
    quantity: '',
    cost: ingredient.costPerUnit.toString(),
    reason: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/stock-movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredientId: ingredient._id,
          ...formData,
          quantity: parseFloat(formData.quantity),
          cost: formData.cost ? parseFloat(formData.cost) : undefined
        })
      });

      if (response.ok) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error recording stock movement:', error);
    } finally {
      setLoading(false);
    }
  };

  const actions: ModalActionButton[] = [
    {
      label: 'ยกเลิก',
      onClick: onClose,
      variant: 'secondary',
      disabled: loading
    },
    {
      label: loading ? 'กำลังบันทึก...' : 'บันทึก',
      onClick: () => {
        const form = document.querySelector('form');
        if (form) {
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }
      },
      variant: 'primary',
      disabled: loading || !formData.quantity,
      loading: loading
    }
  ];

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`จัดการสต็อก: ${ingredient.name}`}
      size="md"
      actions={actions}
    >
      <div className="p-8 space-y-6">
        <div className="border-b border-gray-100 pb-4">
          <div className="text-sm font-light text-gray-600">
            สต็อกปัจจุบัน: {ingredient.stock} {ingredient.unit}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">
              ประเภท
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              className="w-full border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black focus:outline-none"
            >
              <option value="purchase">ซื้อเข้า</option>
              <option value="use">ใช้ไป</option>
              <option value="waste">สูญเสีย</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">
              จำนวน
            </label>
            <Input
              type="number"
              step="0.01"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              className="border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black"
              required
            />
          </div>

          {formData.type === 'purchase' && (
            <>
              <div>
                <label className="block text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">
                  ต้นทุน (บาท)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                  className="border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black"
                />
              </div>

              {formData.quantity && formData.cost && (
                <div className="bg-gray-50 p-4 rounded">
                  <div className="text-xs font-light text-gray-400 mb-1 tracking-wider uppercase">
                    ต้นทุนรวม
                  </div>
                  <div className="text-lg font-light text-black">
                    ฿{(parseFloat(formData.quantity) * parseFloat(formData.cost)).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              )}
            </>
          )}

          <div>
            <label className="block text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">
              เหตุผล
            </label>
            <Input
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="เหตุผลของการเคลื่อนไหวสต็อก"
              className="border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black"
            />
          </div>
        </form>
      </div>
    </Modal>
  );
}