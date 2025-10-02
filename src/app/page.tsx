'use client';

import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, ComposedChart, LabelList, CartesianGrid, Legend } from 'recharts';
import { Calendar, Store, TrendingUp, TrendingDown, AlertTriangle, AlertCircle, Info, Clock, Users, Utensils } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import OnboardingGuide from '@/components/ui/OnboardingGuide';
import SuperAdminReturn from '@/components/ui/SuperAdminReturn';

interface MenuItem {
  menuItemId: string;
  name: string;
  quantity: number;
  revenue: number;
  color?: string;
}

interface BoothSalesData {
  _id: string;
  boothName: string;
  menuItems: MenuItem[];
  totalQuantity: number;
  totalRevenue: number;
}

interface MenuProfit {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  revenue: number;
  cost: number;
  profit: number;
  color?: string;
}

interface BoothProfitData {
  _id: string;
  boothName: string;
  menuItems: MenuProfit[];
  totalQuantity: number;
  totalRevenue: number;
  totalProfit: number;
}

interface BoothDateData {
  boothId: string;
  boothName: string;
  dates: string[];
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

interface TopPerformer {
  name: string;
  quantity: number;
  revenue: number;
  boothName: string;
}

interface InventoryAlert {
  _id: string;
  name: string;
  unit: string;
  currentStock: number;
  minimumStock: number;
  costPerUnit: number;
  severity: 'critical' | 'warning' | 'low';
  stockRatio: number;
}

interface CustomerPatterns {
  peakHours: Array<{
    hour: number;
    orderCount: number;
    totalRevenue: number;
    hourDisplay: string;
  }>;
  orderSizes: Array<{
    sizeCategory: string;
    orderCount: number;
    avgRevenue: number;
    totalRevenue: number;
  }>;
  popularCombinations: Array<{
    combination: string;
    frequency: number;
  }>;
}

interface BoothDate {
  date: string;
  displayName: string;
}

interface IngredientUsage {
  _id: string;
  name: string;
  unit: string;
  totalUsed: number;
  costPerUnit: number;
  totalValue: number;
}

interface DailySummary {
  date: string;
  revenue: number;
  cost: number;
  profit: number;
  displayDate: string;
}

export default function HomePage() {
  const { user } = useAuth();
  const [boothSalesData, setBoothSalesData] = useState<BoothSalesData[]>([]);
  const [boothProfitData, setBoothProfitData] = useState<BoothProfitData[]>([]);
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingBooths, setLoadingBooths] = useState<{[boothId: string]: boolean}>({});
  const [boothDatesData, setBoothDatesData] = useState<BoothDateData[]>([]);
  const [selectedDates, setSelectedDates] = useState<{[boothId: string]: string}>({});
  const [topPerformers, setTopPerformers] = useState<{best: TopPerformer[], worst: TopPerformer[]}>({best: [], worst: []});
  const [inventoryAlerts, setInventoryAlerts] = useState<InventoryAlert[]>([]);
  const [customerPatterns, setCustomerPatterns] = useState<CustomerPatterns>({peakHours: [], orderSizes: [], popularCombinations: []});
  const [boothIngredients, setBoothIngredients] = useState<{[boothId: string]: IngredientUsage[]}>({});
  const [selectedIngredient, setSelectedIngredient] = useState<{[boothId: string]: IngredientUsage | null}>({});
  const [boothDailySummary, setBoothDailySummary] = useState<{[boothId: string]: DailySummary[]}>({});
  const [isMobile, setIsMobile] = useState(false);

  const SALES_COLORS = ['#000000', '#1a1a1a', '#333333', '#4d4d4d', '#666666', '#808080', '#999999', '#b3b3b3', '#cccccc', '#e6e6e6'];
  const PROFIT_COLORS = ['#065f46', '#047857', '#059669', '#10b981', '#34d399', '#6ee7b7', '#9decf9', '#67e8f9', '#22d3ee', '#06b6d4'];

