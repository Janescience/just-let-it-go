'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit, Trash2, Calculator, ChefHat, Search, X, Upload, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/layout/Header';
import { MenuItem, Ingredient } from '@/types';
import { Button, Input, Select, Modal } from '@/components/ui';

interface MenuItemWithCost extends MenuItem {
  totalCost: number;
  profitMargin: number;
}

export default function MenuPage() {
  const { user } = useAuth();
  const [menuItems, setMenuItems] = useState<MenuItemWithCost[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItemWithCost | null>(null);

  useEffect(() => {
    if (user) {
      fetchMenuItems();
      fetchIngredients();
    }
  }, [user]);

  const fetchMenuItems = async () => {
    try {
      const response = await fetch('/api/menu-items');
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

  const fetchIngredients = async () => {
    try {
      const response = await fetch('/api/ingredients');
      if (response.ok) {
        const data = await response.json();
        setIngredients(data.ingredients);
      }
    } catch (error) {
      console.error('Error fetching ingredients:', error);
    }
  };

  const filteredMenuItems = menuItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const deleteMenuItem = async (id: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบเมนูนี้?')) return;

    try {
      const response = await fetch(`/api/menu-items/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchMenuItems();
      }
    } catch (error) {
      console.error('Error deleting menu item:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="จัดการเมนู" />
        <div className="p-4 tablet:p-6">
          <div className="text-center py-8">กำลังโหลด...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen mb-5 bg-white">
      <Header title="จัดการเมนู" />
      <div className="p-6 tablet:p-8 pb-20 max-w-7xl mx-auto">
        {/* Header Actions */}
        <div className="flex flex-row items-center justify-between gap-4 mb-8">
          <Input
            label="ค้นหาเมนู"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 min-w-0"
          />
          <Button onClick={() => setShowAddModal(true)} variant="primary" className="ml-4 whitespace-nowrap">
            <Plus className="w-5 h-5" />
            เมนูใหม่
          </Button>
        </div>

        {/* Menu Items Grid */}
        {filteredMenuItems.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <ChefHat className="w-12 h-12 text-gray-300" />
            </div>
            <h3 className="text-2xl font-light text-gray-900 mb-3">ยังไม่มีเมนู</h3>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">เริ่มต้นสร้างเมนูแรกของคุณและเพิ่มรูปภาพให้ดูน่าสนใจ</p>
            <Button onClick={() => setShowAddModal(true)} variant="primary">
              <Plus className="w-5 h-5" />
              เพิ่มเมนูใหม่
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6 gap-4">
            {filteredMenuItems.map(item => (
              <div key={item._id} className="group">
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow transition-all duration-200">
                  {/* Image */}
                  <div className="aspect-[4/3] bg-gray-50 overflow-hidden relative">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100">
                        <ChefHat className="w-16 h-16 text-gray-300" />
                      </div>
                    )}
                    {/* Status Badge */}
                    <div className="absolute top-3 right-3">
                      <span className={`px-2 py-0.5 rounded  font-light border ${item.isActive ? 'bg-black text-white border-black' : 'bg-white text-gray-400 border-gray-300'}`}>
                        {item.isActive ? 'ใช้งาน' : 'ปิดใช้งาน'}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <div className="mb-2">
                      <h3 className="font-light text-lg text-gray-900 mb-1 truncate">{item.name}</h3>
                      {item.description && (
                        <p className="text-gray-500 text-lg leading-relaxed truncate">{item.description}</p>
                      )}
                    </div>

                    {/* Financial Info */}
                    <div className="flex justify-between items-end mb-4">
                      <div>
                        <div className=" text-gray-400 mb-1">ราคาขาย</div>
                        <div className="text-lg font-light text-gray-900">฿{item.price.toLocaleString()}</div>
                      </div>
                      <div className="text-right">
                        <div className=" text-gray-400 mb-1">กำไร</div>
                        <div className=" font-light text-gray-700">฿{(item.price - (item.totalCost || 0)).toFixed(0)}</div>
                        <div className=" text-gray-400">{item.totalCost ? (((item.price - item.totalCost) / item.price) * 100).toFixed(0) : '0'}% margin</div>
                      </div>
                    </div>

                    {/* Ingredients */}
                    {/*<div className="mb-4">
                      <div className=" text-gray-400 mb-1">วัตถุดิบหลัก</div>
                      <div className="flex flex-wrap gap-1">
                        {item.ingredients.slice(0, 3).map((ing, index) => {
                          const ingredient = ingredients.find(i => i._id === ing.ingredientId);
                          return (
                            <span key={index} className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded  font-light">
                              {ingredient?.name}
                            </span>
                          );
                        })}
                        {item.ingredients.length > 3 && (
                          <span className="bg-gray-100 text-gray-400 px-2 py-0.5 rounded ">+{item.ingredients.length - 3}</span>
                        )}
                      </div>
                    </div>*/}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button onClick={() => { setSelectedMenuItem(item); setShowEditModal(true); }} variant="secondary" className="flex-1" size="sm">
                        <Edit className="w-4 h-4" />
                        แก้ไข
                      </Button>
                      <Button onClick={() => deleteMenuItem(item._id)} variant="danger" size="sm" className="flex-1">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Menu Item Modal */}
      <MenuItemModal
        isOpen={showAddModal}
        ingredients={ingredients}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => { fetchMenuItems(); setShowAddModal(false); }}
      />
      <MenuItemModal
        isOpen={showEditModal}
        menuItem={selectedMenuItem || undefined}
        ingredients={ingredients}
        onClose={() => { setShowEditModal(false); setSelectedMenuItem(null); }}
        onSuccess={() => { fetchMenuItems(); setShowEditModal(false); setSelectedMenuItem(null); }}
      />
    </div>
  );
}

// Menu Item Modal Component
function MenuItemModal({ isOpen, menuItem, ingredients, onClose, onSuccess }: {
  isOpen: boolean;
  menuItem?: MenuItemWithCost;
  ingredients: Ingredient[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEditing = !!menuItem;
  const [formData, setFormData] = useState({
    name: menuItem?.name || '',
    description: menuItem?.description || '',
    price: menuItem?.price?.toString() || '',
    image: menuItem?.image || '',
    isActive: menuItem?.isActive ?? true
  });

  const [, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedIngredients, setSelectedIngredients] = useState<{
    ingredientId: string;
    quantity: string;
  }[]>([{ ingredientId: '', quantity: '' }]);

  const [loading, setLoading] = useState(false);

  // Reset form data when menuItem changes or modal opens/closes
  useEffect(() => {
    if (isOpen) {
      // Reset form data when modal opens with new menuItem
      setFormData({
        name: menuItem?.name || '',
        description: menuItem?.description || '',
        price: menuItem?.price?.toString() || '',
        image: menuItem?.image || '',
        isActive: menuItem?.isActive ?? true
      });

      setImagePreview(menuItem?.image || '');

      if (menuItem?.ingredients && menuItem.ingredients.length > 0) {
        console.log('Menu item ingredients:', menuItem.ingredients);
        setSelectedIngredients(
          menuItem.ingredients.map(ing => {
            console.log('Processing ingredient:', ing);
            const ingredientId = (ing.ingredientId && typeof ing.ingredientId === 'object')
              ? (ing.ingredientId as any)._id
              : ing.ingredientId;
            return {
              ingredientId: ingredientId || '',
              quantity: ing.quantity.toString()
            };
          })
        );
      } else {
        setSelectedIngredients([{ ingredientId: '', quantity: '' }]);
      }
    } else {
      // Clear form data when modal closes
      setFormData({
        name: '',
        description: '',
        price: '',
        image: '',
        isActive: true
      });
      setImagePreview('');
      setSelectedIngredients([{ ingredientId: '', quantity: '' }]);
      setImageFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [isOpen, menuItem]);

  // Calculate total cost
  const calculateTotalCost = () => {
    return selectedIngredients.reduce((total, ing) => {
      const ingredient = ingredients.find(i => i._id === ing.ingredientId);
      if (ingredient && ing.quantity) {
        return total + (ingredient.costPerUnit * parseFloat(ing.quantity));
      }
      return total;
    }, 0);
  };

  const totalCost = calculateTotalCost();
  const price = parseFloat(formData.price) || 0;
  const profit = price - totalCost;
  const profitMargin = price > 0 ? (profit / price) * 100 : 0;

  const addIngredient = () => {
    setSelectedIngredients([...selectedIngredients, { ingredientId: '', quantity: '' }]);
  };

  const removeIngredient = (index: number) => {
    setSelectedIngredients(selectedIngredients.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, field: string, value: string) => {
    const updated = [...selectedIngredients];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedIngredients(updated);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImagePreview(result);
        setFormData({ ...formData, image: result });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview('');
    setFormData({ ...formData, image: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validIngredients = selectedIngredients
        .filter(ing => ing.ingredientId && ing.quantity)
        .map(ing => ({
          ingredientId: ing.ingredientId,
          quantity: parseFloat(ing.quantity)
        }));

      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        image: formData.image,
        ingredients: validIngredients,
        isActive: formData.isActive
      };

      const response = await fetch(
        isEditing ? `/api/menu-items/${menuItem._id}` : '/api/menu-items',
        {
          method: isEditing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );

      if (response.ok) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error saving menu item:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'แก้ไขเมนู' : 'เพิ่มเมนูใหม่'}
      size="lg"
    >
      <div className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Image Upload */}
            <div>
              <div className="space-y-4">
                {imagePreview ? (
                  <div className="relative w-full max-w-sm mx-auto">
                    <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-gray-50">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={removeImage}
                      variant="danger"
                      size="sm"
                      className="absolute -top-2 -right-2 shadow-lg"
                      aria-label="ลบรูป"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full max-w-sm mx-auto aspect-[4/3] border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-all"
                  >
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <ImageIcon className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-600 font-light mb-1">คลิกเพื่ออัพโหลดรูป</p>
                    <p className="text-lg text-gray-500">PNG, JPG หรือ WEBP</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
               
              </div>
            </div>
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-6">
              <Input
                label="ชื่อเมนู"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="รามอร่อย สลัดผลไม้..."
                required
              />
              <Input
                label="ราคาขาย (บาท)"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={e => setFormData({ ...formData, price: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="block text-lg  text-gray-700 mb-2">คำอธิบาย</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="อร่อยมาก รสชาติ พิเศษ..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                <span className="ml-3 text-lg font-light text-gray-900">
                  เปิดใช้งานเมนูนี้
                </span>
              </label>
            </div>
            {/* Ingredients */}
            <div>
              <div className="flex justify-between items-center mb-6">
                <label className="text-lg font-light text-gray-900">วัตถุดิบที่ใช้</label>
                <Button
                  type="button"
                  onClick={addIngredient}
                  variant="secondary"
                  className="inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  เพิ่มวัตถุดิบ
                </Button>
              </div>
              <div className="space-y-4">
                {selectedIngredients.map((ing, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-2xl">
                    <div className="flex gap-4 items-end">
                      <div className="flex-1">
                        <label className="block text-lg font-light text-gray-700 mb-2">
                          วัตถุดิบ
                        </label>
                        <Select
                          value={ing.ingredientId}
                          onChange={e => updateIngredient(index, 'ingredientId', e.target.value)}
                          options={ingredients.map(ingredient => ({
                            value: ingredient._id,
                            label: `${ingredient.name} (${ingredient.unit}) - ฿${ingredient.costPerUnit.toFixed(2)}/${ingredient.unit}`
                          }))}
                          placeholder="เลือกวัตถุดิบ"
                          required
                        />
                      </div>
                      <div className="w-32">
                        <label className="block text-lg font-light text-gray-700 mb-2">
                          จำนวน
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          value={ing.quantity}
                          onChange={e => updateIngredient(index, 'quantity', e.target.value)}
                          placeholder="0"
                          required
                        />
                      </div>
                      <div className="w-24 text-right">
                        {ing.ingredientId && ing.quantity && (
                          <div className=" text-gray-500 mb-1">ต้นทุน</div>
                        )}
                        {ing.ingredientId && ing.quantity && ingredients.find(i => i._id === ing.ingredientId) && (
                          <div className="font-light text-gray-900">
                            ฿{(ingredients.find(i => i._id === ing.ingredientId)!.costPerUnit * parseFloat(ing.quantity)).toFixed(2)}
                          </div>
                        )}
                      </div>
                      {selectedIngredients.length > 1 && (
                        <Button
                          type="button"
                          onClick={() => removeIngredient(index)}
                          variant="danger"
                          className="flex items-center justify-center"
                          aria-label="ลบวัตถุดิบ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Cost Summary - 1 row only */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 rounded-2xl">
              <div className="flex flex-wrap justify-between items-center gap-4">
                <div className="text-center flex-1 min-w-[120px]">
                  <div className=" font-light text-gray-500 uppercase tracking-wide mb-1">ต้นทุนรวม</div>
                  <div className="text-xl  text-gray-900">฿{totalCost.toFixed(0)}</div>
                </div>
                <div className="text-center flex-1 min-w-[120px]">
                  <div className=" font-light text-gray-500 uppercase tracking-wide mb-1">ราคาขาย</div>
                  <div className="text-xl  text-gray-900">฿{price.toFixed(0)}</div>
                </div>
                <div className="text-center flex-1 min-w-[120px]">
                  <div className=" font-light text-gray-500 uppercase tracking-wide mb-1">กำไรสุทธิ</div>
                  <div className={`text-xl  ${profit >= 0 ? 'text-gray-900' : 'text-red-600'}`}>฿{profit.toFixed(0)}</div>
                </div>
                <div className="text-center flex-1 min-w-[120px]">
                  <div className=" font-light text-gray-500 uppercase tracking-wide mb-1">MARGIN</div>
                  <div className={`text-xl  ${profitMargin >= 0 ? 'text-gray-900' : 'text-red-600'}`}>{profitMargin.toFixed(0)}%</div>
                </div>
              </div>
              {profit < 0 && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                  <div className="flex items-center gap-2 font-light">
                    <div className="w-5 h-5 bg-red-600 rounded-full flex items-center justify-center">
                      <span className="text-white  font-light">!</span>
                    </div>
                    ราคาขายต่ำกว่าต้นทุน จะทำให้ขาดทุน
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-col flex-row gap-4 ">
              <Button
                type="button"
                onClick={onClose}
                variant="secondary"
                className="flex-1"
              >
                ยกเลิก
              </Button>
              <Button
                type="submit"
                disabled={loading || selectedIngredients.every(ing => !ing.ingredientId)}
                variant="primary"
                className="flex-1"
              >
                {loading ? 'กำลังบันทึก...' : 'บันทึก'}
              </Button>
            </div>
          </form>
      </div>
    </Modal>
  );
}