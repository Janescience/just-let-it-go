'use client';

import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Minus, CreditCard, Banknote, ListOrdered, Clock, MapPin, Calendar, Users, BarChart3, TrendingUp, Store, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/layout/Header';
import { Button, Input, Modal, Toast } from '@/components/ui';
import { MenuItem, Booth, Sale, Brand } from '@/types';
import { getAvailablePaymentMethods, getPaymentMethodLabel, generatePaymentQRString } from '@/utils/qrcode';
import QRCode from 'react-qr-code';

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
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
          // Check if this update is for the current user's booth
          if (user?.role === 'staff' && user?.boothId === data.boothId) {
            // Refresh menu items for staff when their booth menu is updated
            fetchMenuItems();
          }
        }
      } catch (error) {
        console.error('Error parsing SSE message:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('EventSource error:', error);
      // Reconnect after 5 seconds
      setTimeout(() => {
        setupEventSource();
      }, 5000);
    };

    // Cleanup on unmount
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
        setMenuItems(data.menuItems);
      }
    } catch (error) {
      console.error('Error fetching menu items:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSalesData = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        date: selectedDate
      });
      if (selectedBoothId) {
        params.append('boothId', selectedBoothId);
      }
      const response = await fetch(`/api/sales/summary?${params}`);
      if (response.ok) {
        const data = await response.json();
        setSalesData(data);
      }
    } catch (error) {
      console.error('Error fetching sales data:', error);
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

  const refreshData = () => {
    fetchSalesData();
  };

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(cartItem => cartItem._id === item._id);
      if (existing) {
        return prev.map(cartItem =>
          cartItem._id === item._id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const existing = prev.find(cartItem => cartItem._id === itemId);
      if (existing && existing.quantity > 1) {
        return prev.map(cartItem =>
          cartItem._id === itemId
            ? { ...cartItem, quantity: cartItem.quantity - 1 }
            : cartItem
        );
      }
      return prev.filter(cartItem => cartItem._id !== itemId);
    });
  };

  const clearCart = () => {
    setCart([]);
  };

  const showToast = (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => {
    setToast({
      show: true,
      type,
      title,
      message
    });
  };

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="ขายสินค้า" />
        <div className="p-4 tablet:p-6">
          <div className="text-center py-8">กำลังโหลด...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-25">
      <Header title="ขายสินค้า" />

      {/* Booth Info */}
      {salesData?.boothDetails && (
        <div className="bg-white border-b border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex text-xl text-gray-900 items-center gap-1.5">
                <Store className="w-4 h-4" />
                <span>{salesData.boothDetails.name}</span>
                {selectedBoothId && user?.role === 'admin' && (
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    ขายแทน
                  </span>
                )}
              </div>
              <div className="flex items-center gap-6 text-lg text-gray-500 mt-2">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  <span>{salesData.boothDetails.location}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  <span>{salesData.boothDetails.openingHours?.start} - {salesData.boothDetails.openingHours?.end}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className=" font-light text-gray-400 uppercase tracking-wide">วันนี้</div>
              <div className="text-2xl font-light text-black">
                ฿{salesData.summary.totalSales.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-100 p-2">
        <div className="flex">
          <button
            onClick={() => setActiveTab('sale')}
            className={`flex-1 py-3 px-3  font-light transition-all duration-200 ${
              activeTab === 'sale'
                ? 'text-black bg-gray-50'
                : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-200'
            }`}
          >
            <ShoppingCart className="w-5 h-5 inline mr-3" />
            ขายสินค้า
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 px-3  font-light  transition-all duration-200 ${
              activeTab === 'history'
                ? 'text-black bg-gray-50'
                : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-200'
            }`}
          >
            <ListOrdered className="w-5 h-5 inline mr-3" />
            ประวัติการขาย
          </button>
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex-1 py-3 px-3  font-light  transition-all duration-200 ${
              activeTab === 'summary'
                ? 'text-black bg-gray-50'
                : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-200'
            }`}
          >
            <BarChart3 className="w-5 h-5 inline mr-3" />
            สรุปยอดขาย
          </button>
        </div>
      </div>

      <div className="h-[calc(100vh-220px)]">
        {activeTab === 'sale' && (
          <SaleTab
            menuItems={menuItems}
            cart={cart}
            addToCart={addToCart}
            removeFromCart={removeFromCart}
            clearCart={clearCart}
            getTotalAmount={getTotalAmount}
            getTotalItems={getTotalItems}
            setShowPaymentModal={setShowPaymentModal}
          />
        )}

        {activeTab === 'history' && salesData && (
          <div className="p-6 overflow-y-auto">
            <HistoryTab
              salesData={salesData}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
            />
          </div>
        )}

        {activeTab === 'summary' && salesData && (
          <div className="p-6 overflow-y-auto">
            <SummaryTab salesData={salesData} />
          </div>
        )}
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        cart={cart}
        totalAmount={getTotalAmount()}
        brand={brand}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={() => {
          console.log('💰 Sale completed - starting booth update process');
          setShowPaymentModal(false);
          clearCart();
          refreshData();

          // Trigger booth page refresh
          console.log('📢 Dispatching booth-stats-update event');
          localStorage.setItem('booth-stats-update', Date.now().toString());
          window.dispatchEvent(new CustomEvent('booth-stats-update'));
          console.log('✅ Event dispatched successfully');
        }}
        showToast={showToast}
      />

      {/* Toast Notification */}
      <Toast
        isVisible={toast.show}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        onClose={() => setToast({ ...toast, show: false })}
      />
    </div>
  );
}

// Sale Tab Component
function SaleTab({ menuItems, cart, addToCart, removeFromCart, clearCart, getTotalAmount, getTotalItems, setShowPaymentModal }: {
  menuItems: MenuItem[];
  cart: CartItem[];
  addToCart: (item: MenuItem) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  getTotalAmount: () => number;
  getTotalItems: () => number;
  setShowPaymentModal: (show: boolean) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMenuItems = menuItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex h-full">
      {/* Menu Items - Left Side */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-light text-gray-900 mb-1">เมนูทั้งหมด</h2>
              <p className="text-lg text-gray-500">เลือกเมนูที่ต้องการเพิ่มในตะกร้า</p>
            </div>
            <div className="text-lg text-gray-400">
              {filteredMenuItems.length} รายการ
            </div>
          </div>

          {/* Search */}
          <div className="mb-6">
            <Input
              placeholder="ค้นหาเมนู..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full max-w-md"
            />
          </div>
        </div>

        {filteredMenuItems.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {searchQuery ? (
                <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              ) : (
                <ListOrdered className="w-10 h-10 text-gray-300" />
              )}
            </div>
            <h3 className="text-xl font-light text-gray-900 mb-2">
              {searchQuery ? 'ไม่พบเมนูที่ค้นหา' : 'ยังไม่มีเมนู'}
            </h3>
            <p className="text-gray-500">
              {searchQuery ? 'ลองใช้คำค้นหาอื่น' : 'กรุณาติดต่อผู้ดูแลระบบเพื่อเพิ่มเมนู'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-4 tablet:grid-cols-5 desktop:grid-cols-6 2xl:grid-cols-8 gap-3">
            {filteredMenuItems.map(item => (
              <div
                key={item._id}
                className="group bg-white border border-gray-100 rounded-xl p-3 cursor-pointer hover:border-gray-200 hover:shadow-sm transition-all duration-200"
                onClick={() => addToCart(item)}
              >
                <div className="flex flex-col h-full">
                  {item.image ? (
                    <div className="w-full aspect-square bg-gray-50 rounded-lg mb-2 overflow-hidden">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className="w-full aspect-square bg-gray-50 rounded-lg mb-2 flex items-center justify-center">
                      <ListOrdered className="w-6 h-6 text-gray-300" />
                    </div>
                  )}
                  <div className="flex justify-between">
                    <h3 className="font-light text-gray-900 mb-1 line-clamp-2 leading-tight">{item.name}</h3>
                    <div className="font-light text-black">
                      ฿{item.price.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cart - Right Side */}
      <div className="w-80 border-l border-gray-100 bg-white shadow-sm">
        <div className="p-6 h-full flex flex-col">
          {/* Cart Header */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingCart className="w-5 h-5 text-gray-900" />
                {getTotalItems() > 0 && (
                  <span className="absolute -top-2 -right-2 bg-black text-white   px-1.5 py-0.5 rounded-full min-w-[18px] h-[18px] flex items-center justify-center">
                    {getTotalItems()}
                  </span>
                )}
              </div>
              <h3 className="text-lg font-light text-gray-900">ตะกร้าสินค้า</h3>
            </div>
            {cart.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={clearCart}
                className=" hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                ล้างทั้งหมด
              </Button>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="text-center py-16 flex-1 flex flex-col justify-center">
              <div className="w-20 h-20 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                <ShoppingCart className="w-10 h-10 text-gray-300" />
              </div>
              <h4 className="text-gray-600 font-light mb-2">ตะกร้าว่าง</h4>
              <p className="text-gray-400 text-lg leading-relaxed">
                เลือกเมนูจากด้านซ้าย<br />
                เพื่อเริ่มการขาย
              </p>
            </div>
          ) : (
            <>
              {/* Cart Items */}
              <div className="flex-1 overflow-y-auto space-y-3 mb-6 pr-1">
                {cart.map(item => (
                  <div key={item._id} className="group bg-gray-50 hover:bg-gray-100 rounded-xl p-4 transition-all duration-200 border border-transparent hover:border-gray-200">
                    <div className="flex items-start gap-3">
                      {/* Item Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className=" text-gray-900 text-lg truncate mb-1">{item.name}</h4>
                        <div className="flex items-center gap-2  text-gray-500 mb-2">
                          <span>฿{item.price.toLocaleString()}</span>
                          <span className="text-gray-300">×</span>
                          <span>{item.quantity}</span>
                        </div>
                        <div className="text-black  ">
                          ฿{(item.price * item.quantity).toLocaleString()}
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2 bg-white rounded-lg p-1 shadow-sm">
                        <button
                          onClick={() => removeFromCart(item._id)}
                          className="w-8 h-8 flex items-center justify-center rounded-md bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all duration-200 hover:scale-105"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className=" text-lg w-8 text-center bg-gray-50 rounded px-2 py-1">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => addToCart(item)}
                          className="w-8 h-8 flex items-center justify-center rounded-md bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-600 transition-all duration-200 hover:scale-105"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Cart Summary */}
              <div className="border-t border-gray-200 pt-6 mt-auto space-y-4">
                {/* Subtotal breakdown */}
                <div className="space-y-2 text-lg">
                  <div className="flex justify-between text-gray-600">
                    <span>จำนวนรายการ</span>
                    <span>{getTotalItems()} ชิ้น</span>
                  </div>
                </div>

                {/* Total Amount */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 ">ยอดรวมทั้งสิ้น</span>
                    <span className="text-2xl font-semibold text-black">
                      ฿{getTotalAmount().toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Checkout Button */}
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => setShowPaymentModal(true)}
                  icon={CreditCard}
                  className="w-full shadow-lg hover:shadow-xl transition-shadow"
                >
                  ดำเนินการชำระเงิน
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// History Tab Component
function HistoryTab({ salesData, selectedDate, setSelectedDate, currentPage, setCurrentPage }: {
  salesData: SalesData;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
}) {
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-8">
      {/* Date Filter */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Calendar className="w-5 h-5 text-gray-900" />
          <h3 className="text-lg font-light text-gray-900">เลือกวันที่</h3>
        </div>
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {/* Sales History */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6">
        <div className="mb-6">
          <h3 className="text-lg font-light text-gray-900 mb-1">ประวัติการขาย</h3>
          <p className="text-lg text-gray-500">{formatDate(new Date(selectedDate))}</p>
        </div>

        {salesData.salesHistory.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ListOrdered className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-light text-gray-900 mb-2">ไม่มีรายการขาย</h3>
            <p className="text-gray-500">ไม่มีการขายในวันที่เลือก</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {salesData.salesHistory.map(sale => (
                <div key={sale._id} className="border border-gray-100 rounded-xl p-5 hover:border-gray-200 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="text-lg font-mono text-gray-500 mb-1">#{sale._id.slice(-8)}</div>
                      <div className="text-lg text-gray-600">
                        {formatTime(sale.createdAt)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-light text-black mb-2">
                        ฿{sale.totalAmount.toLocaleString()}
                      </div>
                      <div className={`inline-flex items-center  font-light px-3 py-1 rounded-full ${
                        sale.paymentMethod === 'cash'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-black text-white'
                      }`}>
                        {sale.paymentMethod === 'cash' ? 'เงินสด' : 'โอนเงิน'}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 pt-3 border-t border-gray-100">
                    {sale.items.map((item, index) => (
                      <div key={index} className="flex justify-between text-lg">
                        <span className="text-gray-700">
                          <span className="font-light">{(item.menuItemId as any)?.name || 'รายการถูกลบ'}</span>
                          <span className="text-gray-400 ml-2">×{item.quantity}</span>
                        </span>
                        <span className="font-light text-gray-900">฿{(item.price * item.quantity).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {salesData.pagination.totalPages > 1 && (
              <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-100">
                <Button
                  variant="secondary"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={!salesData.pagination.hasPrev}
                  icon={ChevronLeft}
                >
                  ก่อนหน้า
                </Button>
                <span className="text-lg text-gray-500 font-light">
                  หน้า {currentPage} จาก {salesData.pagination.totalPages}
                </span>
                <Button
                  variant="secondary"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={!salesData.pagination.hasNext}
                  icon={ChevronRight}
                  iconPosition="right"
                >
                  ถัดไป
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Summary Tab Component
function SummaryTab({ salesData }: { salesData: SalesData }) {
  return (
    <div className="space-y-8">
      {/* Today's Summary */}
      <div className="bg-white border border-gray-100 rounded-2xl p-8">
        <div className="flex items-center gap-3 mb-8">
          <BarChart3 className="w-6 h-6 text-gray-900" />
          <h3 className="text-xl font-light text-gray-900">สรุปยอดขายวันนี้</h3>
        </div>

        <div className="grid grid-cols-2 tablet:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="text-3xl font-light text-black mb-2">
              ฿{salesData.summary.totalSales.toLocaleString()}
            </div>
            <div className=" font-light text-gray-400 uppercase tracking-wide">ยอดขายรวม</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-light text-gray-700 mb-2">
              ฿{salesData.summary.cashSales.toLocaleString()}
            </div>
            <div className=" font-light text-gray-400 uppercase tracking-wide">เงินสด</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-light text-gray-700 mb-2">
              ฿{salesData.summary.transferSales.toLocaleString()}
            </div>
            <div className=" font-light text-gray-400 uppercase tracking-wide">เงินโอน</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-light text-gray-700 mb-2">
              {salesData.summary.totalTransactions}
            </div>
            <div className=" font-light text-gray-400 uppercase tracking-wide">รายการ</div>
          </div>
        </div>
      </div>

      {/* Payment Method Breakdown */}
      <div className="bg-white border border-gray-100 rounded-2xl p-8">
        <h3 className="text-xl font-light text-gray-900 mb-6">วิธีการชำระเงิน</h3>

        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                <Banknote className="w-6 h-6 text-gray-700" />
              </div>
              <div>
                <div className="font-light text-gray-900">เงินสด</div>
                <div className="text-lg text-gray-500">{salesData.summary.cashTransactions} รายการ</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-light text-black">฿{salesData.summary.cashSales.toLocaleString()}</div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="font-light text-gray-900">โอนเงิน</div>
                <div className="text-lg text-gray-500">{salesData.summary.transferTransactions} รายการ</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-light text-black">฿{salesData.summary.transferSales.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Sales Statistics */}
      <div className="bg-white border border-gray-100 rounded-2xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <TrendingUp className="w-6 h-6 text-gray-900" />
          <h3 className="text-xl font-light text-gray-900">สถิติการขายตามเมนู</h3>
        </div>

        {salesData.summary.menuStats.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-light text-gray-900 mb-2">ยังไม่มีข้อมูลการขาย</h3>
            <p className="text-gray-500">เริ่มขายเพื่อดูสถิติการขายของแต่ละเมนู</p>
          </div>
        ) : (
          <div className="space-y-4">
            {salesData.summary.menuStats.map((menu, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-light ${
                    index === 0 ? 'bg-black' :
                    index === 1 ? 'bg-gray-400' :
                    index === 2 ? 'bg-gray-500' : 'bg-gray-300'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-light text-gray-900">{menu.name}</div>
                    <div className="text-lg text-gray-500">{menu.quantity} ชิ้น</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-light text-black">
                    ฿{menu.revenue.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Payment Modal Component
function PaymentModal({ isOpen, cart, totalAmount, brand, onClose, onSuccess, showToast }: {
  isOpen: boolean;
  cart: CartItem[];
  totalAmount: number;
  brand: Brand | null;
  onClose: () => void;
  onSuccess: () => void;
  showToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => void;
}) {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
  const [selectedQRMethod, setSelectedQRMethod] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [receivedAmount, setReceivedAmount] = useState<string>('');
  const [showCashInput, setShowCashInput] = useState(false);

  const availablePaymentMethods = brand ? getAvailablePaymentMethods(brand) : [];

  const quickAmounts = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 2000, 3000];

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      // Reset to initial state when modal opens
      setPaymentMethod('cash');
      setSelectedQRMethod('');
      setQrCode(null);
      setReceivedAmount(totalAmount.toString());
      setShowCashInput(true);
      setLoading(false);
    }
  }, [isOpen, totalAmount]);

  // ตั้งค่าเริ่มต้นเมื่อเปิด modal
  useEffect(() => {
    if (paymentMethod === 'cash') {
      setShowCashInput(true);
      setQrCode(null); // Clear QR code when switching to cash
      // Only set default amount if receivedAmount is empty or when modal first opens
      if (!receivedAmount) {
        setReceivedAmount(totalAmount.toString());
      }
    } else if (paymentMethod === 'transfer' && availablePaymentMethods.length > 0 && brand) {
      // Auto-select first available payment method for transfer
      setSelectedQRMethod(availablePaymentMethods[0]);
      // Generate QR code immediately when transfer is selected
      const methodToUse = selectedQRMethod || availablePaymentMethods[0];
      const qrString = generatePaymentQRString({
        amount: totalAmount,
        brand,
        paymentMethod: methodToUse as any
      });
      if (qrString) {
        setQrCode(qrString);
      }
    }
  }, [paymentMethod, availablePaymentMethods, brand, totalAmount]);

  const getChangeAmount = () => {
    const received = parseFloat(receivedAmount) || 0;
    return received - totalAmount;
  };

  const isValidCashPayment = () => {
    const received = parseFloat(receivedAmount) || 0;
    return received >= totalAmount;
  };

  const handlePayment = async () => {
    // ตรวจสอบเงินสดก่อนดำเนินการ
    if (paymentMethod === 'cash' && !isValidCashPayment()) {
      alert('จำนวนเงินที่รับมาไม่เพียงพอ');
      return;
    }

    // ตรวจสอบว่ามี payment methods พร้อมใช้งานสำหรับ transfer
    if (paymentMethod === 'transfer' && availablePaymentMethods.length === 0) {
      alert('ไม่พบข้อมูลการชำระเงิน กรุณาติดต่อผู้ดูแลระบบ');
      return;
    }

    // For transfer payments, QR code is already generated, proceed with confirmation
    if (paymentMethod === 'transfer') {
      // Process transfer payment immediately
      showToast('success', 'ยืนยันการชำระสำเร็จ!', `ยอดชำระ ฿${totalAmount.toLocaleString()}`);
      onSuccess();
      processTransferPaymentAsync();
      return;
    }

    // For cash payments: Show success immediately, then process API call
    if (paymentMethod === 'cash') {
      // 1. Show success toast immediately
      showToast('success', 'ชำระเงินสำเร็จ!', `ยอดชำระ ฿${totalAmount.toLocaleString()}`);

      // 2. Show success UI immediately
      onSuccess();

      // 3. Process API call in background (don't await)
      processPaymentAsync();
    }
  };

  const processPaymentAsync = async () => {
    try {
      console.log('🔄 Processing payment in background...');
      console.log('📦 Payment data:', {
        items: cart.map(item => ({
          menuItemId: item._id,
          quantity: item.quantity,
          price: item.price
        })),
        totalAmount,
        paymentMethod
      });

      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(item => ({
            menuItemId: item._id,
            quantity: item.quantity,
            price: item.price
          })),
          totalAmount,
          paymentMethod,
          ...(selectedBoothId && { boothId: selectedBoothId })
        })
      });

      console.log('📡 API Response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Payment processed successfully in background:', result);

        // Trigger booth page refresh after successful payment
        console.log('📢 Dispatching booth-stats-update event from background process');
        localStorage.setItem('booth-stats-update', Date.now().toString());
        window.dispatchEvent(new CustomEvent('booth-stats-update'));
      } else {
        const error = await response.json();
        console.error('❌ Background payment processing failed:', error);
        // Could show a non-intrusive notification here instead of alert
      }
    } catch (error) {
      console.error('❌ Error in background payment processing:', error);
      // Could show a non-intrusive notification here instead of alert
    }
  };

  const handleQuickAmount = (amount: number) => {
    console.log('Quick amount clicked:', amount); // Debug log
    setReceivedAmount(amount.toString());
  };

  const handlePaymentMethodChange = (method: 'cash' | 'transfer') => {
    setPaymentMethod(method);
    if (method === 'cash') {
      setShowCashInput(true);
      // Only set default amount if switching from transfer to cash and amount is empty
      if (!receivedAmount || receivedAmount === '') {
        setReceivedAmount(totalAmount.toString());
      }
      setSelectedQRMethod('');
    } else {
      setShowCashInput(false);
      setReceivedAmount('');
      // Auto-select first available payment method for transfer
      if (availablePaymentMethods.length > 0) {
        setSelectedQRMethod(availablePaymentMethods[0]);
      }
    }
  };

  const confirmPayment = async () => {
    // For QR code payment confirmation - show success immediately
    // 1. Show success toast immediately
    showToast('success', 'ยืนยันการชำระสำเร็จ!', `ยอดชำระ ฿${totalAmount.toLocaleString()}`);

    // 2. Show success UI immediately
    onSuccess();

    // 3. Process API call in background (don't await)
    processTransferPaymentAsync();
  };

  const processTransferPaymentAsync = async () => {
    try {
      console.log('🔄 Processing transfer payment in background...');

      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(item => ({
            menuItemId: item._id,
            quantity: item.quantity,
            price: item.price
          })),
          totalAmount,
          paymentMethod: 'transfer',
          ...(selectedBoothId && { boothId: selectedBoothId })
        })
      });

      if (response.ok) {
        console.log('✅ Transfer payment processed successfully in background');

        // Trigger booth page refresh after successful payment
        localStorage.setItem('booth-stats-update', Date.now().toString());
        window.dispatchEvent(new CustomEvent('booth-stats-update'));
      } else {
        const error = await response.json();
        console.error('❌ Background transfer payment processing failed:', error);
        // Could show a non-intrusive notification here instead of alert
      }
    } catch (error) {
      console.error('❌ Error in background transfer payment processing:', error);
      // Could show a non-intrusive notification here instead of alert
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={!qrCode ? "ชำระเงิน" : "สแกน QR Code"}
      size="xl"
    >
      <div className="p-6">
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Payment Methods - Col 1 */}
              <div className="space-y-6">
                <div className="space-y-3">
                  <div
                    className={`p-5 border-2 rounded-xl cursor-pointer transition-all ${
                      paymentMethod === 'cash'
                        ? 'border-black bg-gray-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handlePaymentMethodChange('cash')}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        paymentMethod === 'cash' ? 'bg-black' : 'bg-gray-100'
                      }`}>
                        <Banknote className={`w-6 h-6 ${
                          paymentMethod === 'cash' ? 'text-white' : 'text-gray-600'
                        }`} />
                      </div>
                      <div>
                        <div className="font-light text-gray-900">เงินสด</div>
                        <div className="text-lg text-gray-500">ชำระด้วยเงินสด</div>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`p-5 border-2 rounded-xl cursor-pointer transition-all ${
                      paymentMethod === 'transfer'
                        ? 'border-black bg-gray-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handlePaymentMethodChange('transfer')}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        paymentMethod === 'transfer' ? 'bg-black' : 'bg-gray-100'
                      }`}>
                        <CreditCard className={`w-6 h-6 ${
                          paymentMethod === 'transfer' ? 'text-white' : 'text-gray-600'
                        }`} />
                      </div>
                      <div>
                        <div className="font-light text-gray-900">โอนเงิน</div>
                        <div className="text-lg text-gray-500">สแกน QR Code</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Summary - Always in Same Column */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-light text-gray-900 mb-4">สรุปรายการ</h3>
                  <div className="space-y-3">
                    {cart.map((item, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                        <div className="flex-1">
                          <div className="font-light text-gray-900">{item.name}</div>
                          <div className="text-lg text-gray-500">฿{item.price.toLocaleString()} x {item.quantity}</div>
                        </div>
                        <div className="font-light text-gray-900 ml-4">
                          ฿{(item.price * item.quantity).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                  <hr className="my-4 border-gray-300" />
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-light text-gray-700">รวมทั้งสิ้น</span>
                    <span className="text-2xl font-light text-black">฿{totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <div className="text-lg font-light text-blue-700 text-center">
                      กรุณาตรวจสอบรายการให้ถูกต้องก่อนชำระเงิน
                    </div>
                  </div>
                </div>

              </div>

              {/* Cash Input Section or QR Code Section - Col 2 */}
              {((showCashInput && paymentMethod === 'cash') || (paymentMethod === 'transfer' && qrCode)) && (
                <div className="lg:col-span-2 bg-blue-50 p-8 rounded-lg">
                  {/* Cash Input for Cash Payment */}
                  {paymentMethod === 'cash' && (
                    <>
                      <div className="mb-8">
                        <label className="block text-lg  text-gray-700 mb-4">จำนวนเงินที่รับมา</label>
                        <input
                          type="number"
                          value={receivedAmount}
                          onChange={(e) => setReceivedAmount(e.target.value)}
                          placeholder="0"
                          min={totalAmount}
                          className="w-full text-4xl text-center font-light border-2 border-gray-300 rounded-lg py-6 px-4 focus:border-black focus:outline-none transition-colors"
                        />
                      </div>

                      {/* Quick Amount Buttons */}
                      <div className="mb-8">
                        <div className="text-xl text-gray-700 mb-6 ">ปุ่มทางลัด:</div>
                        <div className="grid grid-cols-3 gap-6">
                          {quickAmounts.map((amount) => (
                            <button
                              key={amount}
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                console.log('Button clicked for amount:', amount);
                                handleQuickAmount(amount);
                              }}
                              className={`py-16 px-10 rounded-xl text-2xl  transition-all duration-200 cursor-pointer ${
                                receivedAmount === amount.toString()
                                  ? 'bg-black text-white shadow-xl'
                                  : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-gray-400 hover:shadow-lg hover:scale-105'
                              }`}
                            >
                              ฿{amount.toLocaleString()}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Change Calculation */}
                      {receivedAmount && parseFloat(receivedAmount) >= totalAmount && (
                        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-700 font-light text-xl">
                              {getChangeAmount() === 0 ? 'ชำระเงินพอดี' : 'เงินทอน:'}
                            </span>
                            <span className="text-3xl font-light text-black">
                              {getChangeAmount() === 0 ? '✓' : `฿${getChangeAmount().toLocaleString()}`}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Warning for insufficient amount */}
                      {receivedAmount && parseFloat(receivedAmount) < totalAmount && (
                        <div className="bg-red-50 p-6 rounded-lg border-2 border-red-200">
                          <div className="text-red-600 text-lg ">
                            ⚠️ จำนวนเงินไม่เพียงพอ (ขาด ฿{(totalAmount - parseFloat(receivedAmount)).toLocaleString()})
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* QR Code for Transfer Payment */}
                  {paymentMethod === 'transfer' && qrCode && (
                    <div className="text-center">
                      <div className="bg-gray-100 p-4 rounded-lg mb-6">
                        <div className="w-full bg-white rounded-lg flex items-center justify-center p-6">
                          <QRCode
                            value={qrCode}
                            size={300}
                            bgColor="#ffffff"
                            fgColor="#000000"
                          />
                        </div>
                      </div>

                      {/* Amount below QR code */}
                      <div className="mb-6">
                        <div className="text-2xl font-light text-gray-700">
                          จำนวนเงิน: ฿{totalAmount.toLocaleString()}
                        </div>
                      </div>

                      <div className="flex items-center justify-center gap-2 text-orange-600 mt-4">
                        <Clock className="w-4 h-4" />
                        <span className="text-lg">รอการชำระเงิน...</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>



            {/* Action Buttons Footer */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex gap-4">
                <Button
                  variant="secondary"
                  onClick={onClose}
                  className="flex-1 py-4 text-lg"
                >
                  ยกเลิก
                </Button>
                <Button
                  variant="primary"
                  onClick={handlePayment}
                  className="flex-1 py-4 text-lg"
                  disabled={loading || (paymentMethod === 'cash' && !isValidCashPayment())}
                  loading={loading}
                >
                  ดำเนินการ
                </Button>
              </div>
          </div>
        </>
      </div>
    </Modal>
  );
}