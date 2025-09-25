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
          className="bg-black text-white p-3 rounded-l-lg shadow-lg hover:bg-gray-800 transition-colors relative"
        >
          <Activity className="w-6 h-6" />
          {newSalesCount > 0 && (
            <span className="absolute -top-2 -left-2 bg-red-500 text-white  rounded-full w-6 h-6 flex items-center justify-center font-bold">
              {newSalesCount > 99 ? '99+' : newSalesCount}
            </span>
          )}
        </button>
      </div>

      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className={`fixed right-0 top-0 h-full w-96 bg-white border-l border-gray-200 shadow-xl transform transition-transform duration-300 z-50 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-black text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="w-6 h-6" />
              <div className="text-lg text-white font-medium">กิจกรรมการขาย</div>
            </div>
            <button
              onClick={onToggle}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {newSalesCount > 0 && (
            <div className="mt-2 text-lg text-gray-300">
              มีรายการใหม่ {newSalesCount} รายการ
            </div>
          )}
        </div>

        {/* Activities List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {activities.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <Activity className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">ยังไม่มีกิจกรรมการขาย</p>
            </div>
          ) : (
            activities.map((activity) => (
              <div
                key={activity.id}
                className={`border rounded p-3 transition-all duration-500 ${
                  activity.isNew
                    ? 'border-green-400 bg-green-50 shadow-sm'
                    : 'border-gray-200 bg-white'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-1">
                    <Store className="w-3 h-3 text-gray-600" />
                    <span className="font-medium text-sm text-gray-900">{activity.boothName}</span>
                    {activity.isNew && (
                      <span className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                        ใหม่
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {formatTime(activity.timestamp)}
                    </div>
                    <div className="text-xs text-gray-400">
                      {formatDate(activity.timestamp)}
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div className="space-y-0.5 mb-2">
                  {activity.orderItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-700 truncate">
                        {item.name} x{item.quantity}
                      </span>
                      <span className="text-gray-900 font-medium ml-2">
                        ฿{(item.price * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="flex items-center justify-between pt-1.5 border-t border-gray-100">
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <DollarSign className="w-2.5 h-2.5" />
                    <span>ยอดรวม</span>
                  </div>
                  <span className="font-bold text-sm text-black">
                    ฿{activity.totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {activities.length > 0 && (
          <div className="p-3 border-t border-gray-200 bg-gray-50">
            <div className="text-center text-sm text-gray-600">
              รายการทั้งหมด {activities.length} รายการ
            </div>
          </div>
        )}
      </div>
    </>
  );
}