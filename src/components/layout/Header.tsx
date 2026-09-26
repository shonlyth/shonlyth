/**
 * Header Component: แถบหัวเรื่องด้านบนของแอป
 * แสดงชื่อร้าน, สาขา, วันที่ปัจจุบัน และปุ่มกด Export ข้อมูลด่วน
 */

import React from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { Store, Download, UtensilsCrossed } from 'lucide-react';

interface HeaderProps {
  currentTabName: string;
}

export const Header: React.FC<HeaderProps> = ({ currentTabName }) => {
  const { data, exportData } = useRestaurant();
  const { restaurantName, branchName } = data.settings;

  // วันที่ปัจจุบันรูปแบบไทย
  const todayStr = new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium'
  }).format(new Date());

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-stone-200 shadow-xs print:hidden">
      <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-between">
        {/* ชื่อร้านและสาขา */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white shrink-0 shadow-xs">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-bold text-stone-900 truncate">
                {restaurantName || 'ระบบบัญชีร้านอาหาร'}
              </h1>
              {branchName && (
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 font-medium shrink-0">
                  {branchName}
                </span>
              )}
            </div>
            <p className="text-[11px] text-stone-500 flex items-center gap-1 truncate">
              <span>{currentTabName}</span> • <span>{todayStr}</span>
            </p>
          </div>
        </div>

        {/* ปุ่มสำรองข้อมูลด่วน */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportData()}
            title="สำรองข้อมูลทั้งหมดเป็น JSON"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">สำรอง JSON</span>
          </button>
        </div>
      </div>
    </header>
  );
};
