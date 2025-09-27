import React, { useState } from 'react';
import { PieChart, TrendingUp, TrendingDown } from 'lucide-react';

interface CategoryBreakdownProps {
  incomeByCategory: Record<string, number>;
  expenseByCategory: Record<string, number>;
  incomeCategories: Record<string, string>;
  expenseCategories: Record<string, string>;
}

export function CategoryBreakdown({
  incomeByCategory,
  expenseByCategory,
  incomeCategories,
  expenseCategories
}: CategoryBreakdownProps) {
  const [activeTab, setActiveTab] = useState<'income' | 'expense'>('expense');

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const calculatePercentage = (amount: number, total: number) => {
    return total > 0 ? Math.round((amount / total) * 100) : 0;
  };

  const totalIncome = Object.values(incomeByCategory).reduce((sum, amount) => sum + amount, 0);
  const totalExpense = Object.values(expenseByCategory).reduce((sum, amount) => sum + amount, 0);

  const renderCategoryList = (
    categories: Record<string, number>,
    categoryNames: Record<string, string>,
    total: number,
    type: 'income' | 'expense'
  ) => {
    const sortedCategories = Object.entries(categories)
      .filter(([, amount]) => amount > 0)
      .sort(([, a], [, b]) => b - a);

    if (sortedCategories.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-sm font-light text-gray-400">
            ไม่มี{type === 'income' ? 'รายรับ' : 'รายจ่าย'}ในช่วงวันที่ที่เลือก
          </p>
        </div>
      );
    }

    const colors = ['bg-gray-600', 'bg-gray-500', 'bg-gray-400', 'bg-gray-300', 'bg-gray-200'];

    return (
      <div className="space-y-6">
        {sortedCategories.map(([category, amount], index) => {
          const percentage = calculatePercentage(amount, total);
          const colorClass = colors[index % colors.length];

          return (
            <div key={category} className="border-b border-gray-100 pb-4 last:border-b-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 ${colorClass}`}></div>
                  <p className="text-sm font-light text-gray-600">
                    {categoryNames[category] || category}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-light text-black">
                    {formatAmount(amount)}
                  </p>
                  <p className="text-xs font-light text-gray-400">{percentage}%</p>
                </div>
              </div>
              <div className="w-full bg-gray-100 h-1">
                <div
                  className={`h-1 ${colorClass}`}
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-6">
          <PieChart className="w-4 h-4 text-gray-400" />
          <h2 className="text-lg font-thin text-black tracking-wide">แบ่งตามหมวดหมู่</h2>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-8 border-b border-gray-100">
          <button
            onClick={() => setActiveTab('expense')}
            className={`pb-3 text-sm font-light transition-colors ${
              activeTab === 'expense'
                ? 'text-black border-b border-black'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              รายจ่าย ({formatAmount(totalExpense)})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('income')}
            className={`pb-3 text-sm font-light transition-colors ${
              activeTab === 'income'
                ? 'text-black border-b border-black'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              รายรับ ({formatAmount(totalIncome)})
            </div>
          </button>
        </div>
      </div>

      <div className="pt-6">
        {activeTab === 'expense' ? (
          renderCategoryList(expenseByCategory, expenseCategories, totalExpense, 'expense')
        ) : (
          renderCategoryList(incomeByCategory, incomeCategories, totalIncome, 'income')
        )}
      </div>
    </div>
  );
}