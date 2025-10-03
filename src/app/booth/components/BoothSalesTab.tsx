import React, { useState, useEffect } from 'react';
import { TrendingUp, Calendar, Package, BarChart3, Edit, X, Check, Trash2, Loader2 } from 'lucide-react';
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
  const [ingredientsData, setIngredientsData] = useState<any[]>([]);
  const [totalIngredientsData, setTotalIngredientsData] = useState<any[]>([]);
  const [loadingSalesDetail, setLoadingSalesDetail] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 20;

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

  // Fetch ingredients data when date or view mode changes
  useEffect(() => {
    if (selectedDate && ingredientViewMode === 'daily') {
      fetchIngredientsData(selectedDate);
    } else if (ingredientViewMode === 'total') {
      fetchTotalIngredientsData();
    }
  }, [selectedDate, ingredientViewMode]);


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

  // Fetch ingredients data for daily view
  const fetchIngredientsData = async (date: string) => {
    try {
      const params = new URLSearchParams();
      params.append('boothId', booth._id);
      if (date !== 'all') {
        params.append('date', date);
      }

      const response = await fetch(`/api/dashboard/booth-ingredients?${params}`);
      if (response.ok) {
        const ingredients = await response.json();
        setIngredientsData(ingredients);
      } else {
        setIngredientsData([]);
      }
    } catch (error) {
      console.error('Error fetching ingredients data:', error);
      setIngredientsData([]);
    }
  };

  // Fetch total ingredients data
  const fetchTotalIngredientsData = async () => {
    try {
      const params = new URLSearchParams();
      params.append('boothId', booth._id);
      params.append('date', 'all');

      const response = await fetch(`/api/dashboard/booth-ingredients?${params}`);
      if (response.ok) {
        const ingredients = await response.json();
        setTotalIngredientsData(ingredients);
      } else {
        setTotalIngredientsData([]);
      }
    } catch (error) {
      console.error('Error fetching total ingredients data:', error);
      setTotalIngredientsData([]);
    }
  };

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

      // Calculate cost and profit for this day
      const dayCost = daySales.reduce((sum: number, sale: any) => sum + (sale.totalCost || 0), 0);
      const dayProfit = daySales.reduce((sum: number, sale: any) => sum + (sale.profit || 0), 0);

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
        cost: dayCost,
        profit: dayProfit,
        sales: daySales // เพิ่ม sales array เพื่อใช้คำนวณ menu stats
      });
    }

    // Sort by date (most recent first)
    dailyData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setDailySalesData(dailyData);
  };

  const fetchDailySalesData = async () => {
    try {
      const response = await fetch(`/api/sales?boothId=${booth._id}`);
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
      const response = await fetch(`/api/sales?boothId=${booth._id}`);
      if (response.ok) {
        const data = await response.json();
        const allSales = data.sales || [];

        // Filter sales for this specific date (booth is already filtered by API)
        const dateSales = allSales.filter((sale: any) => {
          const saleDate = new Date(sale.createdAt).toISOString().split('T')[0];
          return saleDate === date;
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
    setLoadingSalesDetail(date);
    setCurrentPage(1); // Reset to first page
    try {
      const sales = await fetchSalesForDate(date);
      setEditingDate(date);
      setEditingSales(sales);
      setShowSalesDetail(date);
    } catch (error) {
      console.error('Error loading sales detail:', error);
    } finally {
      setLoadingSalesDetail(null);
    }
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
    setCurrentPage(1);
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

        <div className="overflow-x-auto">
          {dailySalesData.length > 0 ? (
            <>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left text-xs font-light text-gray-400 tracking-wider uppercase p-3">วันที่</th>
                    <th className="text-right text-xs font-light text-gray-400 tracking-wider uppercase p-3">เงินสด</th>
                    <th className="text-right text-xs font-light text-gray-400 tracking-wider uppercase p-3">เงินโอน</th>
                    <th className="text-right text-xs font-light text-gray-400 tracking-wider uppercase p-3">ยอดขาย</th>
                    <th className="text-right text-xs font-light text-gray-400 tracking-wider uppercase p-3">ต้นทุน</th>
                    <th className="text-right text-xs font-light text-gray-400 tracking-wider uppercase p-3">กำไร</th>
                    <th className="text-right text-xs font-light text-gray-400 tracking-wider uppercase p-3">ออเดอร์</th>
                    <th className="text-center text-xs font-light text-gray-400 tracking-wider uppercase p-3">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {dailySalesData.map((day, index) => {
                    return (
                    <React.Fragment key={day.date}>
                      <tr className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-3 font-light text-black">{day.displayDate}</td>
                        <td className="p-3 font-light text-right">
                          ฿{day.cash?.toLocaleString() || '0'}
                        </td>
                        <td className="p-3 font-light text-right">
                          ฿{day.transfer?.toLocaleString() || '0'}
                        </td>
                        <td className="p-3 font-light text-black text-right">
                          ฿{day.total.toLocaleString()}
                        </td>
                        <td className="p-3 font-light  text-right">
                          ฿{day.cost?.toFixed(0) || '0'}
                        </td>
                        <td className={`p-3 font-light text-right`}>
                          ฿{day.profit?.toFixed(0) || '0'}
                        </td>
                        <td className="p-3 font-light text-gray-700 text-right">
                          {day.orders}
                        </td>
                        <td className="p-3 text-center">
                          {day.orders > 0 && (
                            <button
                              onClick={() => handleEditDate(day.date)}
                              disabled={loadingSalesDetail === day.date}
                              className="p-2 text-gray-300 hover:text-gray-600 transition-colors duration-200 disabled:opacity-50"
                              title={loadingSalesDetail === day.date ? "กำลังโหลด..." : "แก้ไขยอดขาย"}
                            >
                              {loadingSalesDetail === day.date ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Edit className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </td>
                      </tr>
                    </React.Fragment>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-200 bg-gray-50">
                    <td className="p-3 font-medium text-black">รวมทั้งหมด:</td>
                    <td className="p-3 font-medium text-black text-right">
                      ฿{dailySalesData.reduce((sum, day) => sum + (day.cash || 0), 0).toLocaleString()}
                    </td>
                    <td className="p-3 font-medium text-black text-right">
                      ฿{dailySalesData.reduce((sum, day) => sum + (day.transfer || 0), 0).toLocaleString()}
                    </td>
                    <td className="p-3 font-medium text-black text-right">
                      ฿{dailySalesData.reduce((sum, day) => sum + day.total, 0).toLocaleString()}
                    </td>
                    <td className="p-3 font-medium  text-right">
                      ฿{dailySalesData.reduce((sum, day) => sum + (day.cost || 0), 0).toLocaleString()}
                    </td>
                    <td className="p-3 font-medium text-right">
                      {(() => {
                        const totalProfit = dailySalesData.reduce((sum, day) => sum + (day.profit || 0), 0);
                        return (
                          <span>
                            ฿{totalProfit.toLocaleString()}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="p-3 font-medium text-black text-right">
                      {dailySalesData.reduce((sum, day) => sum + day.orders, 0).toLocaleString()}
                    </td>
                    <td className="p-3 text-center"></td>
                  </tr>
                </tfoot>
              </table>

              {/* Sales Detail Modals */}
              {dailySalesData.map((day) =>
                showSalesDetail === day.date ? (
                  <div key={`modal-${day.date}`} className="mt-4 border border-gray-100 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-lg font-light text-black tracking-wide">
                        รายละเอียดการขายวันที่ {day.displayDate} ({editingSales.length} รายการ)
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

                    {/* Sales Table */}
                    {(() => {
                      const startIndex = (currentPage - 1) * itemsPerPage;
                      const endIndex = startIndex + itemsPerPage;
                      const paginatedSales = editingSales.slice(startIndex, endIndex);
                      const totalPages = Math.ceil(editingSales.length / itemsPerPage);

                      return (
                        <>
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                              <thead>
                                <tr className="border-b border-gray-200">
                                  <th className="text-left text-xs font-light text-gray-400 tracking-wider uppercase p-3">ออเดอร์</th>
                                  <th className="text-left text-xs font-light text-gray-400 tracking-wider uppercase p-3">เวลา</th>
                                  <th className="text-left text-xs font-light text-gray-400 tracking-wider uppercase p-3">เมนู</th>
                                  <th className="text-center text-xs font-light text-gray-400 tracking-wider uppercase p-3">จำนวน</th>
                                  <th className="text-right text-xs font-light text-gray-400 tracking-wider uppercase p-3">ราคา</th>
                                  <th className="text-center text-xs font-light text-gray-400 tracking-wider uppercase p-3">การชำระ</th>
                                  <th className="text-center text-xs font-light text-gray-400 tracking-wider uppercase p-3">จัดการ</th>
                                </tr>
                              </thead>
                              <tbody>
                                {paginatedSales.map((sale, saleIndex) => {
                                  const actualSaleIndex = startIndex + saleIndex;
                                  return sale.items.map((item: any, itemIndex: number) => (
                                    <tr key={`${sale._id}-${itemIndex}`} className="border-b border-gray-100 hover:bg-gray-50">
                                      {itemIndex === 0 && (
                                        <td rowSpan={sale.items.length} className="p-3 font-light text-gray-600 border-r border-gray-100">
                                          #{sale._id.slice(-6)}
                                        </td>
                                      )}
                                      {itemIndex === 0 && (
                                        <td rowSpan={sale.items.length} className="p-3 font-light text-gray-600 border-r border-gray-100">
                                          {new Date(sale.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}
                                        </td>
                                      )}
                                      <td className="p-3 font-light text-black">
                                        {item.menuItemId.name || 'Unknown Menu'}
                                      </td>
                                      <td className="p-3 text-center">
                                        {editingDate === day.date ? (
                                          <input
                                            type="number"
                                            min="0"
                                            value={item.quantity}
                                            onChange={(e) => updateItemQuantity(actualSaleIndex, itemIndex, parseInt(e.target.value) || 0)}
                                            onWheel={(e) => e.currentTarget.blur()}
                                            onKeyDown={(e) => {
                                              if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                                                e.preventDefault();
                                              }
                                            }}
                                            className="w-16 px-2 py-1 border border-gray-200 rounded text-sm font-light focus:border-black focus:outline-none text-center"
                                          />
                                        ) : (
                                          <span className="font-light text-black">{item.quantity}</span>
                                        )}
                                      </td>
                                      <td className="p-3 font-light text-black text-right">
                                        ฿{(item.price * item.quantity).toLocaleString()}
                                      </td>
                                      {itemIndex === 0 && (
                                        <td rowSpan={sale.items.length} className="p-3 text-center font-light text-gray-600 border-l border-gray-100">
                                          {sale.paymentMethod === 'cash' ? 'เงินสด' : 'เงินโอน'}
                                        </td>
                                      )}
                                      {itemIndex === 0 && (
                                        <td rowSpan={sale.items.length} className="p-3 text-center border-l border-gray-100">
                                          <button
                                            onClick={() => deleteSale(sale._id)}
                                            className="p-2 text-gray-300 hover:text-red-600 transition-colors duration-200"
                                            title="ลบออเดอร์"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        </td>
                                      )}
                                    </tr>
                                  ));
                                })}
                              </tbody>
                            </table>
                          </div>

                          {/* Pagination */}
                          {totalPages > 1 && (
                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                              <div className="text-sm font-light text-gray-600">
                                แสดง {startIndex + 1}-{Math.min(endIndex, editingSales.length)} จากทั้งหมด {editingSales.length} รายการ
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                  disabled={currentPage === 1}
                                  className="px-3 py-1 border border-gray-200 text-sm font-light text-black hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  ก่อนหน้า
                                </button>
                                <span className="px-3 py-1 text-sm font-light text-gray-600">
                                  {currentPage} / {totalPages}
                                </span>
                                <button
                                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                  disabled={currentPage === totalPages}
                                  className="px-3 py-1 border border-gray-200 text-sm font-light text-black hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  ถัดไป
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                ) : null
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <div className="font-light text-gray-500">ไม่มีข้อมูลการขาย</div>
            </div>
          )}
        </div>
      </div>

      

      

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
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-center text-xs font-light text-gray-400 tracking-wider uppercase p-3 w-16">ลำดับ</th>
                        <th className="text-left text-xs font-light text-gray-400 tracking-wider uppercase p-3">เมนู</th>
                        <th className="text-center text-xs font-light text-gray-400 tracking-wider uppercase p-3 w-32">จำนวนที่ขาย</th>
                        <th className="text-right text-xs font-light text-gray-400 tracking-wider uppercase p-3 w-32">ยอดขาย</th>
                      </tr>
                    </thead>
                    <tbody>
                      {totalMenuStats
                        .sort((a: any, b: any) => b.quantity - a.quantity)
                        .map((menuItem: any, index: number) => (
                          <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="p-3 font-light text-gray-500 text-center w-16">#{index + 1}</td>
                            <td className="p-3 font-light text-black">{menuItem.name}</td>
                            <td className="p-3 font-light text-gray-700 text-center w-32">
                              {menuItem.quantity.toLocaleString()} จาน
                            </td>
                            <td className="p-3 font-light text-black text-right w-32">
                              ฿{menuItem.revenue.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-gray-200 bg-gray-50">
                        <td className="p-3 w-16"></td>
                        <td className="p-3 font-medium text-black">รวมทั้งหมด:</td>
                        <td className="p-3 font-medium text-black text-center w-32">
                          {totalMenuStats.reduce((sum: number, item: any) => sum + item.quantity, 0).toLocaleString()} จาน
                        </td>
                        <td className="p-3 font-medium text-black text-right w-32">
                          ฿{totalMenuStats.reduce((sum: number, item: any) => sum + item.revenue, 0).toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
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
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-center text-xs font-light text-gray-400 tracking-wider uppercase p-3 w-16">ลำดับ</th>
                        <th className="text-left text-xs font-light text-gray-400 tracking-wider uppercase p-3">เมนู</th>
                        <th className="text-center text-xs font-light text-gray-400 tracking-wider uppercase p-3 w-32">จำนวนที่ขาย</th>
                        <th className="text-right text-xs font-light text-gray-400 tracking-wider uppercase p-3 w-32">ยอดขาย</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyMenuStats
                        .sort((a: any, b: any) => b.quantity - a.quantity)
                        .map((menuItem: any, index: number) => (
                          <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="p-3 font-light text-gray-500 text-center w-16">#{index + 1}</td>
                            <td className="p-3 font-light text-black">{menuItem.name}</td>
                            <td className="p-3 font-light text-gray-700 text-center w-32">
                              {menuItem.quantity.toLocaleString()} จาน
                            </td>
                            <td className="p-3 font-light text-black text-right w-32">
                              ฿{menuItem.revenue.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-gray-200 bg-gray-50">
                        <td className="p-3 w-16"></td>
                        <td className="p-3 font-medium text-black">รวมในวันนี้:</td>
                        <td className="p-3 font-medium text-black text-center w-32">
                          {dailyMenuStats.reduce((sum: number, item: any) => sum + item.quantity, 0).toLocaleString()} จาน
                        </td>
                        <td className="p-3 font-medium text-black text-right w-32">
                          ฿{dailyMenuStats.reduce((sum: number, item: any) => sum + item.revenue, 0).toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
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
            const currentIngredientsData = ingredientViewMode === 'total'
              ? totalIngredientsData
              : ingredientsData;

            return currentIngredientsData.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-center text-xs font-light text-gray-400 tracking-wider uppercase p-3 w-16">ลำดับ</th>
                        <th className="text-left text-xs font-light text-gray-400 tracking-wider uppercase p-3">วัตถุดิบ</th>
                        <th className="text-center text-xs font-light text-gray-400 tracking-wider uppercase p-3 w-32">ใช้ไปแล้ว</th>
                        <th className="text-right text-xs font-light text-gray-400 tracking-wider uppercase p-3 w-32">มูลค่าที่ใช้</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentIngredientsData
                        .sort((a: any, b: any) => b.totalValue - a.totalValue)
                        .map((ingredient: any, index: number) => (
                          <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="p-3 font-light text-gray-500 text-center w-16">#{index + 1}</td>
                            <td className="p-3 font-light text-black">{ingredient.name}</td>
                            <td className="p-3 font-light text-gray-700 text-center w-32">
                              {ingredient.totalUsed.toLocaleString()} {ingredient.unit}
                            </td>
                            <td className="p-3 font-light text-black text-right w-32">
                              ฿{ingredient.totalValue.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
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
        {(() => {
          const currentIngredientsData = ingredientViewMode === 'total'
            ? totalIngredientsData
            : ingredientsData;

          return currentIngredientsData.length > 0 ? (
            <div className="border-t border-gray-200 pt-4 mt-4">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <tfoot>
                    <tr className="border-t border-gray-200 bg-gray-50">
                      <td className="p-3 w-16"></td>
                      <td className="p-3 font-medium text-black">
                        รวมมูลค่าวัตถุดิบที่ใช้{ingredientViewMode === 'daily' ? ' (วันนี้)' : ' (รวมทั้งหมด)'}:
                      </td>
                      <td className="p-3 w-32"></td>
                      <td className="p-3 font-medium text-black text-right w-32">
                        ฿{(() => {
                          const totalValue = currentIngredientsData.reduce((sum: number, ingredient: any) => {
                            return sum + ingredient.totalValue;
                          }, 0);
                          return totalValue.toLocaleString();
                        })()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : null;
        })()}
      </div>
      
    </div>
  );
}