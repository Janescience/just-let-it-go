'use client';

import React, { useState, useEffect } from 'react';
import { DollarSign, Plus, TrendingUp, TrendingDown, Calendar, Filter } from 'lucide-react';
import { Button, Input, DashboardPageLoading } from '@/components/ui';
import { Header } from '@/components/layout/Header';
import { AccountingTransaction, AccountingSummary, Booth, INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '@/types';
import { AccountingSummaryCard } from './components/AccountingSummaryCard';
import { TransactionList } from './components/TransactionList';
import { CategoryBreakdown } from './components/CategoryBreakdown';
import { TransactionModal } from './components/TransactionModal';

export default function AccountingPage() {
  const [transactions, setTransactions] = useState<AccountingTransaction[]>([]);
  const [summary, setSummary] = useState<AccountingSummary | null>(null);
  const [booths, setBooths] = useState<Booth[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [boothFilter, setBoothFilter] = useState<string>('all');

  // Modal states
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<AccountingTransaction | null>(null);

  useEffect(() => {
    // Set default date range to current month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(now.toISOString().split('T')[0]);

    // Fetch booths
    fetchBooths();
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      fetchTransactions();
    }
  }, [startDate, endDate, typeFilter, boothFilter]);

  const fetchBooths = async () => {
    try {
      const response = await fetch('/api/booths', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setBooths(data.booths || []);
      }
    } catch (error) {
      console.error('Error fetching booths:', error);
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (boothFilter !== 'all') params.append('boothId', boothFilter);

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
    return <DashboardPageLoading title="บัญชีรายรับรายจ่าย" />;
  }

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header */}
      <div className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-thin text-black tracking-wider">บัญชี</h1>
              <p className="text-sm font-light text-gray-500 mt-1">ติดตามรายรับรายจ่าย</p>
            </div>
            <button
              onClick={handleCreateTransaction}
              className="px-6 py-2 border border-gray-200 text-sm font-light text-black hover:bg-gray-50 transition-colors duration-200 tracking-wide"
            >
              เพิ่มรายการ
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Filters */}
        <div className="space-y-4 sm:space-y-0 sm:flex sm:items-center sm:gap-6 mb-8 sm:mb-12 pb-4 sm:pb-6 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="text-xs font-light text-gray-400 tracking-wider uppercase sm:hidden">ช่วงวันที่</div>
            <div className="flex items-center gap-3 sm:gap-4">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex-1 sm:w-36 border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black"
              />
              <span className="text-gray-300 font-thin">—</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="flex-1 sm:w-36 border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="text-xs font-light text-gray-400 tracking-wider uppercase sm:hidden">ประเภท</div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full sm:w-auto border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light text-gray-600 focus:border-black focus:outline-none"
            >
              <option value="all">ทั้งหมด</option>
              <option value="income">รายรับ</option>
              <option value="expense">รายจ่าย</option>
            </select>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="text-xs font-light text-gray-400 tracking-wider uppercase sm:hidden">หน้าร้าน</div>
            <select
              value={boothFilter}
              onChange={(e) => setBoothFilter(e.target.value)}
              className="w-full sm:w-auto border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light text-gray-600 focus:border-black focus:outline-none"
            >
              <option value="all">ทุกหน้าร้าน</option>
              {booths.map(booth => (
                <option key={booth._id} value={booth._id}>{booth.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
            <AccountingSummaryCard
              title="รายรับ"
              amount={summary.totalIncome}
              icon={<TrendingUp className="w-5 h-5" />}
              color="green"
            />
            <AccountingSummaryCard
              title="รายจ่าย"
              amount={summary.totalExpense}
              icon={<TrendingDown className="w-5 h-5" />}
              color="red"
            />
            <AccountingSummaryCard
              title="สุทธิ"
              amount={summary.netProfit}
              icon={<DollarSign className="w-5 h-5" />}
              color={summary.netProfit >= 0 ? 'green' : 'red'}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
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