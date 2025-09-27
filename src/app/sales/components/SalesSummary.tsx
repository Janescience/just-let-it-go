'use client';

import React from 'react';
import { Calendar, BarChart3, TrendingUp, Banknote, CreditCard } from 'lucide-react';
import { Input } from '@/components/ui';

interface SalesSummary {
  totalSales: number;
  cashSales: number;
  transferSales: number;
  totalTransactions: number;
  cashTransactions: number;
  transferTransactions: number;
  menuStats: {
    name: string;
    quantity: number;
    revenue: number;
  }[];
}

interface SalesSummaryProps {
  summary: SalesSummary;
  selectedDate: string;
  onDateChange: (date: string) => void;
}

export function SalesSummaryTab({ summary, selectedDate, onDateChange }: SalesSummaryProps) {
  // Defensive programming: provide fallback values
  const safeSummary = summary || {
    totalSales: 0,
    cashSales: 0,
    transferSales: 0,
    totalTransactions: 0,
    cashTransactions: 0,
    transferTransactions: 0,
    menuStats: []
  };

  return (
    <div className="h-full overflow-y-auto max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Today's Summary */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-8">
          <BarChart3 className="w-4 h-4 text-gray-400" />
          <h3 className="text-lg font-light text-black tracking-wide">สรุปยอดขายวันนี้</h3>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="text-xs font-light text-gray-400 mb-1 tracking-wider uppercase">ยอดขายรวม</div>
            <div className="text-2xl font-light text-black">
              ฿{safeSummary.totalSales.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-xs font-light text-gray-400 mb-1 tracking-wider uppercase">เงินสด</div>
            <div className="text-2xl font-light text-gray-600">
              ฿{safeSummary.cashSales.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-xs font-light text-gray-400 mb-1 tracking-wider uppercase">เงินโอน</div>
            <div className="text-2xl font-light text-gray-600">
              ฿{safeSummary.transferSales.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-xs font-light text-gray-400 mb-1 tracking-wider uppercase">รายการ</div>
            <div className="text-2xl font-light text-gray-600">
              {safeSummary.totalTransactions}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Method Breakdown */}
      <div className="mb-12">
        <h3 className="text-lg font-light text-black tracking-wide mb-6">วิธีการชำระเงิน</h3>

        <div className="space-y-6">
          <div className="border-b border-gray-100 pb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Banknote className="w-4 h-4 text-gray-400" />
                <div>
                  <div className="font-light text-black tracking-wide">เงินสด</div>
                  <div className="text-xs font-light text-gray-400 tracking-wider uppercase">{safeSummary.cashTransactions} รายการ</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-light text-black">฿{safeSummary.cashSales.toLocaleString()}</div>
              </div>
            </div>
          </div>

          <div className="border-b border-gray-100 pb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <CreditCard className="w-4 h-4 text-gray-400" />
                <div>
                  <div className="font-light text-black tracking-wide">โอนเงิน</div>
                  <div className="text-xs font-light text-gray-400 tracking-wider uppercase">{safeSummary.transferTransactions} รายการ</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-light text-black">฿{safeSummary.transferSales.toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Sales Statistics */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <TrendingUp className="w-4 h-4 text-gray-400" />
          <h3 className="text-lg font-light text-black tracking-wide">สถิติการขายตามเมนู</h3>
        </div>

        {safeSummary.menuStats.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 border border-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <BarChart3 className="w-6 h-6 text-gray-300" />
            </div>
            <div className="text-lg font-thin text-gray-600 mb-2 tracking-wide">ยังไม่มีข้อมูลการขาย</div>
            <div className="text-sm font-light text-gray-400">เริ่มขายเพื่อดูสถิติการขายของแต่ละเมนู</div>
          </div>
        ) : (
          <div className="space-y-6">
            {safeSummary.menuStats.map((menu, index) => (
              <div key={index} className="border-b border-gray-100 pb-6 last:border-b-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-light ${
                      index === 0 ? 'bg-black' :
                      index === 1 ? 'bg-gray-400' :
                      index === 2 ? 'bg-gray-500' : 'bg-gray-300'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-light text-black tracking-wide">{menu.name}</div>
                      <div className="text-xs font-light text-gray-400 tracking-wider uppercase">{menu.quantity} ชิ้น</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-light text-black">
                      ฿{menu.revenue.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}