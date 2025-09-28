import React from 'react';
import { Edit, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui';
import { AccountingTransaction } from '@/types';

interface TransactionListProps {
  transactions: AccountingTransaction[];
  onEdit: (transaction: AccountingTransaction) => void;
  onDelete: (transactionId: string) => void;
  incomeCategories: Record<string, string>;
  expenseCategories: Record<string, string>;
}

export function TransactionList({
  transactions,
  onEdit,
  onDelete,
  incomeCategories,
  expenseCategories
}: TransactionListProps) {
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('th-TH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getCategoryName = (type: 'income' | 'expense', category: string) => {
    return type === 'income'
      ? incomeCategories[category] || category
      : expenseCategories[category] || category;
  };

  if (transactions.length === 0) {
    return (
      <div className="">
        <h2 className="text-lg font-thin text-black tracking-wide mb-6">รายการบัญชี</h2>
        <div className="text-center py-16">
          <p className="text-sm font-light text-gray-400">ไม่มีรายการบัญชีในช่วงวันที่ที่เลือก</p>
        </div>
      </div>
    );
  }

  return (
    <div className="">
      <div className="mb-8">
        <h2 className="text-lg font-thin text-black tracking-wide">รายการบัญชี</h2>
        <div className="text-sm font-light text-gray-400 mt-1">{transactions.length} รายการ</div>
      </div>

      <div className="space-y-4 sm:space-y-6">
        {transactions.map((transaction) => (
          <div key={transaction._id} className="border-b border-gray-100 pb-4 sm:pb-6 last:border-b-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="flex-1">
                {/* Mobile: Amount and actions row */}
                <div className="flex sm:hidden items-center justify-between mb-3">
                  <div className="font-light text-black text-lg">
                    {transaction.type === 'income' ? '+' : '-'}{formatAmount(transaction.amount)}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEdit(transaction)}
                      className="p-2 text-gray-300 hover:text-gray-600 transition-colors duration-200"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => transaction._id && onDelete(transaction._id)}
                      className="p-2 text-gray-300 hover:text-red-400 transition-colors duration-200"
                      disabled={!transaction._id}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Transaction info */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-3">
                  <div className="flex items-center gap-2">
                    {transaction.type === 'income' ? (
                      <TrendingUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="text-sm font-light text-gray-600">
                      {transaction.type === 'income' ? 'รายรับ' : 'รายจ่าย'}
                    </span>
                  </div>
                  <span className="text-xs font-light text-gray-400">
                    {getCategoryName(transaction.type, transaction.category)}
                  </span>
                  <span className="text-xs font-light text-gray-400">
                    {formatDate(transaction.date)}
                  </span>
                </div>

                <div className="font-light text-black tracking-wide mb-2">
                  {transaction.description}
                </div>

                {transaction.boothId && typeof transaction.boothId === 'object' && 'name' in transaction.boothId && (
                  <div className="text-xs font-light text-gray-400">
                    หน้าร้าน: {(transaction.boothId as { name: string }).name}
                  </div>
                )}
              </div>

              {/* Desktop: Amount and actions */}
              <div className="hidden sm:flex items-center gap-4">
                <div className="text-right">
                  <div className="font-light text-black">
                    {transaction.type === 'income' ? '+' : '-'}{formatAmount(transaction.amount)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEdit(transaction)}
                    className="p-2 text-gray-300 hover:text-gray-600 transition-colors duration-200"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => transaction._id && onDelete(transaction._id)}
                    className="p-2 text-gray-300 hover:text-red-400 transition-colors duration-200"
                    disabled={!transaction._id}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}