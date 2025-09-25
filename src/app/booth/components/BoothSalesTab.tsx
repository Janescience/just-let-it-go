import React, { useState, useEffect } from 'react';
import { TrendingUp, Target, Calendar, Package, BarChart3, DollarSign } from 'lucide-react';
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
    const boothSales = allSales.filter((sale: any) =>
      sale.boothId._id === booth._id || sale.boothId === booth._id
    );

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
      const orderCount = daySales.length;

      dailyData.push({
        date: dateStr,
        displayDate: d.toLocaleDateString('th-TH', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }),
        total: dayTotal,
        orders: orderCount
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
    <div className="space-y-8">
      {/* Sales Progress Summary */}
      <div className="border border-gray-200 rounded-lg bg-white p-6">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="w-5 h-5 text-gray-500" />
          <h4 className="text-lg font-light text-gray-800 tracking-wide">สรุปยอดขาย</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-gray-200 rounded-lg bg-gray-50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-gray-500" />
              <div className="text-sm font-light text-gray-600">จำนวนที่ขายได้</div>
            </div>
            <div className="space-y-3">
              <div className="text-lg font-light text-gray-800">
                {statsData?.menuStats?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0} จาน
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg bg-gray-50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-4 h-4 text-gray-500" />
              <div className="text-sm font-light text-gray-600">ยอดขายรวม</div>
            </div>
            <div className="space-y-3">
              <div className="text-lg font-light text-gray-800">
                ฿{statsData?.totalSales?.toLocaleString() || '0'}
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg bg-gray-50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-gray-500" />
              <div className="text-sm font-light text-gray-600">กำไร</div>
            </div>
            <div className="space-y-3">
              <div className="text-lg font-light text-gray-800">
                ฿{statsData?.profit?.toLocaleString() || '0'}
              </div>
            </div>
          </div>
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

      {/* Ingredients Usage Table */}
      <div className="border border-gray-200 rounded-lg bg-white">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-gray-500" />
            <h4 className="text-lg font-light text-gray-800 tracking-wide">การใช้วัตถุดิบ</h4>
          </div>
        </div>
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-800 text-white sticky top-0">
              <tr>
                <th className="text-left p-3 font-light">วัตถุดิบ</th>
                <th className="text-center p-3 font-light">ใช้ไปแล้ว</th>
                <th className="text-right p-3 font-light">มูลค่าที่ใช้</th>
              </tr>
            </thead>
            <tbody>
              {booth.businessPlan?.ingredients && booth.businessPlan.ingredients.length > 0 ? (
                booth.businessPlan.ingredients.map((ingredient: any, index: number) => {
                  const totalSoldUnits = statsData?.menuStats?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;
                  const usedQuantity = Math.round((ingredient.quantity * totalSoldUnits) / (booth.businessPlan?.breakEven?.unitsNeeded || 1));
                  const usedValue = (ingredient.cost * totalSoldUnits) / (booth.businessPlan?.breakEven?.unitsNeeded || 1);

                  return (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-100'}>
                      <td className="p-3 text-gray-800 font-light">{ingredient.name}</td>
                      <td className="p-3 text-center text-gray-800 font-light">
                        {usedQuantity} {ingredient.unit}
                      </td>
                      <td className="p-3 text-right text-gray-800 font-light">
                        ฿{usedValue.toLocaleString()}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-gray-500 font-light text-sm">
                    ไม่มีข้อมูลวัตถุดิบ
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-800 bg-gray-800 text-white">
                <td className="p-3 font-light" colSpan={2}>รวมมูลค่าวัตถุดิบที่ใช้:</td>
                <td className="p-3 text-right font-light text-sm">
                  ฿{booth.businessPlan?.ingredients?.reduce((sum: number, ingredient: any) => {
                    const totalSoldUnits = statsData?.menuStats?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;
                    const usedValue = (ingredient.cost * totalSoldUnits) / (booth.businessPlan?.breakEven?.unitsNeeded || 1);
                    return sum + usedValue;
                  }, 0).toLocaleString() || '0'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Menu Sales Summary */}
      <div className="border border-gray-200 rounded-lg bg-white">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-gray-500" />
            <h4 className="text-lg font-light text-gray-800 tracking-wide">สรุปยอดขายแต่ละเมนู</h4>
          </div>
        </div>
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-800 text-white sticky top-0">
              <tr>
                <th className="text-left p-3 font-light">เมนู</th>
                <th className="text-center p-3 font-light">จำนวนที่ขาย</th>
                <th className="text-right p-3 font-light">ยอดขาย</th>
              </tr>
            </thead>
            <tbody>
              {statsData?.menuStats && statsData.menuStats.length > 0 ? (
                statsData.menuStats
                  .sort((a: any, b: any) => b.quantity - a.quantity) // เรียงจากมากไปน้อย
                  .map((menuItem: any, index: number) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-100'}>
                      <td className="p-3 text-gray-800 font-light">{menuItem.name}</td>
                      <td className="p-3 text-center text-gray-800 font-light">
                        {menuItem.quantity.toLocaleString()} จาน
                      </td>
                      <td className="p-3 text-right text-gray-800 font-light">
                        ฿{menuItem.revenue.toLocaleString()}
                      </td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-gray-500 text-lg">
                    ไม่มีข้อมูลการขาย
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-800 bg-gray-800 text-white">
                <td className="p-3 font-light">รวมทั้งหมด:</td>
                <td className="p-3 text-center font-light text-sm">
                  {statsData?.menuStats?.reduce((sum: number, item: any) => sum + item.quantity, 0).toLocaleString() || '0'} จาน
                </td>
                <td className="p-3 text-right font-light text-sm">
                  ฿{statsData?.totalSales?.toLocaleString() || '0'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Daily Sales Table */}
      <div className="border border-gray-200 rounded-lg bg-white">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-gray-500" />
            <h4 className="text-lg font-light text-gray-800 tracking-wide">ยอดขายรายวัน</h4>
          </div>
        </div>
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-800 text-white sticky top-0">
              <tr>
                <th className="text-left p-3 font-light">วันที่</th>
                <th className="text-right p-3 font-light">ยอดขาย</th>
                <th className="text-right p-3 font-light">ออเดอร์</th>
              </tr>
            </thead>
            <tbody>
              {dailySalesData.length > 0 ? (
                dailySalesData.map((day, index) => (
                  <tr key={day.date} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-100'}>
                    <td className="p-3 text-gray-800 font-light">{day.displayDate}</td>
                    <td className="p-3 text-right text-gray-800 font-light">
                      ฿{day.total.toLocaleString()}
                    </td>
                    <td className="p-3 text-right text-gray-600 font-light">
                      {day.orders}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-gray-500 font-light text-sm">
                    ไม่มีข้อมูลการขาย
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}