'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Clock, Database, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { Toast } from '@/components/ui';

interface DataSample {
  _id: string;
  createdAt: string;
  updatedAt?: string;
  type: 'sale' | 'accounting' | 'stock_movement';
  amount?: number;
  description?: string;
}

interface MigrationStats {
  totalRecords: number;
  utcRecords: number;
  thailandRecords: number;
  samples: DataSample[];
}

interface MigrationResult {
  success: boolean;
  totalProcessed: number;
  salesUpdated: number;
  accountingUpdated: number;
  stockMovementsUpdated: number;
  errors: string[];
  duration: number;
}

export default function TimezoneMigrationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const [stats, setStats] = useState<MigrationStats | null>(null);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'samples' | 'migrate'>('overview');

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
    if (!confirm('คุณต้องการดำเนินการ timezone migration หรือไม่?\n\nกระบวนการนี้จะแปลงข้อมูลเวลา UTC เป็นเวลาไทย และไม่สามารถย้อนกลับได้\n\nแนะนำให้สำรองข้อมูลก่อนดำเนินการ')) {
      return;
    }

    try {
      setMigrating(true);
      const response = await fetch('/api/admin/timezone-migration/migrate', {
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
        showToast('success', 'Migration สำเร็จ', `ประมวลผลข้อมูล ${result.totalProcessed} รายการ`);
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

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      thai: date.toLocaleString('th-TH', {
        timeZone: 'Asia/Bangkok',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
      utc: date.toISOString(),
      timestamp: date.getTime()
    };
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'sale': return 'bg-blue-100 text-blue-800';
      case 'accounting': return 'bg-green-100 text-green-800';
      case 'stock_movement': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'sale': return 'การขาย';
      case 'accounting': return 'บัญชี';
      case 'stock_movement': return 'การเคลื่อนไหวสต็อก';
      default: return type;
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
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

        <div className="flex items-center gap-3 mb-2">
          <Clock className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Timezone Migration</h1>
        </div>
        <p className="text-gray-600">
          แปลงข้อมูลเวลา UTC เป็นเวลาไทย (UTC+7) สำหรับข้อมูลที่บันทึกไว้ก่อนหน้า
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setSelectedTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              selectedTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            ภาพรวม
          </button>
          <button
            onClick={() => setSelectedTab('samples')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              selectedTab === 'samples'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            ตัวอย่างข้อมูล
          </button>
          <button
            onClick={() => setSelectedTab('migrate')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              selectedTab === 'migrate'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            ดำเนินการ Migration
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {selectedTab === 'overview' && stats && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center gap-3 mb-2">
                <Database className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg font-medium text-gray-900">ข้อมูลทั้งหมด</h3>
              </div>
              <div className="text-3xl font-bold text-gray-900">{stats.totalRecords.toLocaleString()}</div>
              <p className="text-sm text-gray-600 mt-1">รายการทั้งหมดในระบบ</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="w-5 h-5 text-orange-600" />
                <h3 className="text-lg font-medium text-gray-900">ข้อมูล UTC</h3>
              </div>
              <div className="text-3xl font-bold text-orange-600">{stats.utcRecords.toLocaleString()}</div>
              <p className="text-sm text-gray-600 mt-1">ต้องการ migration</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-medium text-gray-900">ข้อมูลเวลาไทย</h3>
              </div>
              <div className="text-3xl font-bold text-green-600">{stats.thailandRecords.toLocaleString()}</div>
              <p className="text-sm text-gray-600 mt-1">แปลงแล้ว</p>
            </div>
          </div>

          {/* Progress */}
          <div className="bg-white p-6 rounded-lg shadow border">
            <h3 className="text-lg font-medium text-gray-900 mb-4">ความคืบหน้า</h3>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-green-600 h-4 rounded-full transition-all duration-300"
                style={{
                  width: `${stats.totalRecords > 0 ? (stats.thailandRecords / stats.totalRecords) * 100 : 0}%`
                }}
              ></div>
            </div>
            <div className="flex justify-between text-sm text-gray-600 mt-2">
              <span>แปลงแล้ว {((stats.thailandRecords / stats.totalRecords) * 100).toFixed(1)}%</span>
              <span>{stats.utcRecords.toLocaleString()} รายการคงเหลือ</span>
            </div>
          </div>

          {stats.utcRecords > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                <h4 className="font-medium text-yellow-800">ต้องการ Migration</h4>
              </div>
              <p className="text-yellow-700 mt-2">
                พบข้อมูล {stats.utcRecords.toLocaleString()} รายการที่ยังใช้เวลา UTC
                แนะนำให้ดำเนินการ migration เพื่อแปลงเป็นเวลาไทย
              </p>
            </div>
          )}
        </div>
      )}

      {selectedTab === 'samples' && stats && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow border overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">ตัวอย่างข้อมูลก่อน Migration</h3>
              <p className="text-sm text-gray-600 mt-1">ตัวอย่างข้อมูลที่จะได้รับการแปลงเวลา</p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ประเภท
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      เวลาปัจจุบัน (UTC)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      เวลาหลัง Migration (Thailand)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      รายละเอียด
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stats.samples.map((sample) => {
                    const dateInfo = formatDateTime(sample.createdAt);
                    const futureDate = new Date(dateInfo.timestamp + (7 * 60 * 60 * 1000));

                    return (
                      <tr key={sample._id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(sample.type)}`}>
                            {getTypeLabel(sample.type)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                          {dateInfo.utc}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-mono">
                          {futureDate.toISOString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {sample.amount && (
                            <div>฿{sample.amount.toLocaleString()}</div>
                          )}
                          {sample.description && (
                            <div className="truncate max-w-xs">{sample.description}</div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {selectedTab === 'migrate' && (
        <div className="space-y-6">
          {!migrationResult ? (
            <div className="bg-white p-6 rounded-lg shadow border">
              <h3 className="text-lg font-medium text-gray-900 mb-4">ดำเนินการ Timezone Migration</h3>

              {stats && stats.utcRecords > 0 ? (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800 mb-2">ข้อมูลที่จะถูกประมวลผล</h4>
                    <ul className="text-blue-700 space-y-1">
                      <li>• รายการขาย: แปลงเวลาการสร้างและอัพเดต</li>
                      <li>• รายการบัญชี: แปลงเวลาธุรกรรม</li>
                      <li>• การเคลื่อนไหวสต็อก: แปลงเวลาการบันทึก</li>
                      <li>• ทั้งหมด: {stats.utcRecords.toLocaleString()} รายการ</li>
                    </ul>
                  </div>

                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="font-medium text-red-800 mb-2">ข้อควรระวัง</h4>
                    <ul className="text-red-700 space-y-1">
                      <li>• กระบวนการนี้ไม่สามารถย้อนกลับได้</li>
                      <li>• แนะนำให้สำรองข้อมูลก่อนดำเนินการ</li>
                      <li>• ระบบอาจช้าลงระหว่างการประมวลผล</li>
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
                        <Database className="w-5 h-5" />
                        เริ่ม Timezone Migration
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Migration เสร็จสิ้นแล้ว</h4>
                  <p className="text-gray-600">ข้อมูลทั้งหมดได้ถูกแปลงเป็นเวลาไทยเรียบร้อยแล้ว</p>
                </div>
              )}
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

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="text-2xl font-bold text-gray-900">{migrationResult.totalProcessed.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">รวมทั้งหมด</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded">
                    <div className="text-2xl font-bold text-blue-600">{migrationResult.salesUpdated.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">การขาย</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded">
                    <div className="text-2xl font-bold text-green-600">{migrationResult.accountingUpdated.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">บัญชี</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded">
                    <div className="text-2xl font-bold text-purple-600">{migrationResult.stockMovementsUpdated.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">สต็อก</div>
                  </div>
                </div>

                <div className="text-sm text-gray-600">
                  ใช้เวลา: {migrationResult.duration.toFixed(2)} วินาที
                </div>

                {migrationResult.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded p-4">
                    <h4 className="font-medium text-red-800 mb-2">ข้อผิดพลาด</h4>
                    <ul className="text-red-700 space-y-1">
                      {migrationResult.errors.map((error, index) => (
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