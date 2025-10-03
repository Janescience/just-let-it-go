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
  const [categories, setCategories] = useState<any[]>([]);

  const fetchMenuWithStock = async () => {
    try {
      setLoading(true);

      // Fetch menu with stock
      const menuResponse = await fetch(`/api/booths/${booth._id}/menu`);
      if (menuResponse.ok) {
        const menuData = await menuResponse.json();
        setMenuWithStock(menuData.booth.menuItems);
      }


      // Fetch categories
      const categoryResponse = await fetch('/api/categories');
      if (categoryResponse.ok) {
        const categoryData = await categoryResponse.json();
        setCategories(categoryData.categories || []);
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
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-center text-xs font-light text-gray-400 tracking-wider uppercase p-3 w-16">ลำดับ</th>
                    <th className="text-left text-xs font-light text-gray-400 tracking-wider uppercase p-3">เมนู</th>
                    <th className="text-left text-xs font-light text-gray-400 tracking-wider uppercase p-3 w-32">หมวดหมู่</th>
                    <th className="text-center text-xs font-light text-gray-400 tracking-wider uppercase p-3 w-32">ราคาขาย</th>
                    <th className="text-center text-xs font-light text-gray-400 tracking-wider uppercase p-3 w-32">ต้นทุน</th>
                    <th className="text-center text-xs font-light text-gray-400 tracking-wider uppercase p-3 w-32">กำไร</th>
                  </tr>
                </thead>
                <tbody>
                  {[...Array(5)].map((_, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="p-3 text-center w-16">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-8 mx-auto"></div>
                      </td>
                      <td className="p-3">
                        <div className="space-y-2">
                          <div className="h-5 bg-gray-200 rounded animate-pulse w-3/4"></div>
                          <div className="h-4 bg-gray-100 rounded animate-pulse w-full"></div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : menuWithStock && menuWithStock.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-center text-xs font-light text-gray-400 tracking-wider uppercase p-3 w-16">ลำดับ</th>
                    <th className="text-left text-xs font-light text-gray-400 tracking-wider uppercase p-3">เมนู</th>
                    <th className="text-left text-xs font-light text-gray-400 tracking-wider uppercase p-3 w-32">หมวดหมู่</th>
                    <th className="text-center text-xs font-light text-gray-400 tracking-wider uppercase p-3 w-32">ราคาขาย</th>
                    <th className="text-center text-xs font-light text-gray-400 tracking-wider uppercase p-3 w-32">ต้นทุน</th>
                    <th className="text-center text-xs font-light text-gray-400 tracking-wider uppercase p-3 w-32">กำไร</th>
                  </tr>
                </thead>
                <tbody>
                  {menuWithStock.map((item: any, index: number) => {
                    const category = categories.find(cat => cat._id === item.categoryId);

                    return (
                      <tr key={item._id || index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-3 text-center w-16">
                          <div className="font-light text-gray-500">#{index + 1}</div>
                        </td>
                        <td className="p-3">
                          <div>
                            <div className="font-light text-black tracking-wide text-base mb-1">{item.name}</div>
                            {item.description && (
                              <div className="font-light text-gray-500 text-sm">{item.description}</div>
                            )}
                          </div>
                        </td>
                        <td className="p-3 w-32">
                          <div className="font-light text-gray-600">
                            {category ? category.name : 'ไม่มีหมวดหมู่'}
                          </div>
                        </td>
                        <td className="p-3 text-center w-32">
                          <div className="font-light text-black">฿{item.price?.toLocaleString()}</div>
                        </td>
                        <td className="p-3 text-center w-32">
                          <div className="font-light text-gray-700">฿{item.totalCost?.toFixed(2) || '0.00'}</div>
                        </td>
                        <td className="p-3 text-center w-32">
                          <div className={`font-light ${(item.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ฿{item.profit?.toFixed(2) || '0.00'}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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