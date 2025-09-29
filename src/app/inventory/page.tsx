'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Package, AlertTriangle, Search, Edit, Trash2, History } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal, ModalActionButton } from '@/components/ui';
import { TablePageLoading } from '@/components/ui';
import { Ingredient, StockMovement } from '@/types';

export default function InventoryPage() {
  const { user } = useAuth();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [view, setView] = useState<'list' | 'movements'>('list');

  useEffect(() => {
    if (user) {
      fetchIngredients();
      fetchStockMovements();
    }
  }, [user]);

  const fetchIngredients = async () => {
    try {
      const response = await fetch('/api/ingredients');
      if (response.ok) {
        const data = await response.json();
        setIngredients(data.ingredients);
      }
    } catch (error) {
      console.error('Error fetching ingredients:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStockMovements = async () => {
    try {
      const response = await fetch('/api/stock-movements');
      if (response.ok) {
        const data = await response.json();
        setStockMovements(data.movements);
      }
    } catch (error) {
      console.error('Error fetching stock movements:', error);
    }
  };

  const filteredIngredients = ingredients
    .filter(ingredient =>
      ingredient.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      // เรียงตามมูลค่ารวม (stock * costPerUnit) จากมากไปน้อย
      const valueA = a.stock * a.costPerUnit;
      const valueB = b.stock * b.costPerUnit;
      return valueB - valueA;
    });

  const lowStockIngredients = ingredients.filter(ingredient =>
    ingredient.stock <= ingredient.minimumStock
  );

  if (loading) {
    return <TablePageLoading title="คลังสินค้า" />;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-thin text-black tracking-wider">วัตถุดิบ</h1>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 border border-gray-200 text-sm font-light text-black hover:bg-gray-50 transition-colors duration-200 tracking-wide"
            >
              เพิ่มวัตถุดิบ
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {/* Navigation and Search */}
        <div className="space-y-4 sm:space-y-0 sm:flex sm:items-center sm:justify-between mb-6">
          <div className="flex gap-6 sm:gap-8 border-b border-gray-100 pb-4 sm:pb-0 sm:border-b-0">
            <button
              onClick={() => setView('list')}
              className={`pb-3 text-sm font-light transition-colors ${
                view === 'list'
                  ? 'text-black border-b border-black'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                วัตถุดิบ
              </div>
            </button>
            <button
              onClick={() => setView('movements')}
              className={`pb-3 text-sm font-light transition-colors ${
                view === 'movements'
                  ? 'text-black border-b border-black'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <History className="w-4 h-4" />
                ประวัติ
              </div>
            </button>
          </div>
          <div className="w-full sm:max-w-md">
            <Input
              type="text"
              placeholder="ค้นหาวัตถุดิบ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black"
            />
          </div>
        </div>

        {/* Low Stock Alert */}
        {lowStockIngredients.length > 0 && view === 'list' && (
          <div className="border border-gray-200 p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-light text-gray-600">วัตถุดิบใกล้หมด ({lowStockIngredients.length} รายการ)</span>
            </div>
            <div className="space-y-2">
              {lowStockIngredients.map(ingredient => (
                <div key={ingredient._id} className="text-sm font-light text-gray-600">
                  {ingredient.name}: เหลือ {ingredient.stock} {ingredient.unit} (ขั้นต่ำ {ingredient.minimumStock})
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'list' ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 text-xs font-light text-gray-400 tracking-wider uppercase">ชื่อวัตถุดิบ</th>
                  <th className="text-right py-3 text-xs font-light text-gray-400 tracking-wider uppercase">สต็อก</th>
                  <th className="text-right py-3 text-xs font-light text-gray-400 tracking-wider uppercase">ต้นทุน/หน่วย</th>
                  <th className="text-right py-3 text-xs font-light text-gray-400 tracking-wider uppercase">มูลค่ารวม</th>
                  <th className="text-right py-3 text-xs font-light text-gray-400 tracking-wider uppercase">ขั้นต่ำ</th>
                  <th className="text-center py-3 text-xs font-light text-gray-400 tracking-wider uppercase">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredIngredients.map(ingredient => {
                  const totalValue = ingredient.stock * ingredient.costPerUnit;
                  const isLowStock = ingredient.stock <= ingredient.minimumStock;

                  return (
                    <tr key={ingredient._id} className="border-b border-gray-50 hover:bg-gray-25 transition-colors">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="font-light text-black tracking-wide">{ingredient.name}</div>
                            <div className="text-xs font-light text-gray-400">{ingredient.unit}</div>
                          </div>
                          {isLowStock && (
                            <div className="w-2 h-2 bg-orange-400 rounded-full" title="สต็อกใกล้หมด"></div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 text-right">
                        <div className={`font-light ${isLowStock ? 'text-orange-600' : 'text-black'}`}>
                          {Number(ingredient.stock).toFixed(2)}
                        </div>
                      </td>
                      <td className="py-4 text-right">
                        <div className="font-light text-gray-600">
                          ฿{ingredient.costPerUnit.toLocaleString()}
                        </div>
                      </td>
                      <td className="py-4 text-right">
                        <div className="font-light text-black">
                          ฿{totalValue.toLocaleString()}
                        </div>
                      </td>
                      <td className="py-4 text-right">
                        <div className="font-light text-gray-400">
                          {ingredient.minimumStock}
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => { setSelectedIngredient(ingredient); setShowStockModal(true); }}
                            className="p-1 text-gray-500 hover:text-gray-600 transition-colors duration-200"
                            title="จัดการสต็อก"
                          >
                            <Package className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { setSelectedIngredient(ingredient); setShowEditModal(true); }}
                            className="p-1 text-gray-500 hover:text-gray-600 transition-colors duration-200"
                            title="แก้ไข"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <StockMovementsView stockMovements={stockMovements} ingredients={ingredients} />
        )}
      </div>

      {/* Add Ingredient Modal */}
      {showAddModal && (
        <AddIngredientModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            fetchIngredients();
            setShowAddModal(false);
          }}
        />
      )}

      {/* Edit Ingredient Modal */}
      {showEditModal && selectedIngredient && (
        <EditIngredientModal
          ingredient={selectedIngredient}
          onClose={() => {
            setShowEditModal(false);
            setSelectedIngredient(null);
          }}
          onSuccess={() => {
            fetchIngredients();
            setShowEditModal(false);
            setSelectedIngredient(null);
          }}
        />
      )}

      {/* Stock Management Modal */}
      {showStockModal && selectedIngredient && (
        <StockManagementModal
          ingredient={selectedIngredient}
          onClose={() => {
            setShowStockModal(false);
            setSelectedIngredient(null);
          }}
          onSuccess={() => {
            fetchIngredients();
            fetchStockMovements();
            setShowStockModal(false);
            setSelectedIngredient(null);
          }}
        />
      )}
    </div>
  );
}

// Add Ingredient Modal Component
function AddIngredientModal({ onClose, onSuccess }: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    unit: '',
    costPerUnit: '',
    stock: '',
    minimumStock: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          costPerUnit: parseFloat(formData.costPerUnit),
          stock: parseFloat(formData.stock),
          minimumStock: parseFloat(formData.minimumStock)
        })
      });

      if (response.ok) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error adding ingredient:', error);
    } finally {
      setLoading(false);
    }
  };

  const actions: ModalActionButton[] = [
    {
      label: 'ยกเลิก',
      onClick: onClose,
      variant: 'secondary',
      disabled: loading
    },
    {
      label: loading ? 'กำลังบันทึก...' : 'บันทึก',
      onClick: () => {
        const form = document.querySelector('form');
        if (form) {
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }
      },
      variant: 'primary',
      disabled: loading || !formData.name || !formData.unit || !formData.costPerUnit || !formData.stock || !formData.minimumStock,
      loading: loading
    }
  ];

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="เพิ่มวัตถุดิบใหม่"
      size="md"
      actions={actions}
    >
      <div className="p-8 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">
              ชื่อวัตถุดิบ
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">
              หน่วย
            </label>
            <Input
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              placeholder="กก., ลิตร, ชิ้น"
              className="border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">
              ต้นทุนต่อหน่วย (บาท)
            </label>
            <Input
              type="number"
              step="0.01"
              value={formData.costPerUnit}
              onChange={(e) => setFormData({ ...formData, costPerUnit: e.target.value })}
              className="border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">
              จำนวนในสต็อก
            </label>
            <Input
              type="number"
              step="0.01"
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
              className="border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">
              สต็อกขั้นต่ำ
            </label>
            <Input
              type="number"
              step="0.01"
              value={formData.minimumStock}
              onChange={(e) => setFormData({ ...formData, minimumStock: e.target.value })}
              className="border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black"
              required
            />
          </div>
        </form>
      </div>
    </Modal>
  );
}

