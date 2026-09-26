/**
 * App.tsx: คอมโพเนนต์หลักของเว็บแอป KinKhorng - ระบบบัญชีร้านอาหาร
 * จัดการ Navigation Routing แบบง่าย เชื่อมต่อหน้าจอหลักทั้ง 6 ส่วน
 * 1. หน้าหลัก (Dashboard)
 * 2. บันทึกรายรับ (Income)
 * 3. บันทึกรายจ่าย (Expenses)
 * 4. เมนูอาหาร & สูตร (Menu & Recipe)
 * 5. รายงาน (Reports)
 * 6. ตั้งค่า (Settings)
 */

import React, { useState } from 'react';
import { RestaurantProvider } from './context/RestaurantContext';
import { Header } from './components/layout/Header';
import { BottomNav, TabType, NAV_ITEMS } from './components/layout/BottomNav';
import { DashboardView } from './components/dashboard/DashboardView';
import { IncomeView } from './components/income/IncomeView';
import { CogsView } from './components/cogs/CogsView';
import { ExpenseView } from './components/expenses/ExpenseView';
import { MenuView } from './components/menu/MenuView';
import { ReportView } from './components/reports/ReportView';
import { SettingsView } from './components/settings/SettingsView';

function RestaurantApp() {
  // สเตทสำหรับแท็บปัจจุบัน (เริ่มต้นที่หน้าหลัก)
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');

  // ดึงชื่อแท็บปัจจุบันมาแสดงที่ Header
  const activeNavItem = NAV_ITEMS.find((item) => item.id === currentTab);
  const currentTabName = activeNavItem ? activeNavItem.label : 'หน้าหลัก';

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col text-stone-800">
      {/* ส่วนหัวแอป (Sticky Header) */}
      <Header currentTabName={currentTabName} />

      {/* เนื้อหาหน้าจอตามแท็บที่เลือก (Mobile-first responsive container) */}
      <main className="flex-1 max-w-md md:max-w-4xl w-full mx-auto px-3.5 sm:px-6 pt-4 pb-24">
        {currentTab === 'dashboard' && (
          <DashboardView onNavigate={(tab) => setCurrentTab(tab)} />
        )}
        {currentTab === 'income' && <IncomeView />}
        {currentTab === 'cogs' && <CogsView />}
        {currentTab === 'menu' && <MenuView />}
        {currentTab === 'expenses' && <ExpenseView />}
        {currentTab === 'reports' && <ReportView />}
        {currentTab === 'settings' && <SettingsView />}
      </main>

      {/* เมนูนำทางด้านล่างแบบ Mobile-First */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          // เลื่อนหน้าจอขึ้นบนสุดเมื่อเปลี่ยนแท็บ
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <RestaurantProvider>
      <RestaurantApp />
    </RestaurantProvider>
  );
}
