'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthSession } from '@/types';

export function useAuth() {
  const [user, setUser] = useState<AuthSession['user'] | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return {
    user,
    loading,
    logout,
    isAdmin: user?.role === 'admin',
    isStaff: user?.role === 'staff',
    isSuperAdmin: user?.role === 'super_admin',
    refetch: checkAuth,
  };
}