'use client';

import React, { useState } from 'react';
import { LogOut, CircleUserRound, Building2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useBrand } from '@/hooks/useBrand';
import { Brand } from '@/types';
import Link from 'next/link';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showNotifications?: boolean;
  children?: React.ReactNode;
}

export function Header({
  title,
  subtitle,
  showNotifications = true,
  children
}: HeaderProps) {
  const { user, logout } = useAuth();
  const { brand, loading, error } = useBrand();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <>
      {/* Header */}
      <div className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img
                src={brand?.logo || "https://api.dicebear.com/9.x/notionists/svg?seed=justletitgo&flip=true&scale=100"}
                alt="Brand Logo"
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover"
              />
              <div>
                <h1 className="text-xl sm:text-2xl font-thin text-black tracking-wider">{title}</h1>
                <p className="text-sm font-light text-gray-500 mt-1">{subtitle || brand?.name || 'ขายไปเหอะ'}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {children}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 sm:space-x-3 px-2 sm:px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {loading ? (
                    <>
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-300 rounded-full animate-pulse"></div>
                      <div className="hidden sm:block w-20 h-4 bg-gray-300 rounded animate-pulse"></div>
                    </>
                  ) : error ? (
                    <>
                      <CircleUserRound className="w-5 h-5 sm:w-6 sm:h-6" />
                    </>
                  ) : (
                    <>
                      <CircleUserRound className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                      <span className="hidden sm:block text-sm font-light text-black">{user?.name}</span>
                    </>
                  )}
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    <div className="px-3 py-2">
                      <p className="text-sm font-light text-black">{user?.name}</p>
                      <p className="text-xs font-light text-gray-500">{user?.role === 'admin' ? 'ผู้ดูแลระบบ' : 'พนักงานขาย'}</p>
                    </div>
                    <hr className="border-gray-100" />
                    {user?.role === 'admin' && (
                      <>
                        <Link
                          href="/brand"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center w-full px-3 py-2 text-xs font-light text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <Building2 className="w-4 h-4 mr-2" />
                          จัดการแบรนด์
                        </Link>
                        <hr className="border-gray-100" />
                      </>
                    )}
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                      }}
                      className="flex items-center w-full px-3 py-2 text-xs font-light text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      ออกจากระบบ
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay to close menu */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </>
  );
}