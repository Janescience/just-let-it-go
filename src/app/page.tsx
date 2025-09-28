'use client';

import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, DollarSign, Package, Download, Store, ShoppingCart, Users, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import OnboardingGuide from '@/components/ui/OnboardingGuide';

interface SalesData {
  totalSales: number;
  totalCost: number;
  totalProfit: number;
  totalOrders: number;
  averageOrderValue: number;
  topSellingItems: {
    name: string;
    quantity: number;
    revenue: number;
  }[];
  salesByBooth: {
    boothName: string;
    sales: number;
    profit: number;
  }[];
  dailySales: {
    date: string;
    sales: number;
    orders: number;
  }[];
}

interface DashboardStats {
  totalBooths: number;
  activeBooths: number;
  totalMenuItems: number;
  lowStockItems: number;
}

interface OnboardingStatus {
  completionStatus: {
    hasIngredients: boolean;
    hasMenuItems: boolean;
    hasEquipment: boolean;
    hasBooths: boolean;
    hasPaymentInfo: boolean;
  };
  allCompleted: boolean;
}

export default function HomePage() {
  const { user } = useAuth();
  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      console.log('Fetching onboarding status...');
      // First check onboarding status
      const onboardingResponse = await fetch('/api/onboarding/status');
      console.log('Onboarding response status:', onboardingResponse.status);

      if (onboardingResponse.ok) {
        const onboardingData = await onboardingResponse.json();
        console.log('Onboarding data:', onboardingData);
        setOnboardingStatus(onboardingData);

        // Only fetch dashboard data if onboarding is complete
        if (onboardingData.allCompleted) {
          console.log('Onboarding completed, fetching dashboard data');
          await fetchDashboardData();
        } else {
          console.log('Onboarding not completed, showing guide');
        }
      } else {
        console.error('Failed to fetch onboarding status:', await onboardingResponse.text());
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      // Fetch last 30 days sales data for brand overview
      const params = new URLSearchParams({
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
      });

      const [salesResponse, statsResponse] = await Promise.all([
        fetch(`/api/reports/sales?${params}`),
        fetch('/api/dashboard/stats')
      ]);

      console.log('Sales response status:', salesResponse.status);
      console.log('Stats response status:', statsResponse.status);

      if (salesResponse.ok) {
        const salesData = await salesResponse.json();
        console.log('Sales data:', salesData);
        setSalesData(salesData);
      } else {
        console.error('Sales API error:', await salesResponse.text());
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        console.log('Stats data:', statsData);
        setDashboardStats(statsData);
      } else {
        console.error('Stats API error:', await statsResponse.text());
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const exportToCSV = () => {
    if (!salesData) return;

    const csvData = [
      ['Metric', 'Value'],
      ['Total Sales (30 days)', salesData.totalSales.toLocaleString()],
      ['Total Cost', salesData.totalCost.toLocaleString()],
      ['Total Profit', salesData.totalProfit.toLocaleString()],
      ['Total Orders', salesData.totalOrders.toString()],
      ['Average Order Value', salesData.averageOrderValue.toFixed(2)],
      [''],
      ['Top Selling Items', ''],
      ['Item Name', 'Quantity', 'Revenue'],
      ...salesData.topSellingItems.map(item => [item.name, item.quantity.toString(), item.revenue.toLocaleString()]),
      [''],
      ['Sales by Booth', ''],
      ['Booth Name', 'Sales', 'Profit'],
      ...salesData.salesByBooth.map(booth => [booth.boothName, booth.sales.toLocaleString(), booth.profit.toLocaleString()])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brand-dashboard-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl sm:text-2xl font-thin text-black tracking-wider">กำลังโหลด...</h1>
                <p className="text-sm font-light text-gray-500 mt-1">โปรดรอสักครู่</p>
              </div>
            </div>
          </div>
        </div>
        <div className="p-4 tablet:p-6">
          <div className="text-center py-8">กำลังโหลดข้อมูล...</div>
        </div>
      </div>
    );
  }

  // Show onboarding guide if setup is not complete
  if (onboardingStatus && !onboardingStatus.allCompleted) {
    console.log('Showing onboarding guide with status:', onboardingStatus.completionStatus);
    return <OnboardingGuide completionStatus={onboardingStatus.completionStatus} />;
  }

  console.log('Showing dashboard, onboarding status:', onboardingStatus);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-light text-black tracking-wide">แดชบอร์ด</h1>
              <p className="text-sm font-light text-gray-500 mt-1">ภาพรวมข้อมูลและสถิติ 30 วันที่ผ่านมา</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={fetchData}
                className="px-4 py-2 border border-gray-200 text-sm font-light text-black hover:bg-gray-50 transition-colors duration-200 tracking-wide"
              >
                รีเฟรช
              </button>
              <Button
                variant="secondary"
                onClick={exportToCSV}
                icon={Download}
                disabled={!salesData}
              >
                Export CSV
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 tablet:p-6 pb-20">

        {/* Financial Overview */}
        {salesData && (
          <div className="mb-8">
            <label className="text-lg font-light text-black tracking-wide mb-6 block">สรุปยอดขายและกำไร</label>
            <div className="grid grid-cols-1 tablet:grid-cols-3 gap-6">
              <div className="border border-gray-100 p-6">
                <div className="flex items-center gap-4">
                  <DollarSign className="w-8 h-8 text-gray-600" />
                  <div>
                    <div className="text-xs font-light text-gray-400 mb-1 tracking-wider uppercase">ยอดขายรวม</div>
                    <div className="text-2xl font-light text-black mb-1">
                      ฿{salesData.totalSales.toLocaleString()}
                    </div>
                    <div className="text-sm font-light text-gray-500">30 วันที่ผ่านมา</div>
                  </div>
                </div>
              </div>

              <div className="border border-gray-100 p-6">
                <div className="flex items-center gap-4">
                  <TrendingUp className="w-8 h-8 text-gray-600" />
                  <div>
                    <div className="text-xs font-light text-gray-400 mb-1 tracking-wider uppercase">กำไรสุทธิ</div>
                    <div className="text-2xl font-light text-black mb-1">
                      ฿{salesData.totalProfit.toLocaleString()}
                    </div>
                    <div className="text-sm font-light text-gray-500">หลังหักต้นทุน</div>
                  </div>
                </div>
              </div>

              <div className="border border-gray-100 p-6">
                <div className="flex items-center gap-4">
                  <ShoppingCart className="w-8 h-8 text-gray-600" />
                  <div>
                    <div className="text-xs font-light text-gray-400 mb-1 tracking-wider uppercase">ออเดอร์ทั้งหมด</div>
                    <div className="text-2xl font-light text-black mb-1">
                      {salesData.totalOrders.toLocaleString()}
                    </div>
                    <div className="text-sm font-light text-gray-500">รายการ</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Business Stats */}
        {dashboardStats && (
          <div className="mb-8">
            <label className="text-lg font-light text-black tracking-wide mb-6 block">สถิติธุรกิจ</label>
            <div className="grid grid-cols-2 tablet:grid-cols-4 gap-4">
              <div className="border border-gray-100 p-6">
                <div className="flex items-center gap-3">
                  <Store className="w-6 h-6 text-gray-600" />
                  <div>
                    <div className="text-xs font-light text-gray-400 mb-1 tracking-wider uppercase">บูธทั้งหมด</div>
                    <div className="text-xl font-light text-black">
                      {dashboardStats.totalBooths}
                    </div>
                    <div className="text-sm font-light text-gray-500">{dashboardStats.activeBooths} เปิดใช้งาน</div>
                  </div>
                </div>
              </div>

              <div className="border border-gray-100 p-6">
                <div className="flex items-center gap-3">
                  <Package className="w-6 h-6 text-gray-600" />
                  <div>
                    <div className="text-xs font-light text-gray-400 mb-1 tracking-wider uppercase">เมนูทั้งหมด</div>
                    <div className="text-xl font-light text-black">
                      {dashboardStats.totalMenuItems}
                    </div>
                    <div className="text-sm font-light text-gray-500">รายการ</div>
                  </div>
                </div>
              </div>

              <div className="border border-gray-100 p-6">
                <div className="flex items-center gap-3">
                  <Clock className="w-6 h-6 text-gray-600" />
                  <div>
                    <div className="text-xs font-light text-gray-400 mb-1 tracking-wider uppercase">สต็อกใกล้หมด</div>
                    <div className="text-xl font-light text-black">
                      {dashboardStats.lowStockItems}
                    </div>
                    <div className="text-sm font-light text-gray-500">รายการ</div>
                  </div>
                </div>
              </div>

              <div className="border border-gray-100 p-6">
                <div className="flex items-center gap-3">
                  <Users className="w-6 h-6 text-gray-600" />
                  <div>
                    <div className="text-xs font-light text-gray-400 mb-1 tracking-wider uppercase">ยอดขายเฉลี่ย</div>
                    <div className="text-xl font-light text-black">
                      ฿{salesData?.averageOrderValue.toFixed(0) || 0}
                    </div>
                    <div className="text-sm font-light text-gray-500">ต่อออเดอร์</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Section */}
        {salesData ? (
          <div className="space-y-8">
            {/* Sales Analytics Grid */}
            <div>
              <label className="text-lg font-light text-black tracking-wide mb-6 block">การวิเคราะห์ยอดขาย</label>
              <div className="grid tablet:grid-cols-2 gap-6">
                {/* Top Selling Items */}
                <div className="border border-gray-100 p-6">
                  <label className="text-base font-light text-black tracking-wide mb-6 block">เมนูขายดีอันดับต้น</label>
                  <div className="space-y-4">
                    {salesData.topSellingItems.slice(0, 8).map((item, index) => (
                      <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 border border-gray-200 flex items-center justify-center text-sm font-light text-gray-600">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-light text-black">{item.name}</div>
                            <div className="text-sm font-light text-gray-500">{item.quantity} ชิ้น</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-light text-black">
                            ฿{item.revenue.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sales by Booth */}
                <div className="border border-gray-100 p-6">
                  <label className="text-base font-light text-black tracking-wide mb-6 block">ยอดขายตามบูธ</label>
                  <div className="space-y-4">
                    {salesData.salesByBooth.map((booth, index) => (
                      <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                        <div>
                          <div className="font-light text-black">{booth.boothName}</div>
                          <div className="text-sm font-light text-gray-500">
                            กำไร: ฿{booth.profit.toLocaleString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-light text-black">
                            ฿{booth.sales.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Daily Sales Timeline */}
            <div className="border border-gray-100 p-6">
              <label className="text-lg font-light text-black tracking-wide mb-6 block">ยอดขายรายวัน (7 วันล่าสุด)</label>
              <div className="space-y-3">
                {salesData.dailySales.slice(-7).reverse().map((day, index) => (
                  <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                    <div>
                      <div className="font-light text-black">
                        {new Date(day.date).toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                      <div className="text-sm font-light text-gray-500">{day.orders} ออเดอร์</div>
                    </div>
                    <div className="font-light text-black">
                      ฿{day.sales.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <BarChart3 className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <label className="text-lg font-light text-gray-600 mb-2 block">ยังไม่มีข้อมูลการขาย</label>
            <p className="font-light text-gray-400">เริ่มขายเพื่อดูสถิติในแดชบอร์ด</p>
          </div>
        )}
      </div>
    </div>
  );
}