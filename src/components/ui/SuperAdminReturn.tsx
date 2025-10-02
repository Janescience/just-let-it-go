'use client';

import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function SuperAdminReturn() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Only show when currentBrandId is set (indicates super admin switched to brand)
  if (!user?.currentBrandId) {
    return null;
  }

  const handleReturn = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/super-admin/return', {
        method: 'POST',
      });

      if (response.ok) {
        window.location.href = '/super-admin';
      } else {
        console.error('Failed to return to super admin');
      }
    } catch (error) {
      console.error('Error returning to super admin:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleReturn}
      disabled={loading}
      className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 bg-black text-white text-sm hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <ArrowLeft className="w-4 h-4" />
      {loading ? 'กำลังดำเนินการ...' : 'กลับ Super Admin'}
    </button>
  );
}