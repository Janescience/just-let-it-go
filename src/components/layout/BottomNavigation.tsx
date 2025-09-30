'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
  const router = useRouter();
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

    // Prefetch all navigation pages for faster navigation
    const allRoutes = [
      '/',
      '/booth',
      '/inventory',
      '/menu',
      '/equipment',
      '/accounting',
      '/brand'
    ];

    allRoutes.forEach(route => {
      router.prefetch(route);
    });
  }, [pathname, router]);

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
          className="fixed bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-100 py-1 z-50 min-w-[140px] overflow-hidden"
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
                  onClick={(e) => {
                    setActiveSubmenu(null);
                    setSubmenuPosition(null);
                    // Optimistic navigation - navigate immediately
                    router.push(submenuItem.href);
                  }}
                  className={cn(
                    'flex items-center px-4 py-2.5 font-extralight text-sm tracking-wide transition-all duration-200',
                    isActive
                      ? 'text-gray-900 bg-gray-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-25'
                  )}
                >
                  <SubmenuIcon className="w-4 h-4 mr-3 stroke-1" />
                  {submenuItem.label}
                </Link>
              );
            })}
        </div>
      )}

      {/* User Menu Dropdown */}
      {showUserMenu === 'user' && (
        <div className="fixed bottom-16 right-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-100 py-1 z-50 w-44 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50">
            <p className="text-sm font-light text-gray-900 tracking-wide">{user?.name}</p>
            <p className="text-xs font-extralight text-gray-500 tracking-wide">{user?.role === 'admin' ? 'ผู้ดูแลระบบ' : 'พนักงานขาย'}</p>
          </div>
          {user?.role === 'admin' && (
            <Link
              href="/brand"
              onClick={() => setShowUserMenu(null)}
              className="flex items-center w-full px-4 py-2.5 text-sm font-extralight text-gray-600 hover:text-gray-900 hover:bg-gray-25 transition-all duration-200 tracking-wide"
            >
              <Building2 className="w-4 h-4 mr-3 stroke-1" />
              จัดการแบรนด์
            </Link>
          )}
          <button
            onClick={() => {
              setShowUserMenu(null);
              logout();
            }}
            className="flex items-center w-full px-4 py-2.5 text-sm font-extralight text-red-500 hover:text-red-600 hover:bg-red-25 transition-all duration-200 tracking-wide"
          >
            <LogOut className="w-4 h-4 mr-3 stroke-1" />
            ออกจากระบบ
          </button>
        </div>
      )}

      {/* Single Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 px-4 py-2 md:px-6 pb-safe-area-inset-bottom">
        <div className="flex items-center justify-between">
          {/* Left: System Logo & Brand */}
          <div className="flex items-center gap-2">
            <img
              src="https://api.dicebear.com/9.x/notionists/svg?seed=justletitgo&flip=true&scale=100"
              alt="System Logo"
              className="w-6 h-6 rounded-full object-cover opacity-80"
            />
            <div className="hidden sm:block">
              <div className="text-xs font-extralight text-gray-600 tracking-widest">ขายไปเหอะ</div>
            </div>
          </div>

          {/* Center: Navigation Menu */}
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-6">
              {filteredNavigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.href ? pathname === item.href : (item.isSubmenu && isBackendRouteActive());

                if (item.isSubmenu) {
                  return (
                    <button
                      key={item.label}
                      onClick={(e) => handleSubmenuToggle(item.label, e)}
                      className={cn(
                        'flex flex-col items-center justify-center p-2 transition-all duration-300 min-w-[2.5rem] relative group',
                        isActive
                          ? 'text-gray-900'
                          : 'text-gray-400 hover:text-gray-700'
                      )}
                    >
                      <div className="flex items-center">
                        <Icon className="w-5 h-5 stroke-1" />
                        {activeSubmenu === item.label && (
                          <ChevronUp className="w-3 h-3 ml-1 stroke-1" />
                        )}
                      </div>
                      {isActive && (
                        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-gray-900 rounded-full"></div>
                      )}
                    </button>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href!}
                    onClick={() => {
                      // Optimistic navigation - navigate immediately
                      router.push(item.href!);
                    }}
                    className={cn(
                      'flex flex-col items-center justify-center p-2 transition-all duration-300 min-w-[2.5rem] relative group',
                      isActive
                        ? 'text-gray-900'
                        : 'text-gray-400 hover:text-gray-700'
                    )}
                  >
                    <Icon className="w-5 h-5 stroke-1" />
                    {isActive && (
                      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-gray-900 rounded-full"></div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right: Brand Info & User Menu */}
          <div className="flex items-center">
            <button
              onClick={() => setShowUserMenu(showUserMenu ? null : 'user')}
              className="flex items-center gap-2 p-2 hover:bg-gray-50/50 transition-all duration-300 rounded-full"
            >
              {brand?.logo ? (
                <img
                  src={brand.logo}
                  alt="Brand Logo"
                  className="w-6 h-6 rounded-full object-cover opacity-90"
                />
              ) : (
                <CircleUserRound className="w-4 h-4 text-gray-400 stroke-1" />
              )}
              <span className="hidden sm:block text-xs font-extralight text-gray-600 tracking-wide">{brand?.name || user?.name}</span>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}