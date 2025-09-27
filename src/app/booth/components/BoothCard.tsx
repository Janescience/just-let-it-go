import React from 'react';
import { MapPin, Calendar, TrendingUp, AlertTriangle, Users, Flame, Eye, ShoppingCart } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { Button } from '@/components/ui';
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
  onClick: () => void;
  onSaleClick?: () => void;
}

export function BoothCard({ booth, stats, onClick, onSaleClick }: BoothCardProps) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short'
    });
  };

  const isExpired = new Date(booth.endDate) < new Date();
  const isUpcoming = new Date(booth.startDate) > new Date();

  const plannedBreakEven = stats?.booth.plannedBreakEven;
  const breakEvenPercentage =
    (plannedBreakEven?.revenue ?? 0) > 0
      ? (plannedBreakEven?.progress ?? 0)
      : (stats?.booth.breakEvenPercentage || 0);

  const profit = stats?.booth.profit || 0;
  const isBreakEven =
    (plannedBreakEven?.revenue ?? 0) > 0
      ? (plannedBreakEven?.isAchieved ?? false)
      : (stats?.booth.isBreakEven || false);

  const remaining = (plannedBreakEven?.revenue ?? 0) > 0
    ? (stats?.booth.remainingToPlannedBreakEven || 0)
    : (stats?.booth.remainingToBreakEven || 0);

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
    <Card
      className="cursor-pointer transition-all duration-300 rounded-lg border border-gray-200 bg-white hover:shadow-md"
      onClick={handleCardClick}
    >
      {/* Header */}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg md:text-xl font-light text-gray-800 tracking-wide">
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
            </CardTitle>
            <div className="flex gap-2">
              {booth.isActive && !isExpired && !isUpcoming && (
                <span className="border border-gray-300 text-gray-700 px-2 py-0.5 rounded-full text-xs font-light">
                  เปิดใช้งาน
                </span>
              )}
              {isExpired && (
                <span className="border border-gray-300 text-gray-500 px-2 py-0.5 rounded-full text-xs font-light">
                  หมดอายุ
                </span>
              )}
              {isUpcoming && (
                <span className="border border-gray-300 text-gray-500 px-2 py-0.5 rounded-full text-xs font-light">
                  ยังไม่เริ่ม
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end">
            <span className="border border-gray-300 text-gray-600 text-xs px-2 py-0.5 rounded-full font-light">
              เหลือ {daysLeft} วัน
            </span>
          </div>
        </div>
      </CardHeader>

      {/* Content */}
      <CardContent className="space-y-5">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-light text-gray-600">
            <span>
              {(plannedBreakEven?.revenue ?? 0) > 0
                ? `ความคืบหน้า ${Math.round(breakEvenPercentage)}%`
                : `จุดคุ้มทุน ${Math.round(breakEvenPercentage)}%`}
            </span>
            <span className="text-gray-800 font-medium">
              {(plannedBreakEven?.revenue ?? 0) > 0
                ? isBreakEven
                  ? 'บรรลุแผน'
                  : 'ยังไม่ถึงเป้า'
                : isBreakEven
                  ? 'กำไร'
                  : 'ยังไม่คุ้มทุน'}
            </span>
          </div>

          <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
            <div
              className="h-2 bg-gray-800 transition-all duration-500"
              style={{ width: `${Math.min(breakEvenPercentage, 100)}%` }}
            />
          </div>

          <div className="flex justify-between text-sm mt-1 text-gray-600">
            {isBreakEven ? (
              <span className="font-medium text-gray-900">
                ฿{profit.toLocaleString()}
              </span>
            ) : (
              <>
                <span>ยอดขาย ฿{(stats?.booth.totalSales || 0).toLocaleString()}</span>
                <span>เหลือ ฿{remaining.toLocaleString()}</span>
              </>
            )}
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="flex flex-col border border-gray-200 rounded-md bg-gray-50 px-2 py-1">
            <div className="flex items-center gap-2 ">
              <Calendar className="w-4 h-4 text-blue-500" />
              <span className="text-gray-500 text-xs">วันนี้</span>
            </div>
            <span className="font-light text-right text-gray-800">
              ฿{(stats?.booth.todaySales || 0).toLocaleString()}
            </span>
          </div>

          <div className="flex flex-col border border-gray-200 rounded-md bg-gray-50 px-2 py-1">
            <div className="flex items-center gap-2 ">
              <TrendingUp className="w-4 h-4 text-gray-500" />
              <span className="text-gray-500 text-xs">เฉลี่ย/วัน</span>
            </div>
            <span className="font-light text-right text-gray-800">
              ฿{Math.round(stats?.booth.dailyAverage || 0).toLocaleString()}
            </span>
          </div>

          {dailyTargetToBreakEven > 0 && (
            <div className="flex flex-col border border-gray-200 rounded-md bg-gray-50 px-2 py-1">
              <div className="flex items-center gap-2 ">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-gray-500 text-xs">เป้า/วัน</span>
              </div>
              <span className="font-light text-right text-gray-800">
                ฿{dailyTargetToBreakEven.toLocaleString()}
              </span>
            </div>
          )}
        </div>


        {/* Alerts */}
        {(stats?.booth.topSellingItem && (
          <div className="space-y-2">
              <div className="flex items-center gap-2 border border-gray-200 px-3 py-2 rounded-md bg-gray-50">
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

        {/* Footer */}
        <div className="border-t pt-3 mt-auto">
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
                  {booth.employees.slice(0, 2).map((emp) => emp.name).join(', ')}
                  {booth.employees.length > 2 &&
                    ` +${booth.employees.length - 2}`}
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleViewClick}
              className="flex-1 flex items-center gap-1 text-xs font-light"
            >
              <Eye className="w-3 h-3" />
              ดูข้อมูล
            </Button>
            {booth.isActive && !isExpired && !isUpcoming && onSaleClick && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaleClick}
                className="flex-1 flex items-center gap-1 text-xs font-light"
              >
                <ShoppingCart className="w-3 h-3" />
                ขาย
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
