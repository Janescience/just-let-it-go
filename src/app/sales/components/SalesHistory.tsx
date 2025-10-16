'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, ListOrdered, Edit, Save, X, Clock, Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui';
import { Sale } from '@/types';
import { displayDate, displayTime } from '@/utils/timezone';

interface SalesHistoryProps {
  salesHistory: Sale[];
  currentPage: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  selectedDate: string;
  onDateChange: (date: string) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onSaleUpdated?: () => void;
}

export function SalesHistory({
  salesHistory,
  currentPage,
  totalPages,
  hasNext,
  hasPrev,
  selectedDate,
  onDateChange,
  onPreviousPage,
  onNextPage,
  onSaleUpdated
}: SalesHistoryProps) {
  const [editingSale, setEditingSale] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [availableMenuItems, setAvailableMenuItems] = useState<any[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Fetch available menu items for adding new items
  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        const response = await fetch('/api/menu-items');
        if (response.ok) {
          const data = await response.json();
          // API returns { menuItems: [...] }
          const menuItems = data.menuItems || [];
          setAvailableMenuItems(menuItems.filter((item: any) => item.isActive));
        }
      } catch (error) {
        console.error('Error fetching menu items:', error);
      }
    };

    fetchMenuItems();
  }, []);

  const startEditing = (sale: Sale) => {
    setEditingSale(sale._id);
    setEditData({
      paymentMethod: sale.paymentMethod,
      items: sale.items.map(item => {
        // Extract the actual menuItemId (string ID)
        let menuItemId: string | undefined;
        let menuItemName: string;

        if (item.menuItemId) {
          if (typeof item.menuItemId === 'object' && 'name' in item.menuItemId) {
            menuItemId = (item.menuItemId as any)._id;
            menuItemName = (item.menuItemId as { name: string }).name;
          } else if (typeof item.menuItemId === 'string') {
            menuItemId = item.menuItemId;
            // Try to find name from available menu items
            const foundMenuItem = availableMenuItems.find(menu => menu._id === item.menuItemId);
            menuItemName = foundMenuItem?.name || 'สินค้าที่ถูกลบ';
          } else {
            menuItemName = 'สินค้าที่ถูกลบ';
          }
        } else {
          menuItemName = 'สินค้าที่ถูกลบ';
        }

        return {
          menuItemId,
          menuItemName,
          quantity: item.quantity,
          price: item.price
        };
      })
    });
  };

  const cancelEditing = () => {
    setEditingSale(null);
    setEditData({});
  };

  const updateItemQuantity = (itemIndex: number, newQuantity: number) => {
    if (newQuantity < 1) return;

    setEditData((prev: any) => ({
      ...prev,
      items: prev.items.map((item: any, index: number) =>
        index === itemIndex ? { ...item, quantity: newQuantity } : item
      )
    }));
  };

  const updateItemPrice = (itemIndex: number, newPrice: number) => {
    if (newPrice < 0) return;

    setEditData((prev: any) => ({
      ...prev,
      items: prev.items.map((item: any, index: number) =>
        index === itemIndex ? { ...item, price: newPrice } : item
      )
    }));
  };

  const addItem = () => {
    if (availableMenuItems.length === 0) return;

    const firstMenuItem = availableMenuItems[0];
    const newItem = {
      menuItemId: firstMenuItem._id,
      menuItemName: firstMenuItem.name,
      quantity: 1,
      price: firstMenuItem.price
    };

    setEditData((prev: any) => ({
      ...prev,
      items: [...(prev.items || []), newItem]
    }));
  };

  const removeItem = (itemIndex: number) => {
    setEditData((prev: any) => ({
      ...prev,
      items: prev.items.filter((_: any, index: number) => index !== itemIndex)
    }));
  };

  const updateItemMenu = (itemIndex: number, menuItemId: string) => {
    const selectedMenuItem = availableMenuItems.find(item => item._id === menuItemId);
    if (!selectedMenuItem) return;

    setEditData((prev: any) => ({
      ...prev,
      items: prev.items.map((item: any, index: number) =>
        index === itemIndex ? {
          ...item,
          menuItemId: selectedMenuItem._id,
          menuItemName: selectedMenuItem.name,
          price: selectedMenuItem.price
        } : item
      )
    }));
  };

  const calculateTotal = () => {
    return editData.items?.reduce((sum: number, item: any) =>
      sum + (item.quantity * item.price), 0
    ) || 0;
  };

  const saveSale = async () => {
    if (!editingSale) return;

    setSaving(true);
    try {
      // Validate and filter items before sending
      const validItems = editData.items.filter((item: any) => {
        return item.menuItemId && item.quantity > 0 && item.price >= 0;
      });

      if (validItems.length === 0) {
        alert('ต้องมีอย่างน้อย 1 รายการที่ถูกต้อง');
        setSaving(false);
        return;
      }

      const response = await fetch(`/api/sales/${editingSale}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          paymentMethod: editData.paymentMethod,
          items: validItems.map((item: any) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            price: item.price
          })),
          reason: 'แก้ไขจากประวัติการขาย'
        })
      });

      if (response.ok) {
        setEditingSale(null);
        setEditData({});
        // Add a small delay to ensure the database is updated before refreshing
        setTimeout(() => {
          onSaleUpdated?.();
        }, 500);
      } else {
        const error = await response.json();
        alert(`เกิดข้อผิดพลาด: ${error.message || 'ไม่สามารถบันทึกการแก้ไขได้'}`);
      }
    } catch (error) {
      console.error('Error saving sale:', error);
      alert('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSaving(false);
    }
  };

  const deleteSale = async (saleId: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบรายการขายนี้? การกระทำนี้ไม่สามารถยกเลิกได้')) {
      return;
    }

    setDeleting(saleId);
    try {
      const response = await fetch(`/api/sales/${saleId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        // Refresh the sales data
        setTimeout(() => {
          onSaleUpdated?.();
        }, 500);
      } else {
        const error = await response.json();
        alert(`เกิดข้อผิดพลาด: ${error.message || 'ไม่สามารถลบรายการขายได้'}`);
      }
    } catch (error) {
      console.error('Error deleting sale:', error);
      alert('เกิดข้อผิดพลาดในการลบรายการขาย');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="h-full overflow-y-auto max-w-7xl mx-auto px-6 py-4 space-y-6">
      {/* Header with Title and Date Filter */}
      <div className="flex items-center justify-between mb-6">
        <div className="text-lg font-light text-black tracking-wider">ประวัติการขาย {displayDate(selectedDate)}</div>
        <div className="flex items-center gap-3">
          <div className="font-light text-black tracking-wider whitespace-nowrap">วันที่</div>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="max-w-xs border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black"
          />
        </div>
      </div>

      {/* Sales History Table */}
      <div>

        {salesHistory.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 border border-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <ListOrdered className="w-6 h-6 text-gray-400" />
            </div>
            <div className="text-sm font-light text-gray-500 mb-2">ไม่มีประวัติการขาย</div>
            <div className="text-xs font-light text-gray-400">ลองเปลี่ยนวันที่ดู</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-light text-gray-500 uppercase tracking-wider">เวลา</th>
                  <th className="px-4 py-3 text-left text-xs font-light text-gray-500 uppercase tracking-wider">รายการ</th>
                  <th className="px-4 py-3 text-left text-xs font-light text-gray-500 uppercase tracking-wider">การชำระ</th>
                  <th className="px-4 py-3 text-right text-xs font-light text-gray-500 uppercase tracking-wider">ยอดรวม</th>
                  <th className="px-4 py-3 text-center text-xs font-light text-gray-500 uppercase tracking-wider">จัดการ</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {salesHistory.map((sale) => (
                  <tr key={sale._id} className="hover:bg-gray-50">
                    {/* เวลา */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="text-sm font-light text-gray-900 tracking-wider">
                            {displayTime(sale.createdAt)}
                          </div>
                          <div className="text-xs font-light text-gray-500 tracking-wider">
                            #{sale._id.slice(-8)}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* รายการ */}
                    <td className="px-4 py-4">
                      {editingSale === sale._id ? (
                        <div className="space-y-2">
                          {editData.items?.map((item: any, index: number) => (
                            <div key={index} className="flex items-center gap-2">
                              <select
                                value={item.menuItemId}
                                onChange={(e) => updateItemMenu(index, e.target.value)}
                                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                              >
                                {availableMenuItems.map((menuItem) => (
                                  <option key={menuItem._id} value={menuItem._id}>
                                    {menuItem.name}
                                  </option>
                                ))}
                              </select>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 1)}
                                  className="w-16 px-2 py-1 text-sm border border-gray-300 rounded"
                                />
                                <span className="text-xs text-gray-500">x</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.price}
                                  onChange={(e) => updateItemPrice(index, parseFloat(e.target.value) || 0)}
                                  className="w-20 px-2 py-1 text-sm border border-gray-300 rounded"
                                />
                                <button
                                  onClick={() => removeItem(index)}
                                  className="p-1 text-red-600 hover:text-red-800"
                                  disabled={editData.items.length <= 1}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                          <button
                            onClick={addItem}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 border border-blue-300 rounded hover:bg-blue-50"
                          >
                            <Plus className="w-4 h-4" />
                            เพิ่มรายการ
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {sale.items.map((item, index) => {
                            // Get menu item name - try multiple approaches
                            let menuItemName = 'สินค้าที่ถูกลบ';

                            if (item.menuItemId) {
                              if (typeof item.menuItemId === 'object' && 'name' in item.menuItemId) {
                                menuItemName = (item.menuItemId as { name: string }).name;
                              } else if (typeof item.menuItemId === 'string') {
                                // If it's just an ID, try to find the name from available menu items
                                const foundMenuItem = availableMenuItems.find(menu => menu._id === item.menuItemId);
                                if (foundMenuItem) {
                                  menuItemName = foundMenuItem.name;
                                }
                              }
                            }

                            return (
                              <div key={index} className="text-sm">
                                <span className="font-light text-gray-900 tracking-wider">
                                  {menuItemName}
                                </span>
                                <span className="font-light text-gray-500 ml-2 tracking-wider">
                                  {item.quantity} x ฿{item.price.toLocaleString()}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </td>

                    {/* การชำระ */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      {editingSale === sale._id ? (
                        <select
                          value={editData.paymentMethod}
                          onChange={(e) => setEditData((prev: any) => ({ ...prev, paymentMethod: e.target.value }))}
                          className="px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="cash">เงินสด</option>
                          <option value="transfer">เงินโอน</option>
                        </select>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-light rounded-full bg-gray-100 text-gray-800 tracking-wider">
                          {sale.paymentMethod === 'cash' ? 'เงินสด' : 'เงินโอน'}
                        </span>
                      )}
                    </td>

                    {/* ยอดรวม */}
                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-light text-gray-900 tracking-wider">
                        ฿{editingSale === sale._id ? calculateTotal().toLocaleString() : sale.totalAmount.toLocaleString()}
                      </div>
                    </td>

                    {/* จัดการ */}
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      {editingSale === sale._id ? (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={saveSale}
                            disabled={saving}
                            className="p-2 text-green-600 hover:text-green-800 disabled:opacity-50"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={cancelEditing}
                            disabled={saving}
                            className="p-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => startEditing(sale)}
                            className="p-2 text-blue-600 hover:text-blue-800"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteSale(sale._id)}
                            disabled={deleting === sale._id}
                            className="p-2 text-gray-300 hover:text-red-600 disabled:opacity-50"
                            title="ลบรายการขาย"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm font-light text-gray-500 tracking-wider">
              หน้า {currentPage} จาก {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onPreviousPage}
                disabled={!hasPrev}
                className="p-2 text-gray-600 hover:text-black disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={onNextPage}
                disabled={!hasNext}
                className="p-2 text-gray-600 hover:text-black disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}