  const CustomMobilePieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, quantity, revenue }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 15;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    const lineStartX = cx + outerRadius * Math.cos(-midAngle * RADIAN);
    const lineStartY = cy + outerRadius * Math.sin(-midAngle * RADIAN);
    const lineEndX = cx + (outerRadius + 10) * Math.cos(-midAngle * RADIAN);
    const lineEndY = cy + (outerRadius + 10) * Math.sin(-midAngle * RADIAN);

    const shortName = name.length > 8 ? `${name.substring(0, 6)}...` : name;

    return (
      <g>
        <line
          x1={lineStartX}
          y1={lineStartY}
          x2={lineEndX}
          y2={lineEndY}
          stroke="#666"
          strokeWidth={1}
        />
        <text
          x={x}
          y={y}
          fill="#333"
          textAnchor={x > cx ? 'start' : 'end'}
          dominantBaseline="central"
          fontSize="7"
          fontWeight="normal"
        >
          {shortName}
        </text>
      </g>
    );
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    // Center scroll for pie charts on mobile
    if (isMobile) {
      const pieChartContainers = document.querySelectorAll('.pie-chart-scroll');
      pieChartContainers.forEach(container => {
        const scrollContainer = container as HTMLElement;
        const scrollWidth = scrollContainer.scrollWidth;
        const clientWidth = scrollContainer.clientWidth;
        const scrollLeft = (scrollWidth - clientWidth) / 2;
        scrollContainer.scrollLeft = scrollLeft;
      });
    }
  }, [isMobile, boothSalesData, boothProfitData]);

  useEffect(() => {
    if (onboardingStatus?.allCompleted && boothDatesData.length > 0) {
      fetchAllBoothSalesData();
      fetchAllBoothProfitData();
      fetchAllBoothIngredients();
      fetchAllBoothDailySummary();
    }
  }, [selectedDates, onboardingStatus, boothDatesData]);

  const fetchData = async () => {
    try {
      // First check onboarding status
      const onboardingResponse = await fetch('/api/onboarding/status');

      if (onboardingResponse.ok) {
        const onboardingData = await onboardingResponse.json();
        setOnboardingStatus(onboardingData);

        // Only fetch dashboard data if onboarding is complete
        if (onboardingData.allCompleted) {
          await fetchBoothDates();
          await fetchInventoryAlerts();
          await fetchCustomerPatterns();
          await fetchTopPerformers();
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBoothDates = async () => {
    try {
      const response = await fetch('/api/booths/dates');
      if (response.ok) {
        const boothDates = await response.json();
        setBoothDatesData(boothDates);

        // Initialize selected dates with today's date for each booth
        const todayDate = getTodayDate();
        const initialDates: {[boothId: string]: string} = {};
        boothDates.forEach((booth: BoothDateData) => {
          // Use today's date if available, otherwise use 'all'
          const hasToday = booth.dates.includes(todayDate);
          initialDates[booth.boothId] = hasToday ? todayDate : 'all';
        });
        setSelectedDates(initialDates);
      }
    } catch (error) {
      console.error('Error fetching booth dates:', error);
    }
  };

  const fetchAllBoothSalesData = async () => {
    try {
      const allBoothData: BoothSalesData[] = [];

      for (const booth of boothDatesData) {
        const selectedDate = selectedDates[booth.boothId] || 'today';
        const params = new URLSearchParams();
        params.append('boothId', booth.boothId);
        if (selectedDate !== 'all') {
          params.append('date', selectedDate);
        }

        const response = await fetch(`/api/dashboard/menu-sales?${params}`);
        if (response.ok) {
          const data = await response.json();
          if (data.length > 0) {
            const boothData = data[0]; // Should only be one booth since we filtered by boothId

            // Sort by quantity descending and take top 10
            const sortedItems = boothData.menuItems.sort((a: any, b: any) => b.quantity - a.quantity);
            const top10Items = sortedItems.slice(0, 10);
            const otherItems = sortedItems.slice(10);

            // Process top 10 items
            const processedItems = top10Items.map((item: any, index: number) => ({
              ...item,
              value: item.quantity,
              color: SALES_COLORS[index % SALES_COLORS.length]
            }));

            // Add "อื่นๆ" category if there are more than 10 items
            if (otherItems.length > 0) {
              const othersQuantity = otherItems.reduce((sum: number, item: any) => sum + item.quantity, 0);
              const othersRevenue = otherItems.reduce((sum: number, item: any) => sum + item.revenue, 0);

              processedItems.push({
                menuItemId: 'others',
                name: 'อื่นๆ',
                quantity: othersQuantity,
                revenue: othersRevenue,
                value: othersQuantity,
                color: '#9CA3AF' // Gray color for others
              });
            }

            boothData.menuItems = processedItems;
            allBoothData.push(boothData);
          }
        }

        // Clear loading state for this booth
        setLoadingBooths(prev => ({
          ...prev,
          [booth.boothId]: false
        }));
      }

      setBoothSalesData(allBoothData);
    } catch (error) {
      console.error('Error fetching booth sales data:', error);
      // Clear all loading states on error
      setLoadingBooths({});
    }
  };

  const fetchTopPerformers = async () => {
    try {
      const response = await fetch('/api/dashboard/menu-sales?allBooths=true');
      if (response.ok) {
        const allBoothData = await response.json();

        const allMenuItems: (MenuItem & {boothName: string})[] = [];

        allBoothData.forEach((booth: BoothSalesData) => {
          booth.menuItems.forEach(item => {
            // Skip "อื่นๆ" category for performers analysis
            if (item.menuItemId !== 'others') {
              allMenuItems.push({
                ...item,
                boothName: booth.boothName
              });
            }
          });
        });

        // Sort by quantity (descending for best, ascending for worst)
        const sortedByQuantity = [...allMenuItems].sort((a, b) => b.quantity - a.quantity);

        const bestPerformers = sortedByQuantity.slice(0, 5).map(item => ({
          name: item.name,
          quantity: item.quantity,
          revenue: item.revenue,
          boothName: item.boothName
        }));

        const worstPerformers = sortedByQuantity.slice(-5).reverse().map(item => ({
          name: item.name,
          quantity: item.quantity,
          revenue: item.revenue,
          boothName: item.boothName
        }));

        setTopPerformers({
          best: bestPerformers,
          worst: worstPerformers
        });
      }
    } catch (error) {
      console.error('Error fetching top performers:', error);
    }
  };

  const fetchInventoryAlerts = async () => {
    try {
      const response = await fetch('/api/dashboard/inventory-alerts');
      if (response.ok) {
        const alerts = await response.json();
        setInventoryAlerts(alerts);
      }
    } catch (error) {
      console.error('Error fetching inventory alerts:', error);
    }
  };

  const fetchCustomerPatterns = async () => {
    try {
      const response = await fetch('/api/dashboard/customer-patterns');
      if (response.ok) {
        const patterns = await response.json();
        setCustomerPatterns(patterns);
      }
    } catch (error) {
      console.error('Error fetching customer patterns:', error);
    }
  };

  const fetchAllBoothProfitData = async () => {
    try {
      const allBoothData: BoothProfitData[] = [];

      for (const booth of boothDatesData) {
        const selectedDate = selectedDates[booth.boothId] || 'today';
        const params = new URLSearchParams();
        params.append('boothId', booth.boothId);
        if (selectedDate !== 'all') {
          params.append('date', selectedDate);
        }

        const response = await fetch(`/api/dashboard/menu-profits?${params}`);
        if (response.ok) {
          const data = await response.json();
          if (data.length > 0) {
            const boothData = data[0]; // Should only be one booth since we filtered by boothId

            // Sort by profit descending and take top 10
            const sortedItems = boothData.menuItems.sort((a: any, b: any) => b.profit - a.profit);
            const top10Items = sortedItems.slice(0, 10);
            const otherItems = sortedItems.slice(10);

            // Process top 10 items
            const processedItems = top10Items.map((item: any, index: number) => ({
              ...item,
              value: item.profit,
              color: PROFIT_COLORS[index % PROFIT_COLORS.length]
            }));

            // Add "อื่นๆ" category if there are more than 10 items
            if (otherItems.length > 0) {
              const othersProfit = otherItems.reduce((sum: number, item: any) => sum + item.profit, 0);

              processedItems.push({
                menuItemId: 'others',
                name: 'อื่นๆ',
                price: 0,
                quantity: otherItems.reduce((sum: number, item: any) => sum + item.quantity, 0),
                revenue: otherItems.reduce((sum: number, item: any) => sum + item.revenue, 0),
                cost: otherItems.reduce((sum: number, item: any) => sum + item.cost, 0),
                profit: othersProfit,
                value: othersProfit,
                color: '#9CA3AF' // Gray color for others
              });
            }

            boothData.menuItems = processedItems;
            allBoothData.push(boothData);
          }
        }

        // Clear loading state for this booth
        setLoadingBooths(prev => ({
          ...prev,
          [booth.boothId]: false
        }));
      }

      setBoothProfitData(allBoothData);
    } catch (error) {
      console.error('Error fetching booth profit data:', error);
      // Clear all loading states on error
      setLoadingBooths({});
    }
  };

  const fetchAllBoothDailySummary = async () => {
    try {
      const allBoothDaily: {[boothId: string]: DailySummary[]} = {};

      for (const booth of boothDatesData) {
        const response = await fetch(`/api/dashboard/booth-daily-summary?boothId=${booth.boothId}`);
        if (response.ok) {
          const dailyData = await response.json();
          allBoothDaily[booth.boothId] = dailyData;
        } else {
          console.error('Failed to fetch daily data for booth', booth.boothId, response.status);
        }
      }

      setBoothDailySummary(allBoothDaily);
    } catch (error) {
      console.error('Error fetching booth daily summary:', error);
    }
  };

  const fetchAllBoothIngredients = async () => {
    try {
      const allBoothIngredients: {[boothId: string]: IngredientUsage[]} = {};

      for (const booth of boothDatesData) {
        const selectedDate = selectedDates[booth.boothId] || 'today';
        const params = new URLSearchParams();
        params.append('boothId', booth.boothId);
        if (selectedDate !== 'all') {
          params.append('date', selectedDate);
        }

        const response = await fetch(`/api/dashboard/booth-ingredients?${params}`);
        if (response.ok) {
          const ingredients = await response.json();
          allBoothIngredients[booth.boothId] = ingredients;
        }
      }

      setBoothIngredients(allBoothIngredients);
    } catch (error) {
      console.error('Error fetching booth ingredients:', error);
    }
  };

  const handleDateChange = (boothId: string, date: string) => {
    setLoadingBooths(prev => ({
      ...prev,
      [boothId]: true
    }));

    setSelectedDates(prev => ({
      ...prev,
      [boothId]: date
    }));

    // Clear selected ingredient when date changes
    setSelectedIngredient(prev => ({
      ...prev,
      [boothId]: null
    }));
  };

  const handleBarClick = (data: any, boothId: string) => {
    setSelectedIngredient(prev => ({
      ...prev,
      [boothId]: data
    }));
  };

  const getAvailableDatesForBooth = (boothId: string) => {
    const booth = boothDatesData.find(b => b.boothId === boothId);
    if (!booth) return [];

    return [
      { date: 'all', displayName: 'ทุกวัน' },
      ...booth.dates.map((date: string) => ({
        date,
        displayName: new Date(date).toLocaleDateString('th-TH', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      }))
    ];
  };

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const now = new Date();
    // Use Thailand timezone for consistency
    const serverTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    let thailandNow;
    if (serverTimezone === 'Asia/Bangkok') {
      thailandNow = now;
    } else {
      // Add 7 hours for Thailand time
      const thailandOffset = 7 * 60 * 60 * 1000;
      thailandNow = new Date(now.getTime() + thailandOffset);
    }

    return thailandNow.toISOString().split('T')[0]; // YYYY-MM-DD
  };

  const CustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, quantity, revenue }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 30; // Position label outside the pie
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    // Only show label if percentage is significant enough (>1%)
    if (percent < 0.01) return null;

    // Draw line from pie edge to label
    const lineStartX = cx + outerRadius * Math.cos(-midAngle * RADIAN);
    const lineStartY = cy + outerRadius * Math.sin(-midAngle * RADIAN);
    const lineEndX = cx + (outerRadius + 20) * Math.cos(-midAngle * RADIAN);
    const lineEndY = cy + (outerRadius + 20) * Math.sin(-midAngle * RADIAN);

    return (
      <g>
        {/* Connection line */}
        <line
          x1={lineStartX}
          y1={lineStartY}
          x2={lineEndX}
          y2={lineEndY}
          stroke="#666666"
          strokeWidth={1}
        />
        {/* Menu name */}
        <text
          x={x}
          y={y - 8}
          fill="#000000"
          textAnchor={x > cx ? 'start' : 'end'}
          dominantBaseline="central"
          fontSize={11}
          fontWeight="500"
        >
          {name}
        </text>
        {/* Quantity and revenue */}
        <text
          x={x}
          y={y + 8}
          fill="#666666"
          textAnchor={x > cx ? 'start' : 'end'}
          dominantBaseline="central"
          fontSize={10}
          fontWeight="400"
        >
          {`${quantity} จาน • ฿${revenue?.toLocaleString()}`}
        </text>
      </g>
    );
  };

  const CustomProfitPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, quantity, profit }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 30; // Position label outside the pie
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    // Only show label if percentage is significant enough (>1%)
    if (percent < 0.01) return null;

    // Draw line from pie edge to label
    const lineStartX = cx + outerRadius * Math.cos(-midAngle * RADIAN);
    const lineStartY = cy + outerRadius * Math.sin(-midAngle * RADIAN);
    const lineEndX = cx + (outerRadius + 20) * Math.cos(-midAngle * RADIAN);
    const lineEndY = cy + (outerRadius + 20) * Math.sin(-midAngle * RADIAN);

    return (
      <g>
        {/* Connection line */}
        <line
          x1={lineStartX}
          y1={lineStartY}
          x2={lineEndX}
          y2={lineEndY}
          stroke="#666666"
          strokeWidth={1}
        />
        {/* Menu name */}
        <text
          x={x}
          y={y - 8}
          fill="#000000"
          textAnchor={x > cx ? 'start' : 'end'}
          dominantBaseline="central"
          fontSize={11}
          fontWeight="500"
        >
          {name}
        </text>
        {/* Quantity and profit */}
        <text
          x={x}
          y={y + 8}
          fill="#666666"
          textAnchor={x > cx ? 'start' : 'end'}
          dominantBaseline="central"
          fontSize={10}
          fontWeight="400"
        >
          {`${quantity} จาน • ฿${profit?.toLocaleString()}`}
        </text>
      </g>
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload; // Get the original data
      return (
        <div className="bg-black p-3 border border-gray-700 shadow-lg rounded">
          <p className="font-light text-white">{data.name}</p>
          <p className="font-light text-gray-300">จำนวน: {data.quantity} จาน</p>
          <p className="font-light text-gray-300">ยอดขาย: ฿{data.revenue?.toLocaleString()}</p>
        </div>
      );
    }
    return null;
  };

  const CustomProfitTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload; // Get the original data
      return (
        <div className="bg-black p-3 border border-gray-700 shadow-lg rounded">
          <p className="font-light text-white">{data.name}</p>
          <p className="font-light text-gray-300">จำนวน: {data.quantity} จาน</p>
          <p className="font-light text-gray-300">กำไร: ฿{data.profit?.toLocaleString()}</p>
        </div>
      );
    }
    return null;
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
        <div className="p-4 tablet:p-6 pb-24">
          <div className="text-center py-8 text-gray-600 font-light">กำลังโหลดข้อมูล...</div>
        </div>
      </div>
    );
  }

  // Show onboarding guide if setup is not complete
  if (onboardingStatus && !onboardingStatus.allCompleted) {
    return <OnboardingGuide completionStatus={onboardingStatus.completionStatus} />;
  }

  return (
    <div className="min-h-screen bg-white pb-24">
      <SuperAdminReturn />
      {/* Header */}
      <div className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-thin text-black tracking-wider">แดชบอร์ด</h1>
              <p className="text-sm font-light text-gray-500 mt-1">ยอดขายเมนูจากบูธที่กำลังขาย</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 tablet:p-6 pb-24">
        {/* Inventory Alerts Section */}
        {inventoryAlerts.length > 0 && (
          <div className="mb-8">
            <div className="border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-5 h-5 text-black" />
                <h3 className="text-lg font-thin text-black tracking-wider">แจ้งเตือนสต็อกวัตถุดิบ</h3>
                <span className="border border-gray-300 text-black px-2 py-1 text-sm font-light">
                  {inventoryAlerts.length} รายการ
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inventoryAlerts.map((alert) => {
                  const getSeverityColor = (severity: string) => {
                    switch (severity) {
                      case 'critical': return 'border-black';
                      case 'warning': return 'border-gray-400';
                      default: return 'border-gray-300';
                    }
                  };

                  const getSeverityIcon = (severity: string) => {
                    switch (severity) {
                      case 'critical': return <AlertCircle className="w-4 h-4 text-black" />;
                      case 'warning': return <AlertTriangle className="w-4 h-4 text-gray-600" />;
                      default: return <Info className="w-4 h-4 text-gray-400" />;
                    }
                  };

                  const getSeverityText = (severity: string) => {
                    switch (severity) {
                      case 'critical': return 'วิกฤต';
                      case 'warning': return 'เตือน';
                      default: return 'ต่ำ';
                    }
                  };

                  return (
                    <div key={alert._id} className={`p-4 border ${getSeverityColor(alert.severity)}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-light text-black">{alert.name}</div>
                        <div className="flex items-center gap-1">
                          {getSeverityIcon(alert.severity)}
                          <span className="text-sm font-light">{getSeverityText(alert.severity)}</span>
                        </div>
                      </div>
                      <div className="text-sm font-light text-gray-600 mb-2">
                        คงเหลือ: {alert.currentStock} {alert.unit}
                      </div>
                      <div className="text-sm font-light text-gray-600 mb-2">
                        ขั้นต่ำ: {alert.minimumStock} {alert.unit}
                      </div>
                      <div className="text-sm font-light text-gray-600">
                        ต้นทุน: ฿{alert.costPerUnit.toLocaleString()}/{alert.unit}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Top Performers Section */}
        {topPerformers.best.length > 0 && (
          <div className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Best Performers */}
            <div className="border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="w-5 h-5 text-black" />
                <h3 className="text-lg font-thin text-black tracking-wider">เมนูขายดีสุด</h3>
              </div>
              <div className="space-y-3">
                {topPerformers.best.map((item, index) => (
                  <div key={`best-${index}`} className="flex items-center justify-between p-3 border border-gray-200">
                    <div className="flex-1">
                      <div className="font-light text-black">{item.name}</div>
                      <div className="text-sm font-light text-gray-600">{item.boothName}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-light text-black">{item.quantity} จาน</div>
                      <div className="text-sm font-light text-gray-600">฿{item.revenue.toLocaleString()}</div>
                    </div>
                    <div className="ml-3 w-8 h-8 bg-black text-white flex items-center justify-center text-sm font-light">
                      {index + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Worst Performers */}
            <div className="border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <TrendingDown className="w-5 h-5 text-black" />
                <h3 className="text-lg font-thin text-black tracking-wider">เมนูขายน้อยสุด</h3>
              </div>
              <div className="space-y-3">
                {topPerformers.worst.map((item, index) => (
                  <div key={`worst-${index}`} className="flex items-center justify-between p-3 border border-gray-200">
                    <div className="flex-1">
                      <div className="font-light text-black">{item.name}</div>
                      <div className="text-sm font-light text-gray-600">{item.boothName}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-light text-black">{item.quantity} จาน</div>
                      <div className="text-sm font-light text-gray-600">฿{item.revenue.toLocaleString()}</div>
                    </div>
                    <div className="ml-3 w-8 h-8 bg-gray-400 text-white flex items-center justify-center text-sm font-light">
                      {index + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Customer Patterns Section */}
        {(customerPatterns.peakHours.length > 0 || customerPatterns.orderSizes.length > 0 || customerPatterns.popularCombinations.length > 0) && (
          <div className="mb-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Peak Hours */}
            {customerPatterns.peakHours.length > 0 && (
              <div className="border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Clock className="w-5 h-5 text-black" />
                  <h3 className="text-lg font-thin text-black tracking-wider">ช่วงเวลาขายดี</h3>
                </div>
                <div className="space-y-3">
                  {customerPatterns.peakHours.slice(0, 5).map((hour, index) => (
                    <div key={hour.hour} className="flex items-center justify-between p-3 border border-gray-200">
                      <div className="flex-1">
                        <div className="font-light text-black">{hour.hourDisplay}</div>
                        <div className="text-sm font-light text-gray-600">{hour.orderCount} ออเดอร์</div>
                      </div>
                      <div className="text-right">
                        <div className="font-light text-black">฿{hour.totalRevenue.toLocaleString()}</div>
                      </div>
                      <div className="ml-3 w-8 h-8 bg-black text-white flex items-center justify-center text-sm font-light">
                        {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Order Sizes */}
            {customerPatterns.orderSizes.length > 0 && (
              <div className="border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Users className="w-5 h-5 text-black" />
                  <h3 className="text-lg font-thin text-black tracking-wider">ขนาดออเดอร์</h3>
                </div>
                <div className="space-y-3">
                  {customerPatterns.orderSizes.map((size) => (
                    <div key={size.sizeCategory} className="p-3 border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-light text-black">{size.sizeCategory}</div>
                        <div className="font-light text-black">{size.orderCount} ออเดอร์</div>
                      </div>
                      <div className="text-sm font-light text-gray-600">
                        เฉลี่ย: ฿{size.avgRevenue.toLocaleString()}/ออเดอร์
                      </div>
                      <div className="text-sm font-light text-gray-600">
                        รวม: ฿{size.totalRevenue.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Popular Combinations */}
            {customerPatterns.popularCombinations.length > 0 && (
              <div className="border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Utensils className="w-5 h-5 text-black" />
                  <h3 className="text-lg font-thin text-black tracking-wider">เมนูคู่ยอดนิยม</h3>
                </div>
                <div className="space-y-3">
                  {customerPatterns.popularCombinations.slice(0, 5).map((combo, index) => (
                    <div key={`${combo.combination}-${index}`} className="p-3 border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-light text-black text-sm leading-relaxed">{combo.combination}</div>
                        <div className="ml-3 w-8 h-8 bg-black text-white flex items-center justify-center text-sm font-light">
                          {index + 1}
                        </div>
                      </div>
                      <div className="text-sm font-light text-gray-600">
                        {combo.frequency} ครั้ง
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Booth Charts */}
        {boothDatesData.length > 0 ? (
          <div className={`grid gap-8 ${
            boothDatesData.length === 1
              ? 'grid-cols-1'
              : boothDatesData.length === 2
                ? 'grid-cols-1 lg:grid-cols-2'
                : 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3'
          }`}>
            {boothDatesData.map((boothDate) => {
              const booth = boothSalesData.find(b => b._id === boothDate.boothId);
              const selectedDate = selectedDates[boothDate.boothId] || 'today';
              const availableDates = getAvailableDatesForBooth(boothDate.boothId);

              return (
                <div key={boothDate.boothId} className="border border-gray-200 p-6">
                  {/* Header with booth name */}
                  <div className="flex items-center gap-3 mb-6">
                    <Store className="w-5 h-5 text-black" />
                    <div className="text-lg font-thin text-black tracking-wider">
                      {booth ? booth.boothName : boothDate.boothName}
                    </div>
                  </div>

                  {loadingBooths[boothDate.boothId] ? (
                    <div className="text-center py-16">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
                      <p className="font-light text-gray-500">กำลังโหลดข้อมูล...</p>
                    </div>
                  ) : booth && booth.menuItems.length > 0 ? (
                    <div className="space-y-6">
                      {/* Daily Sales & Profit Chart - Top */}
                      {boothDailySummary[boothDate.boothId] && boothDailySummary[boothDate.boothId].length > 0 && (
                        <div className="border-b border-gray-200 pb-6">
                          <h4 className="text-sm font-light text-black mb-4 tracking-wider text-center">ยอดขายและกำไรรายวัน</h4>
                          <div className="h-64 md:h-80 overflow-x-auto">
                            <div style={{ width: isMobile ? `${Math.max(boothDailySummary[boothDate.boothId]?.length * 60, 400)}px` : '100%', height: '100%' }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart
                                  data={boothDailySummary[boothDate.boothId]}
                                  margin={{ top: 30, right: 5, left: 0, bottom: 10 }}
                                >
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis
                                  dataKey="displayDate"
                                  fontSize={isMobile ? 9 : 10}
                                  tick={{ fill: '#666666' }}
                                  axisLine={false}
                                  tickLine={false}
                                  interval={0}
                                />
                                <YAxis
                                  fontSize={isMobile ? 7 : 9}
                                  tick={{ fill: '#666666' }}
                                  width={isMobile ? 35 : 45}
                                  axisLine={false}
                                  tickLine={false}
                                />
                                <Tooltip
                                  formatter={(value: any, name: any) => [
                                    `฿${value.toLocaleString()}`,
                                    name === 'revenue' ? 'ยอดขาย' : 'กำไร'
                                  ]}
                                  labelFormatter={(label) => `วันที่ ${label}`}
                                  contentStyle={{
                                    backgroundColor: '#ffffff',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '4px',
                                    fontSize: '12px'
                                  }}
                                />
                                <Legend
                                  wrapperStyle={{
                                    fontSize: isMobile ? '10px' : '12px',
                                    paddingTop: '10px'
                                  }}
                                  formatter={(value) => value === 'revenue' ? 'ยอดขาย' : 'กำไร'}
                                />
                                <Bar
                                  dataKey="revenue"
                                  fill="#666666"
                                  name="revenue"
                                  radius={[2, 2, 0, 0]}
                                >
                                  <LabelList
                                    dataKey="revenue"
                                    position="top"
                                    fontSize={isMobile ? 8 : 10}
                                    fill="#333"
                                    formatter={(value: any) => {
                                      const numValue = Number(value);
                                      return numValue > 0 ? `฿${(numValue / 1000).toFixed(0)}k` : '';
                                    }}
                                  />
                                </Bar>
                                <Bar
                                  dataKey="profit"
                                  fill="#059669"
                                  name="profit"
                                  radius={[2, 2, 0, 0]}
                                >
                                  <LabelList
                                    dataKey="profit"
                                    position="top"
                                    fontSize={isMobile ? 8 : 10}
                                    fill="#059669"
                                    formatter={(value: any) => {
                                      const numValue = Number(value);
                                      return numValue > 0 ? `฿${(numValue / 1000).toFixed(0)}k` : '';
                                    }}
                                  />
                                </Bar>
                              </ComposedChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Date Selection */}
                      <div className="bg-gray-50 p-4 border border-gray-200 mb-6">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <Calendar className="w-4 h-4 text-black" />
                          <select
                            value={selectedDate}
                            onChange={(e) => handleDateChange(boothDate.boothId, e.target.value)}
                            className="px-3 py-2 border border-gray-300 font-light text-black focus:border-black focus:outline-none bg-white text-sm rounded"
                          >
                            {availableDates.map((dateOption) => (
                              <option key={dateOption.date} value={dateOption.date}>
                                {dateOption.displayName}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="text-xs text-gray-500 text-center">
                          ข้อมูลด้านล่างแสดงตามวันที่ที่เลือก
                        </div>
                      </div>

                      {/* Revenue and Profit Summary */}
                      {booth && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-gray-200 pb-6">
                          {/* Revenue */}
                          <div className="text-center p-4 border border-gray-200">
                            <div className="text-sm font-light text-gray-500">ยอดขายรวม</div>
                            <div className="text-xl font-light text-black">
                              ฿{booth.totalRevenue.toLocaleString()}
                            </div>
                            <div className="text-sm font-light text-gray-500">
                              {booth.totalQuantity} จาน
                            </div>
                          </div>
                          {/* Profit */}
                          {(() => {
                            const profitBooth = boothProfitData.find(b => b._id === boothDate.boothId);
                            return (
                              <div className="text-center p-4 border border-gray-200">
                                <div className="text-sm font-light text-gray-500">กำไรรวม</div>
                                <div className="text-xl font-light text-black">
                                  {profitBooth ? `฿${profitBooth.totalProfit.toLocaleString()}` : 'ไม่มีข้อมูล'}
                                </div>
                                <div className="text-sm font-light text-gray-500">
                                  {profitBooth ? `${profitBooth.totalQuantity} จาน` : 'ต้นทุนวัตถุดิบ'}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* Pie Charts Row */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Sales Pie Chart */}
                        <div>
                          <h4 className="text-sm font-light text-black mb-4 tracking-wider text-center">ยอดขายแต่ละเมนู</h4>
                          <div className="h-[400px] overflow-x-auto pie-chart-scroll">
                            <div style={{ width: isMobile ? '500px' : '100%', height: '100%' }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                <Pie
                                  data={booth.menuItems as any}
                                  cx="50%"
                                  cy="50%"
                                  labelLine={false}
                                  label={CustomPieLabel}
                                  outerRadius={isMobile ? 110 : 120}
                                  fill="#8884d8"
                                  dataKey="value"
                                >
                                  {booth.menuItems.map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        </div>

                        {/* Profit Pie Chart */}
                        {(() => {
                          const profitBooth = boothProfitData.find(b => b._id === boothDate.boothId);
                          return profitBooth && profitBooth.menuItems.length > 0 ? (
                            <div>
                              <h4 className="text-sm font-light text-black mb-4 tracking-wider text-center">กำไรแต่ละเมนู</h4>
                              <div className="h-[400px] overflow-x-auto pie-chart-scroll">
                                <div style={{ width: isMobile ? '500px' : '100%', height: '100%' }}>
                                  <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                    <Pie
                                      data={profitBooth.menuItems as any}
                                      cx="50%"
                                      cy="50%"
                                      labelLine={false}
                                      label={CustomProfitPieLabel}
                                      outerRadius={isMobile ? 110 : 120}
                                      fill="#8884d8"
                                      dataKey="value"
                                    >
                                      {profitBooth.menuItems.map((entry: any, index: number) => (
                                        <Cell key={`profit-cell-${index}`} fill={entry.color} />
                                      ))}
                                    </Pie>
                                    <Tooltip content={<CustomProfitTooltip />} />
                                    </PieChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center h-[400px] border border-gray-200">
                              <div className="text-center">
                                <div className="text-sm font-light text-gray-600 mb-2">ไม่มีข้อมูลกำไร</div>
                                <div className="text-xs font-light text-gray-400">ยังไม่มีข้อมูลต้นทุนวัตถุดิบ</div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Ingredients Usage Bar Chart */}
                      {boothIngredients[boothDate.boothId] && boothIngredients[boothDate.boothId].length > 0 && (
                        <div className="mt-6 pt-6 border-t border-gray-200">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-light text-black tracking-wider">การใช้วัตถุดิบ</h4>
                            <div className="text-right">
                              <div className="text-sm font-light text-gray-500">ต้นทุนรวม</div>
                              <div className="text-lg font-medium text-black">
                                ฿{boothIngredients[boothDate.boothId].reduce((sum, item) => sum + item.totalValue, 0).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <div className="h-80 overflow-x-auto">
                            <div style={{ width: isMobile ? `${Math.max(boothIngredients[boothDate.boothId]?.length * 80, 400)}px` : '100%', height: '100%' }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                  data={boothIngredients[boothDate.boothId]}
                                  margin={{ top: isMobile ? 20 : 50, right: isMobile ? 10 : 30, left: isMobile ? 5 : 20, bottom: isMobile ? 60 : 80 }}
                                >
                                <XAxis
                                  dataKey="name"
                                  angle={isMobile ? 0 : -45}
                                  textAnchor={isMobile ? "middle" : "end"}
                                  height={isMobile ? 60 : 80}
                                  fontSize={isMobile ? 10 : 10}
                                  tick={{ fill: '#666666' }}
                                  axisLine={false}
                                  tickLine={false}
                                  interval={0}
                                />
                                <YAxis
                                  fontSize={isMobile ? 8 : 10}
                                  tick={{ fill: '#666666' }}
                                  width={isMobile ? 30 : 40}
                                  axisLine={false}
                                  tickLine={false}
                                />
                                <Tooltip
                                  content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                      const data = payload[0].payload;
                                      return (
                                        <div className="bg-white p-3 border border-gray-300 shadow-lg rounded text-black">
                                          <p className="font-medium">{label}</p>
                                          <p className="text-sm">จำนวน: {data.totalUsed.toLocaleString()} {data.unit}</p>
                                          <p className="text-sm">มูลค่า: ฿{data.totalValue.toLocaleString()}</p>
                                        </div>
                                      );
                                    }
                                    return null;
                                  }}
                                />
                                <Bar
                                  dataKey="totalUsed"
                                  fill="#000000"
                                  radius={[2, 2, 0, 0]}
                                  onClick={(data) => handleBarClick(data, boothDate.boothId)}
                                  style={{ cursor: 'pointer' }}
                                />
                              </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>

                          {/* Selected Ingredient Info */}
                          {selectedIngredient[boothDate.boothId] && (
                            <div className="mt-4 p-4 border border-gray-300 bg-gray-50">
                              <div className="flex items-center justify-between mb-2">
                                <h5 className="font-medium text-black">{selectedIngredient[boothDate.boothId]?.name}</h5>
                                <button
                                  onClick={() => setSelectedIngredient(prev => ({ ...prev, [boothDate.boothId]: null }))}
                                  className="text-gray-400 hover:text-gray-600"
                                >
                                  ✕
                                </button>
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-600">จำนวนใช้:</span>
                                  <div className="font-medium">
                                    {selectedIngredient[boothDate.boothId]?.totalUsed.toLocaleString()} {selectedIngredient[boothDate.boothId]?.unit}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-gray-600">มูลค่า:</span>
                                  <div className="font-medium">
                                    ฿{selectedIngredient[boothDate.boothId]?.totalValue.toLocaleString()}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-base font-thin text-gray-600 mb-2">ไม่มีข้อมูลการขาย</h3>
                      <p className="font-light text-gray-400">
                        {selectedDate === 'today' ? 'ยังไม่มีการขายในวันนี้' : `ไม่มีข้อมูลการขายในวันที่เลือก`}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="border border-gray-200 p-6">
            <div className="text-center py-16">
              <Store className="w-20 h-20 text-gray-300 mx-auto mb-4" />
              <h2 className="text-lg font-thin text-gray-600 mb-2">ไม่มีบูธที่ใช้งาน</h2>
              <p className="font-light text-gray-400">ยังไม่มีบูธที่กำลังใช้งานหรือยังไม่มีข้อมูลการขาย</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}