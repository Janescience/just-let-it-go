'use client';

import React, { useState, useEffect } from 'react';
import { DollarSign, Plus, TrendingUp, TrendingDown, Calendar, Filter } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { AccountingTransaction, AccountingSummary, INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '@/types';
import { AccountingSummaryCard } from './components/AccountingSummaryCard';
import { TransactionList } from './components/TransactionList';
import { CategoryBreakdown } from './components/CategoryBreakdown';
import { TransactionModal } from './components/TransactionModal';

export default function AccountingPage() {
  const [transactions, setTransactions] = useState<AccountingTransaction[]>([]);
  const [summary, setSummary] = useState<AccountingSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');

  // Modal states
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<AccountingTransaction | null>(null);

  useEffect(() => {
    // Set default date range to current month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(now.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      fetchTransactions();
    }
  }, [startDate, endDate, typeFilter]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (typeFilter !== 'all') params.append('type', typeFilter);

      const response = await fetch(`/api/accounting/transactions?${params}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions || []);
        setSummary(data.summary || null);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTransaction = () => {
    setEditingTransaction(null);
    setShowTransactionModal(true);
  };

  const handleEditTransaction = (transaction: AccountingTransaction) => {
    setEditingTransaction(transaction);
    setShowTransactionModal(true);
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!confirm('คุณแน่ใจที่จะลบรายการนี้?')) return;

    try {
      const response = await fetch(`/api/accounting/transactions/${transactionId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        fetchTransactions();
      } else {
        alert('เกิดข้อผิดพลาดในการลบรายการ');
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('เกิดข้อผิดพลาดในการลบรายการ');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="text-center py-12">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-600 text-lg">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8" />
              <h1 className="text-3xl font-bold text-black">บัญชีรายรับรายจ่าย</h1>
            </div>
            <Button
              variant="primary"
              size="lg"
              onClick={handleCreateTransaction}
              className="flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              เพิ่มรายการ
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-600" />
              <label className="text-sm font-medium text-gray-700">ช่วงวันที่:</label>
            </div>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-40"
            />
            <span className="text-gray-500">ถึง</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-40"
            />
            <div className="flex items-center gap-2 ml-4">
              <Filter className="w-4 h-4 text-gray-600" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="px-3 py-2 border border-gray-200 rounded"
              >
                <option value="all">ทั้งหมด</option>
                <option value="income">รายรับ</option>
                <option value="expense">รายจ่าย</option>
              </select>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <AccountingSummaryCard
              title="รายรับทั้งหมด"
              amount={summary.totalIncome}
              icon={<TrendingUp className="w-6 h-6 text-green-600" />}
              color="green"
            />
            <AccountingSummaryCard
              title="รายจ่ายทั้งหมด"
              amount={summary.totalExpense}
              icon={<TrendingDown className="w-6 h-6 text-red-600" />}
              color="red"
            />
            <AccountingSummaryCard
              title="กำไร/ขาดทุนสุทธิ"
              amount={summary.netProfit}
              icon={<DollarSign className="w-6 h-6" />}
              color={summary.netProfit >= 0 ? 'green' : 'red'}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Category Breakdown */}
          {summary && (
            <div className="lg:col-span-1">
              <CategoryBreakdown
                incomeByCategory={summary.incomeByCategory}
                expenseByCategory={summary.expenseByCategory}
                incomeCategories={INCOME_CATEGORIES}
                expenseCategories={EXPENSE_CATEGORIES}
              />
            </div>
          )}

          {/* Transactions List */}
          <div className="lg:col-span-2">
            <TransactionList
              transactions={transactions}
              onEdit={handleEditTransaction}
              onDelete={handleDeleteTransaction}
              incomeCategories={INCOME_CATEGORIES}
              expenseCategories={EXPENSE_CATEGORIES}
            />
          </div>
        </div>

        {/* Transaction Modal */}
        {showTransactionModal && (
          <TransactionModal
            transaction={editingTransaction}
            onClose={() => setShowTransactionModal(false)}
            onSave={() => {
              setShowTransactionModal(false);
              fetchTransactions();
            }}
            incomeCategories={INCOME_CATEGORIES}
            expenseCategories={EXPENSE_CATEGORIES}
          />
        )}
      </div>
    </div>
  );
}