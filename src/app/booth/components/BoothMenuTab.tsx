import React, { useState, useEffect } from 'react';
import { ChefHat, Plus, DollarSign, Package, AlertTriangle, CheckCircle, UtensilsCrossed } from 'lucide-react';
// No UI imports needed
import { Booth, MenuWithStock } from '@/types';

interface BoothMenuTabProps {
  booth: Booth;
  onRefresh: () => void;
  onOpenMenuModal: () => void;
}

export function BoothMenuTab({ booth, onRefresh, onOpenMenuModal }: BoothMenuTabProps) {
  const [menuWithStock, setMenuWithStock] = useState<MenuWithStock[]>([]);
  const [loading, setLoading] = useState(false);
  const [ingredients, setIngredients] = useState<any[]>([]);

  const fetchMenuWithStock = async () => {
    try {
      setLoading(true);

      // Fetch menu with stock
      const menuResponse = await fetch(`/api/booths/${booth._id}/menu`);
      if (menuResponse.ok) {
        const menuData = await menuResponse.json();
        setMenuWithStock(menuData.booth.menuItems);
      }

      // Fetch ingredients with cost
      const ingredientResponse = await fetch('/api/ingredients');
      if (ingredientResponse.ok) {
        const ingredientData = await ingredientResponse.json();
        setIngredients(ingredientData.ingredients || []);
      }
    } catch (error) {
      console.error('Error fetching menu with stock:', error);
    } finally {
      setLoading(false);
    }
  };

  const adjustStock = async (ingredientId: string, adjustment: number, costPerUnit?: number) => {
    try {
      const response = await fetch(`/api/booths/${booth._id}/stock`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ingredientId,
          adjustment,
          costPerUnit
        }),
      });

      if (response.ok) {
        fetchMenuWithStock();
        onRefresh();
      } else {
        const error = await response.json();
        alert(error.message || 'เกิดข้อผิดพลาด');
      }
    } catch (error) {
      console.error('Error adjusting stock:', error);
      alert('เกิดข้อผิดพลาดในการปรับสต็อก');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sufficient': return 'text-green-600';
      case 'low': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      case 'out': return 'text-red-700';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sufficient': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'low': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'critical': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'out': return <AlertTriangle className="w-4 h-4 text-red-700" />;
      default: return <Package className="w-4 h-4 text-gray-600" />;
    }
  };

  useEffect(() => {
    if (booth._id) {
      fetchMenuWithStock();
    }
  }, [booth._id]);

  return (
    <div className="space-y-6">
      {/* Menu Items */}
      <div className="border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-4 h-4 text-gray-600" />
            <label className="text-lg font-light text-black tracking-wide">รายการเมนู ({booth.menuItems?.length || 0} รายการ)</label>
          </div>
          <button
            onClick={onOpenMenuModal}
            className="px-6 py-2 border border-gray-200 text-sm font-light text-black hover:bg-gray-50 transition-colors duration-200 tracking-wide flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            จัดการเมนู
          </button>
        </div>

        <div className="space-y-6">
          {loading ? (
            <div className="space-y-6">
              {[...Array(4)].map((_, index) => (
                <div key={index} className="space-y-4">
                  {/* Menu header skeleton */}
                  <div className="flex justify-between items-start">
                    <div className="space-y-2 flex-1">
                      <div className="h-5 bg-gray-200 rounded animate-pulse w-1/3"></div>
                      <div className="h-4 bg-gray-100 rounded animate-pulse w-1/4"></div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-16"></div>
                      <div className="h-4 bg-gray-100 rounded animate-pulse w-12"></div>
                    </div>
                  </div>

                  {/* Ingredients skeleton */}
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-1/4"></div>
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-8 bg-gray-100 rounded animate-pulse"></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : menuWithStock && menuWithStock.length > 0 ? (
            <div className="space-y-6">
              {menuWithStock.map((item: MenuWithStock, index: number) => (
                <div key={item._id || index} className="border-b border-gray-100 pb-6 last:border-b-0">
                  {/* Menu Header */}
                  <div className="flex-1">
                    <div className="font-light text-black tracking-wide text-lg mb-4">{item.name}</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-xs font-light text-gray-400 mb-1 tracking-wider uppercase">ราคาขาย</div>
                        <div className="font-light text-black">฿{item.price?.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-xs font-light text-gray-400 mb-1 tracking-wider uppercase">ต้นทุน</div>
                        <div className="font-light text-gray-700">
                          ฿{(() => {
                            const totalCost = item.ingredients?.reduce((cost: number, ing: any) => {
                              // หา ingredient จาก API /ingredients ด้วย ingredientId
                              const ingredient = ingredients.find(avail => avail._id === ing.ingredientId);
                              const costPerUnit = ingredient ? ingredient.costPerUnit : 0;
                              const quantity = ing.quantityNeeded || 0;
                              return cost + (costPerUnit * quantity);
                            }, 0) || 0;
                            return totalCost.toFixed(2);
                          })()}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-light text-gray-400 mb-1 tracking-wider uppercase">กำไร</div>
                        <div className="font-light text-black">
                          ฿{(() => {
                            const totalCost = item.ingredients?.reduce((cost: number, ing: any) => {
                              // หา ingredient จาก API /ingredients ด้วย ingredientId
                              const ingredient = ingredients.find(avail => avail._id === ing.ingredientId);
                              const costPerUnit = ingredient ? ingredient.costPerUnit : 0;
                              const quantity = ing.quantityNeeded || 0;
                              return cost + (costPerUnit * quantity);
                            }, 0) || 0;
                            const profit = (item.price || 0) - totalCost;
                            return profit.toFixed(2);
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <UtensilsCrossed className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <div className="text-lg font-light text-gray-800 mb-2">ยังไม่มีเมนูที่กำหนดไว้</div>
              <div className="text-sm font-light text-gray-500 mb-6">เริ่มต้นเพิ่มเมนูแรกของคุณ</div>
              <button
                onClick={onOpenMenuModal}
                className="px-6 py-2 border border-gray-200 text-sm font-light text-black hover:bg-gray-50 transition-colors duration-200 tracking-wide inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                เพิ่มเมนู
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}