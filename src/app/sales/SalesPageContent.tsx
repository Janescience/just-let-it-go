'use client';

import React, { useState, useEffect } from 'react';
import { Store , Clock , MapPin} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Toast, PageLoading } from '@/components/ui';
import { MenuItem, Booth, Sale, Brand } from '@/types';
import {
  SaleTab,
  SalesHistory,
  SalesSummaryTab,
  TabNavigation,
  PaymentModal,
  SalesLoading,
  SalesHistoryLoading,
  SalesSummaryLoading,
  SalesBottomBar
} from './components';

interface CartItem extends MenuItem {
  quantity: number;
}

interface SalesSummary {
  totalSales: number;
  cashSales: number;
  transferSales: number;
  totalTransactions: number;
  cashTransactions: number;
  transferTransactions: number;
  menuStats: {
    name: string;
    quantity: number;
    revenue: number;
  }[];
}

interface SalesData {
  boothDetails: Booth;
  summary: SalesSummary;
  salesHistory: Sale[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalSales: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export default function SalesPageContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState<'sale' | 'history' | 'summary'>('sale');
  const [toast, setToast] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message?: string;
  }>({
    show: false,
    type: 'success',
    title: '',
    message: ''
  });
  const [selectedBoothId, setSelectedBoothId] = useState<string | null>(null);

  useEffect(() => {
    // Handle boothId from URL parameter
    const boothId = searchParams?.get('boothId');
    if (boothId) {
      setSelectedBoothId(boothId);
    }
  }, [searchParams]);

  // Fetch menu items
  const fetchMenuItems = async () => {
    try {
      const url = selectedBoothId
        ? `/api/menu-items?boothId=${selectedBoothId}`
        : '/api/menu-items';

      console.log('🔄 Fetching menu items from:', url);

      const response = await fetch(url, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Menu items response:', typeof data, data);

        // Handle different API response formats
        let menuItemsArray = [];
        if (Array.isArray(data)) {
          menuItemsArray = data;
        } else if (data.menuItems && Array.isArray(data.menuItems)) {
          menuItemsArray = data.menuItems;
        } else if (data.items && Array.isArray(data.items)) {
          menuItemsArray = data.items;
        } else {
          console.log('⚠️ Unknown response format:', typeof data, data);
        }

        console.log(`📋 Setting ${menuItemsArray.length} menu items`);
        setMenuItems(menuItemsArray);
      } else {
        console.error('❌ Failed to fetch menu items, status:', response.status);
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Error response:', errorData);
        setMenuItems([]); // Set empty array on error
        setToast({
          show: true,
          type: 'error',
          title: 'ไม่สามารถโหลดรายการเมนูได้'
        });
      }
    } catch (error) {
      console.error('❌ Error fetching menu items:', error);
      setMenuItems([]); // Set empty array on error
      setToast({
        show: true,
        type: 'error',
        title: 'ไม่สามารถโหลดรายการเมนูได้'
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch sales data for history and summary tabs
  const fetchSalesData = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        date: selectedDate,
      });

      if (selectedBoothId) {
        params.append('boothId', selectedBoothId);
      }

      const response = await fetch(`/api/sales/summary?${params}`);
      if (response.ok) {
        const data = await response.json();
        setSalesData(data);
      } else {
        console.error('❌ Failed to fetch sales data, status:', response.status);
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Sales error response:', errorData);
      }
    } catch (error) {
      console.error('❌ Error fetching sales data:', error);
    }
  };

  // Fetch brand info
  const fetchBrandInfo = async () => {
    try {
      const response = await fetch('/api/brands', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setBrand(data.brand);
      }
    } catch (error) {
      console.error('Error fetching brand info:', error);
    }
  };

