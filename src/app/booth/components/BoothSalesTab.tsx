import React, { useState, useEffect } from 'react';
import { TrendingUp, Calendar, Package, BarChart3, Edit, X, Check, Trash2 } from 'lucide-react';
import { Booth } from '@/types';

interface BoothSalesTabProps {
  booth: Booth;
  preloadedStats?: any;
  preloadedSales?: any;
}

export function BoothSalesTab({ booth, preloadedStats, preloadedSales }: BoothSalesTabProps) {
  const [statsData, setStatsData] = useState<any>(null);
  const [dailySalesData, setDailySalesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ingredientViewMode, setIngredientViewMode] = useState<'total' | 'daily'>('total');
  const [menuViewMode, setMenuViewMode] = useState<'total' | 'daily'>('total');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editingSales, setEditingSales] = useState<any[]>([]);
  const [showSalesDetail, setShowSalesDetail] = useState<string | null>(null);

  // Get date range for this booth
  const getBoothDateRange = () => {
    const startDate = new Date(booth.startDate);
    const endDate = new Date(booth.endDate);
    const currentDate = new Date();
    const effectiveEndDate = currentDate < endDate ? currentDate : endDate;

    return {
      min: startDate.toISOString().split('T')[0],
      max: effectiveEndDate.toISOString().split('T')[0]
    };
  };

  // Initialize selected date to latest available date
  useEffect(() => {
    if (!selectedDate) {
      const { max } = getBoothDateRange();
      setSelectedDate(max);
    }
  }, []);

  // Calculate daily ingredient usage for a specific date
  const calculateDailyIngredientUsage = (date: string) => {
    const dayData = dailySalesData.find(d => d.date === date);
    if (!dayData || !booth.businessPlan?.ingredients || !dayData.sales) {
      console.log('❌ Daily ingredient calculation failed - missing data:', {
        dayData: !!dayData,
        ingredients: !!booth.businessPlan?.ingredients,
        sales: !!dayData?.sales,
        date
      });
      return [];
    }

    // Calculate actual total quantity sold that day from sales data
    const unitsSoldThatDay = dayData.sales.reduce((total: number, sale: any) => {
      return total + sale.items.reduce((saleTotal: number, item: any) => {
        return saleTotal + item.quantity;
      }, 0);
    }, 0);

    console.log('🔍 Daily ingredient calculation:', {
      date,
      unitsSoldThatDay,
      salesCount: dayData.sales.length,
      ordersFromData: dayData.orders
    });

    const breakEvenUnits = booth.businessPlan?.breakEven?.unitsNeeded || 1;

    return booth.businessPlan.ingredients.map((ingredient: any) => ({
      ...ingredient,
      usedQuantity: (ingredient.quantity * unitsSoldThatDay) / breakEvenUnits,
      usedValue: (ingredient.cost * unitsSoldThatDay) / breakEvenUnits
    }));
  };

  // Calculate daily menu stats for a specific date
  const calculateDailyMenuStats = (date: string) => {
    const dayData = dailySalesData.find(d => d.date === date);

    if (!dayData || !dayData.sales || dayData.sales.length === 0) {
      return [];
    }

    // Group sales by menu item for this specific day
    const menuMap = new Map();

    dayData.sales.forEach((sale: any) => {
      sale.items.forEach((item: any) => {
        const menuItemId = item.menuItemId._id || item.menuItemId;
        const menuName = item.menuItemId.name || 'Unknown Menu';
        const key = menuItemId;

        if (menuMap.has(key)) {
          const existing = menuMap.get(key);
          existing.quantity += item.quantity;
          existing.revenue += item.price * item.quantity;
        } else {
          menuMap.set(key, {
            name: menuName,
            quantity: item.quantity,
            revenue: item.price * item.quantity
          });
        }
      });
    });

    return Array.from(menuMap.values());
  };

  // Get daily menu stats for selected date
  const dailyMenuStats = calculateDailyMenuStats(selectedDate);

  // Calculate total ingredient usage from actual sales data
  const calculateTotalIngredientUsage = () => {
    if (!dailySalesData || !booth.businessPlan?.ingredients) {
      return [];
    }

    // Calculate total sold units from all daily sales data (actual usage)
    const totalSoldUnits = dailySalesData.reduce((grandTotal: number, dayData: any) => {
      if (!dayData.sales) return grandTotal;

      const dayTotal = dayData.sales.reduce((daySum: number, sale: any) => {
        return daySum + sale.items.reduce((saleSum: number, item: any) => {
          return saleSum + item.quantity;
        }, 0);
      }, 0);

      return grandTotal + dayTotal;
    }, 0);

    const breakEvenUnits = booth.businessPlan?.breakEven?.unitsNeeded || 1;

    return booth.businessPlan.ingredients.map((ingredient: any) => ({
      ...ingredient,
      usedQuantity: (ingredient.quantity * totalSoldUnits) / breakEvenUnits,
      usedValue: (ingredient.cost * totalSoldUnits) / breakEvenUnits
    }));
  };

  useEffect(() => {
    if (preloadedStats && preloadedSales) {
      // Use preloaded data
      setStatsData(preloadedStats.booth);
      processDailySalesData(preloadedSales);
      setLoading(false);
    } else {
      // Fallback to fetch data
      fetchBoothStats();
      fetchDailySalesData();
    }
  }, [booth._id, preloadedStats, preloadedSales]);

  const fetchBoothStats = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/booths/${booth._id}/stats`);
      if (response.ok) {
        const data = await response.json();
        setStatsData(data.booth);
      } else {
        console.error('Failed to fetch booth stats');
      }
    } catch (error) {
      console.error('Error fetching booth stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const processDailySalesData = (salesData: any) => {
    const allSales = salesData.sales || [];

    // Filter sales for this booth
    const boothSales = allSales.filter((sale: any) => {
      const saleBoothId = sale.boothId?._id || sale.boothId;
      return saleBoothId === booth._id;
    });

    // Group sales by date
    const salesByDate: { [key: string]: any[] } = {};
    boothSales.forEach((sale: any) => {
      const saleDate = new Date(sale.createdAt);
      const dateStr = saleDate.toISOString().split('T')[0];

      if (!salesByDate[dateStr]) {
        salesByDate[dateStr] = [];
      }
      salesByDate[dateStr].push(sale);
    });

    // Generate daily data from start date to current/end date
    const startDate = new Date(booth.startDate);
    const endDate = new Date(booth.endDate);
    const currentDate = new Date();
    const effectiveEndDate = currentDate < endDate ? currentDate : endDate;

    const dailyData = [];

    for (let d = new Date(startDate); d <= effectiveEndDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const daySales = salesByDate[dateStr] || [];

      const dayTotal = daySales.reduce((sum: number, sale: any) => sum + sale.totalAmount, 0);
      const cashTotal = daySales
        .filter((sale: any) => sale.paymentMethod === 'cash')
        .reduce((sum: number, sale: any) => sum + sale.totalAmount, 0);
      const transferTotal = daySales
        .filter((sale: any) => sale.paymentMethod === 'transfer')
        .reduce((sum: number, sale: any) => sum + sale.totalAmount, 0);
      const orderCount = daySales.length;

      dailyData.push({
        date: dateStr,
        displayDate: d.toLocaleDateString('th-TH', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }),
        total: dayTotal,
        cash: cashTotal,
        transfer: transferTotal,
        orders: orderCount,
        sales: daySales // เพิ่ม sales array เพื่อใช้คำนวณ menu stats
      });
    }

    // Sort by date (most recent first)
    dailyData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setDailySalesData(dailyData);
  };

  const fetchDailySalesData = async () => {
    try {
      const response = await fetch(`/api/sales`);
      if (response.ok) {
        const data = await response.json();
        processDailySalesData(data);
      }
    } catch (error) {
      console.error('Error fetching daily sales data:', error);
    }
  };

  // Fetch sales detail for a specific date
  const fetchSalesForDate = async (date: string) => {
    try {
      const response = await fetch(`/api/sales`);
      if (response.ok) {
        const data = await response.json();
        const allSales = data.sales || [];

        // Filter sales for this booth and date
        const dateSales = allSales.filter((sale: any) => {
          const saleDate = new Date(sale.createdAt).toISOString().split('T')[0];
          const saleBoothId = sale.boothId._id || sale.boothId;
          return saleDate === date && saleBoothId === booth._id;
        });

        return dateSales;
      }
      return [];
    } catch (error) {
      console.error('Error fetching sales for date:', error);
      return [];
    }
  };

  // Edit sales for a specific date
  const handleEditDate = async (date: string) => {
    const sales = await fetchSalesForDate(date);
    setEditingDate(date);
    setEditingSales(sales);
    setShowSalesDetail(date);
  };

  // Update item quantity
  const updateItemQuantity = (saleIndex: number, itemIndex: number, newQuantity: number) => {
    const updatedSales = [...editingSales];
    const sale = updatedSales[saleIndex];
    const item = sale.items[itemIndex];

    // Update quantity
    item.quantity = Math.max(0, newQuantity);

    // Recalculate sale total
    sale.totalAmount = sale.items.reduce((total: number, item: any) =>
      total + (item.price * item.quantity), 0
    );

    setEditingSales(updatedSales);
  };

  // Save changes
  const saveSalesChanges = async () => {
    try {
      setLoading(true);

      // Update each modified sale
      for (const sale of editingSales) {
        const response = await fetch(`/api/sales/${sale._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            items: sale.items.map((item: any) => ({
              menuItemId: item.menuItemId._id || item.menuItemId,
              quantity: item.quantity
            }))
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to update sale');
        }
      }

      // Refresh data
      await fetchDailySalesData();
      if (preloadedStats) {
        // Refresh stats if needed
        await fetchBoothStats();
      }

      // Reset edit state
      setEditingDate(null);
      setEditingSales([]);
      setShowSalesDetail(null);


    } catch (error) {
      console.error('❌ Error saving sales changes:', error);
      // You might want to show an error message to the user here
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Cancel edit
  const cancelEdit = () => {
    setEditingDate(null);
    setEditingSales([]);
    setShowSalesDetail(null);
  };

  // Delete sale
  const deleteSale = async (saleId: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบรายการขายนี้? การกระทำนี้ไม่สามารถยกเลิกได้')) {
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`/api/sales/${saleId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete sale');
      }

      // Refresh data
      await fetchDailySalesData();
      if (preloadedStats) {
        await fetchBoothStats();
      }

      // If this was the last sale for the date, close the detail view
      const remainingSales = editingSales.filter(sale => sale._id !== saleId);
      if (remainingSales.length === 0) {
        setShowSalesDetail(null);
        setEditingDate(null);
        setEditingSales([]);
      } else {
        setEditingSales(remainingSales);
      }


    } catch (error) {
      console.error('❌ Error deleting sale:', error);
      alert('เกิดข้อผิดพลาดในการลบข้อมูล: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Chart skeleton */}
        <div className="space-y-4">
          <div className="h-4 bg-gray-200 rounded animate-pulse w-1/3"></div>
          <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
        </div>

        {/* Stats grid skeleton */}
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
              <div className="h-8 bg-gray-100 rounded animate-pulse"></div>
            </div>
          ))}
        </div>

        {/* Table skeleton */}
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded animate-pulse w-1/4"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sales Progress Summary */}
      <div className="border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-gray-600" />
          <label className="text-lg font-light text-black tracking-wide">สรุปยอดขาย</label>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div>
            <div className="text-xs font-light text-gray-400 mb-1 tracking-wider uppercase">ดำเนินการมา</div>
            <div className="font-light text-black">
                {(() => {
                  const startDate = new Date(booth.startDate);
                  const endDate = new Date(booth.endDate);
                  const currentDate = new Date();

                  // Calculate days passed since start date
                  const daysPassed = Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

                  // Calculate total days in booth period
                  const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

                  // Don't exceed total days if current date is past end date
                  const effectiveDaysPassed = Math.min(daysPassed, totalDays);

                  return `${effectiveDaysPassed}/${totalDays}`;
                })()} วัน
            </div>
          </div>

          <div>
            <div className="text-xs font-light text-gray-400 mb-1 tracking-wider uppercase">จำนวนที่ขายได้</div>
            <div className="font-light text-black">
              {(() => {
                // Calculate total quantity from all daily sales data
                const totalQuantity = dailySalesData.reduce((grandTotal: number, dayData: any) => {
                  if (!dayData.sales) return grandTotal;

                  const dayTotal = dayData.sales.reduce((daySum: number, sale: any) => {
                    return daySum + sale.items.reduce((saleSum: number, item: any) => {
                      return saleSum + item.quantity;
                    }, 0);
                  }, 0);

                  return grandTotal + dayTotal;
                }, 0);

                return totalQuantity;
              })()} จาน
            </div>
          </div>

          <div>
            <div className="text-xs font-light text-gray-400 mb-1 tracking-wider uppercase">ยอดขายรวม</div>
            <div className="font-light text-black">
              ฿{(() => {
                // Calculate total sales from all daily sales data
                const totalSales = dailySalesData.reduce((grandTotal: number, dayData: any) => {
                  return grandTotal + (dayData.total || 0);
                }, 0);

                return totalSales.toLocaleString();
              })()}
            </div>
          </div>

          <div>
            <div className="text-xs font-light text-gray-400 mb-1 tracking-wider uppercase">ต้นทุนรวม</div>
            <div className="font-light text-black">
              ฿{(() => {
                if (!booth.businessPlan?.fixedCosts?.total || !booth.businessPlan?.ingredients) {
                  return '0';
                }

                const fixedCosts = booth.businessPlan.fixedCosts.total;
                const ingredientCost = booth.businessPlan.ingredients.reduce((sum, ing) => sum + ing.cost, 0);
                const baseCapital = fixedCosts + ingredientCost;
                const reserveFund = baseCapital * 0.1;
                const totalCost = baseCapital + reserveFund;

                return totalCost.toLocaleString();
              })()}
            </div>
          </div>

          <div>
            <div className="text-xs font-light text-gray-400 mb-1 tracking-wider uppercase">กำไร</div>
            <div className="font-light text-black">
              ฿{(() => {
                // Calculate correct profit using same logic as BoothCard
                if (!booth.businessPlan?.fixedCosts?.total || !booth.businessPlan?.ingredients) {
                  return '0';
                }

                const fixedCosts = booth.businessPlan.fixedCosts.total;
                const ingredientCost = booth.businessPlan.ingredients.reduce((sum, ing) => sum + ing.cost, 0);
                const baseCapital = fixedCosts + ingredientCost;
                const reserveFund = baseCapital * 0.1;
                const correctBreakEvenRevenue = baseCapital + reserveFund;

                const totalSales = statsData?.totalSales || 0;
                const profit = Math.max(0, totalSales - correctBreakEvenRevenue);

                return profit.toLocaleString();
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* INSERT_DAILY_SALES_HERE */}
      {/* Daily Sales Table */}
      <div className="border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Calendar className="w-4 h-4 text-gray-600" />
          <label className="text-lg font-light text-black tracking-wide">ยอดขายรายวัน</label>
        </div>

        <div className="space-y-3">
          {dailySalesData.length > 0 ? (
            <>
              <div className="grid grid-cols-6 gap-4 pb-2 border-b border-gray-200">
                <div className="text-xs font-light text-gray-400 tracking-wider uppercase">วันที่</div>
                <div className="text-xs font-light text-gray-400 tracking-wider uppercase text-right">เงินสด</div>
                <div className="text-xs font-light text-gray-400 tracking-wider uppercase text-right">เงินโอน</div>
                <div className="text-xs font-light text-gray-400 tracking-wider uppercase text-right">รวม</div>
                <div className="text-xs font-light text-gray-400 tracking-wider uppercase text-right">ออเดอร์</div>
                <div className="text-xs font-light text-gray-400 tracking-wider uppercase text-center">จัดการ</div>
              </div>
              {dailySalesData.map((day, index) => (
                <React.Fragment key={day.date}>
                  <div className="grid grid-cols-6 gap-4 py-3 border-b border-gray-100">
                    <div className="font-light text-black">{day.displayDate}</div>
                    <div className="font-light text-right">
                      ฿{day.cash?.toLocaleString() || '0'}
                    </div>
                    <div className="font-light text-right">
                      ฿{day.transfer?.toLocaleString() || '0'}
                    </div>
                    <div className="font-light text-black text-right">
                      ฿{day.total.toLocaleString()}
                    </div>
                    <div className="font-light text-gray-700 text-right">
                      {day.orders}
                    </div>
                    <div className="text-center">
                      {day.orders > 0 && (
                        <button
                          onClick={() => handleEditDate(day.date)}
                          className="p-2 text-gray-300 hover:text-gray-600 transition-colors duration-200"
                          title="แก้ไขยอดขาย"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Sales Detail Modal */}
                  {showSalesDetail === day.date && (
                    <div className="mt-4 border border-gray-100 p-4">
                      <div className="flex items-center justify-between mb-4">
                        <label className="text-lg font-light text-black tracking-wide">
                          รายละเอียดการขายวันที่ {day.displayDate}
                        </label>
                        <div className="flex items-center gap-2">
                          {editingDate === day.date && (
                            <>
                              <button
                                onClick={saveSalesChanges}
                                className="px-4 py-2 border border-gray-200 text-sm font-light text-black hover:bg-gray-50 transition-colors duration-200 tracking-wide inline-flex items-center gap-2"
                              >
                                <Check className="w-4 h-4" />
                                บันทึก
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="px-4 py-2 border border-gray-200 text-sm font-light text-black hover:bg-gray-50 transition-colors duration-200 tracking-wide inline-flex items-center gap-2"
                              >
                                <X className="w-4 h-4" />
                                ยกเลิก
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => setShowSalesDetail(null)}
                            className="px-4 py-2 border border-gray-200 text-sm font-light text-black hover:bg-gray-50 transition-colors duration-200 tracking-wide inline-flex items-center gap-2"
                          >
                            <X className="w-4 h-4" />
                            ปิด
                          </button>
                        </div>
                      </div>

                      {/* Sales Items List */}
                      <div className="space-y-3">
                        {editingSales.map((sale, saleIndex) => (
                          <div key={sale._id} className="border border-gray-100 p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-light text-gray-600">
                                ออเดอร์ #{sale._id.slice(-6)} - {sale.paymentMethod === 'cash' ? 'เงินสด' : 'เงินโอน'} - {new Date(sale.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="font-light text-black">
                                  ฿{sale.totalAmount.toLocaleString()}
                                </span>
                                <button
                                  onClick={() => deleteSale(sale._id)}
                                  className="p-2 text-gray-300 hover:text-red-600 transition-colors duration-200"
                                  title="ลบออเดอร์"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            <div className="space-y-2">
                              {sale.items.map((item: any, itemIndex: number) => (
                                <div key={itemIndex} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                                  <span className="font-light text-black">{item.menuItemId.name || 'Unknown Menu'}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="font-light text-gray-600">฿{item.price}</span>
                                    <span className="font-light text-gray-600">×</span>
                                    {editingDate === day.date ? (
                                      <input
                                        type="number"
                                        min="0"
                                        value={item.quantity}
                                        onChange={(e) => updateItemQuantity(saleIndex, itemIndex, parseInt(e.target.value) || 0)}
                                        onWheel={(e) => e.currentTarget.blur()}
                                        onKeyDown={(e) => {
                                          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                                            e.preventDefault();
                                          }
                                        }}
                                        className="w-16 px-2 py-1 border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black focus:outline-none text-center"
                                      />
                                    ) : (
                                      <span className="font-light text-black">{item.quantity}</span>
                                    )}
                                    <span className="font-light text-black">
                                      = ฿{(item.price * item.quantity).toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </React.Fragment>
              ))}

              {/* Daily Sales Summary Footer */}
              {dailySalesData.length > 0 && (
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <div className="grid grid-cols-6 gap-4 bg-gray-50 p-3 rounded">
                    <div className="font-medium text-black">รวมทั้งหมด:</div>
                    <div className="font-medium text-black text-right">
                      ฿{dailySalesData.reduce((sum, day) => sum + (day.cash || 0), 0).toLocaleString()}
                    </div>
                    <div className="font-medium text-black text-right">
                      ฿{dailySalesData.reduce((sum, day) => sum + (day.transfer || 0), 0).toLocaleString()}
                    </div>
                    <div className="font-medium text-black text-right">
                      ฿{dailySalesData.reduce((sum, day) => sum + day.total, 0).toLocaleString()}
                    </div>
                    <div className="font-medium text-black text-right">
                      {dailySalesData.reduce((sum, day) => sum + day.orders, 0).toLocaleString()}
                    </div>
                    <div></div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <div className="font-light text-gray-500">
                ยังไม่มีการขายในบูธนี้
              </div>
              <div className="text-xs font-light text-gray-400 mt-2">
                เมื่อมีการขาย ข้อมูลจะแสดงที่นี่
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Daily Targets vs Reality */}
      {/* <div className="border-2 border-gray-300 p-4">
        <div className="flex items-center gap-4 mb-2">
          <Target className="w-8 h-8" />
          <h4 className=" text-black text-2xl">เป้าหมายต่อวัน</h4>
        </div>
        <div className="grid grid-cols-3 gap-8">
          <div className="border-2 border-black p-6 text-center bg-white">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Target className="w-5 h-5 text-gray-700" />
              <div className="text-lg text-gray-700 ">เป้าหมายคุ้มทุน/วัน</div>
            </div>
            <div className="text-3xl  text-black">
              {booth.businessPlan?.breakEven?.dailyTarget || 0} จาน
            </div>
          </div>

          <div className="border-2 border-black p-6 text-center bg-white">
            <div className="flex items-center justify-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-gray-700" />
              <div className="text-lg text-gray-700 ">เป้าหมายกำไร/วัน</div>
            </div>
            <div className="text-3xl  text-black">
              {booth.businessPlan?.targetProfit?.unitsNeeded ?
                Math.ceil((booth.businessPlan.targetProfit.unitsNeeded || 0) / Math.ceil((new Date(booth.endDate).getTime() - new Date(booth.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1) : 0} จาน
            </div>
          </div>

          <div className="border-2 border-black p-6 text-center bg-gray-100">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Calendar className="w-5 h-5 text-gray-700" />
              <div className="text-lg text-gray-700 ">เฉลี่ยต่อวันปัจจุบัน</div>
            </div>
            <div className="text-3xl  text-black">
              {statsData?.daysRunning > 0 ?
                Math.round((statsData?.menuStats?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0) / statsData.daysRunning)
                : 0} จาน
            </div>
          </div>
        </div>
      </div> */}

      

      {/* Menu Sales Summary */}
      <div className="border border-gray-100 p-6">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-gray-600" />
            <label className="text-lg font-light text-black tracking-wide">สรุปยอดขายแต่ละเมนู</label>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMenuViewMode('total')}
                className={`px-4 py-2 text-sm font-light tracking-wide transition-all duration-200 ${
                  menuViewMode === 'total'
                    ? 'text-black border-b-2 border-black'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                ยอดรวม
              </button>
              <button
                onClick={() => setMenuViewMode('daily')}
                className={`px-4 py-2 text-sm font-light tracking-wide transition-all duration-200 ${
                  menuViewMode === 'daily'
                    ? 'text-black border-b-2 border-black'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                รายวัน
              </button>
            </div>

            {/* Date Picker - Only show when in daily mode */}
            {menuViewMode === 'daily' && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-600" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={getBoothDateRange().min}
                  max={getBoothDateRange().max}
                  className="border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black focus:outline-none px-3 py-1"
                />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {menuViewMode === 'total' ? (
            // Total View - Calculate from all daily sales data
            (() => {
              // Calculate total menu stats from all daily sales data
              const totalMenuMap = new Map();

              dailySalesData.forEach((dayData: any) => {
                if (dayData.sales) {
                  dayData.sales.forEach((sale: any) => {
                    sale.items.forEach((item: any) => {
                      const menuItemId = item.menuItemId._id || item.menuItemId;
                      const menuName = item.menuItemId.name || 'Unknown Menu';
                      const key = menuItemId;

                      if (totalMenuMap.has(key)) {
                        const existing = totalMenuMap.get(key);
                        existing.quantity += item.quantity;
                        existing.revenue += item.price * item.quantity;
                      } else {
                        totalMenuMap.set(key, {
                          name: menuName,
                          quantity: item.quantity,
                          revenue: item.price * item.quantity
                        });
                      }
                    });
                  });
                }
              });

              const totalMenuStats = Array.from(totalMenuMap.values());
              return totalMenuStats && totalMenuStats.length > 0 ? (
              <>
                <div className="grid grid-cols-3 gap-4 pb-2 border-b border-gray-200">
                  <div className="text-xs font-light text-gray-400 tracking-wider uppercase">เมนู</div>
                  <div className="text-xs font-light text-gray-400 tracking-wider uppercase text-center">จำนวนที่ขาย</div>
                  <div className="text-xs font-light text-gray-400 tracking-wider uppercase text-right">ยอดขาย</div>
                </div>
                {totalMenuStats
                  .sort((a: any, b: any) => b.quantity - a.quantity)
                  .map((menuItem: any, index: number) => (
                    <div key={index} className="grid grid-cols-3 gap-4 py-3 border-b border-gray-100">
                      <div className="font-light text-black">{menuItem.name}</div>
                      <div className="font-light text-gray-700 text-center">
                        {menuItem.quantity.toLocaleString()} จาน
                      </div>
                      <div className="font-light text-black text-right">
                        ฿{menuItem.revenue.toLocaleString()}
                      </div>
                    </div>
                  ))}

                {/* Total Summary */}
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <div className="grid grid-cols-3 gap-4 bg-gray-50 p-3 rounded">
                    <div className="font-medium text-black">รวมทั้งหมด:</div>
                    <div className="font-medium text-black text-center">
                      {totalMenuStats.reduce((sum: number, item: any) => sum + item.quantity, 0).toLocaleString()} จาน
                    </div>
                    <div className="font-medium text-black text-right">
                      ฿{totalMenuStats.reduce((sum: number, item: any) => sum + item.revenue, 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              </>
              ) : (
                <div className="text-center py-8">
                  <div className="font-light text-gray-500">ไม่มีข้อมูลการขาย</div>
                </div>
              );
            })()
          ) : (
            // Daily View
            dailyMenuStats && dailyMenuStats.length > 0 ? (
              <>
                <div className="grid grid-cols-3 gap-4 pb-2 border-b border-gray-200">
                  <div className="text-xs font-light text-gray-400 tracking-wider uppercase">เมนู</div>
                  <div className="text-xs font-light text-gray-400 tracking-wider uppercase text-center">จำนวนที่ขาย</div>
                  <div className="text-xs font-light text-gray-400 tracking-wider uppercase text-right">ยอดขาย</div>
                </div>
                {dailyMenuStats
                  .sort((a: any, b: any) => b.quantity - a.quantity)
                  .map((menuItem: any, index: number) => (
                    <div key={index} className="grid grid-cols-3 gap-4 py-3 border-b border-gray-100">
                      <div className="font-light text-black">{menuItem.name}</div>
                      <div className="font-light text-gray-700 text-center">
                        {menuItem.quantity.toLocaleString()} จาน
                      </div>
                      <div className="font-light text-black text-right">
                        ฿{menuItem.revenue.toLocaleString()}
                      </div>
                    </div>
                  ))}

                {/* Daily Summary */}
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <div className="grid grid-cols-3 gap-4 bg-gray-50 p-3 rounded">
                    <div className="font-medium text-black">รวมในวันนี้:</div>
                    <div className="font-medium text-black text-center">
                      {dailyMenuStats.reduce((sum: number, item: any) => sum + item.quantity, 0).toLocaleString()} จาน
                    </div>
                    <div className="font-medium text-black text-right">
                      ฿{dailyMenuStats.reduce((sum: number, item: any) => sum + item.revenue, 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="font-light text-gray-500">ไม่มีข้อมูลการขายในวันที่เลือก</div>
              </div>
            )
          )}
        </div>
      </div>

      {/* Ingredients Usage Table */}
      <div className="border border-gray-100 p-6">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-gray-600" />
            <label className="text-lg font-light text-black tracking-wide">การใช้วัตถุดิบ</label>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIngredientViewMode('total')}
                className={`px-4 py-2 text-sm font-light tracking-wide transition-all duration-200 ${
                  ingredientViewMode === 'total'
                    ? 'text-black border-b-2 border-black'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                ยอดรวม
              </button>
              <button
                onClick={() => setIngredientViewMode('daily')}
                className={`px-4 py-2 text-sm font-light tracking-wide transition-all duration-200 ${
                  ingredientViewMode === 'daily'
                    ? 'text-black border-b-2 border-black'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                รายวัน
              </button>
            </div>

            {/* Date Picker - Only show when in daily mode */}
            {ingredientViewMode === 'daily' && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-600" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={getBoothDateRange().min}
                  max={getBoothDateRange().max}
                  className="border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black focus:outline-none px-3 py-1"
                />
              </div>
            )}
          </div>
        </div>
        <div className="space-y-3">
          {(() => {
            const ingredientsData = ingredientViewMode === 'total'
              ? calculateTotalIngredientUsage()
              : calculateDailyIngredientUsage(selectedDate);

            return ingredientsData.length > 0 ? (
              <>
                <div className="grid grid-cols-3 gap-4 pb-2 border-b border-gray-200">
                  <div className="text-xs font-light text-gray-400 tracking-wider uppercase">วัตถุดิบ</div>
                  <div className="text-xs font-light text-gray-400 tracking-wider uppercase text-center">ใช้ไปแล้ว</div>
                  <div className="text-xs font-light text-gray-400 tracking-wider uppercase text-right">มูลค่าที่ใช้</div>
                </div>
                {ingredientsData
                  .sort((a: any, b: any) => b.usedValue - a.usedValue)
                  .map((ingredient: any, index: number) => (
                    <div key={index} className="grid grid-cols-3 gap-4 py-3 border-b border-gray-100">
                      <div className="font-light text-black">{ingredient.name}</div>
                      <div className="font-light text-gray-700 text-center">
                        {ingredient.usedQuantity.toFixed(2)} {ingredient.unit}
                      </div>
                      <div className="font-light text-black text-right">
                        ฿{ingredient.usedValue.toFixed(2)}
                      </div>
                    </div>
                  ))}
              </>
            ) : (
              <div className="text-center py-8">
                <div className="font-light text-gray-500">
                  {ingredientViewMode === 'daily'
                    ? 'ไม่มีข้อมูลการขายในวันที่เลือก'
                    : 'ไม่มีข้อมูลวัตถุดิบ'
                  }
                </div>
              </div>
            );
          })()}
        </div>

        {/* Total */}
        <div className="border-t border-gray-200 pt-4 mt-4">
          <div className="flex justify-between bg-gray-50 p-3 rounded">
            <div className="font-medium text-black">
              รวมมูลค่าวัตถุดิบที่ใช้{ingredientViewMode === 'daily' ? ' (วันนี้)' : ' (รวมทั้งหมด)'}:
            </div>
            <div className="font-medium text-black">
              ฿{(() => {
                const ingredientsData = ingredientViewMode === 'total'
                  ? calculateTotalIngredientUsage()
                  : calculateDailyIngredientUsage(selectedDate);

                const totalValue = ingredientsData.reduce((sum: number, ingredient: any) => sum + ingredient.usedValue, 0);
                return totalValue.toFixed(2);
              })()}
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
}