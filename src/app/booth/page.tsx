'use client';

import React, { useState, useEffect } from 'react';
import { Plus, RefreshCw, MapPin, ChevronDown, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useBrand } from '@/hooks/useBrand';
import { Button } from '@/components/ui';
import { Booth, MenuItem } from '@/types';
import { useRealtime } from '@/utils/realtime';
import { BoothCard } from './components/BoothCard';
import { BoothDetailModal } from './components/BoothDetailModal';
import { BoothDeleteModal } from './components/BoothDeleteModal';
import { BoothMenuModal } from './components/BoothMenuModal';
import { BoothModal } from './components/BoothModal';
import { SalesActivitySidebar } from './components/SalesActivitySidebar';
import { BoothLoading } from './components/BoothLoading';

// Booth Card Skeleton Component
function BoothCardSkeleton() {
  return (
    <div className="cursor-pointer transition-all duration-300 border border-gray-200 bg-white flex flex-col h-full">
      {/* Header */}
      <div className="p-6 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="h-5 w-12 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 space-y-5 mb-2">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <div className="h-3 w-24 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-3 w-20 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
            <div className="h-2 w-1/4 bg-gray-300 animate-pulse"></div>
          </div>
          <div className="flex justify-between">
            <div className="h-3 w-28 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-3 w-20 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex flex-col border border-gray-200 bg-gray-50 px-2 py-1">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-3 w-8 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="h-4 w-12 bg-gray-200 rounded animate-pulse ml-auto mt-1"></div>
            </div>
          ))}
        </div>

        {/* Alert */}
        <div className="flex items-center gap-2 border border-gray-200 px-3 py-2 bg-gray-50">
          <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-3 w-32 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 p-4 mt-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="h-3 w-24 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-3 w-20 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 h-8 bg-gray-200 rounded animate-pulse"></div>
          <div className="flex-1 h-8 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}

interface BoothStats {
  booth: Booth & {
    fixedCosts: number;
    totalSales: number;
    profit: number;
    breakEvenPercentage: number;
    dailyAverage: number;
    daysRunning: number;
    isBreakEven: boolean;
    remainingToBreakEven: number;
    remainingToPlannedBreakEven?: number;
    plannedBreakEven?: {
      revenue: number;
      units: number;
      progress: number;
      isAchieved: boolean;
    };
    menuStats: {
      name: string;
      quantity: number;
      revenue: number;
    }[];
  };
}

interface SaleActivity {
  id: string;
  boothName: string;
  boothId: string;
  totalAmount: number;
  orderItems: {
    name: string;
    quantity: number;
    price: number;
  }[];
  timestamp: Date;
  isNew?: boolean;
}

