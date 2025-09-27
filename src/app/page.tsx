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

      if (salesResponse.ok) {
        const salesData = await salesResponse.json();
        setSalesData(salesData);
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setDashboardStats(statsData);
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-thin text-black tracking-wider">แดชบอร์ด</h1>
              <p className="text-sm font-light text-gray-500 mt-1">ภาพรวมข้อมูลและสถิติ</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 tablet:p-6 pb-20">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-light text-gray-900 mb-2">ภาพรวมธุรกิจ</h1>
              <p className="text-gray-600">สรุปข้อมูลทั้งหมดของแบรนด์ในช่วง 30 วันที่ผ่านมา</p>
            </div>
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

        {/* Main Stats Grid */}
        {dashboardStats && (
          <div className="grid grid-cols-2 tablet:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Store className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <div className="text-lg text-gray-600">บูธทั้งหมด</div>
                  <div className="text-2xl font-light text-blue-600">
                    {dashboardStats.totalBooths}
                  </div>
                  <div className=" text-gray-500">{dashboardStats.activeBooths} เปิดใช้งาน</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Package className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <div className="text-lg text-gray-600">เมนูทั้งหมด</div>
                  <div className="text-2xl font-light text-purple-600">
                    {dashboardStats.totalMenuItems}
                  </div>
                  <div className=" text-gray-500">รายการ</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <div className="text-lg text-gray-600">สต็อกใกล้หมด</div>
                  <div className="text-2xl font-light text-orange-600">
                    {dashboardStats.lowStockItems}
                  </div>
                  <div className=" text-gray-500">รายการ</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <div className="text-lg text-gray-600">ยอดขายเฉลี่ย</div>
                  <div className="text-2xl font-light text-gray-600">
                    ฿{salesData?.averageOrderValue.toFixed(0) || 0}
                  </div>
                  <div className=" text-gray-500">ต่อออเดอร์</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {salesData ? (
          <>
            {/* Financial Summary */}
            <div className="grid grid-cols-1 tablet:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-8 h-8 text-green-600" />
                  </div>
                  <div>
                    <div className="text-lg text-gray-600 mb-1">ยอดขายรวม</div>
                    <div className="text-3xl font-light text-green-600 mb-1">
                      ฿{salesData.totalSales.toLocaleString()}
                    </div>
                    <div className="text-lg text-gray-500">30 วันที่ผ่านมา</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-8 h-8 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-lg text-gray-600 mb-1">กำไรสุทธิ</div>
                    <div className="text-3xl font-light text-blue-600 mb-1">
                      ฿{salesData.totalProfit.toLocaleString()}
                    </div>
                    <div className="text-lg text-gray-500">หลังหักต้นทุน</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center">
                    <ShoppingCart className="w-8 h-8 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-lg text-gray-600 mb-1">ออเดอร์ทั้งหมด</div>
                    <div className="text-3xl font-light text-purple-600 mb-1">
                      {salesData.totalOrders.toLocaleString()}
                    </div>
                    <div className="text-lg text-gray-500">รายการ</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts and Tables */}
            <div className="grid tablet:grid-cols-2 gap-6">
              {/* Top Selling Items */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-light mb-6">เมนูขายดีอันดับต้น</h3>
                <div className="space-y-4">
                  {salesData.topSellingItems.slice(0, 8).map((item, index) => (
                    <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg  ${
                          index === 0 ? 'bg-yellow-100 text-yellow-800' :
                          index === 1 ? 'bg-gray-100 text-gray-800' :
                          index === 2 ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <div className=" text-gray-900">{item.name}</div>
                          <div className="text-lg text-gray-500">{item.quantity} ชิ้น</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className=" text-green-600">
                          ฿{item.revenue.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sales by Booth */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-light mb-6">ยอดขายตามบูธ</h3>
                <div className="space-y-4">
                  {salesData.salesByBooth.map((booth, index) => (
                    <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                      <div>
                        <div className=" text-gray-900">{booth.boothName}</div>
                        <div className="text-lg text-gray-500">
                          กำไร: ฿{booth.profit.toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className=" text-blue-600">
                          ฿{booth.sales.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Daily Sales */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 mt-6">
              <h3 className="text-lg font-light mb-6">ยอดขายรายวัน (7 วันล่าสุด)</h3>
              <div className="space-y-3">
                {salesData.dailySales.slice(-7).reverse().map((day, index) => (
                  <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                    <div>
                      <div className=" text-gray-900">
                        {new Date(day.date).toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                      <div className="text-lg text-gray-500">{day.orders} ออเดอร์</div>
                    </div>
                    <div className=" text-green-600">
                      ฿{day.sales.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-16">
            <BarChart3 className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-light text-gray-500 mb-2">ยังไม่มีข้อมูลการขาย</h3>
            <p className="text-gray-400">เริ่มขายเพื่อดูสถิติในแดชบอร์ด</p>
          </div>
        )}
      </div>
    </div>
  );
}