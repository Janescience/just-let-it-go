'use client';

import React from 'react';
import {
  Skeleton,
  SkeletonButton
} from '@/components/ui';

export function MenuLoading() {
  return (
    <div className="min-h-screen mb-5 bg-white">
      {/* Header */}
      <div className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-thin text-black tracking-wider">เมนู</h1>
              <p className="text-sm font-light text-gray-500 mt-1">กำลังโหลด...</p>
            </div>
          </div>
        </div>
      </div>
      <div className="p-6 tablet:p-8 pb-20 max-w-7xl mx-auto">
        {/* Header Actions */}
        <div className="flex flex-row items-center justify-between gap-4 mb-8">
          <div className="flex-1 space-y-2">
            <Skeleton className="w-16 h-4" />
            <Skeleton className="w-full h-12" />
          </div>
          <SkeletonButton width="120px" />
        </div>

        {/* Menu Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 9 }).map((_, i) => (
            <MenuItemCardLoading key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function MenuItemCardLoading() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
      {/* Image */}
      <Skeleton className="w-full h-48" />

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Title */}
        <Skeleton className="w-3/4 h-6" />

        {/* Description */}
        <Skeleton className="w-full h-4" />
        <Skeleton className="w-2/3 h-4" />

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="w-12 h-3" />
            <Skeleton className="w-16 h-5" />
          </div>
          <div className="space-y-2">
            <Skeleton className="w-16 h-3" />
            <Skeleton className="w-20 h-5" />
          </div>
        </div>

        {/* Ingredients */}
        <div className="space-y-2">
          <Skeleton className="w-20 h-4" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="w-16 h-6" rounded="full" />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <SkeletonButton className="flex-1" />
          <Skeleton className="w-10 h-10" />
          <Skeleton className="w-10 h-10" />
        </div>
      </div>
    </div>
  );
}