export default function BoothPage() {
  const { user } = useAuth();
  const { brand } = useBrand();
  const router = useRouter();
  const [booths, setBooths] = useState<Booth[]>([]);
  const [boothsStats, setBoothsStats] = useState<{ [key: string]: BoothStats }>({});
  const [loading, setLoading] = useState({
    booths: false,
    stats: false,
    activities: false
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedBooth, setSelectedBooth] = useState<Booth | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [salesActivities, setSalesActivities] = useState<SaleActivity[]>([]);
  const [newSalesCount, setNewSalesCount] = useState(0);
  const [showInactiveBooths, setShowInactiveBooths] = useState(false);

  // Real-time connection - use user.brandId which is always available
  const { connected, subscribe, unsubscribe } = useRealtime(
    user?.brandId || '',
    undefined // Listen to all booths for this brand
  );


  useEffect(() => {
    if (user && booths.length === 0 && !loading.booths) {
      fetchBooths();
    }
  }, [user, booths.length, loading.booths]);

  useEffect(() => {
    if (booths.length > 0 && Object.keys(boothsStats).length === 0 && !loading.stats) {
      // Defer stats loading to make page load faster
      setTimeout(() => {
        fetchBoothsStats();
      }, 100);
    }
  }, [booths.length, boothsStats, loading.stats]);

  useEffect(() => {
    if (booths.length > 0 && salesActivities.length === 0 && !loading.activities) {
      // Defer activities loading even more
      setTimeout(() => {
        fetchSalesActivities();
      }, 300);
    }
  }, [booths.length, salesActivities.length, loading.activities]);

  // Listen for booth stats updates from sales page
  useEffect(() => {
    const handleBoothStatsUpdate = () => {
      fetchBoothsStats();
    };

    window.addEventListener('booth-stats-update', handleBoothStatsUpdate);

    return () => {
      window.removeEventListener('booth-stats-update', handleBoothStatsUpdate);
    };
  }, []);

  // Real-time sale event listener
  useEffect(() => {
    if (!connected) return;

    const handleNewSale = (saleData: any) => {
      // Find booth that made the sale
      const saleBoothId = saleData.boothId;
      const booth = booths.find(b => b._id === saleBoothId);

      if (saleBoothId && booth) {
        // Add to sales activities
        const newActivity: SaleActivity = {
          id: saleData.saleId || `${Date.now()}-${Math.random()}`,
          boothName: booth.name,
          boothId: saleBoothId,
          totalAmount: saleData.totalAmount || 0,
          orderItems: saleData.items?.map((item: any) => ({
            name: item.menuItem?.name || 'รายการ',
            quantity: item.quantity || 1,
            price: item.price || 0
          })) || [],
          timestamp: new Date(),
          isNew: true
        };

        setSalesActivities(prev => {
          // Check if activity already exists (avoid duplicates)
          const exists = prev.find(activity => activity.id === newActivity.id);
          if (exists) return prev;

          // Add new activity and remove old ones, keeping max 50
          return [newActivity, ...prev.slice(0, 49)];
        });
        setNewSalesCount(prev => prev + 1);

        // Trigger stats update
        triggerStatsUpdate();
      } else {
        console.log('❌ Could not process sale - missing booth or boothId');
      }
    };

    // Debug: Listen to ALL event types
    const handleAllEvents = (eventType: string) => (data: any) => {
      console.log(`🎨 Received event [${eventType}]:`, data);
    };

    // Subscribe to all possible events for debugging
    subscribe('stock_update', handleAllEvents('stock_update'));
    subscribe('order_status_change', handleAllEvents('order_status_change'));
    subscribe('low_stock_alert', handleAllEvents('low_stock_alert'));
    subscribe('booth_status_change', handleAllEvents('booth_status_change'));

    subscribe('new_sale', handleNewSale);

    return () => {
      unsubscribe('new_sale', handleNewSale);
    };
  }, [connected, subscribe, unsubscribe, booths]);

  // Auto-refresh stats every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (booths.length > 0) {
        fetchBoothsStats();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [booths]);

  const triggerStatsUpdate = () => {
    setTimeout(() => {
      fetchBoothsStats();
      fetchSalesActivities(); // Also refresh activities
    }, 1000); // Small delay to ensure sale is processed
  };

  const fetchSalesActivities = async () => {
    setLoading(prev => ({ ...prev, activities: true }));
    try {
      const response = await fetch('/api/sales');
      if (response.ok) {
        const data = await response.json();

        // Transform sales data to activities format
        const activities: SaleActivity[] = data.sales.map((sale: any) => ({
          id: sale._id,
          boothName: sale.boothId?.name || 'Unknown Booth',
          boothId: sale.boothId?._id || sale.boothId,
          totalAmount: sale.totalAmount,
          orderItems: sale.items?.map((item: any) => ({
            name: item.menuItemId?.name || 'รายการ',
            quantity: item.quantity,
            price: item.price
          })) || [],
          timestamp: new Date(sale.createdAt),
          isNew: false // Existing sales are not new
        }));

        setSalesActivities(activities.slice(0, 50)); // Keep only latest 50
      }
    } catch (error) {
      console.error('Error fetching sales activities:', error);
    } finally {
      setLoading(prev => ({ ...prev, activities: false }));
    }
  };

  const handleMarkAllAsRead = () => {
    setSalesActivities(prev =>
      prev.map(activity => ({ ...activity, isNew: false }))
    );
    setNewSalesCount(0);
  };

  const fetchBooths = async () => {
    setLoading(prev => ({ ...prev, booths: true }));
    try {
      const response = await fetch('/api/booths');
      if (response.ok) {
        const data = await response.json();
        setBooths(data.booths || []);
      }
    } catch (error) {
      console.error('Error fetching booths:', error);
    } finally {
      setLoading(prev => ({ ...prev, booths: false }));
    }
  };

  const fetchBoothsStats = async () => {
    setLoading(prev => ({ ...prev, stats: true }));
    try {
      const statsPromises = booths.map(async (booth) => {
        const response = await fetch(`/api/booths/${booth._id}/stats`);
        if (response.ok) {
          const data = await response.json();
          return { boothId: booth._id, stats: data };
        }
        return null;
      });

      const results = await Promise.all(statsPromises);

      const newStats = results.reduce((acc, result) => {
        if (result) {
          acc[result.boothId] = result.stats;
        }
        return acc;
      }, {} as { [key: string]: BoothStats });

      setBoothsStats(newStats);
      setLastUpdateTime(Date.now());
    } catch (error) {
      console.error('Error fetching booth stats:', error);
    } finally {
      setLoading(prev => ({ ...prev, stats: false }));
    }
  };

  const activeBooths = booths.filter(booth => booth.isActive);
  const inactiveBooths = booths.filter(booth => !booth.isActive);

  const handleBoothClick = (booth: Booth) => {
    setSelectedBooth(booth);
    setShowDetailModal(true);
  };

  const handleSaleClick = (booth: Booth) => {
    router.push(`/sales?boothId=${booth._id}`);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-thin text-black tracking-wider">หน้าร้าน</h1>
              <p className="text-sm font-light text-gray-500 mt-1">จัดการหน้าร้านและติดตามผลการดำเนินงาน</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-2 border border-gray-200 text-sm font-light text-black hover:bg-gray-50 transition-colors duration-200 tracking-wide"
            >
              เพิ่มหน้าร้าน
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 pb-24">
        {/* Header Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4  mb-6">
          <div className="flex gap-4 items-center">
            {loading.booths && booths.length === 0 ? (
              <>
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
              </>
            ) : (
              <>
                <div className="text-sm text-gray-600 font-light">
                  หน้าร้านที่กำลังขาย: <span className="text-gray-800 font-medium">{activeBooths.length}</span>
                </div>
                <div className="text-sm text-gray-600 font-light">
                  หน้าร้านที่ปิด: <span className="text-gray-500">{inactiveBooths.length}</span>
                </div>
              </>
            )}
          </div>

          <div className="flex gap-2 text-right justify-end">
            <button
              onClick={() => fetchBoothsStats()}
              className="px-6 py-2 border border-gray-200 text-sm font-light text-black hover:bg-gray-50 transition-colors duration-200 tracking-wide"
              disabled={loading.stats}
            >
              {loading.stats ? 'กำลังโหลด...' : 'รีเฟรช'}
            </button>
          </div>
        </div>

        {/* Active Booths */}
        {loading.booths && booths.length === 0 ? (
          <div className="mb-8">
            <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[1, 2, 3].map(i => (
                <BoothCardSkeleton key={i} />
              ))}
            </div>
          </div>
        ) : activeBooths.length > 0 ? (
          <div className="mb-8">
            <h2 className="text-lg font-light mb-4 text-gray-800 tracking-wide">หน้าร้านที่กำลังขาย</h2>
            <div className="grid grid-cols-1 md:grid-cols-3   gap-3">
              {activeBooths.map(booth => (
                <BoothCard
                  key={booth._id}
                  booth={booth}
                  stats={boothsStats[booth._id]}
                  isLoadingStats={loading.stats}
                  onClick={() => handleBoothClick(booth)}
                  onSaleClick={() => handleSaleClick(booth)}
                />
              ))}
            </div>
          </div>
        ) : null}

        {/* Inactive Booths */}
        {inactiveBooths.length > 0 && (
          <div>
            <button
              onClick={() => setShowInactiveBooths(!showInactiveBooths)}
              className="flex items-center gap-2 text-sm font-light text-gray-600 hover:text-gray-800 transition-colors mb-4 w-full text-left"
            >
              {showInactiveBooths ? (
                <ChevronDown className="w-5 h-5" />
              ) : (
                <ChevronRight className="w-5 h-5" />
              )}
              <span>หน้าร้านที่ปิดแล้ว ({inactiveBooths.length})</span>
            </button>

            {showInactiveBooths && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {inactiveBooths.map(booth => (
                  <BoothCard
                    key={booth._id}
                    booth={booth}
                    stats={boothsStats[booth._id]}
                    isLoadingStats={loading.stats}
                    onClick={() => handleBoothClick(booth)}
                    onSaleClick={() => handleSaleClick(booth)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {/* {booths.length === 0 && (
          <div className="text-center py-12">
            <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-light text-gray-800 mb-2 tracking-wide">ยังไม่มีหน้าร้าน</h3>
            <p className="text-gray-600 font-light mb-6">เริ่มต้นสร้างหน้าร้านแรกของคุณ</p>
            <Button
              onClick={() => setShowAddModal(true)}
              icon={Plus}
            >
              สร้างหน้าร้าน
            </Button>
          </div>
        )} */}
      </div>

      {/* Modals */}
      {showAddModal && (
        <BoothModal
          booths={booths}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchBooths();
          }}
        />
      )}

      {showEditModal && selectedBooth && (
        <BoothModal
          booth={selectedBooth}
          booths={booths}
          onClose={() => {
            setShowEditModal(false);
            setSelectedBooth(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedBooth(null);
            fetchBooths();
          }}
        />
      )}

      {showMenuModal && selectedBooth && (
        <BoothMenuModal
          booth={selectedBooth}
          onClose={() => {
            setShowMenuModal(false);
            setShowDetailModal(true); // Go back to detail modal
          }}
          onSuccess={() => {
            fetchBooths();
            setShowMenuModal(false);
            setShowDetailModal(true); // Go back to detail modal after success
          }}
        />
      )}

      {showDeleteModal && selectedBooth && (
        <BoothDeleteModal
          booth={selectedBooth}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedBooth(null);
          }}
          onSuccess={() => {
            fetchBooths();
          }}
        />
      )}

      {showDetailModal && selectedBooth && (
        <BoothDetailModal
          booth={selectedBooth}
          stats={boothsStats[selectedBooth._id]}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedBooth(null);
          }}
          onEdit={() => {
            setShowDetailModal(false);
            setShowEditModal(true);
          }}
          onEditMenu={() => {
            setShowDetailModal(false);
            setShowMenuModal(true);
          }}
          onDelete={() => {
            setShowDetailModal(false);
            setShowDeleteModal(true);
          }}
          onRefresh={() => {
            fetchBooths();
          }}
          onOpenMenuModal={() => {
            setShowDetailModal(false);
            setShowMenuModal(true);
            // Don't reset selectedBooth so we can go back to detail modal
          }}
        />
      )}

      {/* Sales Activity Sidebar */}
      <SalesActivitySidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        newSalesCount={newSalesCount}
        activities={salesActivities}
        onMarkAllAsRead={handleMarkAllAsRead}
      />
    </div>
  );
}