'use client';

import React from 'react';
import { ShoppingCart, ListOrdered, BarChart3 } from 'lucide-react';

interface TabNavigationProps {
  activeTab: 'sale' | 'history' | 'summary';
  onTabChange: (tab: 'sale' | 'history' | 'summary') => void;
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex border-b border-gray-100">
        <button
          onClick={() => onTabChange('sale')}
          className={`px-6 py-4 text-sm font-light tracking-wide transition-all duration-200 ${
            activeTab === 'sale'
              ? 'text-black border-b-2 border-black'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden sm:inline">ขายสินค้า</span>
            <span className="sm:hidden">ขาย</span>
          </div>
        </button>

        <button
          onClick={() => onTabChange('history')}
          className={`px-6 py-4 text-sm font-light tracking-wide transition-all duration-200 ${
            activeTab === 'history'
              ? 'text-black border-b-2 border-black'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <div className="flex items-center gap-2">
            <ListOrdered className="w-4 h-4" />
            <span className="hidden sm:inline">ประวัติการขาย</span>
            <span className="sm:hidden">ประวัติ</span>
          </div>
        </button>

        <button
          onClick={() => onTabChange('summary')}
          className={`px-6 py-4 text-sm font-light tracking-wide transition-all duration-200 ${
            activeTab === 'summary'
              ? 'text-black border-b-2 border-black'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">สรุปยอดขาย</span>
            <span className="sm:hidden">สรุป</span>
          </div>
        </button>
      </div>
    </div>
  );
}