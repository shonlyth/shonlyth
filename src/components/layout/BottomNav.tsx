/**
 * Navigation Component: เมนูนำทางแบบ Mobile-First
 * รองรับเมนูหลัก:
 * 1. หน้าหลัก (Dashboard)
 * 2. บันทึกรายรับรายวัน (Income)
 * 3. บันทึกต้นทุนขาย (COGS)
 * 4. บันทึกค่าใช้จ่าย (Expenses)
 * 5. รายงานกำไรขาดทุน (Reports)
 * 6. ตั้งค่า (Settings)
 */

import React from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  ShoppingCart,
  ChefHat,
  TrendingDown,
  FileSpreadsheet,
  Scale,
  Settings
} from 'lucide-react';

export type TabType = 'dashboard' | 'income' | 'cogs' | 'menu' | 'expenses' | 'reports' | 'breakeven' | 'settings';

interface BottomNavProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export const NAV_ITEMS = [
  { id: 'dashboard' as TabType, label: 'หน้าหลัก', icon: LayoutDashboard },
  { id: 'income' as TabType, label: 'รายรับ', icon: TrendingUp },
  { id: 'cogs' as TabType, label: 'ต้นทุน COGS', icon: ShoppingCart },
  { id: 'menu' as TabType, label: 'เมนู & สูตร', icon: ChefHat },
  { id: 'expenses' as TabType, label: 'ค่าใช้จ่าย', icon: TrendingDown },
  { id: 'reports' as TabType, label: 'รายงาน P&L', icon: FileSpreadsheet },
  { id: 'breakeven' as TabType, label: 'จุดคุ้มทุน', icon: Scale },
  { id: 'settings' as TabType, label: 'ตั้งค่า', icon: Settings },
];

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onSelectTab }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-stone-200 safe-area-bottom shadow-lg print:hidden">
      <div className="max-w-md md:max-w-4xl mx-auto px-0.5 sm:px-2">
        <div className="grid grid-cols-8 h-15">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex flex-col items-center justify-center py-1 transition-colors relative ${
                  isActive
                    ? 'text-emerald-600 font-semibold'
                    : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                {isActive && (
                  <span className="absolute top-0 w-5 sm:w-8 h-0.5 bg-emerald-600 rounded-full" />
                )}
                <Icon
                  className={`w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 mb-0.5 transition-transform ${
                    isActive ? 'scale-110 text-emerald-600' : 'text-stone-500'
                  }`}
                />
                <span className="text-[8.5px] sm:text-[10px] leading-tight tracking-tight text-center truncate px-0.5">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
