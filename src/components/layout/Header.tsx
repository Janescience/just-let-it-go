'use client';

import React, { useState } from 'react';
import { LogOut, CircleUserRound, Building2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useBrand } from '@/hooks/useBrand';
import { Brand } from '@/types';
import Link from 'next/link';

interface HeaderProps {
  title: string;
  showNotifications?: boolean;
}

export function Header({
  title,
  showNotifications = true
}: HeaderProps) {
  const { user, logout } = useAuth();
  const { brand, loading, error } = useBrand();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-3 tablet:px-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center ">
          <img
            src="https://api.dicebear.com/9.x/notionists/svg?seed=justletitgo&flip=true&scale=100"
            alt="Logo"
            className="w-12  object-cover"
          />
          <div>
            <div className="text-xl font-light text-black">ขายไปเหอะ</div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {loading ? (
                <>
                  <div className="w-8 h-8 bg-gray-300 rounded-full animate-pulse"></div>
                  <div className="w-20 h-4 bg-gray-300 rounded animate-pulse"></div>
                </>
              ) : error ? (
                <>
                  <CircleUserRound className="w-6 h-6 " />
                </>
              ) : (
                <>
                  <img
                    src={brand?.logo || "https://api.dicebear.com/9.x/notionists/svg?seed=justletitgo&flip=true&scale=100"}
                    alt="Brand Logo"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <span className="text-lg  text-black">{brand?.name || 'Shoots B-Hop'}</span>
                </>
              )}
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <div className="px-3 py-2">
                  <p className="text-lg  text-black">{user?.name}</p>
                  <p className=" text-gray-500">{user?.role === 'admin' ? 'ผู้ดูแลระบบ' : 'พนักงานขาย'}</p>
                </div>
                <hr className="border-gray-100" />
                {user?.role === 'admin' && (
                  <>
                    <Link
                      href="/brand"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center w-full px-3 py-2 text-sm font-light text-gray-700 hover:bg-gray-50 transition-colors"
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
                  className="flex items-center justify-center w-full px-3 py-2 text-sm font-light text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  ออกจากระบบ
                </button>
              </div>
            )}
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
    </header>
  );
}