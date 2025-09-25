import React from 'react';

interface AccountingSummaryCardProps {
  title: string;
  amount: number;
  icon: React.ReactNode;
  color: 'green' | 'red';
}

export function AccountingSummaryCard({ title, amount, icon, color }: AccountingSummaryCardProps) {
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const cardColorClass = color === 'green'
    ? 'border-green-200 bg-green-50'
    : 'border-red-200 bg-red-50';

  const amountColorClass = color === 'green'
    ? 'text-green-700'
    : 'text-red-700';

  return (
    <div className={`border p-6 ${cardColorClass}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className={`text-2xl font-bold ${amountColorClass}`}>
            {formatAmount(amount)}
          </p>
        </div>
        <div className="flex-shrink-0">
          {icon}
        </div>
      </div>
    </div>
  );
}