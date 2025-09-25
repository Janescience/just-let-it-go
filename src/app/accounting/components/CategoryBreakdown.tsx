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
        <div className="text-center py-8">
          <p className="text-gray-500">
            ไม่มี{type === 'income' ? 'รายรับ' : 'รายจ่าย'}ในช่วงวันที่ที่เลือก
          </p>
        </div>
      );
    }

    const colors = type === 'income'
      ? ['bg-green-500', 'bg-green-400', 'bg-green-300', 'bg-green-200', 'bg-green-100']
      : ['bg-red-500', 'bg-red-400', 'bg-red-300', 'bg-red-200', 'bg-red-100'];

    return (
      <div className="space-y-3">
        {sortedCategories.map(([category, amount], index) => {
          const percentage = calculatePercentage(amount, total);
          const colorClass = colors[index % colors.length];

          return (
            <div key={category} className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <div className={`w-4 h-4 rounded ${colorClass}`}></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {categoryNames[category] || category}
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div
                      className={`h-2 rounded-full ${colorClass}`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              <div className="text-right ml-3">
                <p className={`text-sm font-medium ${
                  type === 'income' ? 'text-green-700' : 'text-red-700'
                }`}>
                  {formatAmount(amount)}
                </p>
                <p className="text-xs text-gray-500">{percentage}%</p>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-white border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <PieChart className="w-5 h-5 text-gray-700" />
          <h2 className="text-xl font-bold text-black">แบ่งตามหมวดหมู่</h2>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('expense')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'expense'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              รายจ่าย ({formatAmount(totalExpense)})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('income')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'income'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              รายรับ ({formatAmount(totalIncome)})
            </div>
          </button>
        </div>
      </div>

      <div className="p-6">
        {activeTab === 'expense' ? (
          renderCategoryList(expenseByCategory, expenseCategories, totalExpense, 'expense')
        ) : (
          renderCategoryList(incomeByCategory, incomeCategories, totalIncome, 'income')
        )}
      </div>
    </div>
  );
}