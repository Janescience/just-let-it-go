import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Edit, Trash2 } from 'lucide-react';
import { AccountingTransaction } from '@/types';
import {
  groupTransactionsByDate,
  formatThaiDate,
  formatCurrency,
  exportToExcel
} from '@/utils/excel-export';

interface TransactionTableProps {
  transactions: AccountingTransaction[];
  onEdit: (transaction: AccountingTransaction) => void;
  onDelete: (transactionId: string) => void;
  incomeCategories: Record<string, string>;
  expenseCategories: Record<string, string>;
  filterInfo?: string;
  filterCriteria: any;
  booths: any[];
  userRole?: string;
  currentBrandId?: string;
  onRepairAccounting?: () => void;
}

export function TransactionTable({
  transactions,
  onEdit,
  onDelete,
  incomeCategories,
  expenseCategories,
  filterInfo = 'ทั้งหมด',
  filterCriteria,
  booths,
  userRole,
  currentBrandId,
  onRepairAccounting
}: TransactionTableProps) {
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  const dailyTransactions = groupTransactionsByDate(transactions);

  const toggleDay = (date: string) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDays(newExpanded);
  };

  const getCategoryName = (type: 'income' | 'expense', category: string) => {
    return type === 'income'
      ? incomeCategories[category] || category
      : expenseCategories[category] || category;
  };

  const handleExport = () => {
    exportToExcel(dailyTransactions, incomeCategories, expenseCategories, filterInfo, filterCriteria, booths);
  };

  const grandTotalIncome = dailyTransactions.reduce((sum, day) => sum + day.totalIncome, 0);
  const grandTotalExpense = dailyTransactions.reduce((sum, day) => sum + day.totalExpense, 0);
  const grandNetAmount = grandTotalIncome - grandTotalExpense;

  if (transactions.length === 0) {
    return (
      <div className="">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h2 className="text-lg font-thin text-black tracking-wide">รายการบัญชี</h2>
            <div className="text-sm font-light text-gray-400 mt-1">ไม่มีรายการในช่วงที่เลือก</div>
          </div>
          <button
            onClick={handleExport}
            disabled
            className="px-4 py-2 text-sm font-light text-gray-400 border border-gray-200 cursor-not-allowed tracking-wide whitespace-nowrap"
          >
            ส่งออก Excel
          </button>
        </div>
        <div className="text-center py-16">
          <p className="text-sm font-light text-gray-400">ไม่มีรายการบัญชีในช่วงวันที่ที่เลือก</p>
        </div>
      </div>
    );
  }

  return (
    <div className="">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h2 className="text-lg font-thin text-black tracking-wide">รายการบัญชี</h2>
          <div className="text-sm font-light text-gray-400 mt-1">
            {dailyTransactions.length} วัน • {transactions.length} รายการ
          </div>
        </div>
        <div className="flex gap-2">
          {(userRole === 'super_admin' || currentBrandId) && onRepairAccounting && (
            <button
              onClick={onRepairAccounting}
              className="px-4 py-2 text-sm font-light text-orange-600 border border-orange-200 hover:bg-orange-50 transition-colors tracking-wide whitespace-nowrap"
            >
              ซ่อมรายการบัญชี
            </button>
          )}
          <button
            onClick={handleExport}
            className="px-4 py-2 text-sm font-light text-black border border-gray-200 hover:bg-gray-50 transition-colors tracking-wide whitespace-nowrap"
          >
            ส่งออก Excel
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto -mx-4 sm:-mx-6">
        <div className="min-w-max px-4 sm:px-6">
          <table className="w-full min-w-[700px] border border-gray-100">
            <thead className="border-b border-gray-100">
              <tr>
                <th className="text-left p-2 sm:p-4 text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px]">วันที่</th>
                <th className="text-left p-2 sm:p-4 text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]" colSpan={2}>สรุปรายวัน</th>
                <th className="text-right p-2 sm:p-4 text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[90px]">รายจ่าย</th>
                <th className="text-right p-2 sm:p-4 text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[90px]">รายรับ</th>
                <th className="text-center p-2 sm:p-4 text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[90px]">ยอดสุทธิ</th>
              </tr>
            </thead>
          <tbody className="divide-y divide-gray-100">
            {dailyTransactions.map((dailyTx) => (
              <React.Fragment key={dailyTx.date}>
                {/* Daily Summary Row */}
                <tr
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => toggleDay(dailyTx.date)}
                >
                  <td className="p-2 sm:p-4">
                    <div className="flex items-center gap-2">
                      {expandedDays.has(dailyTx.date) ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {formatThaiDate(dailyTx.date)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {dailyTx.transactions.length} รายการ
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-2 sm:p-4 text-sm font-medium text-gray-700" colSpan={2}>สรุปรายวัน</td>
                  <td className="p-2 sm:p-4 text-right text-sm font-light text-gray-600">
                    {dailyTx.totalExpense > 0 ? (
                      <div className="whitespace-nowrap">
                        <span className="text-red-500">-</span>{formatCurrency(dailyTx.totalExpense)}
                      </div>
                    ) : ''}
                  </td>
                  <td className="p-2 sm:p-4 text-right text-sm font-light text-gray-600">
                    {dailyTx.totalIncome > 0 ? (
                      <div className="whitespace-nowrap">
                        <span className="text-green-500">+</span>{formatCurrency(dailyTx.totalIncome)}
                      </div>
                    ) : ''}
                  </td>
                  <td className="p-2 sm:p-4 text-center text-sm font-light text-gray-600">
                    <div className="whitespace-nowrap">
                      {dailyTx.netAmount >= 0 ? (
                        <>
                          <span className="text-green-500">+</span>{formatCurrency(dailyTx.netAmount)}
                        </>
                      ) : (
                        <>
                          <span className="text-red-500">-</span>{formatCurrency(Math.abs(dailyTx.netAmount))}
                        </>
                      )}
                    </div>
                  </td>
                </tr>

                {/* Individual Transactions */}
                {expandedDays.has(dailyTx.date) && (
                  <>
                    {/* Sub-header for transaction details */}
                    <tr className="border-t border-gray-100">
                      <td className="p-2 sm:p-3 pl-8 sm:pl-12 text-xs font-light text-gray-400 uppercase tracking-wider">เวลา</td>
                      <td className="p-2 sm:p-3 text-xs font-light text-gray-400 uppercase tracking-wider" colSpan={2}>รายละเอียดรายการ</td>
                      <td className="p-2 sm:p-3 text-xs font-light text-gray-400 uppercase tracking-wider text-right">รายจ่าย</td>
                      <td className="p-2 sm:p-3 text-xs font-light text-gray-400 uppercase tracking-wider text-right">รายรับ</td>
                      <td className="p-2 sm:p-3 text-xs font-light text-gray-400 uppercase tracking-wider text-center">จัดการ</td>
                    </tr>
                    {dailyTx.transactions.map((transaction) => (
                      <tr key={transaction._id} className="hover:bg-gray-25">
                        <td className="p-2 sm:p-3 pl-8 sm:pl-12">
                          <div className="text-xs text-gray-500 whitespace-nowrap">
                            {new Date(transaction.date).toLocaleTimeString('th-TH', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </td>
                        <td className="p-2 sm:p-3" colSpan={2}>
                          <div className="flex flex-col gap-1">
                            <div className="text-sm font-light text-gray-800">{transaction.description}</div>
                            <div className="text-xs font-light text-gray-500 flex flex-wrap items-center gap-1 sm:gap-2">
                              <span>{transaction.type === 'income' ? 'รายรับ' : 'รายจ่าย'}</span>
                              <span className="hidden sm:inline">•</span>
                              <span className="break-words">{getCategoryName(transaction.type, transaction.category)}</span>
                              <span className="hidden sm:inline">•</span>
                              <span className="whitespace-nowrap">
                                {transaction.paymentMethod === 'cash' ? 'เงินสด' :
                                 transaction.paymentMethod === 'transfer' ? 'เงินโอน' :
                                 transaction.paymentMethod || 'ไม่ระบุ'}
                              </span>
                              {transaction.boothId && typeof transaction.boothId === 'object' && 'name' in transaction.boothId && (
                                <>
                                  <span className="hidden sm:inline">•</span>
                                  <span className="break-words">{(transaction.boothId as { name: string }).name}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-2 sm:p-3 text-right text-sm font-light text-gray-600">
                          {transaction.type === 'expense' ? (
                            <div className="whitespace-nowrap">
                              <span className="text-red-500">-</span>{formatCurrency(transaction.amount)}
                            </div>
                          ) : ''}
                        </td>
                        <td className="p-2 sm:p-3 text-right text-sm font-light text-gray-600">
                          {transaction.type === 'income' ? (
                            <div className="whitespace-nowrap">
                              <span className="text-green-500">+</span>{formatCurrency(transaction.amount)}
                            </div>
                          ) : ''}
                        </td>
                        <td className="p-2 sm:p-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onEdit(transaction);
                              }}
                              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (transaction._id) onDelete(transaction._id);
                              }}
                              className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                              disabled={!transaction._id}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </>
                )}
              </React.Fragment>
            ))}

            {/* Grand Total Row */}
            <tr className="border-t border-gray-200 font-medium">
              <td className="p-2 sm:p-4 text-sm font-bold text-gray-900">รวมทั้งหมด</td>
              <td className="p-2 sm:p-4 text-sm font-bold text-gray-700" colSpan={2}>สรุปยอดรวม</td>
              <td className="p-2 sm:p-4 text-right text-sm font-light text-gray-700">
                <div className="whitespace-nowrap">
                  <span className="text-red-500">-</span>{formatCurrency(grandTotalExpense)}
                </div>
              </td>
              <td className="p-2 sm:p-4 text-right text-sm font-light text-gray-700">
                <div className="whitespace-nowrap">
                  <span className="text-green-500">+</span>{formatCurrency(grandTotalIncome)}
                </div>
              </td>
              <td className="p-2 sm:p-4 text-center text-sm font-light text-gray-700">
                <div className="whitespace-nowrap">
                  {grandNetAmount >= 0 ? (
                    <>
                      <span className="text-green-500">+</span>{formatCurrency(grandNetAmount)}
                    </>
                  ) : (
                    <>
                      <span className="text-red-500">-</span>{formatCurrency(Math.abs(grandNetAmount))}
                    </>
                  )}
                </div>
              </td>
            </tr>
          </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}