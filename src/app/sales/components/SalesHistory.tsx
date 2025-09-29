'use client';

import React from 'react';
import { Calendar, ChevronLeft, ChevronRight, ListOrdered } from 'lucide-react';
import { Input } from '@/components/ui';
import { Sale } from '@/types';

interface SalesHistoryProps {
  salesHistory: Sale[];
  currentPage: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  selectedDate: string;
  onDateChange: (date: string) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
}

export function SalesHistory({
  salesHistory,
  currentPage,
  totalPages,
  hasNext,
  hasPrev,
  selectedDate,
  onDateChange,
  onPreviousPage,
  onNextPage
}: SalesHistoryProps) {
  const formatTime = (date: string | Date) => {
    return new Date(date).toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="h-full overflow-y-auto max-w-7xl mx-auto px-6 py-4 space-y-6">
      {/* Date Filter */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="font-light text-black tracking-wide whitespace-nowrap">วันที่</div>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="max-w-xs border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black"
          />
        </div>
      </div>

      {/* Sales History */}
      <div>
        <div className="mb-4">
          <div className="text-base font-light text-black tracking-wide">ประวัติการขาย {formatDate(selectedDate)}</div>
        </div>

        {salesHistory.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 border border-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <ListOrdered className="w-6 h-6 text-gray-300" />
            </div>
            <div className="text-lg font-thin text-gray-600 mb-2 tracking-wide">ไม่มีรายการขาย</div>
            <div className="text-sm font-light text-gray-400">ไม่มีการขายในวันที่เลือก</div>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {salesHistory.map(sale => (
                <div key={sale._id} className="border-b border-gray-100 pb-4 last:border-b-0">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-4">
                      <div className="text-xs font-light text-gray-400">#{sale._id.slice(-8)}</div>
                      <div className="text-sm font-light text-black">
                        {formatTime(sale.createdAt)}
                      </div>
                      <div className="text-sm font-light text-gray-500">
                        {sale.items.length} รายการ
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`inline-flex items-center px-2 py-0.5 text-xs font-light ${
                        sale.paymentMethod === 'cash'
                          ? 'text-gray-600 border border-gray-300'
                          : 'text-white bg-black'
                      }`}>
                        {sale.paymentMethod === 'cash' ? 'เงินสด' : 'โอนเงิน'}
                      </div>
                      <div className="text-lg font-light text-black">
                        ฿{sale.totalAmount.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs font-light text-gray-500 pl-4">
                    {sale.items.map((item, index) => (
                      <span key={index}>
                        {(item.menuItemId as any)?.name || 'รายการถูกลบ'} (฿{item.price.toLocaleString()}) x {item.quantity} = ฿{(item.price * item.quantity).toLocaleString()}
                        {index < sale.items.length - 1 ? ' | ' : ''}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-100">
                <button
                  onClick={onPreviousPage}
                  disabled={!hasPrev}
                  className={`px-6 py-2 border border-gray-200 text-sm font-light transition-colors duration-200 tracking-wide flex items-center gap-2 ${
                    !hasPrev
                      ? 'text-gray-300 border-gray-100 cursor-not-allowed'
                      : 'text-black hover:bg-gray-50'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  ก่อนหน้า
                </button>
                <span className="text-sm font-light text-gray-500">
                  หน้า {currentPage} จาก {totalPages}
                </span>
                <button
                  onClick={onNextPage}
                  disabled={!hasNext}
                  className={`px-6 py-2 border border-gray-200 text-sm font-light transition-colors duration-200 tracking-wide flex items-center gap-2 ${
                    !hasNext
                      ? 'text-gray-300 border-gray-100 cursor-not-allowed'
                      : 'text-black hover:bg-gray-50'
                  }`}
                >
                  ถัดไป
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}