import React, { useState, useEffect } from 'react';
import { ChefHat, Plus, DollarSign, Package, AlertTriangle, CheckCircle, UtensilsCrossed } from 'lucide-react';
import { Button, Input } from '@/components/ui';
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
    <div className="space-y-4">
      {/* Header Section */}
      <div className="p-2">
        <div className="flex items-center justify-end">
          <Button
            variant="primary"
            size="md"
            onClick={onOpenMenuModal}
          >
            <Plus className="w-5 h-5" />
            จัดการเมนู
          </Button>
        </div>
      </div>

      {/* Menu Items */}
      <div className="border border-gray-200 rounded-lg bg-white">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <UtensilsCrossed className="w-5 h-5 text-gray-500" />
            <div className="text-lg font-light text-gray-800 tracking-wide">รายการเมนู ({booth.menuItems?.length || 0} รายการ)</div>
          </div>
        </div>

        <div className="">
          {loading ? (
            <div className="space-y-0">
              {[...Array(4)].map((_, index) => (
                <div key={index} className={`p-4 border-b border-gray-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} space-y-4`}>
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
            <div className="space-y-0">
              {menuWithStock.map((item: MenuWithStock, index: number) => (
                <div key={item._id || index} className={`p-4 border-b border-gray-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  {/* Menu Header */}
                  <div className="flex justify-end items-end ">
                    <div className="flex-1">
                      <div className="text-lg font-light text-gray-800 mb-3">{item.name}</div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-gray-600" />
                          <span className="font-light text-gray-600">ราคาขาย:</span>
                          <span className="font-light text-gray-800">฿{item.price?.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-gray-600" />
                          <span className="font-light text-gray-600">ต้นทุน:</span>
                          <span className="font-light text-gray-700">
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
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-gray-600" />
                          <span className="font-light text-gray-600">กำไร:</span>
                          <span className="font-light text-gray-700">
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
                          </span>
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
              <Button
                variant="primary"
                onClick={onOpenMenuModal}
                className="flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                เพิ่มเมนู
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}