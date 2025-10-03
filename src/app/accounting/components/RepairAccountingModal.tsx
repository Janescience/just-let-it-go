import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, CheckCircle, RefreshCw, XCircle } from 'lucide-react';

interface SaleItem {
  menuItemId: string;
  quantity: number;
  price: number;
  menuItem?: {
    name: string;
  };
}

interface SaleWithoutAccounting {
  _id: string;
  boothId: string;
  items: SaleItem[];
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
  booth?: Array<{
    name: string;
  }>;
  employee?: Array<{
    name: string;
    username: string;
  }>;
}

interface RepairAccountingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RepairAccountingModal({ isOpen, onClose }: RepairAccountingModalProps) {
  const [loading, setLoading] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [salesData, setSalesData] = useState<SaleWithoutAccounting[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [dailySums, setDailySums] = useState<Array<{ date: string; count: number; totalAmount: number }>>([]);
  const [selectedSales, setSelectedSales] = useState<Set<string>>(new Set());
  const [repairResults, setRepairResults] = useState<{
    results: any[];
    errors: string[];
    successCount: number;
    errorCount: number;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchSalesWithoutAccounting();
      setRepairResults(null);
      setSelectedSales(new Set());
      setTotalAmount(0);
      setDailySums([]);
    }
  }, [isOpen]);

  const fetchSalesWithoutAccounting = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/accounting/repair');
      if (response.ok) {
        const data = await response.json();
        setSalesData(data.salesWithoutAccounting || []);
        setTotalAmount(data.totalAmount || 0);
        setDailySums(data.dailySums || []);
      } else {
        console.error('Failed to fetch sales data');
      }
    } catch (error) {
      console.error('Error fetching sales data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedSales.size === salesData.length) {
      setSelectedSales(new Set());
    } else {
      setSelectedSales(new Set(salesData.map(sale => sale._id)));
    }
  };

  const handleSelectSale = (saleId: string) => {
    const newSelected = new Set(selectedSales);
    if (newSelected.has(saleId)) {
      newSelected.delete(saleId);
    } else {
      newSelected.add(saleId);
    }
    setSelectedSales(newSelected);
  };

  const handleRepairSelected = async () => {
    if (selectedSales.size === 0) return;

    setRepairing(true);
    try {
      const response = await fetch('/api/accounting/repair', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          saleIds: Array.from(selectedSales)
        })
      });

      if (response.ok) {
        const results = await response.json();
        setRepairResults(results);

        // Refresh the list to remove repaired items
        await fetchSalesWithoutAccounting();
        setSelectedSales(new Set());
      } else {
        console.error('Failed to repair accounting records');
      }
    } catch (error) {
      console.error('Error repairing accounting records:', error);
    } finally {
      setRepairing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return `฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-thin text-black tracking-wider">ซ่อมแซมรายการบัญชี</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
            </div>
          ) : salesData.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">ไม่มีรายการที่ต้องซ่อมแซม</h3>
              <p className="text-gray-600">รายการขายทั้งหมดมีข้อมูลบัญชีครบถ้วนแล้ว</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary */}
              <div className="bg-orange-50 border border-orange-200 p-4 rounded">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  <span className="font-medium text-orange-800">พบรายการขายที่ไม่มีข้อมูลบัญชี</span>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="text-sm text-orange-700">รายการทั้งหมด: {salesData.length} รายการ</p>
                  </div>
                  <div>
                    <p className="text-sm text-orange-700">ยอดรวม: {formatCurrency(totalAmount)}</p>
                  </div>
                </div>
                <p className="text-sm text-orange-700">
                  คุณสามารถเลือกรายการที่ต้องการซ่อมแซมและกดปุ่ม "ปรับปรุงทั้งหมด"
                </p>
              </div>

              {/* Daily Summary */}
              {dailySums.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 p-4 rounded">
                  <h4 className="font-medium text-blue-800 mb-3">สรุปยอดรายวัน</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {dailySums.map((daily) => (
                      <div key={daily.date} className="bg-white p-3 rounded border">
                        <div className="text-sm font-medium text-gray-900">
                          {new Date(daily.date).toLocaleDateString('th-TH', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {daily.count} รายการ • {formatCurrency(daily.totalAmount)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Results */}
              {repairResults && (
                <div className="bg-gray-50 border border-gray-200 p-4 rounded">
                  <h4 className="font-medium text-gray-900 mb-3">ผลการซ่อมแซม</h4>
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-green-700">สำเร็จ: {repairResults.successCount} รายการ</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-red-700">ผิดพลาด: {repairResults.errorCount} รายการ</span>
                    </div>
                  </div>
                  {repairResults.errors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 p-3 rounded">
                      <p className="text-sm font-medium text-red-800 mb-2">ข้อผิดพลาด:</p>
                      <ul className="text-sm text-red-700 space-y-1">
                        {repairResults.errors.map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedSales.size === salesData.length && salesData.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">เลือกทั้งหมด</span>
                  </label>
                  <span className="text-sm text-gray-500">
                    เลือกแล้ว {selectedSales.size} จาก {salesData.length} รายการ
                  </span>
                </div>
                <button
                  onClick={handleRepairSelected}
                  disabled={selectedSales.size === 0 || repairing}
                  className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {repairing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      กำลังปรับปรุง...
                    </>
                  ) : (
                    `ปรับปรุง ${selectedSales.size} รายการ`
                  )}
                </button>
              </div>

              {/* Sales List */}
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={selectedSales.size === salesData.length && salesData.length > 0}
                          onChange={handleSelectAll}
                          className="rounded border-gray-300"
                        />
                      </th>
                      <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">วันที่</th>
                      <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">บูธ</th>
                      <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">รายการ</th>
                      <th className="p-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">ยอดรวม</th>
                      <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">การชำระ</th>
                      <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">พนักงาน</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {salesData.map((sale) => (
                      <tr key={sale._id} className="hover:bg-gray-50">
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedSales.has(sale._id)}
                            onChange={() => handleSelectSale(sale._id)}
                            className="rounded border-gray-300"
                          />
                        </td>
                        <td className="p-3 text-sm text-gray-900">
                          {formatDate(sale.createdAt)}
                        </td>
                        <td className="p-3 text-sm text-gray-900">
                          {sale.booth?.[0]?.name || 'ไม่ระบุ'}
                        </td>
                        <td className="p-3 text-sm text-gray-900">
                          <div className="max-w-xs">
                            {sale.items.map((item, index) => (
                              <div key={index} className="text-sm">
                                {item.menuItem?.name || 'Unknown'} x{item.quantity}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 text-sm text-gray-900 text-right font-medium">
                          {formatCurrency(sale.totalAmount)}
                        </td>
                        <td className="p-3 text-sm text-gray-900">
                          {sale.paymentMethod === 'cash' ? 'เงินสด' : 'เงินโอน'}
                        </td>
                        <td className="p-3 text-sm text-gray-900">
                          {sale.employee?.[0]?.name || sale.employee?.[0]?.username || 'ไม่ระบุ'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
}