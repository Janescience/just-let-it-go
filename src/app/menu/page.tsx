'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit, Trash2, ChefHat, X, Image as ImageIcon, Copy, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { MenuItem, Ingredient, Category } from '@/types';
import { Button, Input, Select, Modal } from '@/components/ui';
import { MenuLoading } from './components/MenuLoading';

interface MenuItemWithCost extends MenuItem {
  totalCost: number;
  profitMargin: number;
}

export default function MenuPage() {
  const { user } = useAuth();
  const [menuItems, setMenuItems] = useState<MenuItemWithCost[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItemWithCost | null>(null);
  const [copyingMenuItem, setCopyingMenuItem] = useState<MenuItemWithCost | null>(null);
  const [activeMainTab, setActiveMainTab] = useState<'menu' | 'categories'>('menu');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedCategoryForAdd, setSelectedCategoryForAdd] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchMenuItems();
      fetchIngredients();
      fetchCategories();
    }
  }, [user]);

  useEffect(() => {
    if (activeMainTab === 'menu') {
      fetchMenuItems();
    }
  }, [activeMainTab, activeCategory]);

  const fetchMenuItems = async () => {
    try {
      const params = new URLSearchParams();
      if (activeCategory !== 'all') {
        params.append('categoryId', activeCategory);
      }
      const response = await fetch(`/api/menu-items?${params.toString()}`);
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
    return <MenuLoading />;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-thin text-black tracking-wider">เมนู</h1>
              <p className="text-sm font-light text-gray-500 mt-1">จัดการเมนูและต้นทุน</p>
            </div>
            <button
              onClick={() => {
                setSelectedCategoryForAdd(null);
                setShowAddModal(true);
              }}
              className="px-6 py-2 border border-gray-200 text-sm font-light text-black hover:bg-gray-50 transition-colors duration-200 tracking-wide"
            >
              เพิ่มเมนู
            </button>
          </div>

          {/* Main Tabs */}
          <div className="mt-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveMainTab('menu')}
                  className={`py-2 px-1 border-b-2 font-light text-sm tracking-wide ${
                    activeMainTab === 'menu'
                      ? 'border-black text-black'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  เมนู
                </button>
                <button
                  onClick={() => setActiveMainTab('categories')}
                  className={`py-2 px-1 border-b-2 font-light text-sm tracking-wide ${
                    activeMainTab === 'categories'
                      ? 'border-black text-black'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  หมวดหมู่
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {activeMainTab === 'menu' ? (
          <>
            {/* Category Sub-tabs */}
            {categories.length > 0 && (
              <div className="mb-6">
                <div className="border-b border-gray-100">
                  <nav className="-mb-px flex space-x-6 overflow-x-auto">
                    <button
                      onClick={() => setActiveCategory('all')}
                      className={`py-2 px-1 border-b-2 font-light text-sm tracking-wide whitespace-nowrap ${
                        activeCategory === 'all'
                          ? 'border-gray-500 text-gray-900'
                          : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-200'
                      }`}
                    >
                      ทั้งหมด
                    </button>
                    {categories.map(category => (
                      <div key={category._id} className="flex items-center space-x-2">
                        <button
                          onClick={() => setActiveCategory(category._id)}
                          className={`py-2 px-1 border-b-2 font-light text-sm tracking-wide whitespace-nowrap ${
                            activeCategory === category._id
                              ? 'border-gray-500 text-gray-900'
                              : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-200'
                          }`}
                        >
                          {category.name}
                        </button>
                        {activeCategory === category._id && (
                          <button
                            onClick={() => {
                              setSelectedCategoryForAdd(category._id);
                              setShowAddModal(true);
                            }}
                            className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                            title="เพิ่มเมนูในหมวดนี้"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </nav>
                </div>
              </div>
            )}

            {/* Search */}
            <div className="mb-12">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาเมนู..."
                className="max-w-md border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black"
              />
            </div>

            {filteredMenuItems.length === 0 ? (
              <div className="text-center py-24">
                <div className="w-16 h-16 border border-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ChefHat className="w-6 h-6 text-gray-300" />
                </div>
                <div className="text-lg font-thin text-gray-600 mb-2 tracking-wide">ไม่มีเมนู</div>
                <div className="text-sm font-light text-gray-400 mb-8">เริ่มต้นด้วยการเพิ่มเมนูแรก</div>
                <button
                  onClick={() => {
                    setSelectedCategoryForAdd(activeCategory !== 'all' ? activeCategory : null);
                    setShowAddModal(true);
                  }}
                  className="px-8 py-3 bg-black text-white text-sm font-light hover:bg-gray-800 transition-colors duration-200 tracking-wide"
                >
                  เริ่มต้น
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {filteredMenuItems.map(item => (
                  <div key={item._id} className="group relative bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-200">
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

                    {/* Action buttons overlay */}
                    <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setCopyingMenuItem(item); setSelectedCategoryForAdd(null); setShowAddModal(true); }}
                          className="p-2 bg-white rounded-full text-gray-600 hover:text-gray-800 transition-colors duration-200"
                          title="คัดลอกเมนู"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setSelectedMenuItem(item); setShowEditModal(true); }}
                          className="p-2 bg-white rounded-full text-gray-600 hover:text-gray-800 transition-colors duration-200"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteMenuItem(item._id)}
                          className="p-2 bg-white rounded-full text-red-600 hover:text-red-800 transition-colors duration-200"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <CategoryManagement
            categories={categories}
            onRefresh={() => {
              fetchCategories();
              fetchMenuItems();
            }}
          />
        )}
      </div>

      {/* Add/Edit Menu Item Modal */}
      <MenuItemModal
        isOpen={showAddModal}
        ingredients={ingredients}
        categories={categories}
        copyFromMenuItem={copyingMenuItem}
        selectedCategoryId={selectedCategoryForAdd}
        onClose={() => { setShowAddModal(false); setCopyingMenuItem(null); setSelectedCategoryForAdd(null); }}
        onSuccess={() => { fetchMenuItems(); setShowAddModal(false); setCopyingMenuItem(null); setSelectedCategoryForAdd(null); }}
      />
      <MenuItemModal
        isOpen={showEditModal}
        menuItem={selectedMenuItem || undefined}
        ingredients={ingredients}
        categories={categories}
        onClose={() => { setShowEditModal(false); setSelectedMenuItem(null); }}
        onSuccess={() => { fetchMenuItems(); setShowEditModal(false); setSelectedMenuItem(null); }}
      />
    </div>
  );
}

// Category Management Component
function CategoryManagement({ categories, onRefresh }: {
  categories: Category[];
  onRefresh: () => void;
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const deleteCategory = async (id: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบหมวดหมู่นี้?')) return;

    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        onRefresh();
      } else {
        const data = await response.json();
        alert(data.error || 'เกิดข้อผิดพลาดในการลบหมวดหมู่');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('เกิดข้อผิดพลาดในการลบหมวดหมู่');
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-lg font-light text-black tracking-wide">จัดการหมวดหมู่</h2>
          <p className="text-sm font-light text-gray-500 mt-1">เพิ่ม แก้ไข หรือลบหมวดหมู่เมนู</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-6 py-2 border border-gray-200 text-sm font-light text-black hover:bg-gray-50 transition-colors duration-200 tracking-wide"
        >
          เพิ่มหมวดหมู่
        </button>
      </div>

      {categories.length === 0 ? (
        <div className="text-center py-24">
          <div className="w-16 h-16 border border-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <Settings className="w-6 h-6 text-gray-300" />
          </div>
          <div className="text-lg font-thin text-gray-600 mb-2 tracking-wide">ไม่มีหมวดหมู่</div>
          <div className="text-sm font-light text-gray-400 mb-8">เริ่มต้นด้วยการเพิ่มหมวดหมู่แรก</div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-8 py-3 bg-black text-white text-sm font-light hover:bg-gray-800 transition-colors duration-200 tracking-wide"
          >
            เริ่มต้น
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map(category => (
            <div key={category._id} className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-light text-black tracking-wide">{category.name}</h3>
                  <p className="text-sm font-light text-gray-500">ลำดับ: {category.order}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setEditingCategory(category)}
                    className="p-2 text-gray-300 hover:text-gray-600 transition-colors duration-200"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteCategory(category._id)}
                    className="p-2 text-gray-300 hover:text-red-400 transition-colors duration-200"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Category Modal */}
      <CategoryModal
        isOpen={showAddModal || !!editingCategory}
        category={editingCategory}
        onClose={() => {
          setShowAddModal(false);
          setEditingCategory(null);
        }}
        onSuccess={() => {
          onRefresh();
          setShowAddModal(false);
          setEditingCategory(null);
        }}
      />
    </>
  );
}

// Category Modal Component
function CategoryModal({ isOpen, category, onClose, onSuccess }: {
  isOpen: boolean;
  category?: Category | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEditing = !!category;
  const [formData, setFormData] = useState({
    name: category?.name || '',
    order: category?.order?.toString() || '0'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: category?.name || '',
        order: category?.order?.toString() || '0'
      });
    }
  }, [isOpen, category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        name: formData.name.trim(),
        order: parseInt(formData.order) || 0
      };

      const response = await fetch(
        isEditing ? `/api/categories/${category._id}` : '/api/categories',
        {
          method: isEditing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );

      if (response.ok) {
        onSuccess();
      } else {
        const data = await response.json();
        alert(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (error) {
      console.error('Error saving category:', error);
      alert('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่ใหม่'}
      size="md"
    >
      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="ชื่อหมวดหมู่"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            placeholder="เครื่องดื่ม, อาหารจานหลัก..."
            required
          />
          <Input
            label="ลำดับ"
            type="number"
            value={formData.order}
            onChange={e => setFormData({ ...formData, order: e.target.value })}
            placeholder="0"
            required
          />
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
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
              disabled={loading || !formData.name.trim()}
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

// Menu Item Modal Component
function MenuItemModal({ isOpen, menuItem, ingredients, categories, copyFromMenuItem, selectedCategoryId, onClose, onSuccess }: {
  isOpen: boolean;
  menuItem?: MenuItemWithCost;
  ingredients: Ingredient[];
  categories: Category[];
  copyFromMenuItem?: MenuItemWithCost | null;
  selectedCategoryId?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEditing = !!menuItem;
  const [formData, setFormData] = useState({
    name: menuItem?.name || '',
    description: menuItem?.description || '',
    price: menuItem?.price?.toString() || '',
    image: menuItem?.image || '',
    categoryId: menuItem?.categoryId || selectedCategoryId || '',
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
      const sourceItem = menuItem || copyFromMenuItem;

      // Reset form data when modal opens with new menuItem or copying
      setFormData({
        name: copyFromMenuItem ? `${copyFromMenuItem.name} (สำเนา)` : (menuItem?.name || ''),
        description: sourceItem?.description || '',
        price: sourceItem?.price?.toString() || '',
        image: sourceItem?.image || '',
        categoryId: selectedCategoryId || sourceItem?.categoryId || '',
        isActive: sourceItem?.isActive ?? true
      });

      setImagePreview(sourceItem?.image || '');

      if (sourceItem?.ingredients && sourceItem.ingredients.length > 0) {
        console.log('Menu item ingredients:', sourceItem.ingredients);
        setSelectedIngredients(
          sourceItem.ingredients.map(ing => {
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
        categoryId: '',
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
        categoryId: formData.categoryId || null,
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
      title={isEditing ? 'แก้ไขเมนู' : (copyFromMenuItem ? 'คัดลอกเมนู' : 'เพิ่มเมนูใหม่')}
      size="lg"
    >
      <div className="p-4 sm:p-6 lg:p-8">
          <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
            {/* Image Upload */}
            <div>
              <div className="space-y-4">
                {imagePreview ? (
                  <div className="relative w-full max-w-xs sm:max-w-sm mx-auto">
                    <div className="aspect-[4/3] rounded-xl sm:rounded-2xl overflow-hidden bg-gray-50">
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
                    className="w-full max-w-xs sm:max-w-sm mx-auto aspect-[4/3] border-2 border-dashed border-gray-300 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-all"
                  >
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                      <ImageIcon className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
                    </div>
                    <p className="text-sm sm:text-base text-gray-600 font-light mb-1">คลิกเพื่ออัพโหลดรูป</p>
                    <p className="text-sm sm:text-base text-gray-500">PNG, JPG หรือ WEBP</p>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <Select
                label="หมวดหมู่"
                value={formData.categoryId}
                onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                options={[
                  { value: '', label: 'ไม่มีหมวดหมู่' },
                  ...categories.map(cat => ({
                    value: cat._id,
                    label: cat.name
                  }))
                ]}
                placeholder="เลือกหมวดหมู่"
                disabled={!!selectedCategoryId}
              />
              <div />
            </div>
            <div>
              <label className="block text-sm sm:text-base font-light text-gray-700 mb-2">คำอธิบาย</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="อร่อยมาก รสชาติ พิเศษ..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm sm:text-base"
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
                <span className="ml-3 text-sm sm:text-base font-light text-gray-900">
                  เปิดใช้งานเมนูนี้
                </span>
              </label>
            </div>
            {/* Ingredients */}
            <div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
                <label className="text-sm sm:text-base font-light text-gray-900">วัตถุดิบที่ใช้</label>
                <Button
                  type="button"
                  onClick={addIngredient}
                  variant="secondary"
                  className="inline-flex items-center gap-2 text-sm"
                  size="sm"
                >
                  <Plus className="w-4 h-4" />
                  เพิ่มวัตถุดิบ
                </Button>
              </div>
              <div className="space-y-3 sm:space-y-4">
                {selectedIngredients.map((ing, index) => (
                  <div key={index} className="bg-gray-50 p-3 sm:p-4 rounded-xl sm:rounded-2xl">
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-end">
                      <div className="flex-1">
                        <label className="block text-sm sm:text-base font-light text-gray-700 mb-2">
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
                      <div className="w-full sm:w-28">
                        <label className="block text-sm sm:text-base font-light text-gray-700 mb-2">
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
                      <div className="flex justify-between sm:block sm:w-20 sm:text-right">
                        <div>
                          {ing.ingredientId && ing.quantity && (
                            <div className="text-xs sm:text-sm text-gray-500 mb-1">ต้นทุน</div>
                          )}
                          {ing.ingredientId && ing.quantity && ingredients.find(i => i._id === ing.ingredientId) && (
                            <div className="text-sm sm:text-base font-light text-gray-900">
                              ฿{(ingredients.find(i => i._id === ing.ingredientId)!.costPerUnit * parseFloat(ing.quantity)).toFixed(2)}
                            </div>
                          )}
                        </div>
                        {selectedIngredients.length > 1 && (
                          <Button
                            type="button"
                            onClick={() => removeIngredient(index)}
                            variant="danger"
                            size="sm"
                            className="flex items-center justify-center"
                            aria-label="ลบวัตถุดิบ"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Cost Summary */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 sm:p-6 rounded-xl sm:rounded-2xl">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-xs sm:text-sm font-light text-gray-500 uppercase tracking-wide mb-1">ต้นทุนรวม</div>
                  <div className="text-lg sm:text-xl font-light text-gray-900">฿{totalCost.toFixed(0)}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs sm:text-sm font-light text-gray-500 uppercase tracking-wide mb-1">ราคาขาย</div>
                  <div className="text-lg sm:text-xl font-light text-gray-900">฿{price.toFixed(0)}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs sm:text-sm font-light text-gray-500 uppercase tracking-wide mb-1">กำไรสุทธิ</div>
                  <div className={`text-lg sm:text-xl font-light ${profit >= 0 ? 'text-gray-900' : 'text-red-600'}`}>฿{profit.toFixed(0)}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs sm:text-sm font-light text-gray-500 uppercase tracking-wide mb-1">MARGIN</div>
                  <div className={`text-lg sm:text-xl font-light ${profitMargin >= 0 ? 'text-gray-900' : 'text-red-600'}`}>{profitMargin.toFixed(0)}%</div>
                </div>
              </div>
              {profit < 0 && (
                <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                  <div className="flex items-center gap-2 font-light text-sm sm:text-base">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs sm:text-sm font-light">!</span>
                    </div>
                    ราคาขายต่ำกว่าต้นทุน จะทำให้ขาดทุน
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Button
                type="button"
                onClick={onClose}
                variant="secondary"
                className="flex-1 text-sm sm:text-base"
              >
                ยกเลิก
              </Button>
              <Button
                type="submit"
                disabled={loading || selectedIngredients.every(ing => !ing.ingredientId)}
                variant="primary"
                className="flex-1 text-sm sm:text-base"
              >
                {loading ? 'กำลังบันทึก...' : 'บันทึก'}
              </Button>
            </div>
          </form>
      </div>
    </Modal>
  );
}