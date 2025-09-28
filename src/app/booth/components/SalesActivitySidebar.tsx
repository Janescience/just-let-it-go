import React, { useState, useEffect, useRef } from 'react';
import { X, Activity, Clock, Store, DollarSign } from 'lucide-react';

interface SaleActivity {
  id: string;
  boothName: string;
  boothId: string;
  totalAmount: number;
  orderItems: {
    name: string;
    quantity: number;
    price: number;
  }[];
  timestamp: Date;
  isNew?: boolean;
}

interface SalesActivitySidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  newSalesCount: number;
  activities: SaleActivity[];
  onMarkAllAsRead: () => void;
}

export function SalesActivitySidebar({
  isOpen,
  onToggle,
  newSalesCount,
  activities,
  onMarkAllAsRead
}: SalesActivitySidebarProps) {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('th-TH', {
      day: '2-digit',
      month: '2-digit'
    });
  };

  const handleOpen = () => {
    onToggle();
    if (!isOpen) {
      // Mark all as read when opening
      setTimeout(() => {
        onMarkAllAsRead();
      }, 500);
    }
  };

  // Handle click outside to close sidebar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        sidebarRef.current &&
        buttonRef.current &&
        !sidebarRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        onToggle();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onToggle]);

  return (
    <>
      {/* Toggle Button */}
      <div className="fixed right-0 top-1/2 transform -translate-y-1/2 z-40">
        <button
          ref={buttonRef}
          onClick={handleOpen}
          className="bg-white border border-gray-200 text-gray-600 p-3 rounded-l-lg shadow-sm hover:bg-gray-50 hover:text-black transition-colors relative"
        >
          <Activity className="w-5 h-5" />
          {newSalesCount > 0 && (
            <span className="absolute -top-2 -left-2 bg-black text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-light">
              {newSalesCount > 99 ? '99+' : newSalesCount}
            </span>
          )}
        </button>
      </div>

      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className={`fixed right-0 top-0 h-full w-96 bg-white border-l border-gray-100 transform transition-transform duration-300 z-50 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-gray-400" />
              <div className="text-lg font-light text-black tracking-wide">กิจกรรมการขาย</div>
            </div>
            <button
              onClick={onToggle}
              className="p-2 text-gray-300 hover:text-gray-600 transition-colors duration-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {newSalesCount > 0 && (
            <div className="mt-2 text-sm font-light text-gray-500">
              มีรายการใหม่ {newSalesCount} รายการ
            </div>
          )}
        </div>

        {/* Activities List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activities.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-8 h-8 mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-light text-gray-400">ยังไม่มีกิจกรรมการขาย</p>
            </div>
          ) : (
            activities.map((activity) => (
              <div
                key={activity.id}
                className={`border-b border-gray-100 pb-4 last:border-b-0 transition-all duration-500 ${
                  activity.isNew
                    ? 'bg-gray-50'
                    : ''
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-gray-400" />
                    <span className="font-light text-black tracking-wide">{activity.boothName}</span>
                    {activity.isNew && (
                      <span className="bg-black text-white text-xs px-2 py-0.5 font-light">
                        ใหม่
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-light text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(activity.timestamp)}
                    </div>
                    <div className="text-xs font-light text-gray-400">
                      {formatDate(activity.timestamp)}
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div className="space-y-1 mb-3">
                  {activity.orderItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="font-light text-gray-600 truncate">
                        {item.name} x{item.quantity}
                      </span>
                      <span className="font-light text-black ml-2">
                        ฿{(item.price * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-1 text-sm font-light text-gray-400">
                    <DollarSign className="w-3 h-3" />
                    <span>ยอดรวม</span>
                  </div>
                  <span className="font-light text-black">
                    ฿{activity.totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {activities.length > 0 && (
          <div className="p-6 border-t border-gray-100">
            <div className="text-center text-xs font-light text-gray-400 tracking-wider uppercase">
              รายการทั้งหมด {activities.length} รายการ
            </div>
          </div>
        )}
      </div>
    </>
  );
}