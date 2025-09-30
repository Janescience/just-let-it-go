import React from 'react';
import { Calendar, TrendingUp, AlertTriangle, Users, Flame, Eye, ShoppingCart } from 'lucide-react';
import { Booth } from '@/types';

interface BoothStats {
  booth: Booth & {
    fixedCosts: number;
    totalSales: number;
    profit: number;
    breakEvenPercentage: number;
    dailyAverage: number;
    daysRunning: number;
    isBreakEven: boolean;
    remainingToBreakEven: number;
    remainingToPlannedBreakEven?: number;
    plannedBreakEven?: {
      revenue: number;
      units: number;
      progress: number;
      isAchieved: boolean;
    };
    menuStats: {
      name: string;
      quantity: number;
      revenue: number;
    }[];
    lowStockCount?: number;
    topSellingItem?: {
      name: string;
      quantity: number;
    };
    todaySales?: number;
  };
}

interface BoothCardProps {
  booth: Booth;
  stats?: BoothStats;
  isLoadingStats?: boolean;
  onClick: () => void;
  onSaleClick?: () => void;
}

export function BoothCard({ booth, stats, isLoadingStats = false, onClick, onSaleClick }: BoothCardProps) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short'
    });
  };

  const isExpired = new Date(booth.endDate) < new Date();
  const isUpcoming = new Date(booth.startDate) > new Date();

  // Recalculate break-even using the new method (same as BoothDetailModal)
  const { breakEvenPercentage, remaining, isBreakEven } = (() => {
    if (!booth.businessPlan?.fixedCosts?.total || !booth.businessPlan?.ingredients) {
      return {
        breakEvenPercentage: 0,
        remaining: 0,
        isBreakEven: false
      };
    }

    const fixedCosts = booth.businessPlan.fixedCosts.total;
    const ingredientCost = booth.businessPlan.ingredients.reduce((sum, ing) => sum + ing.cost, 0);
    const baseCapital = fixedCosts + ingredientCost;
    const reserveFund = baseCapital * 0.1;
    const correctBreakEvenRevenue = baseCapital + reserveFund;

    const totalSales = stats?.booth.totalSales || 0;
    const breakEvenPercentage = correctBreakEvenRevenue > 0 ? (totalSales / correctBreakEvenRevenue) * 100 : 0;
    const remaining = Math.max(0, correctBreakEvenRevenue - totalSales);
    const isBreakEven = breakEvenPercentage >= 100;

    return {
      breakEvenPercentage,
      remaining,
      isBreakEven
    };
  })();

  const profit = stats?.booth.profit || 0;

  const daysLeft = Math.max(
    0,
    Math.ceil(
      (new Date(booth.endDate).getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );

  const dailyTargetToBreakEven =
    !isBreakEven && daysLeft > 0 ? Math.ceil(remaining / daysLeft) : 0;

  // Check if booth is underperforming
  const isUnderperforming = (() => {
    if (!stats?.booth || isExpired || isUpcoming) return false;

    const daysRunning = stats.booth.daysRunning || 0;
    if (daysRunning < 2) return false; // Need at least 2 days to evaluate

    // Get daily target from business plan break-even
    const dailyTarget = booth.businessPlan?.breakEven?.dailyTarget || 0;
    if (dailyTarget === 0) return false;

    // Expected sales = daily target * days running
    const expectedSales = dailyTarget * daysRunning;
    const actualSales = stats.booth.totalSales || 0;

    // Consider underperforming if actual sales < 70% of expected sales
    const performanceRatio = actualSales / expectedSales;
    return performanceRatio < 0.7;
  })();

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent card click when clicking buttons
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    onClick();
  };

  const handleSaleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSaleClick) {
      onSaleClick();
    }
  };

  const handleViewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick();
  };

  return (
    <div
      className="cursor-pointer transition-all duration-300 border border-gray-200 bg-white hover:border-gray-300 flex flex-col h-full"
      onClick={handleCardClick}
    >
      {/* Header */}
      <div className="p-6 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-light text-black tracking-wide">
              <div className="flex items-center gap-2">
                {booth.name}
                {isUnderperforming && (
                  <div className="relative group">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      บูธกำลังขายได้น้อยกว่าเป้าหมาย
                    </div>
                  </div>
                )}
              </div>
            </h3>
            <div className="flex gap-2">
              {booth.isActive && !isExpired && !isUpcoming && (
                <span className="border border-gray-200 text-gray-700 px-2 py-0.5 text-xs font-light">
                  เปิดใช้งาน
                </span>
              )}
              {isExpired && (
                <span className="border border-gray-200 text-gray-500 px-2 py-0.5 text-xs font-light">
                  หมดอายุ
                </span>
              )}
              {isUpcoming && (
                <span className="border border-gray-200 text-gray-500 px-2 py-0.5 text-xs font-light">
                  ยังไม่เริ่ม
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end">
            <span className="border border-gray-200 text-gray-600 text-xs px-2 py-0.5 font-light">
              เหลือ {daysLeft} วัน
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 space-y-5 mb-2">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-light text-gray-600">
            {isLoadingStats && !stats ? (
              <>
                <div className="h-3 w-24 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-3 w-20 bg-gray-200 rounded animate-pulse"></div>
              </>
            ) : (
              <>
                <span>ขายได้แล้ว</span>
                <span className="text-gray-800 font-medium">
                  {isBreakEven ? 'กำไรแล้ว' : 'ยังไม่กำไร'}
                </span>
              </>
            )}
          </div>

          <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
            {isLoadingStats && !stats ? (
              <div className="h-2 w-1/4 bg-gray-300 animate-pulse"></div>
            ) : (
              <div
                className="h-2 bg-gray-800 transition-all duration-500"
                style={{ width: `${Math.min(breakEvenPercentage, 100)}%` }}
              />
            )}
          </div>

          <div className="flex justify-between text-sm mt-1 text-gray-600">
            {isLoadingStats && !stats ? (
              <>
                <div className="h-3 w-28 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-3 w-20 bg-gray-200 rounded animate-pulse"></div>
              </>
            ) : (
              <>
                <span>฿{(stats?.booth.totalSales || 0).toLocaleString()}</span>
                {isBreakEven ? (
                  <span className="font-medium text-green-600">
                    +฿{profit.toLocaleString()}
                  </span>
                ) : (
                  <span className="text-gray-500">
                    อีก ฿{remaining.toLocaleString()}
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="flex flex-col border border-gray-200 bg-gray-50 px-2 py-1">
            <div className="flex items-center gap-2 ">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-gray-500 text-xs">ยอดขายวันนี้</span>
            </div>
            {isLoadingStats && !stats ? (
              <div className="h-4 w-12 bg-gray-200 rounded animate-pulse ml-auto mt-1"></div>
            ) : (
              <span className="font-light text-right text-gray-800">
                ฿{(stats?.booth.todaySales || 0).toLocaleString()}
              </span>
            )}
          </div>

          <div className="flex flex-col border border-gray-200 bg-gray-50 px-2 py-1">
            <div className="flex items-center gap-2 ">
              <TrendingUp className="w-4 h-4 text-gray-500" />
              <span className="text-gray-500 text-xs">เฉลี่ย/วัน</span>
            </div>
            {isLoadingStats && !stats ? (
              <div className="h-4 w-16 bg-gray-200 rounded animate-pulse ml-auto mt-1"></div>
            ) : (
              <span className="font-light text-right text-gray-800">
                ฿{Math.round(stats?.booth.dailyAverage || 0).toLocaleString()}
              </span>
            )}
          </div>

          {(dailyTargetToBreakEven > 0 || (isLoadingStats && !stats)) && (
            <div className="flex flex-col border border-gray-200 bg-gray-50 px-2 py-1">
              <div className="flex items-center gap-2 ">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-gray-500 text-xs">เป้า/วัน</span>
              </div>
              {isLoadingStats && !stats ? (
                <div className="h-4 w-14 bg-gray-200 rounded animate-pulse ml-auto mt-1"></div>
              ) : (
                <span className="font-light text-right text-gray-800">
                  ฿{dailyTargetToBreakEven.toLocaleString()}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Alerts */}
        {isLoadingStats && !stats ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 border border-gray-200 px-3 py-2 bg-gray-50">
              <Flame className="w-4 h-4 text-gray-500" />
              <div className="h-3 w-32 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        ) : (
          stats?.booth.topSellingItem && (
            <div className="space-y-2">
                <div className="flex items-center gap-2 border border-gray-200 px-3 py-2 bg-gray-50">
                  <Flame className="w-4 h-4 text-gray-500" />
                  <span className="text-xs text-gray-700">
                    ขายดี:{' '}
                    <span className="font-medium text-gray-900">
                      {stats.booth.topSellingItem.name}
                    </span>{' '}
                    ({stats.booth.topSellingItem.quantity} ชิ้น)
                  </span>
                </div>
            </div>
          )
        )}
      </div>

      {/* Fixed Footer */}
      <div className="border-t border-gray-100  p-4 mt-auto">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>
              {formatDate(booth.startDate)} - {formatDate(booth.endDate)}
            </span>
          </div>
          {booth.employees?.length > 0 && (
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>
                {booth.employees.slice(0, 2).map((emp: any) => emp.name || 'พนักงาน').join(', ')}
                {booth.employees.length > 2 &&
                  ` +${booth.employees.length - 2}`}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleViewClick}
            className="flex-1 flex items-center justify-center gap-1 text-xs font-light px-3 py-2 border border-gray-200 text-black hover:bg-white transition-colors duration-200"
          >
            <Eye className="w-3 h-3" />
            ดูข้อมูล
          </button>
          {booth.isActive && !isExpired && !isUpcoming && onSaleClick && (
            <button
              onClick={handleSaleClick}
              className="flex-1 flex items-center justify-center gap-1 text-xs font-light px-3 py-2 bg-black text-white hover:bg-gray-800 transition-colors duration-200"
            >
              <ShoppingCart className="w-3 h-3" />
              ขาย
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
