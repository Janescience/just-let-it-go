'use client';

import React, { useState, useEffect } from 'react';
import { DollarSign, Plus, TrendingUp, TrendingDown, Calendar, Filter, Settings } from 'lucide-react';
import { Button, Input, DashboardPageLoading } from '@/components/ui';
import { Header } from '@/components/layout/Header';
import { useAuth } from '@/hooks/useAuth';
import { AccountingTransaction, AccountingSummary, Booth, INCOME_CATEGORIES, EXPENSE_CATEGORIES, AccountingFilterCriteria } from '@/types';
import { AccountingSummaryCard } from './components/AccountingSummaryCard';
import { TransactionTable } from './components/TransactionTable';
import { CategoryBreakdown } from './components/CategoryBreakdown';
import { TransactionModal } from './components/TransactionModal';
import { AccountingFilterPanel } from './components/AccountingFilterPanel';
import { RepairAccountingModal } from './components/RepairAccountingModal';
import { getDefaultCriteriaForType, buildQueryParamsFromCriteria } from '@/utils/accounting-filters';
import { FILTER_CRITERIA_LABELS, THAI_MONTHS } from '@/types';

export default function AccountingPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<AccountingTransaction[]>([]);
  const [summary, setSummary] = useState<AccountingSummary | null>(null);
  const [booths, setBooths] = useState<Booth[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [filterCriteria, setFilterCriteria] = useState<AccountingFilterCriteria>(
    getDefaultCriteriaForType('by_month')
  );

  // Modal states
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<AccountingTransaction | null>(null);
  const [showRepairModal, setShowRepairModal] = useState(false);

  useEffect(() => {
    // Fetch booths
    fetchBooths();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [filterCriteria]);

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
      const params = buildQueryParamsFromCriteria(filterCriteria);

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

  const getFilterInfo = (): string => {
    const criteriaLabel = FILTER_CRITERIA_LABELS[filterCriteria.type];

    switch (filterCriteria.type) {
      case 'by_booth':
        const booth = booths.find(b => b._id === filterCriteria.boothId);
        return booth ? `${criteriaLabel}: ${booth.name}` : criteriaLabel;

      case 'by_month':
        if (filterCriteria.month && filterCriteria.year) {
          const monthName = THAI_MONTHS[filterCriteria.month - 1];
          return `${criteriaLabel}: ${monthName} ${filterCriteria.year + 543}`;
        }
        return criteriaLabel;

      case 'by_quarter':
        if (filterCriteria.quarter && filterCriteria.quarterYear) {
          return `${criteriaLabel}: ไตรมาสที่ ${filterCriteria.quarter} ปี ${filterCriteria.quarterYear + 543}`;
        }
        return criteriaLabel;

      case 'by_half_year':
        if (filterCriteria.halfYear && filterCriteria.halfYearYear) {
          const halfLabel = filterCriteria.halfYear === 'first' ? 'ครึ่งแรก' : 'ครึ่งหลัง';
          return `${criteriaLabel}: ${halfLabel} ปี ${filterCriteria.halfYearYear + 543}`;
        }
        return criteriaLabel;

      case 'by_year':
        if (filterCriteria.selectedYear) {
          return `${criteriaLabel}: ปี ${filterCriteria.selectedYear + 543}`;
        }
        return criteriaLabel;

      case 'all_time':
        return criteriaLabel;

      default:
        return criteriaLabel;
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
        <div className="mb-8 sm:mb-12">
          <AccountingFilterPanel
            criteria={filterCriteria}
            onCriteriaChange={setFilterCriteria}
            booths={booths}
          />
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-4">
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

        {/* Category Breakdown Charts */}
        {summary && (
          <div className="mb-16">
            <CategoryBreakdown
              incomeByCategory={summary.incomeByCategory}
              expenseByCategory={summary.expenseByCategory}
              incomeCategories={INCOME_CATEGORIES}
              expenseCategories={EXPENSE_CATEGORIES}
            />
          </div>
        )}

        {/* Transactions Table */}
        <div>
          <TransactionTable
            transactions={transactions}
            onEdit={handleEditTransaction}
            onDelete={handleDeleteTransaction}
            incomeCategories={INCOME_CATEGORIES}
            expenseCategories={EXPENSE_CATEGORIES}
            filterInfo={getFilterInfo()}
            filterCriteria={filterCriteria}
            booths={booths}
            userRole={user?.role}
            currentBrandId={user?.currentBrandId}
            onRepairAccounting={() => setShowRepairModal(true)}
          />
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

        {/* Repair Accounting Modal */}
        {showRepairModal && (
          <RepairAccountingModal
            isOpen={showRepairModal}
            onClose={() => setShowRepairModal(false)}
          />
        )}
      </div>
    </div>
  );
}