// Edit Ingredient Modal Component
function EditIngredientModal({ ingredient, onClose, onSuccess }: {
  ingredient: Ingredient;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: ingredient.name,
    unit: ingredient.unit,
    costPerUnit: ingredient.costPerUnit.toString(),
    minimumStock: ingredient.minimumStock.toString()
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/ingredients/${ingredient._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          costPerUnit: parseFloat(formData.costPerUnit),
          minimumStock: parseFloat(formData.minimumStock)
        })
      });

      if (response.ok) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error updating ingredient:', error);
    } finally {
      setLoading(false);
    }
  };

  const actions: ModalActionButton[] = [
    {
      label: 'ยกเลิก',
      onClick: onClose,
      variant: 'secondary',
      disabled: loading
    },
    {
      label: loading ? 'กำลังบันทึก...' : 'บันทึก',
      onClick: () => {
        const form = document.querySelector('form');
        if (form) {
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }
      },
      variant: 'primary',
      disabled: loading || !formData.name || !formData.unit || !formData.costPerUnit || !formData.minimumStock,
      loading: loading
    }
  ];

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="แก้ไขวัตถุดิบ"
      size="md"
      actions={actions}
    >
      <div className="p-8 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">
              ชื่อวัตถุดิบ
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">
              หน่วย
            </label>
            <Input
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              placeholder="กก., ลิตร, ชิ้น"
              className="border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">
              ต้นทุนต่อหน่วย (บาท)
            </label>
            <Input
              type="number"
              step="0.01"
              value={formData.costPerUnit}
              onChange={(e) => setFormData({ ...formData, costPerUnit: e.target.value })}
              className="border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">
              สต็อกขั้นต่ำ
            </label>
            <Input
              type="number"
              step="0.01"
              value={formData.minimumStock}
              onChange={(e) => setFormData({ ...formData, minimumStock: e.target.value })}
              className="border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black"
              required
            />
          </div>

          <div className="border-t border-gray-100 pt-6">
            <div className="text-sm font-light text-gray-600">
              <div>สต็อกปัจจุบัน: {ingredient.stock} {ingredient.unit}</div>
              <div className="text-xs font-light text-gray-400 mt-1">
                หมายเหตุ: การแก้ไขจะไม่เปลี่ยนแปลงจำนวนสต็อกปัจจุบัน
              </div>
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
}

