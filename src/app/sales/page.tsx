'use client';

import React, { useState, useEffect } from 'react';
import { Store , Clock , MapPin} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Toast } from '@/components/ui';
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

export default function SalesPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
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
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'sale' | 'history' | 'summary'>('sale');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedBoothId, setSelectedBoothId] = useState<string | null>(null);

  useEffect(() => {
    // Handle boothId from URL parameter
    const boothId = searchParams?.get('boothId');
    if (boothId) {
      setSelectedBoothId(boothId);
    }
  }, [searchParams]);

  useEffect(() => {
    if (user) {
      fetchMenuItems();
      fetchSalesData();
      fetchBrand();
      // Setup real-time menu updates
      const cleanup = setupEventSource();
      return cleanup;
    }
  }, [user, selectedBoothId]);

  useEffect(() => {
    if (user && (activeTab === 'history' || activeTab === 'summary')) {
      fetchSalesData();
    }
  }, [currentPage, selectedDate, activeTab]);

  const setupEventSource = () => {
    const eventSource = new EventSource('/api/events/menu');

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'menu-updated') {
          fetchMenuItems();
        }
      } catch (error) {
        console.error('Error parsing event data:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('EventSource error:', error);
    };

    return () => {
      eventSource.close();
    };
  };

  const fetchMenuItems = async () => {
    try {
      const url = selectedBoothId
        ? `/api/menu-items?boothId=${selectedBoothId}`
        : '/api/menu-items';


      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();

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

        setMenuItems(menuItemsArray);
      } else {
        console.error('❌ Failed to fetch menu items, status:', response.status);
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Error response:', errorData);
        setMenuItems([]); // Set empty array on error
      }
    } catch (error) {
      console.error('❌ Error fetching menu items:', error);
      setMenuItems([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

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

  const fetchBrand = async () => {
    try {
      const response = await fetch('/api/brands');
      if (response.ok) {
        const data = await response.json();
        setBrand(data.brand);
      }
    } catch (error) {
      console.error('Error fetching brand:', error);
    }
  };

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existingItem = prev.find(cartItem => cartItem._id === item._id);
      if (existingItem) {
        return prev.map(cartItem =>
          cartItem._id === item._id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      } else {
        return [...prev, { ...item, quantity: 1 }];
      }
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const existingItem = prev.find(cartItem => cartItem._id === itemId);
      if (existingItem && existingItem.quantity > 1) {
        return prev.map(cartItem =>
          cartItem._id === itemId
            ? { ...cartItem, quantity: cartItem.quantity - 1 }
            : cartItem
        );
      } else {
        return prev.filter(cartItem => cartItem._id !== itemId);
      }
    });
  };

  const clearCart = () => {
    setCart([]);
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

  if (loading) {
    return <SalesLoading />;
  }

  return (
    <div className={`min-h-screen bg-white ${user?.role === 'staff' ? 'pb-20' : ''}`}>
      {/* Header */}
      <div className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {brand?.logo && (
                <img
                  src={brand.logo}
                  alt="Brand Logo"
                  className="w-12 h-12 rounded-full object-cover mr-4"
                />
              )}
              <div>
                <h1 className="text-2xl font-thin text-black tracking-wider">{brand?.name || 'ร้านค้า'}</h1>
                <p className="text-sm font-light text-gray-500 mt-1">ขายสินค้า</p>
              </div>
            </div>
            {/* Booth Info */}
            {salesData?.boothDetails && (
              <div className="text-right">
                <div className="flex items-center justify-end gap-2 mb-2">
                  <Store className="w-4 h-4 text-gray-400" />
                  <span className="font-light text-black tracking-wide">{salesData.boothDetails.name}</span>
                  {selectedBoothId && user?.role === 'admin' && (
                    <span className="px-2 py-0.5 text-xs font-light text-black border border-black">
                      ขายแทน
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-end gap-4 text-sm font-light text-gray-500 mb-3">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>{salesData.boothDetails.location}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{salesData.boothDetails.openingHours?.start} - {salesData.boothDetails.openingHours?.end}</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-light text-gray-400 mb-1 tracking-wider uppercase">ยอดขายวันนี้</div>
                  <div className="text-xl font-light text-black">
                    ฿{salesData.summary?.totalSales?.toLocaleString() || '0'}
                  </div>
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
      <div className="lg:h-[calc(100vh-320px)] lg:overflow-hidden bg-white">
        {activeTab === 'sale' && (
          <SaleTab
            menuItems={Array.isArray(menuItems) ? menuItems : []}
            cart={cart}
            addToCart={addToCart}
            removeFromCart={removeFromCart}
            clearCart={clearCart}
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
      <PaymentModal
        isOpen={showPaymentModal}
        cart={cart}
        totalAmount={getTotalAmount()}
        brand={brand}
        selectedBoothId={selectedBoothId}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={() => {
          setShowPaymentModal(false);
          clearCart();

          // Refresh sales data
          if (activeTab === 'history' || activeTab === 'summary') {
            fetchSalesData();
          }
          localStorage.setItem('booth-stats-update', Date.now().toString());
          window.dispatchEvent(new CustomEvent('booth-stats-update'));
        }}
        showToast={showToast}
      />

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

