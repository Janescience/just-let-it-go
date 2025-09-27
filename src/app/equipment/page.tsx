'use client';

import React, { useState, useEffect } from 'react';
import { Package, History } from 'lucide-react';
import { GridPageLoading } from '@/components/ui';
import { Equipment } from '@/types';
import { EquipmentListTab } from './components/EquipmentListTab';
import { EquipmentHistoryTab } from './components/EquipmentHistoryTab';
import { EquipmentModal } from './components/EquipmentModal';

export default function EquipmentPage() {
  const [activeTab, setActiveTab] = useState<'equipment' | 'history'>('equipment');
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [copyFromEquipment, setCopyFromEquipment] = useState<Equipment | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/equipment', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setEquipment(data.equipment || []);
      }
    } catch (error) {
      console.error('Error fetching equipment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEquipment = () => {
    setEditingEquipment(null);
    setCopyFromEquipment(null);
    setShowModal(true);
  };

  const handleEditEquipment = (equipment: Equipment) => {
    setEditingEquipment(equipment);
    setCopyFromEquipment(null);
    setShowModal(true);
  };

  const handleCopyEquipment = (equipment: Equipment) => {
    setEditingEquipment(null);
    setCopyFromEquipment(equipment);
    setShowModal(true);
  };

  const handleDeleteEquipment = async (equipmentId: string) => {
    if (!confirm('คุณแน่ใจที่จะลบอุปกรณ์นี้? ประวัติการใช้งานจะถูกลบด้วย')) return;

    try {
      const response = await fetch(`/api/equipment/${equipmentId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        fetchData();
      } else {
        alert('เกิดข้อผิดพลาดในการลบอุปกรณ์');
      }
    } catch (error) {
      console.error('Error deleting equipment:', error);
      alert('เกิดข้อผิดพลาดในการลบอุปกรณ์');
    }
  };

  if (loading) {
    return <GridPageLoading title="จัดการอุปกรณ์" />;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-thin text-black tracking-wider">อุปกรณ์</h1>
              <p className="text-sm font-light text-gray-500 mt-1">จัดการอุปกรณ์และติดตามการใช้งาน</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-100 mb-12">
          <button
            onClick={() => setActiveTab('equipment')}
            className={`px-6 py-4 text-sm font-light tracking-wide transition-all duration-200 ${
              activeTab === 'equipment'
                ? 'text-black border-b-2 border-black'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            อุปกรณ์
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-4 text-sm font-light tracking-wide transition-all duration-200 ${
              activeTab === 'history'
                ? 'text-black border-b-2 border-black'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            ประวัติการใช้งาน
          </button>
        </div>

        {/* Tab Content */}
        <div className="min-h-96">
          {activeTab === 'equipment' ? (
            <EquipmentListTab
              equipment={equipment}
              onCreateEquipment={handleCreateEquipment}
              onEditEquipment={handleEditEquipment}
              onDeleteEquipment={handleDeleteEquipment}
              onCopyEquipment={handleCopyEquipment}
            />
          ) : (
            <EquipmentHistoryTab
              equipment={equipment}
            />
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <EquipmentModal
            equipment={editingEquipment}
            copyFrom={copyFromEquipment}
            onClose={() => setShowModal(false)}
            onSave={() => {
              setShowModal(false);
              fetchData();
            }}
          />
        )}
      </div>
    </div>
  );
}