'use client';

import React, { useState } from 'react';
import { Plus, Minus, CreditCard, ShoppingCart, ListOrdered } from 'lucide-react';
import { Input } from '@/components/ui';
import { MenuItem } from '@/types';

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

  const filteredMenuItems = Array.isArray(menuItems)
    ? menuItems.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  return (
    <div className="flex flex-col lg:flex-row lg:h-full">
      {/* Menu Items - Mobile: Full width, Desktop: Left Side */}
      <div className="flex-1 flex flex-col">
        {/* Header - Fixed */}
        <div className="flex-shrink-0 max-w-7xl mx-auto px-6 py-6 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-light text-black tracking-wide">เมนู ({filteredMenuItems.length} รายการ)</h2>
            </div>
            <div className="max-w-md">
              <Input
                placeholder="ค้นหาเมนู..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black"
              />
            </div>
          </div>
        </div>

        {/* Scrollable Menu Content */}
        <div className="flex-1 overflow-y-auto max-w-7xl mx-auto px-6 w-full">
          {filteredMenuItems.length === 0 ? (
            <div className="text-center py-24">
              <div className="w-16 h-16 border border-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                {searchQuery ? (
                  <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                ) : (
                  <ListOrdered className="w-6 h-6 text-gray-300" />
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
            <div className="space-y-6">
              {filteredMenuItems.map((item) => (
                <div key={item._id} className="border-b border-gray-100 pb-6 last:border-b-0">
                  <div
                    className="flex flex-col sm:flex-row gap-4 sm:gap-6 cursor-pointer group"
                    onClick={() => addToCart(item)}
                  >
                    <div className="w-24 h-24 bg-gray-100 overflow-hidden flex-shrink-0">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ListOrdered className="w-8 h-8 text-gray-300" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-light text-black tracking-wide text-lg mb-2">{item.name}</h3>
                          {item.description && (
                            <p className="text-sm font-light text-gray-500 mb-4">{item.description}</p>
                          )}
                          <div>
                            <div className="text-xs font-light text-gray-400 mb-1 tracking-wider uppercase">ราคา</div>
                            <div className="font-light text-black">฿{item.price.toLocaleString()}</div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart(item);
                            }}
                            className="px-6 py-2 border border-gray-200 text-sm font-light text-black hover:bg-gray-50 transition-colors duration-200 tracking-wide"
                          >
                            เพิ่มในตะกร้า
                          </button>
                        </div>
                      </div>
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
        <div className="lg:h-full flex flex-col">
          {/* Cart Header - Fixed */}
          <div className="flex-shrink-0 px-6 py-6 border-b border-gray-100">
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
              <div className="lg:flex-1 lg:overflow-y-auto px-6 py-6">
                <div className="space-y-6">
                  {cart.map((item) => (
                    <div key={item._id} className="border-b border-gray-100 pb-6 last:border-b-0">
                      <div className="flex items-start gap-4">
                        {/* Item Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-light text-black tracking-wide text-lg mb-2">{item.name}</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-xs font-light text-gray-400 mb-1 tracking-wider uppercase">ราคาต่อหน่วย</div>
                              <div className="font-light text-gray-600">฿{item.price.toLocaleString()}</div>
                            </div>
                            <div>
                              <div className="text-xs font-light text-gray-400 mb-1 tracking-wider uppercase">รวม</div>
                              <div className="font-light text-black">฿{(item.price * item.quantity).toLocaleString()}</div>
                            </div>
                          </div>
                        </div>

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
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cart Summary - Fixed */}
              <div className="lg:flex-shrink-0 border-t border-gray-100 px-6 py-6 bg-white">
                <div className="space-y-6">
                  {/* Subtotal breakdown */}
                  <div>
                    <div className="text-xs font-light text-gray-400 mb-1 tracking-wider uppercase">จำนวนรายการ</div>
                    <div className="font-light text-gray-600">{getTotalItems()} ชิ้น</div>
                  </div>

                  {/* Total Amount */}
                  <div className="border-t border-gray-100 pt-4">
                    <div className="text-xs font-light text-gray-400 mb-1 tracking-wider uppercase">ยอดรวมทั้งสิ้น</div>
                    <div className="text-xl font-light text-black">
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