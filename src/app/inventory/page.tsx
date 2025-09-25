'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Package, AlertTriangle, Search, Edit, Trash2, History } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
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

  const filteredIngredients = ingredients.filter(ingredient =>
    ingredient.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const lowStockIngredients = ingredients.filter(ingredient =>
    ingredient.stock <= ingredient.minimumStock
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="คลังสินค้า" />
        <div className="p-4 tablet:p-6">
          <div className="text-center py-8">กำลังโหลด...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="คลังสินค้า" />

      <div className="p-4 tablet:p-6 pb-20">
        {/* Header Actions */}
        <div className="flex flex-row items-center justify-between gap-4 mb-6">
          <Input
            type="text"
            placeholder="ค้นหาวัตถุดิบ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={Search}
            className="flex-1 min-w-0"
          />
          <div className="flex gap-2 ml-4">
            <Button
              variant={view === 'list' ? 'primary' : 'secondary'}
              onClick={() => setView('list')}
              icon={Package}
              size="sm"
            >
              วัตถุดิบ
            </Button>
            <Button
              variant={view === 'movements' ? 'primary' : 'secondary'}
              onClick={() => setView('movements')}
              icon={History}
              size="sm"
            >
              ประวัติ
            </Button>
            <Button
              variant="primary"
              onClick={() => setShowAddModal(true)}
              icon={Plus}
              size="sm"
            >
              วัตถุดิบ
            </Button>
          </div>
        </div>

        {/* Low Stock Alert */}
        {lowStockIngredients.length > 0 && view === 'list' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-red-800 mb-2">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-light">วัตถุดิบใกล้หมด ({lowStockIngredients.length} รายการ)</span>
            </div>
            <div className="grid gap-2">
              {lowStockIngredients.map(ingredient => (
                <div key={ingredient._id} className="text-lg text-red-700">
                  {ingredient.name}: เหลือ {ingredient.stock} {ingredient.unit} (ขั้นต่ำ {ingredient.minimumStock})
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'list' ? (
          /* Ingredients List */
          <div className="grid gap-4">
            {filteredIngredients.map(ingredient => (
              <div key={ingredient._id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-light text-lg text-gray-900 truncate">{ingredient.name}</h3>
                  <div className="text-lg text-gray-500 mt-1 flex flex-wrap gap-4">
                    <span>หน่วย: {ingredient.unit}</span>
                    <span>ต้นทุน: ฿{ingredient.costPerUnit.toLocaleString()} ต่อ {ingredient.unit}</span>
                  </div>
                </div>
                <div className="text-right min-w-[90px]">
                  <div className={`text-lg font-light ${ingredient.stock <= ingredient.minimumStock ? 'text-red-600' : 'text-gray-900'}`}>
                    {Number(ingredient.stock).toFixed(2)} {ingredient.unit}
                  </div>
                  <div className=" text-gray-400">ขั้นต่ำ: {ingredient.minimumStock}</div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => { setSelectedIngredient(ingredient); setShowStockModal(true); }}
                    icon={Package}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => { setSelectedIngredient(ingredient); setShowEditModal(true); }}
                    icon={Edit}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Stock Movements List */
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-light text-gray-900">ประวัติการเคลื่อนไหวสต็อก</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {stockMovements.map(movement => (
                <div key={movement._id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-light text-gray-900">
                        {movement.type === 'purchase' && 'ซื้อเข้า'}
                        {movement.type === 'use' && 'ใช้ไป'}
                        {movement.type === 'waste' && 'สูญเสีย'}
                        {movement.type === 'adjustment' && 'ปรับปรุง'}
                      </div>
                      <div className="text-lg text-gray-500">
                        {movement.reason || 'ไม่มีเหตุผล'}
                      </div>
                    </div>
                    <div className="text-right min-w-[80px]">
                      <div className={`font-light ${movement.type === 'purchase' || movement.type === 'adjustment' ? 'text-green-600' : 'text-red-600'}`}>
                        {movement.type === 'purchase' || movement.type === 'adjustment' ? '+' : '-'}
                        {Math.abs(movement.quantity)}
                      </div>
                      {movement.cost && (
                        <div className=" text-gray-400">
                          ฿{movement.cost.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className=" text-gray-400 mt-2">
                    {new Date(movement.createdAt).toLocaleDateString('th-TH', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-light mb-4">เพิ่มวัตถุดิบใหม่</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="ชื่อวัตถุดิบ"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <Input
            label="หน่วย"
            value={formData.unit}
            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            placeholder="กก., ลิตร, ชิ้น"
            required
          />

          <Input
            label="ต้นทุนต่อหน่วย (บาท)"
            type="number"
            step="0.01"
            value={formData.costPerUnit}
            onChange={(e) => setFormData({ ...formData, costPerUnit: e.target.value })}
            required
          />

          <Input
            label="จำนวนในสต็อก"
            type="number"
            step="0.01"
            value={formData.stock}
            onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
            required
          />

          <Input
            label="สต็อกขั้นต่ำ"
            type="number"
            step="0.01"
            value={formData.minimumStock}
            onChange={(e) => setFormData({ ...formData, minimumStock: e.target.value })}
            required
          />

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              ยกเลิก
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              disabled={loading}
            >
              {loading ? 'กำลังบันทึก...' : 'บันทึก'}
            </Button>
          </div>
        </form>
      </div>
    </div>
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-light mb-4">แก้ไขวัตถุดิบ</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="ชื่อวัตถุดิบ"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <Input
            label="หน่วย"
            value={formData.unit}
            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            placeholder="กก., ลิตร, ชิ้น"
            required
          />

          <Input
            label="ต้นทุนต่อหน่วย (บาท)"
            type="number"
            step="0.01"
            value={formData.costPerUnit}
            onChange={(e) => setFormData({ ...formData, costPerUnit: e.target.value })}
            required
          />

          <Input
            label="สต็อกขั้นต่ำ"
            type="number"
            step="0.01"
            value={formData.minimumStock}
            onChange={(e) => setFormData({ ...formData, minimumStock: e.target.value })}
            required
          />

          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-lg text-gray-600">
              <div>สต็อกปัจจุบัน: {ingredient.stock} {ingredient.unit}</div>
              <div className=" text-gray-500 mt-1">
                หมายเหตุ: การแก้ไขจะไม่เปลี่ยนแปลงจำนวนสต็อกปัจจุบัน
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              ยกเลิก
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              disabled={loading}
            >
              {loading ? 'กำลังบันทึก...' : 'บันทึก'}
            </Button>
          </div>
        </form>
      </div>
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-light mb-4">จัดการสต็อก: {ingredient.name}</h3>
        <div className="text-lg text-gray-600 mb-4">
          สต็อกปัจจุบัน: {ingredient.stock} {ingredient.unit}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-lg font-light text-gray-700 mb-2">
              ประเภท
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option value="purchase">ซื้อเข้า</option>
              <option value="use">ใช้ไป</option>
              <option value="waste">สูญเสีย</option>
              <option value="adjustment">ปรับปรุง</option>
            </select>
          </div>

          <Input
            label="จำนวน"
            type="number"
            step="0.01"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
            required
          />

          {formData.type === 'purchase' && (
            <Input
              label="ต้นทุน (บาท)"
              type="number"
              step="0.01"
              value={formData.cost}
              onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
            />
          )}

          <Input
            label="เหตุผล"
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            placeholder="เหตุผลของการเคลื่อนไหวสต็อก"
          />

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              ยกเลิก
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              disabled={loading}
            >
              {loading ? 'กำลังบันทึก...' : 'บันทึก'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}