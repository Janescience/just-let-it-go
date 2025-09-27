'use client';

import React, { useState } from 'react';
import { LogOut, CircleUserRound } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Brand } from '@/types';

interface SalesBottomBarProps {
  brand: Brand | null;
}

export function SalesBottomBar({ brand }: SalesBottomBarProps) {
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = () => {
    setShowUserMenu(false);
    logout();
  };

  return (
    <>
      {/* Overlay to close menu */}
      {showUserMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
      )}

      {/* User Menu Dropdown */}
      {showUserMenu && (
        <div className="fixed bottom-20 right-4 bg-white border border-gray-200 py-2 z-50 w-48">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="font-light text-black tracking-wide">{user?.name}</p>
            <p className="text-xs font-light text-gray-400 tracking-wider uppercase">
              {user?.role === 'admin' ? 'ผู้ดูแลระบบ' : 'พนักงานขาย'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-3 text-sm font-light text-gray-600 hover:bg-gray-50 hover:text-red-600 transition-colors duration-200"
          >
            <LogOut className="w-4 h-4 mr-3" />
            ออกจากระบบ
          </button>
        </div>
      )}

      {/* Bottom Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left: System Logo & Name */}
            <div className="flex items-center gap-3">
              <img
                src="https://api.dicebear.com/9.x/notionists/svg?seed=justletitgo&flip=true&scale=100"
                alt="System Logo"
                className="w-8 h-8 rounded-full object-cover"
              />
              <div>
                <div className="text-sm font-light text-black tracking-wide">ขายไปเหอะ</div>
                <div className="text-xs font-light text-gray-400">Point of Sale System</div>
              </div>
            </div>

            {/* Right: User Menu */}
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors duration-200"
            >
              <CircleUserRound className="w-6 h-6 text-gray-400" />
              <div className="text-left">
                <div className="text-sm font-light text-black tracking-wide">
                  {user?.name}
                </div>
                <div className="text-xs font-light text-gray-400">
                  แตะเพื่อออกจากระบบ
                </div>
              </div>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}