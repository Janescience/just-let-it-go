'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Clock, Database, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { Toast } from '@/components/ui';

interface MigrationStats {
  accountingTransactions: number;
  stockMovements: number;
  totalRecords: number;
}

interface MigrationResult {
  success: boolean;
  results: {
    accountingTransactions: number;
    stockMovements: number;
    totalUpdated: number;
    errors: string[];
  };
}

export default function TimezoneMigrationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const [stats, setStats] = useState<MigrationStats | null>(null);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);

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

  const showToast = (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => {
    setToast({ show: true, type, title, message });
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/timezone-migration/stats');

      if (!response.ok) {
        throw new Error('Failed to fetch migration stats');
      }

      const data = await response.json();
      setStats(data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
      showToast('error', 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const runMigration = async () => {
    if (!confirm('คุณต้องการดำเนินการ timezone migration หรือไม่?\n\nกระบวนการนี้จะเพิ่มเวลา +7 ชั่วโมงให้กับข้อมูลใน 2 ตาราง:\n- AccountingTransaction\n- StockMovement\n\nแนะนำให้สำรองข้อมูลก่อนดำเนินการ')) {
      return;
    }

    try {
      setMigrating(true);
      const response = await fetch('/api/admin/timezone-migration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Migration failed');
      }

      const result = await response.json();
      setMigrationResult(result);

      if (result.success) {
        showToast('success', 'Migration สำเร็จ', `ประมวลผลข้อมูล ${result.results.totalUpdated} รายการ`);
        // Refresh stats after successful migration
        await fetchStats();
      } else {
        showToast('error', 'Migration ไม่สำเร็จ', 'มีข้อผิดพลาดในการประมวลผล');
      }

    } catch (error) {
      console.error('Error during migration:', error);
      showToast('error', 'เกิดข้อผิดพลาดในการ migrate ข้อมูล');
    } finally {
      setMigrating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.push('/super-admin')}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>กลับไปหน้าหลัก</span>
          </button>
        </div>

        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
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

        <div className="flex items-center gap-3 mb-2">
          <Clock className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Timezone Migration</h1>
        </div>
        <p className="text-gray-600">
          เพิ่มเวลา +7 ชั่วโมงให้กับข้อมูล createdAt และ updatedAt ใน AccountingTransaction และ StockMovement
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center gap-3 mb-2">
              <Database className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-medium text-gray-900">AccountingTransaction</h3>
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats.accountingTransactions.toLocaleString()}</div>
            <p className="text-sm text-gray-600 mt-1">รายการบัญชี</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center gap-3 mb-2">
              <Database className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-medium text-gray-900">StockMovement</h3>
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats.stockMovements.toLocaleString()}</div>
            <p className="text-sm text-gray-600 mt-1">การเคลื่อนไหวสต็อก</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center gap-3 mb-2">
              <Database className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-medium text-gray-900">รวมทั้งหมด</h3>
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats.totalRecords.toLocaleString()}</div>
            <p className="text-sm text-gray-600 mt-1">รายการที่จะอัปเดต</p>
          </div>
        </div>
      )}

      {/* Migration Section */}
      <div className="space-y-6">
        {!migrationResult ? (
          <div className="bg-white p-6 rounded-lg shadow border">
            <h3 className="text-lg font-medium text-gray-900 mb-4">ดำเนินการ Timezone Migration</h3>

            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">การปรับปรุงข้อมูล</h4>
                <ul className="text-blue-700 space-y-1">
                  <li>• AccountingTransaction: เพิ่ม +7 ชั่วโมงให้ createdAt และ updatedAt</li>
                  <li>• StockMovement: เพิ่ม +7 ชั่วโมงให้ createdAt และ updatedAt</li>
                  <li>• ทั้งหมด: {stats?.totalRecords.toLocaleString()} รายการ</li>
                </ul>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-medium text-red-800 mb-2">ข้อควรระวัง</h4>
                <ul className="text-red-700 space-y-1">
                  <li>• กระบวนการนี้ไม่สามารถย้อนกลับได้</li>
                  <li>• แนะนำให้สำรองข้อมูลก่อนดำเนินการ</li>
                  <li>• ควรทำในช่วงเวลาที่ไม่มีการใช้งานหนัก</li>
                </ul>
              </div>

              <button
                onClick={runMigration}
                disabled={migrating}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                {migrating ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    กำลังดำเนินการ Migration...
                  </>
                ) : (
                  <>
                    <Clock className="w-5 h-5" />
                    เริ่ม Timezone Migration
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-lg shadow border">
            <h3 className="text-lg font-medium text-gray-900 mb-4">ผลลัพธ์ Migration</h3>

            <div className="space-y-4">
              <div className={`flex items-center gap-2 ${migrationResult.success ? 'text-green-600' : 'text-red-600'}`}>
                {migrationResult.success ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <AlertTriangle className="w-5 h-5" />
                )}
                <span className="font-medium">
                  {migrationResult.success ? 'Migration สำเร็จ' : 'Migration ไม่สำเร็จ'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-green-50 rounded">
                  <div className="text-2xl font-bold text-green-600">{migrationResult.results.accountingTransactions.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">AccountingTransaction</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded">
                  <div className="text-2xl font-bold text-purple-600">{migrationResult.results.stockMovements.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">StockMovement</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded">
                  <div className="text-2xl font-bold text-gray-900">{migrationResult.results.totalUpdated.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">รวมทั้งหมด</div>
                </div>
              </div>

              {migrationResult.results.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded p-4">
                  <h4 className="font-medium text-red-800 mb-2">ข้อผิดพลาด</h4>
                  <ul className="text-red-700 space-y-1">
                    {migrationResult.results.errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={() => setMigrationResult(null)}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                ดำเนินการใหม่
              </button>
            </div>
          </div>
        )}
      </div>

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