// Stock Movements View Component
function StockMovementsView({ stockMovements, ingredients }: {
  stockMovements: StockMovement[];
  ingredients: Ingredient[];
}) {
  // จัดกลุ่ม movements ตาม saleId และ timestamp ใกล้เคียงกัน
  const groupedMovements = React.useMemo(() => {
    const groups: { [key: string]: StockMovement[] } = {};

    stockMovements.forEach(movement => {
      let groupKey = '';

      if (movement.saleId) {
        // จัดกลุ่มตาม saleId
        groupKey = `sale_${movement.saleId}`;
      } else {
        // สำหรับ movement ที่ไม่มี saleId ให้ใช้ timestamp และ type
        const date = new Date(movement.createdAt).toISOString().split('T')[0];
        const hour = new Date(movement.createdAt).getHours();
        groupKey = `${movement.type}_${date}_${hour}_${movement.reason || 'no_reason'}`;
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(movement);
    });

    // เรียงลำดับกลุ่มตามเวลาล่าสุด
    return Object.entries(groups)
      .map(([key, movements]) => ({
        key,
        movements: movements.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        latestTime: movements.reduce((latest, m) =>
          new Date(m.createdAt) > new Date(latest) ? m.createdAt : latest, movements[0].createdAt
        )
      }))
      .sort((a, b) => new Date(b.latestTime).getTime() - new Date(a.latestTime).getTime());
  }, [stockMovements]);

  const getIngredientName = (ingredientId: string) => {
    const ingredient = ingredients.find(ing => ing._id === ingredientId);
    return ingredient?.name || 'วัตถุดิบที่ถูกลบ';
  };

  const getIngredientUnit = (ingredientId: string) => {
    const ingredient = ingredients.find(ing => ing._id === ingredientId);
    return ingredient?.unit || '';
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-3 text-xs font-light text-gray-400 tracking-wider uppercase">ประเภท/เหตุผล</th>
            <th className="text-left py-3 text-xs font-light text-gray-400 tracking-wider uppercase">วัตถุดิบที่เกี่ยวข้อง</th>
            <th className="text-right py-3 text-xs font-light text-gray-400 tracking-wider uppercase">จำนวนรวม</th>
            <th className="text-right py-3 text-xs font-light text-gray-400 tracking-wider uppercase">วัน/เวลา</th>
          </tr>
        </thead>
        <tbody>
          {groupedMovements.map(({ key, movements }) => {
            const firstMovement = movements[0];
            const totalCost = movements.reduce((sum, m) => sum + (m.cost || 0), 0);
            const totalItems = movements.length;

            return (
              <tr key={key} className="border-b border-gray-50 hover:bg-gray-25 transition-colors">
                <td className="py-4">
                  <div>
                    <div className="font-light text-black tracking-wide">
                      {firstMovement.type === 'purchase' && '🛒 ซื้อเข้า'}
                      {firstMovement.type === 'use' && '🍳 ใช้ไป'}
                      {firstMovement.type === 'waste' && '🗑️ สูญเสีย'}
                      {firstMovement.type === 'adjustment' && '⚖️ ปรับปรุง'}
                    </div>
                    {firstMovement.reason && (
                      <div className="text-xs font-light text-gray-500 mt-1">
                        {firstMovement.reason}
                      </div>
                    )}
                    {firstMovement.saleId && (
                      <div className="text-xs font-light text-blue-500 mt-1">
                        การขาย
                      </div>
                    )}
                  </div>
                </td>
                <td className="py-4">
                  <div className="space-y-1">
                    {movements.slice(0, 3).map((movement, idx) => (
                      <div key={idx} className="text-sm font-light text-gray-600">
                        {getIngredientName(movement.ingredientId)}: {Math.abs(movement.quantity)} {getIngredientUnit(movement.ingredientId)}
                      </div>
                    ))}
                    {movements.length > 3 && (
                      <div className="text-xs font-light text-gray-400">
                        และอีก {movements.length - 3} รายการ
                      </div>
                    )}
                  </div>
                </td>
                <td className="py-4 text-right">
                  <div className="font-light text-black">
                    {totalItems} รายการ
                  </div>
                  {totalCost > 0 && (
                    <div className="text-xs font-light text-gray-400">
                      ฿{totalCost.toLocaleString()}
                    </div>
                  )}
                </td>
                <td className="py-4 text-right">
                  <div className="text-sm font-light text-gray-600">
                    {new Date(firstMovement.createdAt).toLocaleDateString('th-TH', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Stock Management Modal Component
function StockManagementModal({ ingredient, onClose, onSuccess }: {
  ingredient: Ingredient;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    type: 'purchase' as 'purchase' | 'use' | 'waste' | 'adjustment',
    quantity: '',
    cost: '',
    reason: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/stock-movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredientId: ingredient._id,
          ...formData,
          quantity: parseFloat(formData.quantity),
          cost: formData.cost ? parseFloat(formData.cost) : undefined
        })
      });

      if (response.ok) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error recording stock movement:', error);
    } finally {
      setLoading(false);
    }
  };

  const actions: ModalActionButton[] = [
    {
      label: 'ยกเลิก',
      onClick: onClose,
      variant: 'secondary',
      disabled: loading
    },
    {
      label: loading ? 'กำลังบันทึก...' : 'บันทึก',
      onClick: () => {
        const form = document.querySelector('form');
        if (form) {
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }
      },
      variant: 'primary',
      disabled: loading || !formData.quantity,
      loading: loading
    }
  ];

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`จัดการสต็อก: ${ingredient.name}`}
      size="md"
      actions={actions}
    >
      <div className="p-8 space-y-6">
        <div className="border-b border-gray-100 pb-4">
          <div className="text-sm font-light text-gray-600">
            สต็อกปัจจุบัน: {ingredient.stock} {ingredient.unit}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">
              ประเภท
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              className="w-full border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black focus:outline-none"
            >
              <option value="purchase">ซื้อเข้า</option>
              <option value="use">ใช้ไป</option>
              <option value="waste">สูญเสีย</option>
              <option value="adjustment">ปรับปรุง</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">
              จำนวน
            </label>
            <Input
              type="number"
              step="0.01"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              className="border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black"
              required
            />
          </div>

          {formData.type === 'purchase' && (
            <div>
              <label className="block text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">
                ต้นทุน (บาท)
              </label>
              <Input
                type="number"
                step="0.01"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                className="border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">
              เหตุผล
            </label>
            <Input
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="เหตุผลของการเคลื่อนไหวสต็อก"
              className="border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black"
            />
          </div>
        </form>
      </div>
    </Modal>
  );
}