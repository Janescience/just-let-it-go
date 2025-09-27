import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Modal, Input, ModalActionButton } from '@/components/ui';
import { Booth } from '@/types';

interface BoothDeleteModalProps {
  booth: Booth;
  onClose: () => void;
  onSuccess: () => void;
}

export function BoothDeleteModal({ booth, onClose, onSuccess }: BoothDeleteModalProps) {
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const handleDeleteBooth = async () => {
    if (deleteConfirmText !== booth.name) return;

    setDeleteLoading(true);
    try {
      const response = await fetch(`/api/booths/${booth._id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        const data = await response.json();
        console.error('Error deleting booth:', data.error);
      }
    } catch (error) {
      console.error('Error deleting booth:', error);
    } finally {
      setDeleteLoading(false);
    }
  };

  const actions: ModalActionButton[] = [
    {
      label: 'ยกเลิก',
      onClick: onClose,
      variant: 'secondary',
      disabled: deleteLoading
    },
    {
      label: deleteLoading ? 'กำลังลบ...' : 'ลบหน้าร้าน',
      onClick: handleDeleteBooth,
      variant: 'danger',
      disabled: deleteLoading || deleteConfirmText !== booth.name,
      icon: deleteLoading ? undefined : Trash2,
      loading: deleteLoading
    }
  ];

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`ลบหน้าร้าน "${booth.name}"`}
      size="sm"
      actions={actions}
    >
      <div className="p-6">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-6 h-6 text-red-600" />
        </div>

        <div className="text-center space-y-3 mb-6">
          <p className="text-red-600 font-light text-sm">⚠️ การดำเนินการนี้ไม่สามารถยกเลิกได้!</p>
          <div className="text-sm text-gray-600 bg-gray-50 border border-gray-200 p-3 rounded-lg text-left">
            <p className="font-light mb-2 text-gray-700">การลบหน้าร้านจะส่งผลต่อ:</p>
            <div className="space-y-1 font-light text-gray-600">
              <div>• บัญชี Staff ที่เชื่อมกับหน้าร้านนี้จะถูกลบ</div>
              <div>• ข้อมูลพนักงานทั้งหมดจะถูกลบ</div>
              <div>• การกำหนดเมนูของหน้าร้านจะถูกลบ</div>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-light text-gray-600 mb-2">
            พิมพ์ "{booth.name}" เพื่อยืนยัน:
          </label>
          <Input
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder={booth.name}
            className="text-center"
          />
        </div>
      </div>
    </Modal>
  );
}