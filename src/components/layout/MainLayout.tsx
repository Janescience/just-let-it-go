'use client';

import React, { ReactNode } from 'react';
import { Header } from './Header';
import { BottomNavigation } from './BottomNavigation';
import { cn } from '@/utils/cn';

interface MainLayoutProps {
  children: ReactNode;
  title: string;
  brandName?: string;
  brandLogo?: string;
  showBottomNav?: boolean;
}

export function MainLayout({
  children,
  title,
  brandName,
  brandLogo,
  showBottomNav = true
}: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title={title}
      />

      <main className={cn(
        'mx-auto max-w-7xl px-4 tablet:px-6 laptop:px-8',
        showBottomNav ? 'pb-24' : 'pb-4'
      )}>
        {children}
      </main>

      {showBottomNav && <BottomNavigation />}
    </div>
  );
}