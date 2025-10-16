'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatDateTime, migrateUtcToThailand } from '@/utils/timezone';
import { Toast } from '@/components/ui';
import { ArrowLeft } from 'lucide-react';

interface DuplicateSale {
  _id: string;
  createdAt: string;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  clientTransactionId?: string;
  employeeId?: string;
  items: any[];
  booth: {
    _id: string;
    name: string;
    brandId: string;
  };
  timeDiffSeconds: number;
  employeeInfo?: string;
}

interface DuplicateGroup {
  _id: {
    boothId: string;
    totalAmount: number;
    paymentMethod: string;
    timeGroup: number;
  };
  salesWithEmployee: DuplicateSale[];
  count: number;
  brand: Array<{ _id: string; name: string }>;
}

interface DuplicateResponse {
  success: boolean;
  data: {
    duplicateGroups: DuplicateGroup[];
    pagination: {
      current: number;
      total: number;
      limit: number;
      totalRecords: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    summary: {
      totalSales: number;
      totalAmount: number;
      avgAmount: number;
      affectedBrands: number;
    };
    filters: {
      timeWindow: number;
      minAmount: number;
      maxAmount: number;
      brandId?: string;
      startDate?: string;
      endDate?: string;
    };
  };
}

export default function DuplicateSalesPage() {
  const router = useRouter();
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string[]>([]);
  const [selectedSales, setSelectedSales] = useState<string[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    total: 1,
    limit: 20,
    totalRecords: 0,
    hasNext: false,
    hasPrev: false
  });
  const [summary, setSummary] = useState({
    totalSales: 0,
    totalAmount: 0,
    avgAmount: 0,
    affectedBrands: 0
  });

