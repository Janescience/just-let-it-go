'use client';

import React, { useState, useEffect } from 'react';
import { Package, Plus, Settings, Archive } from 'lucide-react';
import { Button } from '@/components/ui';
import { EquipmentTemplate, EquipmentSet } from '@/types';
import { EquipmentTemplatesTab } from './components/EquipmentTemplatesTab';
import { EquipmentInventoryTab } from './components/EquipmentInventoryTab';
import { EquipmentTemplateModal } from './components/EquipmentTemplateModal';
import { EquipmentSetModal } from './components/EquipmentSetModal';

export default function EquipmentPage() {
  const [activeTab, setActiveTab] = useState<'templates' | 'inventory'>('templates');
  const [templates, setTemplates] = useState<EquipmentTemplate[]>([]);
  const [equipmentSets, setEquipmentSets] = useState<EquipmentSet[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showSetModal, setShowSetModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EquipmentTemplate | null>(null);
  const [editingSet, setEditingSet] = useState<EquipmentSet | null>(null);
  const [selectedTemplateForSet, setSelectedTemplateForSet] = useState<EquipmentTemplate | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch equipment templates
      const templatesResponse = await fetch('/api/equipment/templates', {
        credentials: 'include'
      });
      if (templatesResponse.ok) {
        const templatesData = await templatesResponse.json();
        setTemplates(templatesData.templates || []);
      }

      // Fetch equipment sets
      const setsResponse = await fetch('/api/equipment/sets', {
        credentials: 'include'
      });
      if (setsResponse.ok) {
        const setsData = await setsResponse.json();
        console.log('Equipment sets data:', setsData.sets);
        setEquipmentSets(setsData.sets || []);
      }
    } catch (error) {
      console.error('Error fetching equipment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setShowTemplateModal(true);
  };

  const handleEditTemplate = (template: EquipmentTemplate) => {
    setEditingTemplate(template);
    setShowTemplateModal(true);
  };

  const handleCreateSet = (template?: EquipmentTemplate) => {
    setSelectedTemplateForSet(template || null);
    setEditingSet(null);
    setShowSetModal(true);
  };

  const handleEditSet = (set: EquipmentSet) => {
    setEditingSet(set);
    setSelectedTemplateForSet(null);
    setShowSetModal(true);
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('คุณแน่ใจที่จะลบแม่แบบอุปกรณ์นี้?')) return;

    try {
      const response = await fetch(`/api/equipment/templates/${templateId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        fetchData();
      } else {
        alert('เกิดข้อผิดพลาดในการลบแม่แบบ');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('เกิดข้อผิดพลาดในการลบแม่แบบ');
    }
  };

  const handleDeleteSet = async (setId: string) => {
    if (!confirm('คุณแน่ใจที่จะลบชุดอุปกรณ์นี้?')) return;

    try {
      const response = await fetch(`/api/equipment/sets/${setId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        fetchData();
      } else {
        alert('เกิดข้อผิดพลาดในการลบชุดอุปกรณ์');
      }
    } catch (error) {
      console.error('Error deleting equipment set:', error);
      alert('เกิดข้อผิดพลาดในการลบชุดอุปกรณ์');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="text-center py-12">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-600 text-lg">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8" />
              <h1 className="text-3xl font-bold text-black">จัดการอุปกรณ์</h1>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <div className="flex text-2xl">
            <button
              onClick={() => setActiveTab('templates')}
              className={`flex-1 py-4 px-6 transition-colors ${
                activeTab === 'templates'
                  ? 'text-black border-b-2 border-black bg-white'
                  : 'text-gray-500 hover:text-gray-800 bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Settings className="w-5 h-5" />
                แม่แบบอุปกรณ์
              </div>
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex-1 py-4 px-6 transition-colors ${
                activeTab === 'inventory'
                  ? 'text-black border-b-2 border-black bg-white'
                  : 'text-gray-500 hover:text-gray-800 bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Archive className="w-5 h-5" />
                คลังอุปกรณ์
              </div>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white border border-gray-200 min-h-96">
          {activeTab === 'templates' ? (
            <EquipmentTemplatesTab
              templates={templates}
              onCreateTemplate={handleCreateTemplate}
              onEditTemplate={handleEditTemplate}
              onDeleteTemplate={handleDeleteTemplate}
              onCreateSet={handleCreateSet}
            />
          ) : (
            <EquipmentInventoryTab
              equipmentSets={equipmentSets}
              templates={templates}
              onCreateSet={handleCreateSet}
              onEditSet={handleEditSet}
              onDeleteSet={handleDeleteSet}
            />
          )}
        </div>

        {/* Modals */}
        {showTemplateModal && (
          <EquipmentTemplateModal
            template={editingTemplate}
            onClose={() => setShowTemplateModal(false)}
            onSave={() => {
              setShowTemplateModal(false);
              fetchData();
            }}
          />
        )}

        {showSetModal && (
          <EquipmentSetModal
            equipmentSet={editingSet}
            selectedTemplate={selectedTemplateForSet}
            templates={templates}
            onClose={() => setShowSetModal(false)}
            onSave={() => {
              setShowSetModal(false);
              fetchData();
            }}
          />
        )}
      </div>
    </div>
  );
}