  const setupEventSource = () => {
    const eventSource = new EventSource('/api/events/menu');

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'menu-updated') {
          fetchMenuItems();
        }
      } catch (error) {
        console.error('Error parsing SSE data:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      eventSource.close();
    };

    return eventSource;
  };

  useEffect(() => {
    if (user) {
      fetchMenuItems();
      fetchBrandInfo();

      // Setup real-time menu updates
      const eventSource = setupEventSource();

      return () => {
        eventSource.close();
      };
    }
  }, [user, selectedBoothId]);

  useEffect(() => {
    if (user) {
      fetchSalesData();
    }
  }, [currentPage, selectedDate, activeTab]);

  // Initial data fetch
  useEffect(() => {
    if (user && selectedBoothId) {
      fetchSalesData();
    }
  }, [user, selectedBoothId]);

  const addToCart = (menuItem: MenuItem, quantity: number = 1) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item._id === menuItem._id);
      if (existingItem) {
        return prevCart.map(item =>
          item._id === menuItem._id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        return [...prevCart, { ...menuItem, quantity }];
      }
    });
  };


  const removeFromCart = (menuItemId: string) => {
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item._id === menuItemId) {
          if (item.quantity > 1) {
            return { ...item, quantity: item.quantity - 1 };
          } else {
            return null;
          }
        }
        return item;
      }).filter(item => item !== null);
    });
  };

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };


  const showToast = (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => {
    setToast({ show: true, type, title, message });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 5000);
  };

  if (!user) {
    return <PageLoading title="ขายสินค้า" />;
  }

  // Get booth ID
  const boothId = selectedBoothId || user?.boothId;

  if (loading) {
    return <SalesLoading />;
  }

  return (
    <div className={`min-h-screen bg-white ${user?.role === 'staff' ? 'pb-20' : ''}`}>
      {/* Header */}
      <div className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {brand?.logo && (
                <img
                  src={brand.logo}
                  alt="Brand Logo"
                  className="w-8 h-8 rounded-full object-cover mr-3"
                />
              )}
              <div>
                <h1 className="text-lg font-light text-black tracking-wide">{brand?.name || 'ร้านค้า'}</h1>
                <p className="text-xs font-light text-gray-500">ขายสินค้า</p>
              </div>
            </div>
            {/* Booth Info */}
            {salesData?.boothDetails && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3  font-light">
                <div className="flex items-center gap-1 justify-end">
                  <Store className="w-4 h-4 text-gray-400" />
                  <span className="text-black">{salesData.boothDetails.name}</span>
                  {selectedBoothId && user?.role === 'admin' && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs text-black border border-black">
                      ขายแทน
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">ยอดขายวันนี้:</span>
                  <span className="text-xl font-medium text-black">
                    ฿{salesData.summary?.totalSales?.toLocaleString() || '0'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <TabNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Content */}
      <div className="lg:h-[calc(100vh-220px)] overflow-hidden bg-white">
        {activeTab === 'sale' && (
          <SaleTab
            menuItems={Array.isArray(menuItems) ? menuItems : []}
            cart={cart}
            addToCart={addToCart}
            removeFromCart={removeFromCart}
            clearCart={() => setCart([])}
            getTotalAmount={getTotalAmount}
            getTotalItems={getTotalItems}
            setShowPaymentModal={setShowPaymentModal}
          />
        )}

        {activeTab === 'history' && (
          salesData && salesData.pagination ? (
            <SalesHistory
              salesHistory={salesData.salesHistory || []}
              currentPage={salesData.pagination.currentPage || 1}
              totalPages={salesData.pagination.totalPages || 1}
              hasNext={salesData.pagination.hasNext || false}
              hasPrev={salesData.pagination.hasPrev || false}
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              onPreviousPage={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              onNextPage={() => setCurrentPage(prev => prev + 1)}
            />
          ) : (
            <SalesHistoryLoading />
          )
        )}

        {activeTab === 'summary' && (
          salesData && salesData.summary ? (
            <SalesSummaryTab
              summary={salesData.summary}
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
            />
          ) : (
            <SalesSummaryLoading />
          )
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          isOpen={showPaymentModal}
          cart={cart}
          totalAmount={getTotalAmount()}
          brand={brand}
          selectedBoothId={selectedBoothId || null}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => {
            setShowPaymentModal(false);
            setCart([]);

            // Refresh sales data
            if (activeTab === 'history' || activeTab === 'summary') {
              fetchSalesData();
            }
            localStorage.setItem('booth-stats-update', Date.now().toString());
            window.dispatchEvent(new CustomEvent('booth-stats-update'));
          }}
          showToast={showToast}
        />
      )}

      {/* Toast Notification */}
      <Toast
        isVisible={toast.show}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        onClose={() => setToast(prev => ({ ...prev, show: false }))}
      />

      {/* Sales Bottom Bar - แสดงเฉพาะสำหรับ staff */}
      {user?.role === 'staff' && <SalesBottomBar brand={brand} />}
    </div>
  );
}