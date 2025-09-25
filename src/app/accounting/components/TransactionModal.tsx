import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { AccountingTransaction } from '@/types';

interface TransactionModalProps {
  transaction: AccountingTransaction | null;
  onClose: () => void;
  onSave: () => void;
  incomeCategories: Record<string, string>;
  expenseCategories: Record<string, string>;
}

export function TransactionModal({
  transaction,
  onClose,
  onSave,
  incomeCategories,
  expenseCategories
}: TransactionModalProps) {
  const [formData, setFormData] = useState({
    date: '',
    type: 'expense' as 'income' | 'expense',
    category: '',
    amount: '',
    description: '',
    boothId: ''
  });
  const [loading, setLoading] = useState(false);
  const [booths, setBooths] = useState<any[]>([]);

  useEffect(() => {
    if (transaction) {
      setFormData({
        date: new Date(transaction.date).toISOString().split('T')[0],
        type: transaction.type,
        category: transaction.category,
        amount: transaction.amount.toString(),
        description: transaction.description,
        boothId: transaction.boothId && typeof transaction.boothId === 'object' && '_id' in transaction.boothId
          ? transaction.boothId._id
          : transaction.boothId || ''
      });
    } else {
      setFormData({
        date: new Date().toISOString().split('T')[0],
        type: 'expense',
        category: '',
        amount: '',
        description: '',
        boothId: ''
      });
    }
  }, [transaction]);

  useEffect(() => {
    fetchBooths();
  }, []);

  const fetchBooths = async () => {
    try {
      const response = await fetch('/api/booth', {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.type || !formData.category || !formData.amount || !formData.description) {
      alert('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      alert('กรุณากรอกจำนวนเงินที่ถูกต้อง');
      return;
    }

    setLoading(true);

    try {
      const url = transaction
        ? `/api/accounting/transactions/${transaction._id}`
        : '/api/accounting/transactions';

      const method = transaction ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          date: formData.date,
          type: formData.type,
          category: formData.category,
          amount: amount,
          description: formData.description,
          boothId: formData.boothId || null
        })
      });

      if (response.ok) {
        onSave();
      } else {
        const error = await response.json();
        alert(error.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    } catch (error) {
      console.error('Error saving transaction:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const currentCategories = formData.type === 'income' ? incomeCategories : expenseCategories;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-black">
            {transaction ? 'แก้ไขรายการบัญชี' : 'เพิ่มรายการบัญชี'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              วันที่ *
            </label>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ประเภท *
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({
                ...formData,
                type: e.target.value as 'income' | 'expense',
                category: '' // Reset category when type changes
              })}
              className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-black"
              required
            >
              <option value="expense">รายจ่าย</option>
              <option value="income">รายรับ</option>
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              หมวดหมู่ *
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-black"
              required
            >
              <option value="">เลือกหมวดหมู่</option>
              {Object.entries(currentCategories).map(([key, value]) => (
                <option key={key} value={key}>{value}</option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              จำนวนเงิน (บาท) *
            </label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0.00"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              รายละเอียด *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-black"
              rows={3}
              placeholder="อธิบายรายละเอียดการทำรายการ"
              required
            />
          </div>

          {/* Booth (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              หน้าร้านที่เกี่ยวข้อง (ถ้ามี)
            </label>
            <select
              value={formData.boothId}
              onChange={(e) => setFormData({ ...formData, boothId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option value="">ไม่เกี่ยวข้องกับหน้าร้านใดๆ</option>
              {booths.map((booth) => (
                <option key={booth._id} value={booth._id}>
                  {booth.name} - {booth.location}
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              ยกเลิก
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1 flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  บันทึก
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}