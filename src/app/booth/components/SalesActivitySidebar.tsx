import React, { useState, useEffect, useRef } from 'react';
import { X, Activity, Clock, Store, DollarSign } from 'lucide-react';
import { displayDateTime, displayDate } from '@/utils/timezone';

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
    const d = new Date(date);
    const hours = String(d.getUTCHours()).padStart(2, '0');
    const minutes = String(d.getUTCMinutes()).padStart(2, '0');
    const seconds = String(d.getUTCSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  const formatDate = (date: Date) => {
    return displayDate(date).slice(0, 5); // DD/MM format
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
        className={`fixed right-0 top-0 h-full w-96 bg-white border-l border-gray-100 transform transition-transform duration-300 z-50 flex flex-col ${
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
        <div className="flex-1 overflow-y-auto">
          {activities.length === 0 ? (
            <div className="text-center py-12 px-6">
              <Activity className="w-8 h-8 mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-light text-gray-400">ยังไม่มีกิจกรรมการขาย</p>
            </div>
          ) : (
            (() => {
              // จัดกลุ่มตามวันที่
              const groupedActivities = activities.reduce((groups, activity) => {
                const dateKey = displayDate(activity.timestamp);
                if (!groups[dateKey]) {
                  groups[dateKey] = [];
                }
                groups[dateKey].push(activity);
                return groups;
              }, {} as Record<string, SaleActivity[]>);

              return Object.entries(groupedActivities)
                .sort(([dateA], [dateB]) => {
                  // เรียงตามวันที่ใหม่สุดก่อน
                  const [dayA, monthA, yearA] = dateA.split('/').map(Number);
                  const [dayB, monthB, yearB] = dateB.split('/').map(Number);
                  const dateObjA = new Date(yearA, monthA - 1, dayA);
                  const dateObjB = new Date(yearB, monthB - 1, dayB);
                  return dateObjB.getTime() - dateObjA.getTime();
                })
                .map(([date, dayActivities]) => (
                  <div key={date} className="mb-4">
                    {/* Date Header */}
                    <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-900">{date}</h3>
                        <span className="text-xs text-gray-500">{dayActivities.length} รายการ</span>
                      </div>
                    </div>

                    {/* Activities for this date */}
                    <div className="px-6">
                      {dayActivities.map((activity) => (
                        <div
                          key={activity.id}
                          className={`border-b border-gray-50 py-2 last:border-b-0 transition-all duration-300 ${
                            activity.isNew ? 'bg-gray-25' : ''
                          }`}
                        >
                          {/* Row 1: Booth name, new badge, time */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <Store className="w-3 h-3 text-gray-400 flex-shrink-0" />
                              <span className="font-light text-gray-900 truncate text-sm">{activity.boothName}</span>
                              {activity.isNew && (
                                <span className="bg-black text-white text-xs px-1.5 py-0.5 font-light flex-shrink-0">
                                  ใหม่
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-500 flex-shrink-0">
                              <Clock className="w-3 h-3" />
                              {formatTime(activity.timestamp)}
                            </div>
                          </div>

                          {/* Row 2: Order items and total */}
                          <div className="flex items-center justify-between mt-1">
                            <div className="text-xs text-gray-600 flex-1 min-w-0 truncate">
                              {activity.orderItems.map((item, idx) => (
                                <span key={idx}>
                                  {item.name} x{item.quantity}
                                  {idx < activity.orderItems.length - 1 ? ', ' : ''}
                                </span>
                              ))}
                            </div>
                            <span className="text-sm font-medium text-gray-900 ml-3 flex-shrink-0">
                              ฿{activity.totalAmount.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ));
            })()
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