'use client';

import React from 'react';
import {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonGrid,
  SkeletonButton
} from '@/components/ui';
import { Header } from '@/components/layout/Header';

export function SalesLoading() {
  return (
    <div className="min-h-screen bg-gray-25 pb-20">
      <Header title="ขายสินค้า" />

      {/* Booth Info Skeleton */}
      <div className="bg-white border-b border-gray-100 p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="w-5 h-5" />
              <Skeleton className="w-48 h-6" />
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Skeleton className="w-4 h-4" />
                <Skeleton className="w-24 h-4" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="w-4 h-4" />
                <Skeleton className="w-32 h-4" />
              </div>
            </div>
          </div>
          <div className="text-right space-y-2">
            <Skeleton className="w-16 h-4" />
            <Skeleton className="w-24 h-8" />
          </div>
        </div>
      </div>

      {/* Tab Navigation Skeleton */}
      <div className="bg-white border-b border-gray-100 px-6">
        <div className="flex space-x-8">
          <Skeleton className="w-16 h-12" />
          <Skeleton className="w-20 h-12" />
          <Skeleton className="w-18 h-12" />
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="p-6">
        <SaleTabLoading />
      </div>
    </div>
  );
}

export function SaleTabLoading() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-300px)]">
      {/* Menu Items Grid */}
      <div className="lg:col-span-2 space-y-4 overflow-hidden">
        {/* Search Bar */}
        <div className="flex gap-4">
          <Skeleton className="flex-1 h-12" />
          <SkeletonButton width="120px" />
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4 space-y-3">
              <Skeleton className="w-full h-32" rounded="lg" />
              <div className="space-y-2">
                <Skeleton className="w-3/4 h-5" />
                <Skeleton className="w-1/2 h-4" />
                <div className="flex justify-between items-center">
                  <Skeleton className="w-16 h-6" />
                  <SkeletonButton width="80px" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cart Sidebar */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-lg border border-gray-200 h-full">
          <div className="p-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <Skeleton className="w-24 h-6" />
              <Skeleton className="w-8 h-6" />
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* Cart Items */}
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                <div className="flex-1 space-y-2">
                  <Skeleton className="w-3/4 h-4" />
                  <Skeleton className="w-1/2 h-3" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="w-8 h-8" />
                  <Skeleton className="w-6 h-4" />
                  <Skeleton className="w-8 h-8" />
                </div>
              </div>
            ))}

            {/* Total */}
            <div className="border-t border-gray-200 pt-4 space-y-3">
              <div className="flex justify-between">
                <Skeleton className="w-16 h-4" />
                <Skeleton className="w-20 h-4" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="w-20 h-6" />
                <Skeleton className="w-24 h-6" />
              </div>
            </div>

            {/* Buttons */}
            <div className="space-y-2">
              <SkeletonButton className="h-12" />
              <SkeletonButton className="h-10" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SalesHistoryLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Date Picker */}
      <div className="flex justify-between items-center">
        <Skeleton className="w-32 h-6" />
        <Skeleton className="w-40 h-10" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="grid grid-cols-5 gap-4">
            <Skeleton className="h-5" />
            <Skeleton className="h-5" />
            <Skeleton className="h-5" />
            <Skeleton className="h-5" />
            <Skeleton className="h-5" />
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="p-4">
              <div className="grid grid-cols-5 gap-4">
                <Skeleton className="h-4" />
                <Skeleton className="h-4" />
                <Skeleton className="h-4" />
                <Skeleton className="h-4" />
                <Skeleton className="h-4" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center">
        <SkeletonButton width="80px" />
        <Skeleton className="w-24 h-4" />
        <SkeletonButton width="80px" />
      </div>
    </div>
  );
}

export function SalesSummaryLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Date Picker */}
      <div className="flex justify-between items-center">
        <Skeleton className="w-32 h-6" />
        <Skeleton className="w-40 h-10" />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
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
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <Skeleton className="w-32 h-6" />
          <Skeleton className="w-full h-64" />
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <Skeleton className="w-32 h-6" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex justify-between items-center">
                <Skeleton className="w-24 h-4" />
                <Skeleton className="w-16 h-4" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}