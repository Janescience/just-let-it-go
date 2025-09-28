import React, { useState, useEffect } from 'react';
import { Store, DollarSign, Package } from 'lucide-react';
import { Modal } from '@/components/ui';
import { Booth } from '@/types';
import { BoothSalesTab } from './BoothSalesTab';
import { BoothMenuTab } from './BoothMenuTab';

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
  };
}

interface BoothDetailModalProps {
  booth: Booth;
  stats?: BoothStats;
  onClose: () => void;
  onEdit: () => void;
  onEditMenu: () => void;
  onDelete: () => void;
  onRefresh: () => void;
  onOpenMenuModal: () => void;
}

export function BoothDetailModal({
  booth,
  stats,
  onClose,
  onEdit,
  onEditMenu,
  onDelete,
  onRefresh,
  onOpenMenuModal
}: BoothDetailModalProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'detail' | 'sales' | 'menu'>('detail');
  const [preloadedData, setPreloadedData] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(true);

  // Preload data for all tabs when modal opens
  useEffect(() => {
    const preloadAllData = async () => {
      setDataLoading(true);
      try {
        // Fetch booth stats (for SalesTab and BusinessPlanTab)
        const statsResponse = await fetch(`/api/booths/${booth._id}/stats`);
        const statsData = statsResponse.ok ? await statsResponse.json() : null;

        // Fetch daily sales data (for SalesTab)
        const salesResponse = await fetch(`/api/sales`);
        const salesData = salesResponse.ok ? await salesResponse.json() : null;

        setPreloadedData({
          stats: statsData,
          sales: salesData
        });
      } catch (error) {
        console.error('Error preloading data:', error);
      } finally {
        setDataLoading(false);
      }
    };

    preloadAllData();
  }, [booth._id]);

  const toggleBoothStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/booths/${booth._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...booth,
          isActive: !booth.isActive
        })
      });

      if (response.ok) {
        onRefresh();
        onClose();
      }
    } catch (error) {
      console.error('Error updating booth status:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isExpired = new Date(booth.endDate) < new Date();
  const isUpcoming = new Date(booth.startDate) > new Date();

  const footerButtons = (
    <div className="p-6">
      <div className="flex gap-3 justify-end">
        <button
          onClick={onEdit}
          className="px-6 py-2 border border-gray-200 text-sm font-light text-black hover:bg-gray-50 transition-colors duration-200 tracking-wide"
        >
          แก้ไข
        </button>
        <button
          onClick={onDelete}
          className="px-6 py-2 border border-red-200 text-sm font-light text-red-600 hover:bg-red-50 transition-colors duration-200 tracking-wide"
        >
          ลบ
        </button>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`${booth.name}`}
      size="full"
      className="w-[95vw] h-[95vh]"
      hasFixedFooter={true}
      footer={footerButtons}
    >

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-100 px-6">
          <button
            onClick={() => setActiveTab('detail')}
            className={`px-6 py-4 text-sm font-light tracking-wide transition-all duration-200 ${
              activeTab === 'detail'
                ? 'text-black border-b-2 border-black'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            ข้อมูลร้าน
          </button>
          <button
            onClick={() => setActiveTab('sales')}
            className={`px-6 py-4 text-sm font-light tracking-wide transition-all duration-200 ${
              activeTab === 'sales'
                ? 'text-black border-b-2 border-black'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            ยอดขาย
          </button>
          <button
            onClick={() => setActiveTab('menu')}
            className={`px-6 py-4 text-sm font-light tracking-wide transition-all duration-200 ${
              activeTab === 'menu'
                ? 'text-black border-b-2 border-black'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            จัดการเมนู
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
        {/* Tab 1: Booth Detail - Step3Summary Style */}
        {activeTab === 'detail' && (
          <div className="space-y-6">

            {/* Step 1 Summary: Basic Information */}
            <div className="border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Store className="w-4 h-4 text-gray-600" />
                <label className="text-lg font-light text-black tracking-wide">ข้อมูลพื้นฐาน</label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="font-light">ชื่อบูธ:</span>
                    <span className="font-light text-black">{booth.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-light">สถานที่:</span>
                    <span className="font-light text-gray-700">{booth.location}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-light">ระยะเวลา:</span>
                    <span className="font-light text-gray-700">{Math.ceil((new Date(booth.endDate).getTime() - new Date(booth.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} วัน ({formatDate(booth.startDate)} - {formatDate(booth.endDate)})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-light">เวลาทำการ:</span>
                    <span className="font-light text-gray-700">{booth.openingHours?.start} - {booth.openingHours?.end}</span>
                  </div>
                  {booth.businessPlan?.equipmentId && (
                    <div className="flex justify-between">
                      <span className="font-light">อุปกรณ์:</span>
                      <span className="font-light text-gray-700">
                        {typeof booth.businessPlan.equipmentId === 'object' && booth.businessPlan.equipmentId !== null && 'name' in booth.businessPlan.equipmentId
                          ? (booth.businessPlan.equipmentId as any).name
                          : 'มีอุปกรณ์ชุดประจำหน้าร้าน'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="font-light">ค่าเช่าบูธ:</span>
                    <span className="font-light text-black">฿{booth.rentCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-light">พนักงาน:</span>
                    <span className="font-light text-gray-700">{booth.employees?.length || 0} คน</span>
                  </div>
                  {booth.businessPlan && (
                    <div className="flex justify-between">
                      <span className="font-light">ค่าแรงรวม:</span>
                      <span className="font-light text-black">
                        ฿{booth.businessPlan.fixedCosts?.staff?.toLocaleString() || '0'}
                      </span>
                    </div>
                  )}
                  {booth.employees && booth.employees.length > 0 && (
                    <div className="space-y-1">
                      <div className="font-light">รายชื่อพนักงาน:</div>
                      {booth.employees.map((emp, index) => (
                        <div key={index} className="text-sm font-light text-gray-600">
                          {emp.name} ({emp.position || 'พนักงาน'}) - ฿{emp.salary}/วัน
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="mb-2 font-light">ข้อมูลการเข้าสู่ระบบ POS</div>
                  <div className="border border-gray-100 p-3">
                    <div className="text-xs font-light text-gray-400 tracking-wider uppercase">Username:</div>
                    <div className="font-light text-black">{booth.staff?.username}</div>
                  </div>
                  <div className="border border-gray-100 p-3">
                    <div className="text-xs font-light text-gray-400 tracking-wider uppercase">Password:</div>
                    <div className="font-light text-black">{booth.staff?.password}</div>
                  </div>
                </div>
              </div>
            </div>


            {/* Financial Summary */}
            {booth.businessPlan && (
              <div className="border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="w-4 h-4 text-gray-600" />
                  <label className="text-lg font-light text-black tracking-wide">สรุปรวม</label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="font-light">ต้นทุนคงที่:</span>
                        <span className="font-light text-black">
                          ฿{booth.businessPlan.fixedCosts?.total?.toLocaleString() || '0'}
                        </span>
                      </div>
                      <div className="pl-4 space-y-1 text-sm text-gray-600">
                        <div className="flex justify-between">
                          <span className="font-light">- ค่าเช่าบูธ ({Math.ceil((new Date(booth.endDate).getTime() - new Date(booth.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} วัน):</span>
                          <span className="font-light">฿{booth.businessPlan.fixedCosts?.rent?.toLocaleString() || booth.rentCost.toLocaleString()}</span>
                        </div>
                        {booth.businessPlan.fixedCosts?.staff && (
                          <div className="flex justify-between">
                            <span className="font-light">- ค่าแรงพนักงาน ({Math.ceil((new Date(booth.endDate).getTime() - new Date(booth.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} วัน):</span>
                            <span className="font-light">฿{booth.businessPlan.fixedCosts.staff.toLocaleString()}</span>
                          </div>
                        )}
                        {(() => {
                          // Show equipment cost if there's an equipmentId or if total > (rent + staff)
                          const hasEquipment = booth.businessPlan.equipmentId;
                          const rent = booth.businessPlan.fixedCosts?.rent || 0;
                          const staff = booth.businessPlan.fixedCosts?.staff || 0;
                          const total = booth.businessPlan.fixedCosts?.total || 0;
                          const additionalExpenses = booth.businessPlan.fixedCosts?.additionalExpenses || 0;
                          const equipmentFromCalc = total - rent - staff - additionalExpenses;
                          const equipmentCost = booth.businessPlan.fixedCosts?.equipment || equipmentFromCalc;

                          return (hasEquipment || equipmentCost > 0) && (
                            <div className="flex justify-between">
                              <span className="font-light">- ค่าอุปกรณ์ ({Math.ceil((new Date(booth.endDate).getTime() - new Date(booth.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} วัน):</span>
                              <span className="font-light">฿{Math.max(equipmentCost, 0).toLocaleString()}</span>
                            </div>
                          );
                        })()}
                        {/* Additional Costs Details */}
                        {booth.businessPlan.additionalExpenses && booth.businessPlan.additionalExpenses.length > 0 && (
                          <div className="space-y-2">
                            <div className="font-light text-gray-600">- ค่าใช้จ่ายเพิ่มเติม:</div>
                            {booth.businessPlan.additionalExpenses.map((expense, index) => (
                              <div key={index} className="flex justify-between pl-4">
                                <span className="font-light text-gray-600">• {expense.description}</span>
                                <span className="font-light">฿{expense.amount.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Fallback for old data structure */}
                        {!booth.businessPlan.additionalExpenses && booth.businessPlan.fixedCosts?.additionalExpenses && (
                          <div className="flex justify-between">
                            <span className="font-light">- ค่าใช้จ่ายเพิ่มเติม:</span>
                            <span className="font-light">฿{booth.businessPlan.fixedCosts.additionalExpenses.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Variable Costs Section */}
                    {booth.businessPlan.ingredients && (
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="font-light">ต้นทุนผันแปร:</span>
                          <span className="font-light text-black">
                            ฿{booth.businessPlan.ingredients.reduce((sum: number, ing: any) => sum + (ing.cost || 0), 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="pl-4 space-y-1 text-sm text-gray-600">
                          <div className="flex justify-between">
                            <span className="font-light">- ค่าวัตถุดิบ:</span>
                            <span className="font-light">฿{booth.businessPlan.ingredients.reduce((sum: number, ing: any) => sum + (ing.cost || 0), 0).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Reserve Fund Section */}
                    {booth.businessPlan.fixedCosts?.total && booth.businessPlan.ingredients && (
                      <div className="flex justify-between border-t pt-2">
                        <span className="font-light">เงินสำรอง (10%):</span>
                        <span className="font-light text-black">
                          ฿{((booth.businessPlan.fixedCosts.total + booth.businessPlan.ingredients.reduce((sum: number, ing: any) => sum + (ing.cost || 0), 0)) * 0.1).toLocaleString()}
                        </span>
                      </div>
                    )}

                    {booth.businessPlan.breakEven && (
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="font-light">เป้าหมายคุ้มทุน:</span>
                          <span className="font-light text-black">{booth.businessPlan.breakEven.unitsNeeded} จาน</span>
                        </div>
                        <div className="pl-4 space-y-1 text-sm text-gray-600">
                          <div className="flex justify-between">
                            <span className="font-light">- รายได้ต้องการ:</span>
                            <span className="font-light">฿{booth.businessPlan.breakEven.revenueNeeded?.toLocaleString() || '0'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-light">- เป้าหมายต่อวัน:</span>
                            <span className="font-light">{booth.businessPlan.breakEven.dailyTarget || 0} จาน</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-center">
                    <div className="border border-gray-100 p-6 text-center">
                      <div className="text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">เงินทุนที่ใช้</div>
                      <div className="text-3xl font-light text-black tracking-wide">
                        ฿{booth.businessPlan.totalCapital?.toLocaleString() || '0'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Profit Ladder */}
            {booth.businessPlan && booth.businessPlan.breakEven && (
              <div className="border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Package className="w-4 h-4 text-gray-600" />
                  <label className="text-lg font-light text-black tracking-wide">เปรียบเทียบกำไร</label>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-center py-2 px-2 whitespace-nowrap font-light">เปอร์เซ็นต์กำไร</th>
                        <th className="text-right py-2 px-2 whitespace-nowrap font-light">ต้นทุนคงที่</th>
                        <th className="text-right py-2 px-2 whitespace-nowrap font-light">ต้นทุนผันแปร</th>
                        <th className="text-right py-2 px-2 whitespace-nowrap font-light">เงินทุนรวม</th>
                        <th className="text-right py-2 px-2 whitespace-nowrap font-light">กำไรที่ได้</th>
                        <th className="text-right py-2 px-2 whitespace-nowrap font-light">ขายได้</th>
                        <th className="text-center py-2 px-2 whitespace-nowrap font-light">ขายทั้งหมด (จาน)</th>
                        <th className="text-center py-2 px-2 whitespace-nowrap font-light">วันล่ะ (จาน)</th>
                        <th className="text-right py-2 px-2 whitespace-nowrap font-light">ขายได้วันล่ะ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[10, 20, 30, 40, 50, 60, 70].map(profit => {
                        const targetProfitDecimal = profit / 100;
                        const fixedCosts = booth.businessPlan!.fixedCosts.total;
                        const numberOfDays = Math.ceil((new Date(booth.endDate).getTime() - new Date(booth.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;

                        // Use the same average price calculation as Step3Summary
                        const averagePrice = booth.businessPlan!.breakEven.revenueNeeded > 0 && booth.businessPlan!.breakEven.unitsNeeded > 0
                          ? booth.businessPlan!.breakEven.revenueNeeded / booth.businessPlan!.breakEven.unitsNeeded
                          : 100; // fallback price

                        // Use iterative calculation like Step3Summary
                        let totalCapital = fixedCosts;
                        let requiredRevenue = 0;
                        let ingredientCost = 0;

                        // Iterate until convergence (same as Step3Summary)
                        for (let i = 0; i < 10; i++) {
                          const reserveFund = totalCapital * 0.1;
                          const totalCapitalWithReserve = totalCapital + reserveFund;
                          requiredRevenue = totalCapitalWithReserve / (1 - targetProfitDecimal);

                          const unitsNeeded = Math.ceil(requiredRevenue / averagePrice);
                          // Use the static ingredient cost since we don't have calculateIngredientsNeeded function
                          // Scale it based on units needed vs break-even units
                          const breakEvenUnits = booth.businessPlan!.breakEven.unitsNeeded || 1;
                          const baseIngredientCost = booth.businessPlan!.ingredients?.reduce((sum, ing) => sum + ing.cost, 0) || 0;
                          ingredientCost = (baseIngredientCost * unitsNeeded) / breakEvenUnits;

                          const newTotalCapital = fixedCosts + ingredientCost;

                          // Check for convergence
                          if (Math.abs(newTotalCapital - totalCapital) < 1) break;
                          totalCapital = newTotalCapital;
                        }

                        const finalReserveFund = totalCapital * 0.1;
                        const finalTotalCapital = totalCapital + finalReserveFund;
                        const totalProfit = requiredRevenue - finalTotalCapital;

                        const finalUnitsNeeded = Math.ceil(requiredRevenue / averagePrice);
                        const dailyUnitsNeeded = Math.ceil(finalUnitsNeeded / numberOfDays);
                        const dailyRevenue = Math.round(requiredRevenue / numberOfDays);

                        return (
                          <tr key={profit} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="text-center py-2 font-light">{profit}%</td>
                            <td className="text-right py-2 font-light">฿{Math.round(fixedCosts).toLocaleString()}</td>
                            <td className="text-right py-2 font-light">฿{Math.round(ingredientCost).toLocaleString()}</td>
                            <td className="text-right py-2 font-light">฿{Math.round(finalTotalCapital).toLocaleString()}</td>
                            <td className="text-right py-2 font-light text-black">฿{Math.round(totalProfit).toLocaleString()}</td>
                            <td className="text-right py-2 font-light">฿{Math.round(requiredRevenue).toLocaleString()}</td>
                            <td className="text-center py-2 font-light">{finalUnitsNeeded.toLocaleString()}</td>
                            <td className="text-center py-2 font-light">{dailyUnitsNeeded.toLocaleString()}</td>
                            <td className="text-right py-2 font-light">฿{dailyRevenue.toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}

        {/* Tab 2: Sales Daily Detail */}
        {activeTab === 'sales' && (
          dataLoading ? (
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
          ) : (
            <BoothSalesTab
              booth={booth}
              preloadedStats={preloadedData?.stats}
              preloadedSales={preloadedData?.sales}
            />
          )
        )}

        {/* Tab 3: Manage Menu */}
        {activeTab === 'menu' && (
          <BoothMenuTab
            booth={booth}
            onRefresh={onRefresh}
            onOpenMenuModal={onOpenMenuModal}
          />
        )}

        </div>

    </Modal>
  );
}