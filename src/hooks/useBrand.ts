'use client';

import { useState, useEffect } from 'react';
import { Brand } from '@/types';

interface UseBrandReturn {
  brand: Brand | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useBrand(): UseBrandReturn {
  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBrand = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/brands', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch brand data');
      }

      const data = await response.json();
      setBrand(data.brand);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setBrand(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrand();
  }, []);

  return {
    brand,
    loading,
    error,
    refetch: fetchBrand,
  };
}