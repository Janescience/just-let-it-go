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
      <div className="bg-white border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-black mb-4">รายการบัญชี</h2>
        <div className="text-center py-12">
          <p className="text-gray-500">ไม่มีรายการบัญชีในช่วงวันที่ที่เลือก</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-bold text-black">รายการบัญชี ({transactions.length} รายการ)</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">วันที่</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">ประเภท</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">หมวดหมู่</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">รายละเอียด</th>
              <th className="text-right px-6 py-3 text-sm font-medium text-gray-700">จำนวนเงิน</th>
              <th className="text-center px-6 py-3 text-sm font-medium text-gray-700">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {transactions.map((transaction) => (
              <tr key={transaction._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900">
                  {formatDate(transaction.date)}
                </td>
                <td className="px-6 py-4 text-sm">
                  <div className="flex items-center gap-2">
                    {transaction.type === 'income' ? (
                      <>
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <span className="text-green-700 font-medium">รายรับ</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="w-4 h-4 text-red-600" />
                        <span className="text-red-700 font-medium">รายจ่าย</span>
                      </>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {getCategoryName(transaction.type, transaction.category)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  <div>
                    <p>{transaction.description}</p>
                    {transaction.boothId && typeof transaction.boothId === 'object' && 'name' in transaction.boothId && (
                      <p className="text-xs text-gray-500 mt-1">
                        หน้าร้าน: {transaction.boothId.name}
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-right">
                  <span className={`font-medium ${
                    transaction.type === 'income' ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {transaction.type === 'income' ? '+' : '-'}{formatAmount(transaction.amount)}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(transaction)}
                      className="text-gray-600 hover:text-blue-600"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(transaction._id)}
                      className="text-gray-600 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}