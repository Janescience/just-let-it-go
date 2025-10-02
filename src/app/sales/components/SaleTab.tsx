'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Minus, CreditCard, ShoppingCart, ChefHat } from 'lucide-react';
import { Input } from '@/components/ui';
import { MenuItem, Category } from '@/types';

interface CartItem extends MenuItem {
  quantity: number;
}

interface SaleTabProps {
  menuItems: MenuItem[];
  cart: CartItem[];
  addToCart: (item: MenuItem) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  getTotalAmount: () => number;
  getTotalItems: () => number;
  setShowPaymentModal: (show: boolean) => void;
}

export function SaleTab({
  menuItems,
  cart,
  addToCart,
  removeFromCart,
  clearCart,
  getTotalAmount,
  getTotalItems,
  setShowPaymentModal
}: SaleTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const filteredMenuItems = Array.isArray(menuItems)
    ? menuItems.filter(item => {
        // Filter by category
        const categoryMatch = activeCategory === 'all' || item.categoryId === activeCategory;

        // Filter by search query
        const searchMatch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));

        return categoryMatch && searchMatch;
      })
    : [];

  return (
    <div className="flex flex-col lg:flex-row h-full">
      {/* Menu Items - Mobile: Full width, Desktop: Left Side */}
      <div className="flex-1 flex flex-col">
        {/* Header - Fixed */}
        <div className="flex-shrink-0 max-w-7xl mx-auto px-4 py-3 w-full">
          <div className="flex flex-col flex-row items-center justify-between gap-3">

            <div className="w-60">
              <Input
                placeholder="ค้นหาเมนู..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-0 border-b border-gray-200 rounded-none bg-transparent  font-light focus:border-black"
              />
            </div>
          </div>

          {/* Category Tabs */}
          {categories.length > 0 && (
            <div className="mt-3">
              <div className="border-b border-gray-100">
                <nav className="-mb-px flex space-x-4 overflow-x-auto">
                  <button
                    onClick={() => setActiveCategory('all')}
                    className={`py-3 px-4 border-b-2 font-light text-base tracking-wide whitespace-nowrap ${
                      activeCategory === 'all'
                        ? 'border-gray-500 text-gray-900'
                        : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-200'
                    }`}
                  >
                    ทั้งหมด ({menuItems.length})
                  </button>
                  {categories.map(category => {
                    const categoryItemCount = menuItems.filter(item => item.categoryId === category._id).length;
                    return (
                      <button
                        key={category._id}
                        onClick={() => setActiveCategory(category._id)}
                        className={`py-3 px-4 border-b-2 font-light text-base tracking-wide whitespace-nowrap ${
                          activeCategory === category._id
                            ? 'border-gray-500 text-gray-900'
                            : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-200'
                        }`}
                      >
                        {category.name} ({categoryItemCount})
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>
          )}
        </div>

        {/* Scrollable Menu Content */}
        <div className="flex-1 overflow-y-auto max-w-7xl mx-auto px-4 w-full">
          {filteredMenuItems.length === 0 ? (
            <div className="text-center py-24">
              <div className="w-16 h-16 border border-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                {searchQuery ? (
                  <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                ) : (
                  <ChefHat className="w-6 h-6 text-gray-300" />
                )}
              </div>
              <div className="text-lg font-thin text-gray-600 mb-2 tracking-wide">
                {searchQuery ? 'ไม่พบเมนูที่ค้นหา' : 'ยังไม่มีเมนู'}
              </div>
              <div className="text-sm font-light text-gray-400">
                {searchQuery ? 'ลองใช้คำค้นหาอื่น' : 'กรุณาติดต่อผู้ดูแลระบบเพื่อเพิ่มเมนู'}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredMenuItems.map((item) => (
                <div
                  key={item._id}
                  className="group relative bg-white border border-gray-200 rounded overflow-hidden hover:shadow-lg transition-shadow duration-200 cursor-pointer"
                  onClick={() => addToCart(item)}
                >
                  {/* Image */}
                  <div className="aspect-square bg-gray-100 overflow-hidden relative">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ChefHat className="w-8 h-8 text-gray-300" />
                      </div>
                    )}
                    {/* Price overlay */}
                    <div className="absolute top-2 right-2 bg-black bg-opacity-80 text-white text-sm font-medium px-2 py-1 rounded">
                      ฿{item.price.toLocaleString()}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-2">
                    <h3 className="font-medium text-black text-base leading-tight">{item.name}</h3>
                    {!item.isActive && (
                      <span className="text-xs text-gray-400 border border-gray-300 px-1 py-0.5 rounded inline-block mt-1">ปิด</span>
                    )}
                  </div>

                  {/* Add to cart button */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                    <div className="bg-black rounded-full p-3 text-white hover:bg-gray-800 transition-colors duration-200 shadow-lg">
                      <Plus className="w-6 h-6" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cart - Mobile: Full width, Desktop: Right Side */}
      <div className="w-full lg:w-80 border-l-0 lg:border-l border-gray-100 bg-white">
        <div className="h-full flex flex-col pb-safe-area-inset-bottom lg:pb-0">
          {/* Cart Header - Fixed */}
          <div className="flex-shrink-0 px-4 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <ShoppingCart className="w-4 h-4 text-gray-400" />
                  {getTotalItems() > 0 && (
                    <span className="absolute -top-2 -right-2 bg-black text-white px-1.5 py-0.5 rounded-full min-w-[16px] h-[16px] flex items-center justify-center text-xs font-light">
                      {getTotalItems()}
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-light text-black tracking-wide">ตะกร้าสินค้า</h3>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="px-4 py-1 border border-gray-200 text-xs font-light text-gray-600 hover:bg-gray-50 hover:text-red-600 transition-colors duration-200 tracking-wide"
                >
                  ล้างทั้งหมด
                </button>
              )}
            </div>
          </div>

          {cart.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-24">
              <div className="w-16 h-16 border border-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShoppingCart className="w-6 h-6 text-gray-300" />
              </div>
              <div className="text-lg font-thin text-gray-600 mb-2 tracking-wide">ตะกร้าว่าง</div>
              <div className="text-sm font-light text-gray-400">
                เลือกเมนูเพื่อเริ่มการขาย
              </div>
            </div>
          ) : (
            <>
              {/* Cart Items - Scrollable */}
              <div className="lg:flex-1 lg:overflow-y-auto px-4 py-4">
                <div className="space-y-6">
                  {cart.map((item) => (
                    <div key={item._id} className="border-b border-gray-100 pb-2 last:border-b-0">
                      <div className="flex items-start gap-4">
                        {/* Item Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-light text-black tracking-wide text-lg">{item.name}</h4>
                          <div>
                            <div className="text-xs font-light text-gray-400 tracking-wider uppercase">ราคาต่อหน่วย</div>
                            <div className="font-light text-gray-600">฿{item.price.toLocaleString()}</div>
                          </div>
                        </div>

                        {/* Quantity Controls and Total */}
                        <div className="flex flex-col items-end ">
                          {/* Quantity Controls */}
                          <div className="flex items-center gap-2">
                          <button
                            onClick={() => removeFromCart(item._id)}
                            className="p-2 text-gray-300 hover:text-gray-600 transition-colors duration-200"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="font-light text-black min-w-[24px] text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => addToCart(item)}
                            className="p-2 text-gray-300 hover:text-gray-600 transition-colors duration-200"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          </div>

                          {/* Total Price */}
                          <div className="text-righ mt-1">
                            <div className="text-xs font-light text-gray-400 tracking-wider uppercase">รวม</div>
                            <div className="text-black">฿{(item.price * item.quantity).toLocaleString()}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cart Summary - Fixed */}
              <div className="lg:flex-shrink-0 border-t border-gray-100 px-4 py-3 bg-white">
                <div className="space-y-3">
                  {/* Summary in one line */}
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-light text-gray-600">{cart.length} รายการ {getTotalItems()} ชิ้น</div>
                    <div className="text-xl font-medium text-black">
                      ฿{getTotalAmount().toLocaleString()}
                    </div>
                  </div>

                  {/* Checkout Button */}
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="w-full px-6 py-3 bg-black text-white text-sm font-light hover:bg-gray-800 transition-colors duration-200 tracking-wide flex items-center justify-center gap-2"
                  >
                    <CreditCard className="w-4 h-4" />
                    ดำเนินการชำระเงิน
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}