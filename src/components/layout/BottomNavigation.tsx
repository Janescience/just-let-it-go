'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChartNoAxesCombined, Store, Beef, UtensilsCrossed, Hammer, Calculator, ChevronUp, Settings, LogOut, CircleUserRound, Building2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAuth } from '@/hooks/useAuth';
import { useBrand } from '@/hooks/useBrand';

interface NavigationItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href?: string;
  adminOnly?: boolean;
  isSubmenu?: boolean;
  submenuItems?: SubmenuItem[];
}

interface SubmenuItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
}

const navigationItems: NavigationItem[] = [
  {
    icon: ChartNoAxesCombined,
    label: '',
    href: '/',
    adminOnly: true,
  },
  {
    icon: Store,
    label: 'หน้าร้าน',
    href: '/booth',
    adminOnly: true,
  },
  {
    icon: Settings,
    label: 'dd',
    adminOnly: true,
    isSubmenu: true,
    submenuItems: [
      {
        icon: Beef,
        label: 'วัตถุดิบ',
        href: '/inventory',
      },
      {
        icon: UtensilsCrossed,
        label: 'เมนู',
        href: '/menu',
      },
      {
        icon: Hammer,
        label: 'อุปกรณ์',
        href: '/equipment',
      },
      {
        icon: Calculator,
        label: 'บัญชี',
        href: '/accounting',
      },
    ],
  },
];

