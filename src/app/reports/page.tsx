'use client';

import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, DollarSign, Package, Calendar, Download, Filter } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DashboardPageLoading } from '@/components/ui';

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

export default function ReportsPage() {
  const { user } = useAuth();
  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    endDate: new Date().toISOString().split('T')[0] // today
  });
  const [selectedBooth, setSelectedBooth] = useState<string>('all');
  const [booths, setBooths] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchBooths();
      fetchSalesData();
    }
  }, [user, dateRange, selectedBooth]);

  const fetchBooths = async () => {
    try {
      const response = await fetch('/api/booths');
      if (response.ok) {
        const data = await response.json();
        setBooths(data.booths);
      }
    } catch (error) {
      console.error('Error fetching booths:', error);
    }
  };

  const fetchSalesData = async () => {
    try {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        ...(selectedBooth !== 'all' && { boothId: selectedBooth })
      });

      const response = await fetch(`/api/reports/sales?${params}`);
      if (response.ok) {
        const data = await response.json();
        setSalesData(data);
      }
    } catch (error) {
      console.error('Error fetching sales data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!salesData) return;

    const csvData = [
      ['Metric', 'Value'],
      ['Total Sales', salesData.totalSales.toLocaleString()],
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
    a.download = `sales-report-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <DashboardPageLoading title="รายงานการขาย" />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-thin text-black tracking-wider">รายงาน</h1>
              <p className="text-sm font-light text-gray-500 mt-1">วิเคราะห์ข้อมูลการขายและผลกำไร</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 tablet:p-6 pb-20">
        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5" />
            <h3 className="font-light">ตัวกรอง</h3>
          </div>

          <div className="grid tablet:grid-cols-4 gap-4">
            <div>
              <Input
                label="วันที่เริ่ม"
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              />
            </div>

            <div>
              <Input
                label="วันที่สิ้นสุด"
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-lg font-light text-gray-700 mb-2">
                หน้าร้าน
              </label>
              <select
                value={selectedBooth}
                onChange={(e) => setSelectedBooth(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="all">ทุกหน้าร้าน</option>
                {booths.map(booth => (
                  <option key={booth._id} value={booth._id}>
                    {booth.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <Button
                variant="primary"
                onClick={exportToCSV}
                icon={Download}
                disabled={!salesData}
              >
                Export CSV
              </Button>
            </div>
          </div>
        </div>

        {salesData ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 tablet:grid-cols-5 gap-4 mb-6">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <div className="text-lg text-gray-600">ยอดขาย</div>
                    <div className="text-lg font-light text-green-600">
                      ฿{salesData.totalSales.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-lg text-gray-600">กำไร</div>
                    <div className="text-lg font-light text-blue-600">
                      ฿{salesData.totalProfit.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Package className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-lg text-gray-600">ออเดอร์</div>
                    <div className="text-lg font-light text-purple-600">
                      {salesData.totalOrders.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <div className="text-lg text-gray-600">ค่าเฉลี่ย/ออเดอร์</div>
                    <div className="text-lg font-light text-orange-600">
                      ฿{salesData.averageOrderValue.toFixed(0)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <div className="text-lg text-gray-600">ต้นทุน</div>
                    <div className="text-lg font-light text-red-600">
                      ฿{salesData.totalCost.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts and Tables */}
            <div className="grid tablet:grid-cols-2 gap-6">
              {/* Top Selling Items */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="font-light mb-4">เมนูขายดี</h3>
                <div className="space-y-3">
                  {salesData.topSellingItems.slice(0, 5).map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <div className="font-light">{item.name}</div>
                        <div className="text-lg text-gray-600">{item.quantity} ชิ้น</div>
                      </div>
                      <div className="text-right">
                        <div className="font-light text-green-600">
                          ฿{item.revenue.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sales by Booth */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="font-light mb-4">ยอดขายตามหน้าร้าน</h3>
                <div className="space-y-3">
                  {salesData.salesByBooth.map((booth, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <div className="font-light">{booth.boothName}</div>
                        <div className="text-lg text-gray-600">
                          กำไร: ฿{booth.profit.toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-light text-blue-600">
                          ฿{booth.sales.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Daily Sales Chart */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 mt-6">
              <h3 className="font-light mb-4">ยอดขายรายวัน</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {salesData.dailySales.map((day, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100">
                    <div>
                      <div className="font-light">
                        {new Date(day.date).toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                      <div className="text-lg text-gray-600">{day.orders} ออเดอร์</div>
                    </div>
                    <div className="font-light text-green-600">
                      ฿{day.sales.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-light text-gray-500 mb-2">ไม่มีข้อมูลการขาย</h3>
            <p className="text-gray-400">ในช่วงเวลาที่เลือก</p>
          </div>
        )}
      </div>
    </div>
  );
}