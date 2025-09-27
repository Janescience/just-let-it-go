'use client';

import React from 'react';
import {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonTable,
  SkeletonButton,
  SkeletonGrid
} from './Skeleton';

interface PageLoadingProps {
  title: string;
  layout?: 'table' | 'grid' | 'cards' | 'list' | 'dashboard';
  children?: React.ReactNode;
}

export function PageLoading({ title, layout = 'grid', children }: PageLoadingProps) {
  if (children) {
    return (
      <div className="min-h-screen bg-white">
        {/* Header */}
      <div className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-thin text-black tracking-wider">{title}</h1>
              <p className="text-sm font-light text-gray-500 mt-1">กำลังโหลด...</p>
            </div>
          </div>
        </div>
      </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-thin text-black tracking-wider">{title}</h1>
              <p className="text-sm font-light text-gray-500 mt-1">กำลังโหลด...</p>
            </div>
          </div>
        </div>
      </div>
      <div className="p-6">
        {/* Header Actions */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Skeleton className="w-48 h-10" />
            <SkeletonButton width="100px" />
          </div>
          <SkeletonButton width="120px" />
        </div>

        {/* Content based on layout */}
        {layout === 'table' && <SkeletonTable rows={8} columns={5} />}
        {layout === 'grid' && <SkeletonGrid items={6} columns={3} />}
        {layout === 'cards' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}
        {layout === 'list' && (
          <div className="space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <Skeleton className="w-12 h-12" rounded="full" />
                    <div className="space-y-2">
                      <Skeleton className="w-32 h-5" />
                      <Skeleton className="w-24 h-4" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <SkeletonButton width="80px" />
                    <Skeleton className="w-8 h-8" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {layout === 'dashboard' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <Skeleton className="w-6 h-6" />
                    <Skeleton className="w-16 h-4" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="w-20 h-8" />
                    <Skeleton className="w-24 h-4" />
                  </div>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
                <Skeleton className="w-32 h-6" />
                <Skeleton className="w-full h-64" />
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
                <Skeleton className="w-32 h-6" />
                <SkeletonTable rows={5} columns={2} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Specific loading layouts for common page types
export function TablePageLoading({ title }: { title: string }) {
  return <PageLoading title={title} layout="table" />;
}

export function GridPageLoading({ title }: { title: string }) {
  return <PageLoading title={title} layout="grid" />;
}

export function DashboardPageLoading({ title }: { title: string }) {
  return <PageLoading title={title} layout="dashboard" />;
}

export function ListPageLoading({ title }: { title: string }) {
  return <PageLoading title={title} layout="list" />;
}