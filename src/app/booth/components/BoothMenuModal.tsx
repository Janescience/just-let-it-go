import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { Modal } from '@/components/ui';
import { Booth, MenuItem } from '@/types';

interface MenuItemWithSelection extends MenuItem {
  selected: boolean;
}

interface BoothMenuModalProps {
  booth: Booth;
  onClose: () => void;
  onSuccess: () => void;
}

export function BoothMenuModal({ booth, onClose, onSuccess }: BoothMenuModalProps) {
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuSubmitting, setMenuSubmitting] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItemWithSelection[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchBoothMenu();
  }, [booth]);

  const fetchBoothMenu = async () => {
    setMenuLoading(true);
    try {
      const response = await fetch(`/api/booths/${booth._id}/menu`);
      if (response.ok) {
        const data = await response.json();

        const boothMenuItems = data.booth?.menuItems || [];
        const allMenuItems = data.allMenuItems || [];

        const menuItemsWithSelection = allMenuItems.map((item: MenuItem) => ({
          ...item,
          selected: boothMenuItems.some((boothItem: any) => boothItem._id === item._id)
        }));
        setMenuItems(menuItemsWithSelection);
      } else {
        const error = await response.json();
        console.error('Error fetching booth menu:', error);
      }
    } catch (error) {
      console.error('Error fetching booth menu:', error);
    } finally {
      setMenuLoading(false);
    }
  };

  const toggleMenuItem = (itemId: string) => {
    setMenuItems(prev =>
      prev.map(item =>
        item._id === itemId ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const handleMenuSubmit = async () => {
    setMenuSubmitting(true);
    try {
      const selectedMenuIds = menuItems
        .filter(item => item.selected)
        .map(item => item._id);

      const response = await fetch(`/api/booths/${booth._id}/menu`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          menuItemIds: selectedMenuIds
        })
      });

      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        const error = await response.json();
        console.error('Error updating booth menu:', error);
      }
    } catch (error) {
      console.error('Error updating booth menu:', error);
    } finally {
      setMenuSubmitting(false);
    }
  };

  const filteredMenuItems = menuItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`จัดการเมนู "${booth.name}"`}
      size="lg"
    >
      <div className="p-4 border-b border-gray-100">
        <p className="text-lg text-gray-600 mb-3">
          เลือกเมนูที่ต้องการขาย (เลือกแล้ว {menuItems.filter(item => item.selected).length} รายการ)
        </p>

        <div className="relative">
          <input
            placeholder="ค้นหาเมนู..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black focus:outline-none w-full px-3 py-2"
          />
        </div>
      </div>

      <div className="p-4 max-h-96 overflow-y-auto">
        {menuLoading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
                    <div className="h-3 bg-gray-100 rounded animate-pulse w-1/3"></div>
                  </div>
                  <div className="h-5 bg-gray-200 rounded animate-pulse w-12"></div>
                </div>
                <div className="space-y-1">
                  <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4"></div>
                  <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredMenuItems.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 text-lg">
              {searchTerm ? 'ไม่พบเมนูที่ค้นหา' : 'ยังไม่มีเมนูในระบบ'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredMenuItems.map((item) => (
              <div
                key={item._id}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  item.selected
                    ? 'border-black bg-gray-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => toggleMenuItem(item._id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                      item.selected
                        ? 'bg-black border-black'
                        : 'border-gray-300'
                    }`}>
                      {item.selected && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-lg font-light text-black tracking-wide">{item.name}</h4>
                      {item.description && (
                        <p className="font-light text-gray-600 mt-0.5 truncate">{item.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-lg font-light text-black ml-3">
                    ฿{item.price.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-100">
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            disabled={menuSubmitting}
            className="px-6 py-2 border border-gray-200 text-sm font-light text-black hover:bg-gray-50 transition-colors duration-200 tracking-wide disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleMenuSubmit}
            disabled={menuSubmitting || menuLoading}
            className="bg-black text-white hover:bg-gray-800 px-6 py-2 border border-gray-200 text-sm font-light transition-colors duration-200 tracking-wide disabled:opacity-50"
          >
            {menuSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </div>
    </Modal>
  );
}