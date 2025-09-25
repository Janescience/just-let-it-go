'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Store, Beef, UtensilsCrossed, Hammer, Calculator, ChevronUp,Warehouse } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAuth } from '@/hooks/useAuth';

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
    icon: Home,
    label: 'หน้าหลัก',
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
    icon: Warehouse,
    label: 'หลังร้าน',
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
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);

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

  const handleSubmenuToggle = (label: string) => {
    setActiveSubmenu(activeSubmenu === label ? null : label);
  };

  const isBackendRouteActive = () => {
    const backendRoutes = ['/inventory', '/menu', '/equipment', '/accounting'];
    return backendRoutes.includes(pathname);
  };

  return (
    <>
      {/* Submenu Overlay */}
      {activeSubmenu && (
        <div className="fixed inset-0 z-40" onClick={() => setActiveSubmenu(null)} />
      )}

      {/* Submenu Dropdown */}
      {activeSubmenu && (
        <div className="fixed bottom-20 right-8 transform -translate-x-1/2 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 min-w-[200px]">
          {navigationItems
            .find(item => item.label === activeSubmenu)
            ?.submenuItems?.map((submenuItem) => {
              const SubmenuIcon = submenuItem.icon;
              const isActive = pathname === submenuItem.href;

              return (
                <Link
                  key={submenuItem.href}
                  href={submenuItem.href}
                  onClick={() => setActiveSubmenu(null)}
                  className={cn(
                    'flex items-center px-4 py-3  font-light transition-colors',
                    isActive
                      ? 'text-black bg-gray-100'
                      : 'text-gray-700 hover:text-black hover:bg-gray-50'
                  )}
                >
                  <SubmenuIcon className="w-4 h-4 mr-3" />
                  {submenuItem.label}
                </Link>
              );
            })}
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 md:px-6 safe-area-pb">
        <div className="flex items-center justify-center">
          <div className="flex items-center justify-around w-full max-w-4xl">
            {filteredNavigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.href ? pathname === item.href : (item.isSubmenu && isBackendRouteActive());

              if (item.isSubmenu) {
                return (
                  <button
                    key={item.label}
                    onClick={() => handleSubmenuToggle(item.label)}
                    className={cn(
                      'flex flex-col items-center justify-center p-2 rounded-lg transition-colors duration-200 min-w-[4rem] flex-1 relative',
                      isActive
                        ? 'text-black bg-gray-100'
                        : 'text-gray-500 hover:text-black hover:bg-gray-50'
                    )}
                  >
                    <div className="flex items-center">
                      <Icon className="w-5 h-5" />
                      {activeSubmenu === item.label && (
                        <ChevronUp className="w-3 h-3 ml-1" />
                      )}
                    </div>
                    <span className="font-light">{item.label}</span>
                  </button>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href!}
                  className={cn(
                    'flex flex-col items-center justify-center p-2 rounded-lg transition-colors duration-200 min-w-[4rem] flex-1',
                    isActive
                      ? 'text-black bg-gray-100'
                      : 'text-gray-500 hover:text-black hover:bg-gray-50'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-light">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}