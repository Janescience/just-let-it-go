import React from 'react';
import { CategoryPieChart } from './CategoryPieChart';

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
  // Prepare data for expense pie chart
  const expenseData = Object.entries(expenseByCategory)
    .filter(([, amount]) => amount > 0)
    .map(([category, amount]) => ({
      name: expenseCategories[category] || category,
      value: amount,
      category
    }))
    .sort((a, b) => b.value - a.value);

  // Prepare data for income pie chart
  const incomeData = Object.entries(incomeByCategory)
    .filter(([, amount]) => amount > 0)
    .map(([category, amount]) => ({
      name: incomeCategories[category] || category,
      value: amount,
      category
    }))
    .sort((a, b) => b.value - a.value);

  // Colors for expense chart (deeper red/pink tones)
  const expenseColors = [
    '#E91E63', // deep pink
    '#C2185B', // darker pink
    '#AD1457', // dark pink
    '#880E4F', // very dark pink
    '#F06292', // medium pink
    '#EC407A'  // rose pink
  ];

  // Colors for income chart (deeper green tones)
  const incomeColors = [
    '#4CAF50', // standard green
    '#388E3C', // deeper green
    '#2E7D32', // dark green
    '#1B5E20', // very dark green
    '#66BB6A', // fresh green
    '#43A047'  // medium green
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <CategoryPieChart
        title="รายจ่าย"
        data={expenseData}
        colors={expenseColors}
      />
      <CategoryPieChart
        title="รายรับ"
        data={incomeData}
        colors={incomeColors}
      />
    </div>
  );
}