export function BottomNavigation() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { brand, loading, error } = useBrand();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState<string | null>(null);
  const [submenuPosition, setSubmenuPosition] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    // Get user role from cookie or localStorage
    const checkUserRole = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setUserRole(data.user?.role || null);
        }
      } catch (error) {
        console.error('Error checking user role:', error);
        setUserRole(null);
      }
    };

    checkUserRole();
  }, [pathname]);

  // Don't show navigation on login/setup pages or for staff users
  const hiddenPages = ['/login', '/setup'];
  const shouldHide = hiddenPages.includes(pathname) || user?.role === 'staff';

  if (shouldHide) {
    return null;
  }

  // Filter navigation items based on user role
  const filteredNavigationItems = navigationItems.filter(item => {
    if (item.adminOnly && userRole !== 'admin') {
      return false;
    }
    return true;
  });

  // Don't render if no items to show
  if (filteredNavigationItems.length === 0) {
    return null;
  }

  const handleSubmenuToggle = (label: string, event: React.MouseEvent<HTMLButtonElement>) => {
    if (activeSubmenu === label) {
      setActiveSubmenu(null);
      setSubmenuPosition(null);
    } else {
      // คำนวณตำแหน่งของปุ่มที่กด
      const buttonRect = event.currentTarget.getBoundingClientRect();
      const centerX = buttonRect.left + (buttonRect.width / 2);
      const bottomY = buttonRect.top;

      setSubmenuPosition({ x: centerX, y: bottomY });
      setActiveSubmenu(label);
    }
  };

  const isBackendRouteActive = () => {
    const backendRoutes = ['/inventory', '/menu', '/equipment', '/accounting'];
    return backendRoutes.includes(pathname);
  };

  return (
    <>
      {/* Overlay to close menus */}
      {(activeSubmenu || showUserMenu) && (
        <div className="fixed inset-0 z-40" onClick={() => {
          setActiveSubmenu(null);
          setShowUserMenu(null);
          setSubmenuPosition(null);
        }} />
      )}

      {/* Submenu Dropdown */}
      {activeSubmenu && submenuPosition && (
        <div
          className="fixed bg-white rounded-md shadow-lg border border-gray-200 py-2 z-50 min-w-[120px]"
          style={{
            left: `${submenuPosition.x}px`,
            top: `${submenuPosition.y - 10}px`, // เว้นระยะ 10px จากด้านบน
            transform: 'translateX(-50%) translateY(-100%)', // จัดกึ่งกลางแนวนอนและขยับขึ้นด้านบน
          }}
        >
          {navigationItems
            .find(item => item.label === activeSubmenu)
            ?.submenuItems?.map((submenuItem) => {
              const SubmenuIcon = submenuItem.icon;
              const isActive = pathname === submenuItem.href;

              return (
                <Link
                  key={submenuItem.href}
                  href={submenuItem.href}
                  onClick={() => {
                    setActiveSubmenu(null);
                    setSubmenuPosition(null);
                  }}
                  className={cn(
                    'flex items-center px-4 py-3 font-light transition-colors',
                    isActive
                      ? 'text-black bg-gray-100'
                      : 'text-gray-700 hover:text-black hover:bg-gray-50'
                  )}
                >
                  <SubmenuIcon className="w-4 h-4 mr-2" />
                  {submenuItem.label}
                </Link>
              );
            })}
        </div>
      )}

      {/* User Menu Dropdown */}
      {showUserMenu === 'user' && (
        <div className="fixed bottom-20 right-4 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 w-48">
          <div className="px-3 py-2">
            <p className="text-sm font-light text-black">{user?.name}</p>
            <p className="text-xs font-light text-gray-500">{user?.role === 'admin' ? 'ผู้ดูแลระบบ' : 'พนักงานขาย'}</p>
          </div>
          <hr className="border-gray-100" />
          {user?.role === 'admin' && (
            <>
              <Link
                href="/brand"
                onClick={() => setShowUserMenu(null)}
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
              setShowUserMenu(null);
              logout();
            }}
            className="flex items-center w-full px-3 py-2 text-xs font-light text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2" />
            ออกจากระบบ
          </button>
        </div>
      )}

      {/* Single Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 md:px-6 pb-safe-area-inset-bottom">
        <div className="flex items-center justify-between">
          {/* Left: System Logo & Brand */}
          <div className="flex items-center gap-3">
            <img
              src="https://api.dicebear.com/9.x/notionists/svg?seed=justletitgo&flip=true&scale=100"
              alt="System Logo"
              className="w-8 h-8 rounded-full object-cover"
            />
            <div className="hidden sm:block">
              <div className="text-sm font-thin text-black tracking-wider">ขายไปเหอะ</div>
            </div>
          </div>

          {/* Center: Navigation Menu */}
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-8">
              {filteredNavigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.href ? pathname === item.href : (item.isSubmenu && isBackendRouteActive());

                if (item.isSubmenu) {
                  return (
                    <button
                      key={item.label}
                      onClick={(e) => handleSubmenuToggle(item.label, e)}
                      className={cn(
                        'flex flex-col items-center justify-center p-2 transition-colors duration-200 min-w-[3rem] relative',
                        isActive
                          ? 'text-black border-b-2 border-black'
                          : 'text-gray-400 hover:text-black'
                      )}
                    >
                      <div className="flex items-center">
                        <Icon className="w-6 h-6" />
                        {activeSubmenu === item.label && (
                          <ChevronUp className="w-2 h-2 ml-1" />
                        )}
                      </div>
                    </button>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href!}
                    className={cn(
                      'flex flex-col items-center justify-center p-3 transition-colors duration-200 min-w-[3rem] relative',
                      isActive
                        ? 'text-black border-b-2 border-black'
                        : 'text-gray-400 hover:text-black'
                    )}
                  >
                    <Icon className="w-6 h-6 font-light" />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right: Brand Info & User Menu */}
          <div className="flex items-center">
            <button
              onClick={() => setShowUserMenu(showUserMenu ? null : 'user')}
              className="flex items-center gap-2 p-2 hover:bg-gray-50 transition-colors duration-200"
            >
              {brand?.logo ? (
                <img
                  src={brand.logo}
                  alt="Brand Logo"
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <CircleUserRound className="w-5 h-5 text-gray-400" />
              )}
              <span className="hidden sm:block text-xs font-light text-black">{brand?.name || user?.name}</span>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}