  // Toast state
  const [toast, setToast] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message?: string;
  }>({
    show: false,
    type: 'info',
    title: '',
    message: ''
  });

  // Filters
  const [filters, setFilters] = useState({
    timeWindow: 10, // seconds
    minAmount: 0,
    maxAmount: 999999,
    brandId: '',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 20
  });

  // Toast helper function
  const showToast = (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => {
    setToast({ show: true, type, title, message });
  };

  const fetchDuplicateSales = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== '' && value !== 0) {
          params.append(key, value.toString());
        }
      });

      const response = await fetch(`/api/admin/duplicate-sales?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch duplicate sales');
      }

      const data: DuplicateResponse = await response.json();

      if (data.success) {
        setDuplicateGroups(data.data.duplicateGroups);
        setPagination(data.data.pagination);
        setSummary(data.data.summary);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error fetching duplicate sales:', error);
      showToast('error', 'ไม่สามารถโหลดข้อมูลการขายซ้ำได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDuplicateSales();
  }, [filters.page, filters.limit]);

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleSearch = () => {
    fetchDuplicateSales();
  };

  const handleSelectSale = (saleId: string) => {
    setSelectedSales(prev =>
      prev.includes(saleId)
        ? prev.filter(id => id !== saleId)
        : [...prev, saleId]
    );
  };

  const handleSelectGroup = (group: DuplicateGroup, selectAll: boolean) => {
    const saleIds = group.salesWithEmployee.map(sale => sale._id);
    setSelectedSales(prev => {
      if (selectAll) {
        return [...new Set([...prev, ...saleIds])];
      } else {
        return prev.filter(id => !saleIds.includes(id));
      }
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedSales.length === 0) {
      showToast('error', 'กรุณาเลือกรายการที่ต้องการลบ');
      return;
    }

    const confirmDelete = window.confirm(
      `คุณต้องการลบรายการที่เลือก ${selectedSales.length} รายการหรือไม่?\nการกระทำนี้ไม่สามารถย้อนกลับได้`
    );

    if (!confirmDelete) return;

    try {
      setDeleting(selectedSales);

      const response = await fetch('/api/admin/duplicate-sales', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          saleIds: selectedSales,
          reason: 'Duplicate sale removal by super admin'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete sales');
      }

      const result = await response.json();

      if (result.success) {
        showToast('success', `ลบรายการซ้ำสำเร็จ ${result.results.length} รายการ`);
        if (result.errors.length > 0) {
          showToast('error', `ลบไม่สำเร็จ ${result.errors.length} รายการ`);
        }

        setSelectedSales([]);
        await fetchDuplicateSales(); // Refresh data
      } else {
        throw new Error(result.error || 'Delete failed');
      }
    } catch (error) {
      console.error('Error deleting sales:', error);
      showToast('error', 'เกิดข้อผิดพลาดในการลบรายการ');
    } finally {
      setDeleting([]);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB'
    }).format(amount);
  };

  const getPaymentMethodText = (method: string) => {
    const methods: { [key: string]: string } = {
      'cash': 'เงินสด',
      'promptpay': 'พร้อมเพย์',
      'bank_transfer': 'โอนเงิน',
      'credit_card': 'บัตรเครดิต'
    };
    return methods[method] || method;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => router.push('/super-admin')}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>กลับไปหน้าหลัก</span>
          </button>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">จัดการการขายซ้ำ</h1>
        <p className="text-gray-600">
          ตรวจสอบและจัดการรายการขายที่อาจซ้ำกันจากการกดซ้ำหรือปัญหาเทคนิค
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-sm text-gray-500">รายการทั้งหมด</div>
          <div className="text-2xl font-bold text-gray-900">{summary.totalSales}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-sm text-gray-500">ยอดรวม</div>
          <div className="text-2xl font-bold text-blue-600">{formatCurrency(summary.totalAmount)}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-sm text-gray-500">ยอดเฉลี่ย</div>
          <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.avgAmount)}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-sm text-gray-500">แบรนด์ที่เกี่ยวข้อง</div>
          <div className="text-2xl font-bold text-purple-600">{summary.affectedBrands}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow border mb-6">
        <h3 className="text-lg font-semibold mb-4">ตัวกรอง</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ช่วงเวลา (วินาที)
            </label>
            <input
              type="number"
              value={filters.timeWindow}
              onChange={(e) => handleFilterChange('timeWindow', parseInt(e.target.value) || 10)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
              max="60"
              placeholder="10"
            />
            <div className="text-xs text-gray-500 mt-1">รายการขายที่เกิดขึ้นห่างกันเกิน {filters.timeWindow} วินาทีจะไม่ถือว่าซ้ำ</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ยอดขั้นต่ำ
            </label>
            <input
              type="number"
              value={filters.minAmount}
              onChange={(e) => handleFilterChange('minAmount', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ยอดสูงสุด
            </label>
            <input
              type="number"
              value={filters.maxAmount}
              onChange={(e) => handleFilterChange('maxAmount', parseFloat(e.target.value) || 999999)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              วันที่เริ่มต้น
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              วันที่สิ้นสุด
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              ค้นหา
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedSales.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-yellow-800">
              เลือกแล้ว {selectedSales.length} รายการ
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedSales([])}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                ยกเลิกการเลือก
              </button>
              <button
                onClick={handleDeleteSelected}
                disabled={deleting.length > 0}
                className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white text-sm font-medium py-1 px-3 rounded transition-colors"
              >
                {deleting.length > 0 ? 'กำลังลบ...' : 'ลบรายการที่เลือก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      )}

      {/* Duplicate Groups */}
      {!loading && duplicateGroups.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          ไม่พบรายการขายที่ซ้ำกัน
        </div>
      )}

      {!loading && duplicateGroups.map((group, groupIndex) => (
        <div key={groupIndex} className="bg-white rounded-lg shadow border mb-6">
          <div className="border-b border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  กลุ่มที่ {groupIndex + 1} - {group.salesWithEmployee[0]?.booth?.name}
                </h3>
                <div className="text-sm text-gray-600 mt-1">
                  แบรนด์: {group.brand[0]?.name || 'ไม่ระบุ'} |
                  ยอดรวม: {formatCurrency(group._id.totalAmount)} |
                  วิธีชำระ: {getPaymentMethodText(group._id.paymentMethod)} |
                  จำนวน: {group.count} รายการ
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSelectGroup(group, !group.salesWithEmployee.every(sale => selectedSales.includes(sale._id)))}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {group.salesWithEmployee.every(sale => selectedSales.includes(sale._id)) ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
                </button>
              </div>
            </div>
          </div>

          <div className="p-4">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-sm font-medium text-gray-900">เลือก</th>
                    <th className="text-left py-2 px-3 text-sm font-medium text-gray-900">เวลา</th>
                    <th className="text-left py-2 px-3 text-sm font-medium text-gray-900">ช่วงห่าง (วินาที)</th>
                    <th className="text-left py-2 px-3 text-sm font-medium text-gray-900">ยอดเงิน</th>
                    <th className="text-left py-2 px-3 text-sm font-medium text-gray-900">พนักงาน</th>
                    <th className="text-left py-2 px-3 text-sm font-medium text-gray-900">Transaction ID</th>
                    <th className="text-left py-2 px-3 text-sm font-medium text-gray-900">สินค้า</th>
                  </tr>
                </thead>
                <tbody>
                  {group.salesWithEmployee.map((sale, saleIndex) => (
                    <tr
                      key={sale._id}
                      className={`border-b border-gray-100 ${selectedSales.includes(sale._id) ? 'bg-blue-50' : ''} ${deleting.includes(sale._id) ? 'opacity-50' : ''}`}
                    >
                      <td className="py-2 px-3">
                        <input
                          type="checkbox"
                          checked={selectedSales.includes(sale._id)}
                          onChange={() => handleSelectSale(sale._id)}
                          disabled={deleting.includes(sale._id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="py-2 px-3 text-sm">
                        {formatDateTime(migrateUtcToThailand(new Date(sale.createdAt)))}
                      </td>
                      <td className="py-2 px-3 text-sm">
                        {saleIndex === 0 ? (
                          <span className="text-green-600 font-medium">อ้างอิง</span>
                        ) : (
                          <span className={`font-medium ${sale.timeDiffSeconds < 30 ? 'text-red-600' : sale.timeDiffSeconds < 60 ? 'text-yellow-600' : 'text-gray-600'}`}>
                            +{Math.round(sale.timeDiffSeconds)}s
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-sm font-medium">
                        {formatCurrency(sale.totalAmount)}
                      </td>
                      <td className="py-2 px-3 text-sm">
                        {sale.employeeInfo || 'ไม่ระบุ'}
                      </td>
                      <td className="py-2 px-3 text-sm font-mono text-xs">
                        {sale.clientTransactionId ? (
                          <span className="bg-gray-100 px-2 py-1 rounded">
                            {sale.clientTransactionId.slice(-8)}
                          </span>
                        ) : (
                          <span className="text-red-500">ไม่มี</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-sm">
                        <div className="max-w-xs">
                          {sale.items.map((item: any, idx: number) => (
                            <div key={idx} className="text-xs text-gray-600">
                              {item.name} x{item.quantity}
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ))}

      {/* Pagination */}
      {!loading && pagination.total > 1 && (
        <div className="flex items-center justify-between bg-white px-4 py-3 border border-gray-200 rounded-lg">
          <div className="flex items-center text-sm text-gray-700">
            <span>
              แสดง {Math.min((pagination.current - 1) * pagination.limit + 1, pagination.totalRecords)} ถึง {Math.min(pagination.current * pagination.limit, pagination.totalRecords)} จาก {pagination.totalRecords} รายการ
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleFilterChange('page', pagination.current - 1)}
              disabled={!pagination.hasPrev}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ก่อนหน้า
            </button>
            <span className="px-3 py-1 text-sm">
              หน้า {pagination.current} จาก {pagination.total}
            </span>
            <button
              onClick={() => handleFilterChange('page', pagination.current + 1)}
              disabled={!pagination.hasNext}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ถัดไป
            </button>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      <Toast
        isVisible={toast.show}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        onClose={() => setToast(prev => ({ ...prev, show: false }))}
      />
    </div>
  );
}