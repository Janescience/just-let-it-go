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
    <div className="h-full overflow-y-auto max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Date Filter */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <Calendar className="w-4 h-4 text-gray-400" />
          <h3 className="text-lg font-light text-black tracking-wide">เลือกวันที่</h3>
        </div>
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => onDateChange(e.target.value)}
          className="max-w-xs border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black"
        />
      </div>

      {/* Sales History */}
      <div>
        <div className="mb-6">
          <h3 className="text-lg font-light text-black tracking-wide mb-1">ประวัติการขาย</h3>
          <p className="text-sm font-light text-gray-500">{formatDate(selectedDate)}</p>
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
            <div className="space-y-6">
              {salesHistory.map(sale => (
                <div key={sale._id} className="border-b border-gray-100 pb-6 last:border-b-0">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="text-sm font-light text-gray-400 mb-1">#{sale._id.slice(-8)}</div>
                      <div className="font-light text-black tracking-wide">
                        {formatTime(sale.createdAt)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-light text-black mb-2">
                        ฿{sale.totalAmount.toLocaleString()}
                      </div>
                      <div className={`inline-flex items-center px-2 py-0.5 text-xs font-light ${
                        sale.paymentMethod === 'cash'
                          ? 'text-gray-600 border border-gray-300'
                          : 'text-white bg-black'
                      }`}>
                        {sale.paymentMethod === 'cash' ? 'เงินสด' : 'โอนเงิน'}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3 pt-4 border-t border-gray-100">
                    {sale.items.map((item, index) => (
                      <div key={index} className="flex justify-between">
                        <div className="flex-1">
                          <div className="font-light text-black">{(item.menuItemId as any)?.name || 'รายการถูกลบ'}</div>
                          <div className="text-xs font-light text-gray-400">จำนวน {item.quantity} x ฿{item.price.toLocaleString()}</div>
                        </div>
                        <div className="font-light text-black">฿{(item.price * item.quantity).toLocaleString()}</div>
                      </div>
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