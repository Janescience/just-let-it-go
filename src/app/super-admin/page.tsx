'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Store, Users, Calendar, Building, ChevronRight, LogOut } from 'lucide-react';
import { Brand } from '@/types';

interface BrandWithStats extends Brand {
  stats: {
    totalBooths: number;
    activeBooths: number;
    totalUsers: number;
    totalSales: number;
    lastActivity: string;
  };
}

export default function SuperAdminPage() {
  const { user, isSuperAdmin, logout } = useAuth();
  const router = useRouter();
  const [brands, setBrands] = useState<BrandWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user && !isSuperAdmin) {
      router.push('/');
      return;
    }

    if (isSuperAdmin) {
      fetchBrands();
    }
  }, [user, isSuperAdmin, router]);

  const fetchBrands = async () => {
    try {
      const response = await fetch('/api/super-admin/brands');
      if (response.ok) {
        const data = await response.json();
        setBrands(data.brands);
      } else {
        setError('ไม่สามารถโหลดข้อมูลแบรนด์ได้');
      }
    } catch (error) {
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const handleBrandSelect = async (brandId: string) => {
    try {
      // Switch to selected brand context
      const response = await fetch('/api/super-admin/switch-brand', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ brandId }),
      });

      if (response.ok) {
        // Redirect to dashboard as admin of selected brand
        window.location.href = '/';
      } else {
        setError('ไม่สามารถเข้าถึงแบรนด์นี้ได้');
      }
    } catch (error) {
      setError('เกิดข้อผิดพลาดในการเปลี่ยนแบรนด์');
    }
  };

  const formatLastActivity = (dateString: string) => {
    if (!dateString) return 'ไม่มีข้อมูล';

    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'วันนี้';
    if (diffDays === 2) return 'เมื่อวาน';
    if (diffDays <= 7) return `${diffDays - 1} วันที่แล้ว`;
    if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} สัปดาห์ที่แล้ว`;
    return `${Math.ceil(diffDays / 30)} เดือนที่แล้ว`;
  };

  if (!user || !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังตรวจสอบสิทธิ์...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl sm:text-2xl font-thin text-black tracking-wider">Super Admin</h1>
                <p className="text-sm font-light text-gray-500 mt-1">กำลังโหลดข้อมูลแบรนด์...</p>
              </div>
            </div>
          </div>
        </div>
        <div className="p-4 tablet:p-6 pb-24">
          <div className="text-center py-8 text-gray-600 font-light">กำลังโหลดข้อมูล...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header */}
      <div className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-thin text-black tracking-wider">Super Admin Dashboard</h1>
              <p className="text-sm font-light text-gray-500 mt-1">เลือกแบรนด์เพื่อเข้าใช้งาน</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-light text-gray-600">ยินดีต้อนรับ, {user.name}</p>
                <p className="text-xs text-gray-400">Super Administrator</p>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors border border-gray-200 hover:border-red-200"
              >
                <LogOut className="w-4 h-4" />
                ออกจากระบบ
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 tablet:p-6 pb-24">
        {error && (
          <div className="mb-6 p-4 border border-red-200 bg-red-50 text-red-700">
            {error}
          </div>
        )}

        {brands.length === 0 ? (
          <div className="text-center py-16">
            <Building className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <h2 className="text-lg font-thin text-gray-600 mb-2">ไม่มีแบรนด์ในระบบ</h2>
            <p className="font-light text-gray-400">ยังไม่มีแบรนด์ที่ลงทะเบียนในระบบ</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-thin text-black tracking-wider">แบรนด์ทั้งหมด ({brands.length})</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {brands.map((brand) => (
                <div
                  key={brand._id}
                  onClick={() => handleBrandSelect(brand._id)}
                  className="border border-gray-200 p-6 hover:border-black transition-colors cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {brand.logo ? (
                        <img
                          src={brand.logo}
                          alt={brand.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                          <Store className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <h3 className="text-lg font-light text-black">{brand.name}</h3>
                        <p className="text-sm text-gray-500">
                          {formatLastActivity(brand.stats.lastActivity)}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-black transition-colors" />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="text-center p-3 border border-gray-100">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Store className="w-4 h-4 text-gray-500" />
                        <span className="text-xs text-gray-500">บูธ</span>
                      </div>
                      <div className="font-light text-black">
                        {brand.stats.activeBooths}/{brand.stats.totalBooths}
                      </div>
                    </div>
                    <div className="text-center p-3 border border-gray-100">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Users className="w-4 h-4 text-gray-500" />
                        <span className="text-xs text-gray-500">ผู้ใช้</span>
                      </div>
                      <div className="font-light text-black">
                        {brand.stats.totalUsers}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">ยอดขายรวม</span>
                      <span className="font-light text-black">
                        ฿{brand.stats.totalSales.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 text-center">
                    <span className="text-xs text-gray-400 group-hover:text-gray-600 transition-colors">
                      คลิกเพื่อเข้าใช้งาน
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}