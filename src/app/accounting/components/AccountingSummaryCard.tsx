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

  const amountColorClass = color === 'green'
    ? 'text-black'
    : 'text-black';

  return (
    <div className="border-b border-gray-100 pb-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">{title}</div>
          <div className="text-2xl font-thin text-black tracking-wide">
            {formatAmount(amount)}
          </div>
          <div className={`text-xs font-light mt-1 ${color === 'green' ? 'text-gray-500' : color === 'red' ? 'text-gray-500' : 'text-gray-500'}`}>
            {color === 'green' ? '+' : color === 'red' ? '-' : ''}
          </div>
        </div>
        <div className="text-gray-300 ml-4">
          {icon}
        </div>
      </div>
    </div>
  );
}