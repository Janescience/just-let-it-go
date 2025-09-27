'use client';

import React from 'react';
import {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonButton
} from '@/components/ui';
import { Header } from '@/components/layout/Header';

export function BoothLoading() {
  return (
    <div className="min-h-screen bg-gray-25">
      <Header title="จัดการหน้าร้าน" />

      <div className="flex">
        {/* Main Content */}
        <div className="flex-1 p-6">
          {/* Header Actions */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <Skeleton className="w-32 h-6" />
              <Skeleton className="w-24 h-4" />
            </div>
            <div className="flex gap-3">
              <SkeletonButton width="120px" />
              <SkeletonButton width="100px" />
              <SkeletonButton width="140px" />
            </div>
          </div>

          {/* Booth Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <BoothCardLoading key={i} />
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-96 border-l border-gray-200 bg-white">
          <SalesActivitySidebarLoading />
        </div>
      </div>
    </div>
  );
}

export function BoothCardLoading() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex justify-between items-start">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="w-5 h-5" />
              <Skeleton className="w-32 h-6" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="w-4 h-4" />
              <Skeleton className="w-24 h-4" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="w-8 h-8" />
            <Skeleton className="w-8 h-8" />
            <Skeleton className="w-8 h-8" />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-6 pb-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="w-16 h-4" />
            <Skeleton className="w-20 h-6" />
          </div>
          <div className="space-y-2">
            <Skeleton className="w-12 h-4" />
            <Skeleton className="w-16 h-6" />
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <Skeleton className="w-24 h-4" />
            <Skeleton className="w-12 h-4" />
          </div>
          <Skeleton className="w-full h-2" rounded="full" />
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Skeleton className="w-20 h-3" />
            <Skeleton className="w-16 h-4" />
          </div>
          <div className="space-y-1">
            <Skeleton className="w-16 h-3" />
            <Skeleton className="w-12 h-4" />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
        <div className="flex justify-between items-center">
          <Skeleton className="w-20 h-4" />
          <SkeletonButton width="80px" />
        </div>
      </div>
    </div>
  );
}

export function SalesActivitySidebarLoading() {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <Skeleton className="w-32 h-6" />
          <div className="flex items-center gap-2">
            <Skeleton className="w-4 h-4" />
            <Skeleton className="w-6 h-4" />
          </div>
        </div>
      </div>

      {/* Activity List */}
      <div className="flex-1 p-4 space-y-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="p-3 border border-gray-200 rounded-lg space-y-3">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <Skeleton className="w-24 h-4" />
                <Skeleton className="w-16 h-3" />
              </div>
              <Skeleton className="w-16 h-5" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="w-20 h-3" />
                <Skeleton className="w-8 h-3" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="w-24 h-3" />
                <Skeleton className="w-10 h-3" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <SkeletonButton className="w-full" />
      </div>
    </div>
  );
}