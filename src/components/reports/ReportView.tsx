/**
 * หน้ารายงาน (Reports View):
 * รายงานสรุปบัญชีรายรับ-รายจ่าย-กำไรขาดทุน (P&L Statement) สำหรับเจ้าของร้านอาหาร
 * พร้อมวิเคราะห์ Food Cost %, ค่าคอมมิชชั่น GP เดลิเวอรี่, และสัดส่วนค่าใช้จ่ายคงที่ vs ผันแปร
 */

import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { MenuView } from '../menu/MenuView';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  Calendar,
  FileSpreadsheet,
  ChefHat
} from 'lucide-react';

export const ReportView: React.FC = () => {
  const { data } = useRestaurant();
  const { settings, incomes, expenses } = data;
  const cogsRecords = data.cogsRecords || [];

  // แท็บย่อย: 'pnl' (งบกำไรขาดทุน) หรือ 'menu' (เมนูและสูตรต้นทุน)
  const [reportSubTab, setReportSubTab] = useState<'pnl' | 'menu'>('pnl');

  // ตัวกรองช่วงเวลา (ทั้งหมด, เดือนนี้, วันนี้)
  const [timeRange, setTimeRange] = useState<'all' | 'month' | 'today'>('all');

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const thisMonthStr = todayStr.substring(0, 7); // YYYY-MM

  // กรองรายการตามช่วงเวลา
  const filteredIncomes = incomes.filter((i) => {
    if (timeRange === 'today') return i.date === todayStr;
    if (timeRange === 'month') return i.date.startsWith(thisMonthStr);
    return true;
  });

  const filteredExpenses = expenses.filter((e) => {
    if (timeRange === 'today') return e.date === todayStr;
    if (timeRange === 'month') return (e.month === thisMonthStr || e.date.startsWith(thisMonthStr));
    return true;
  });

  const filteredCogs = cogsRecords.filter((c) => {
    if (timeRange === 'today') return c.date === todayStr;
    if (timeRange === 'month') return c.date.startsWith(thisMonthStr);
    return true;
  });

  // คำนวณตัวเลข P&L
  const grossSales = filteredIncomes.reduce((s, i) => s + (Number(i.grossAmount) || 0), 0);
  const totalGPCommission = filteredIncomes.reduce((s, i) => s + (Number(i.commissionAmount) || 0), 0);
  const netSales = grossSales - totalGPCommission;

  // ต้นทุนขาย (COGS วัตถุดิบ)
  const totalCogs = filteredCogs.reduce((s, c) => s + (Number(c.amount) || 0), 0);

  // รายจ่ายผันแปร (Variable Costs: วัตถุดิบ COGS + ค่าแก๊ส + บรรจุภัณฑ์)
  const otherVariableExpenses = filteredExpenses
    .filter((e) => e.costType === 'variable')
    .reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const variableExpenses = otherVariableExpenses + totalCogs;

  // กำไรส่วนเกิน / กำไรขั้นต้น (Contribution Margin / Gross Profit)
  const grossProfit = netSales - variableExpenses;
  const grossProfitMargin = netSales > 0 ? (grossProfit / netSales) * 100 : 0;

  // รายจ่ายคงที่ (Fixed Costs)
  const fixedExpenses = filteredExpenses
    .filter((e) => e.costType === 'fixed')
    .reduce((s, e) => s + (Number(e.amount) || 0), 0);

  // กำไรสุทธิ (Net Operating Profit)
  const netOperatingProfit = grossProfit - fixedExpenses;
  const netProfitMargin = grossSales > 0 ? (netOperatingProfit / grossSales) * 100 : 0;

  // สรุปค่าใช้จ่ายแยกตามหมวดหมู่
  const categoryExpenses = settings.expenseCategories.map((cat) => {
    const total = filteredExpenses
      .filter((e) => e.categoryId === cat.id)
      .reduce((s, e) => s + (Number(e.amount) || 0), 0);
    return {
      cat,
      total,
      percent: (variableExpenses + fixedExpenses) > 0
        ? Math.round((total / (variableExpenses + fixedExpenses)) * 100)
        : 0
    };
  }).filter((c) => c.total > 0).sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-6 pb-12">
      {/* สลับมุมมองรายงาน */}
      <div className="flex items-center gap-2 p-1 bg-stone-200/80 rounded-xl">
        <button
          onClick={() => setReportSubTab('pnl')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
            reportSubTab === 'pnl'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          รายงานงบกำไร-ขาดทุน (P&L)
        </button>
        <button
          onClick={() => setReportSubTab('menu')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
            reportSubTab === 'menu'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <ChefHat className="w-4 h-4 text-emerald-600" />
          เมนูอาหาร & คำนวณสูตร (BOM)
        </button>
      </div>

      {reportSubTab === 'menu' ? (
        <MenuView />
      ) : (
        <>
          {/* หัวข้อและตัวเลือกช่วงเวลา */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-stone-900">รายงานกำไร-ขาดทุน (P&L Report)</h2>
              <p className="text-xs text-stone-500 mt-0.5">
                สรุปผลประกอบการร้านอาหาร วิเคราะห์ต้นทุนและกำไรสุทธิ
              </p>
            </div>

            {/* ตัวเลือกช่วงเวลา */}
            <div className="flex items-center gap-1 p-1 bg-stone-200/80 rounded-xl self-start sm:self-auto">
              <button
                onClick={() => setTimeRange('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  timeRange === 'all'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                ทั้งหมด
              </button>
              <button
                onClick={() => setTimeRange('month')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  timeRange === 'month'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                เดือนนี้
              </button>
              <button
                onClick={() => setTimeRange('today')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  timeRange === 'today'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                วันนี้
              </button>
            </div>
          </div>

      {/* ตารางงบกำไรขาดทุนร้านอาหาร (Restaurant P&L Statement) */}
      <section className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-xs">
        <div className="flex items-center gap-2 pb-3 mb-3 border-b border-stone-100">
          <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
          <h3 className="font-semibold text-stone-900 text-sm">
            งบกำไรขาดทุนอย่างง่าย (Statement of Profit & Loss)
          </h3>
        </div>

        <div className="space-y-2 text-xs">
          {/* 1. ยอดขายรวม */}
          <div className="flex justify-between py-2 border-b border-stone-100 font-semibold text-stone-900">
            <span>1. ยอดขายรวมทุกช่องทาง (Gross Revenue)</span>
            <span className="text-sm">฿{grossSales.toLocaleString()}</span>
          </div>

          {/* 2. หัก ค่าคอมมิชชั่น GP */}
          <div className="flex justify-between py-1.5 text-stone-600 pl-4">
            <span>หัก: ค่าคอมมิชชั่น GP เดลิเวอรี่ (Delivery Fee)</span>
            <span className="text-amber-600">
              -฿{totalGPCommission.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* 3. ยอดขายสุทธิ */}
          <div className="flex justify-between py-2 border-y border-stone-200 font-bold bg-stone-50 px-2 rounded-lg text-stone-900">
            <span>2. ยอดขายสุทธิที่ได้รับจริง (Net Revenue)</span>
            <span className="text-sm text-emerald-700">฿{netSales.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          </div>

          {/* 4. ต้นทุนผันแปร */}
          <div className="flex justify-between py-1.5 text-stone-600 pl-4">
            <span>หัก: ต้นทุนผันแปร (วัตถุดิบอาหาร, แก๊ส, บรรจุภัณฑ์)</span>
            <span className="text-red-600">
              -฿{variableExpenses.toLocaleString()}
            </span>
          </div>

          {/* 5. กำไรขั้นต้น */}
          <div className="flex justify-between py-2 border-y border-stone-200 font-bold bg-stone-50 px-2 rounded-lg text-stone-900">
            <div>
              <span>3. กำไรขั้นต้น (Gross Profit)</span>
              <span className="text-[10px] text-stone-500 font-normal ml-2">
                (มาร์จิ้น: {grossProfitMargin.toFixed(1)}%)
              </span>
            </div>
            <span className={`text-sm ${grossProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              ฿{grossProfit.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* 6. ต้นทุนคงที่ */}
          <div className="flex justify-between py-1.5 text-stone-600 pl-4">
            <span>หัก: ต้นทุนคงที่ (ค่าเช่าร้าน, เงินเดือนพนักงาน, ค่าไฟเน็ต)</span>
            <span className="text-red-600">
              -฿{fixedExpenses.toLocaleString()}
            </span>
          </div>

          {/* 7. กำไรสุทธิสุดท้าย */}
          <div className={`flex justify-between py-3 px-3 rounded-xl border mt-2 font-bold text-sm ${
            netOperatingProfit >= 0
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-red-50 border-red-300 text-red-900'
          }`}>
            <div>
              <div>กำไรจากการดำเนินงานสุทธิ (Net Operating Profit)</div>
              <div className="text-[10px] font-normal opacity-80">
                สัดส่วนกำไรสุทธิ: {netProfitMargin.toFixed(1)}% ของยอดขายรวม
              </div>
            </div>
            <div className="text-base sm:text-lg">
              {netOperatingProfit >= 0 ? '+' : ''}฿{netOperatingProfit.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </section>

      {/* สรุปสัดส่วนค่าใช้จ่ายตามหมวดหมู่ */}
      <section className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-xs">
        <div className="flex items-center gap-2 pb-3 mb-3 border-b border-stone-100">
          <PieChart className="w-5 h-5 text-emerald-600" />
          <h3 className="font-semibold text-stone-900 text-sm">
            สัดส่วนค่าใช้จ่ายตามหมวดหมู่ (Expense Breakdown)
          </h3>
        </div>

        {categoryExpenses.length === 0 ? (
          <div className="py-6 text-center text-xs text-stone-400">
            ยังไม่มีรายการค่าใช้จ่ายในช่วงเวลานี้
          </div>
        ) : (
          <div className="space-y-3">
            {categoryExpenses.map((item) => (
              <div key={item.cat.id} className="text-xs">
                <div className="flex justify-between mb-1">
                  <span className="font-medium text-stone-800">{item.cat.name}</span>
                  <span className="font-bold text-stone-900">
                    ฿{item.total.toLocaleString()} ({item.percent}%)
                  </span>
                </div>
                <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-1.5 rounded-full ${
                      item.cat.type === 'variable' ? 'bg-amber-500' : 'bg-purple-500'
                    }`}
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
        </>
      )}
    </div>
  );
};
