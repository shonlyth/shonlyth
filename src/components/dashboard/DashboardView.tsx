/**
 * หน้าหลัก (Dashboard View):
 * 1. สรุปยอดขายวันนี้และเดือนนี้ แยกตามช่องทาง (หน้าร้าน + แพลตฟอร์มเดลิเวอรี่)
 * 2. % Food Cost ของเดือนนี้ (ต้นทุนวัตถุดิบ COGS ÷ ยอดขายสุทธิ x 100)
 * 3. กำไร/ขาดทุนสุทธิเบื้องต้นของเดือนนี้ (รายรับสุทธิ − ต้นทุนขาย − ค่าใช้จ่าย)
 * 4. กราฟเปรียบเทียบยอดขายและกำไรย้อนหลัง 6 เดือน (Recharts)
 * 5. Widget เตือนเมื่อ % Food Cost เดือนนี้สูงกว่าเดือนก่อนเกินเกณฑ์ (Threshold ปรับได้ใน Settings)
 * 6. ปุ่ม Export/Import ข้อมูล วางให้เข้าถึงง่ายจากหน้า Dashboard ทันที
 */

import React, { useState, useRef, useMemo } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { TabType } from '../layout/BottomNav';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  ShoppingBag,
  ArrowRight,
  Sparkles,
  Layers,
  ChevronRight,
  UtensilsCrossed
} from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (tab: TabType) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { data, exportData, importData } = useRestaurant();
  const { settings, incomes, expenses } = data;
  const cogsRecords = data.cogsRecords || [];

  // สลับมุมมองยอดขายตามช่องทาง: 'today' (วันนี้) หรือ 'month' (เดือนนี้)
  const [salesViewPeriod, setSalesViewPeriod] = useState<'today' | 'month'>('today');

  // สถานะข้อความ Import แจ้งเตือน
  const [importStatusMsg, setImportStatusMsg] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // วันที่ปัจจุบัน และเดือนปัจจุบัน
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const thisMonthStr = todayStr.substring(0, 7); // e.g. "2026-09"

  // เดือนก่อนหน้า (Previous Month)
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

  // =========================================================================
  // 1. คำนวณตัวเลขของ "วันนี้" (Today)
  // =========================================================================
  const todayIncomes = incomes.filter((i) => i.date === todayStr);
  const todayGross = todayIncomes.reduce((s, i) => s + (Number(i.grossAmount) || 0), 0);
  const todayCommission = todayIncomes.reduce((s, i) => s + (Number(i.commissionAmount) || 0), 0);
  const todayNet = todayGross - todayCommission;

  // =========================================================================
  // 2. คำนวณตัวเลขของ "เดือนนี้" (This Month)
  // =========================================================================
  const monthIncomes = incomes.filter((i) => i.date.startsWith(thisMonthStr));
  const monthGross = monthIncomes.reduce((s, i) => s + (Number(i.grossAmount) || 0), 0);
  const monthCommission = monthIncomes.reduce((s, i) => s + (Number(i.commissionAmount) || 0), 0);
  const monthNet = monthGross - monthCommission; // ยอดขายสุทธิเดือนนี้

  // ต้นทุนวัตถุดิบ (COGS) เดือนนี้
  const monthCogs = cogsRecords
    .filter((c) => c.date.startsWith(thisMonthStr))
    .reduce((s, c) => s + (Number(c.amount) || 0), 0);

  // ค่าใช้จ่ายทั้งหมดของเดือนนี้ (Expenses: ทั้งคงที่และผันแปร)
  const monthExpenses = expenses
    .filter((e) => (e.month === thisMonthStr || e.date.startsWith(thisMonthStr)))
    .reduce((s, e) => s + (Number(e.amount) || 0), 0);

  // กำไร/ขาดทุนสุทธิเบื้องต้นของเดือนนี้ = รายรับสุทธิ − ต้นทุนขาย − ค่าใช้จ่าย
  const monthNetProfit = monthNet - monthCogs - monthExpenses;
  const monthNetMargin = monthGross > 0 ? (monthNetProfit / monthGross) * 100 : 0;

  // 2. % Food Cost ของเดือนนี้ = (ต้นทุนวัตถุดิบ COGS ÷ ยอดขายสุทธิ) x 100
  const monthFoodCostPercent = monthNet > 0 ? (monthCogs / monthNet) * 100 : 0;

  // =========================================================================
  // 5. คำนวณ Food Cost เดือนก่อนหน้า และตรวจสอบ Alert Widget
  // =========================================================================
  const prevMonthIncomes = incomes.filter((i) => i.date.startsWith(prevMonthStr));
  const prevMonthGross = prevMonthIncomes.reduce((s, i) => s + (Number(i.grossAmount) || 0), 0);
  const prevMonthComm = prevMonthIncomes.reduce((s, i) => s + (Number(i.commissionAmount) || 0), 0);
  const prevMonthNet = prevMonthGross - prevMonthComm;

  const prevMonthCogs = cogsRecords
    .filter((c) => c.date.startsWith(prevMonthStr))
    .reduce((s, c) => s + (Number(c.amount) || 0), 0);

  const prevMonthFoodCostPercent = prevMonthNet > 0 ? (prevMonthCogs / prevMonthNet) * 100 : 0;

  // ส่วนต่างเทียบเดือนก่อน (+ ถ้าสูงขึ้น)
  const foodCostDiff = monthFoodCostPercent - prevMonthFoodCostPercent;
  const alertThreshold = settings.foodCostAlertThresholdPercent ?? 5;
  const isFoodCostAlertTriggered =
    prevMonthFoodCostPercent > 0 &&
    monthFoodCostPercent > 0 &&
    foodCostDiff >= alertThreshold;

  // =========================================================================
  // 1. ยอดขายแยกตามช่องทาง (วันนี้ / เดือนนี้)
  // =========================================================================
  const activeChannels = settings.salesChannels.filter((c) => c.isActive);
  const channelDataList = activeChannels.map((ch) => {
    const list = salesViewPeriod === 'today'
      ? todayIncomes.filter((i) => i.channelId === ch.id)
      : monthIncomes.filter((i) => i.channelId === ch.id);

    const gross = list.reduce((s, i) => s + (Number(i.grossAmount) || 0), 0);
    const comm = list.reduce((s, i) => s + (Number(i.commissionAmount) || 0), 0);
    const net = gross - comm;
    const orders = list.reduce((s, i) => s + (Number(i.orderCount) || 0), 0);

    return {
      channel: ch,
      gross,
      comm,
      net,
      orders
    };
  });

  const periodGrossTotal = salesViewPeriod === 'today' ? todayGross : monthGross;

  // =========================================================================
  // 4. กราฟเปรียบเทียบยอดขายและกำไรย้อนหลัง 6 เดือน (6-Month Historical Chart)
  // =========================================================================
  const sixMonthsChartData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const mLabel = new Intl.DateTimeFormat('th-TH', { month: 'short' }).format(d);

      // ยอดขาย
      const mIncs = incomes.filter((item) => item.date.startsWith(mStr));
      const mGross = mIncs.reduce((s, item) => s + (Number(item.grossAmount) || 0), 0);
      const mComm = mIncs.reduce((s, item) => s + (Number(item.commissionAmount) || 0), 0);
      const mNet = mGross - mComm;

      // ต้นทุนขาย
      const mCogs = cogsRecords
        .filter((c) => c.date.startsWith(mStr))
        .reduce((s, c) => s + (Number(c.amount) || 0), 0);

      // ค่าใช้จ่าย
      const mExp = expenses
        .filter((e) => e.month === mStr || e.date.startsWith(mStr))
        .reduce((s, e) => s + (Number(e.amount) || 0), 0);

      // กำไรสุทธิ
      const mProfit = mNet - mCogs - mExp;
      const mFoodCost = mNet > 0 ? parseFloat(((mCogs / mNet) * 100).toFixed(1)) : 0;

      months.push({
        monthKey: mStr,
        name: mLabel,
        ยอดขายสุทธิ: Math.round(mNet),
        กำไรสุทธิ: Math.round(mProfit),
        ยอดขายรวม: Math.round(mGross),
        foodCostPercent: mFoodCost
      });
    }
    return months;
  }, [incomes, cogsRecords, expenses, now]);

  // จัดการอัปโหลดไฟล์ JSON จาก Dashboard
  const handleQuickImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      const res = importData(text);
      if (res.success) {
        setImportStatusMsg({
          type: 'success',
          text: `นำเข้าข้อมูลร้าน "${res.summary?.restaurantName}" สำเร็จ!`
        });
      } else {
        setImportStatusMsg({ type: 'error', text: res.message });
      }
      setTimeout(() => setImportStatusMsg(null), 4000);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-5 pb-12">
      {/* 6. ปุ่ม Export/Import ข้อมูล วางให้เข้าถึงง่ายจาก Dashboard + แถบทักทาย */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white p-4 sm:p-5 rounded-2xl shadow-md space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-emerald-200 text-xs font-semibold uppercase tracking-wider">
              <UtensilsCrossed className="w-3.5 h-3.5" />
              <span>{settings.branchName ? `${settings.branchName}` : 'ระบบบัญชีร้านอาหาร'}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold mt-0.5 tracking-tight">
              {settings.restaurantName || 'ร้านอาหารของฉัน'}
            </h1>
            <p className="text-xs text-emerald-100/90 mt-0.5">
              สรุปภาพรวมรายรับ-รายจ่าย-กำไร และควบคุมต้นทุน Food Cost
            </p>
          </div>

          {/* ปุ่มด่วน Export & Import JSON บน Dashboard */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => exportData()}
              title="ดาวน์โหลดไฟล์สำรองข้อมูล JSON"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export JSON</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              title="นำเข้าไฟล์สำรองข้อมูล JSON"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-900/70 hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold border border-emerald-500/40 transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-300" />
              <span>Import JSON</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleQuickImport}
              className="hidden"
            />
          </div>
        </div>

        {/* ปุ่มลัด Action บันทึกข้อมูล */}
        <div className="flex flex-wrap gap-2 pt-1 border-t border-emerald-600/50">
          <button
            onClick={() => onNavigate('income')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-900/60 hover:bg-emerald-900 text-xs font-medium rounded-lg text-emerald-100 transition-colors"
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-300" />
            + บันทึกยอดขายรายวัน
          </button>
          <button
            onClick={() => onNavigate('cogs')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-900/60 hover:bg-emerald-900 text-xs font-medium rounded-lg text-amber-200 transition-colors"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-amber-300" />
            + บันทึกต้นทุน COGS
          </button>
          <button
            onClick={() => onNavigate('expenses')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-900/60 hover:bg-emerald-900 text-xs font-medium rounded-lg text-red-200 transition-colors"
          >
            <TrendingDown className="w-3.5 h-3.5 text-red-300" />
            + บันทึกค่าใช้จ่าย
          </button>
        </div>
      </div>

      {/* แจ้งเตือนสถานะ Import */}
      {importStatusMsg && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
            importStatusMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {importStatusMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{importStatusMsg.text}</span>
        </div>
      )}

      {/* 5. Widget เตือนเมื่อ Food Cost % เดือนนี้สูงกว่าเดือนก่อนเกิน Threshold */}
      {isFoodCostAlertTriggered ? (
        <div className="bg-amber-50 border-2 border-amber-300 p-4 rounded-2xl shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                  แจ้งเตือนต้นทุนอาหารสูงผิดปกติ (Food Cost Alert)
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold">
                  +{foodCostDiff.toFixed(1)}%
                </span>
              </div>
              <p className="text-xs text-amber-900 mt-1 leading-relaxed">
                % Food Cost เดือนนี้อยู่ที่ <strong>{monthFoodCostPercent.toFixed(1)}%</strong> เพิ่มขึ้นจากเดือนก่อน (
                {prevMonthFoodCostPercent.toFixed(1)}%) เกินเกณฑ์เตือนที่ตั้งไว้{' '}
                <strong>+{alertThreshold}%</strong> แนะนำตรวจสอบการสูญเสียในครัวหรือราคาวัตถุดิบที่ปรับขึ้น
              </p>
              <div className="flex items-center gap-3 mt-2.5">
                <button
                  onClick={() => onNavigate('cogs')}
                  className="text-xs text-amber-950 font-bold underline hover:text-amber-800 flex items-center gap-1"
                >
                  ตรวจสอบรายการ COGS <ArrowRight className="w-3 h-3" />
                </button>
                <button
                  onClick={() => onNavigate('settings')}
                  className="text-xs text-stone-500 hover:text-stone-800"
                >
                  ปรับเกณฑ์เตือนใน Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50/70 border border-emerald-200/80 px-3.5 py-2.5 rounded-xl flex items-center justify-between text-xs text-emerald-900">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>Food Cost เดือนนี้ ({monthFoodCostPercent.toFixed(1)}%)</strong> อยู่ในเกณฑ์ควบคุมปกติ
              {prevMonthFoodCostPercent > 0 && (
                <span className="text-emerald-700 ml-1">
                  (เดือนก่อน {prevMonthFoodCostPercent.toFixed(1)}%, ส่วนต่าง {foodCostDiff >= 0 ? `+${foodCostDiff.toFixed(1)}` : foodCostDiff.toFixed(1)}%)
                </span>
              )}
            </span>
          </div>
          <button
            onClick={() => onNavigate('settings')}
            className="text-[11px] text-emerald-700 hover:underline shrink-0"
          >
            เกณฑ์: {alertThreshold}%
          </button>
        </div>
      )}

      {/* 2 & 3. การ์ดสรุปตัวเลขหลักของเดือนนี้ (Food Cost % และ กำไรสุทธิ) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* การ์ด 1: ยอดขายสุทธิเดือนนี้ (Net Revenue) */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-stone-500 mb-1">
              <span className="text-xs font-semibold">ยอดขายสุทธิเดือนนี้</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-stone-900 tracking-tight">
              ฿{monthNet.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div className="text-[11px] text-stone-500 mt-1">
              ยอดก่อนหัก GP: ฿{monthGross.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
          </div>
          <div className="text-[10px] text-stone-400 mt-2 pt-2 border-t border-stone-100 flex justify-between">
            <span>ค่า GP เดลิเวอรี่เดือนนี้:</span>
            <span className="text-amber-600 font-semibold">-฿{monthCommission.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
        </div>

        {/* การ์ด 2: % Food Cost ของเดือนนี้ (ต้นทุนวัตถุดิบ ÷ ยอดขายสุทธิ x 100) */}
        <div className={`p-4 rounded-2xl border shadow-xs flex flex-col justify-between ${
          monthFoodCostPercent > (settings.targetFoodCostPercent || 35)
            ? 'bg-amber-50/70 border-amber-200'
            : 'bg-white border-stone-200'
        }`}>
          <div>
            <div className="flex items-center justify-between text-stone-600 mb-1">
              <span className="text-xs font-semibold">% Food Cost เดือนนี้</span>
              <Percent className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold text-stone-900 tracking-tight">
                {monthFoodCostPercent.toFixed(1)}%
              </div>
              <span className="text-[11px] text-stone-500">
                (เป้าหมาย {settings.targetFoodCostPercent || 32}%)
              </span>
            </div>
            <div className="text-[11px] text-stone-500 mt-1">
              สูตร: วัตถุดิบ ฿{monthCogs.toLocaleString(undefined, { maximumFractionDigits: 0 })} ÷ สุทธิ ฿{monthNet.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
          </div>
          <div className="text-[10px] text-stone-500 mt-2 pt-2 border-t border-stone-100 flex justify-between">
            <span>เดือนก่อนหน้า:</span>
            <span className="font-semibold text-stone-700">
              {prevMonthFoodCostPercent > 0 ? `${prevMonthFoodCostPercent.toFixed(1)}%` : 'ไม่มีข้อมูล'}
            </span>
          </div>
        </div>

        {/* การ์ด 3: กำไร/ขาดทุนสุทธิของเดือนนี้ (รายรับสุทธิ − ต้นทุนขาย − ค่าใช้จ่าย) */}
        <div className={`p-4 rounded-2xl border shadow-xs flex flex-col justify-between ${
          monthNetProfit >= 0
            ? 'bg-emerald-50/70 border-emerald-200'
            : 'bg-red-50/70 border-red-200'
        }`}>
          <div>
            <div className="flex items-center justify-between text-stone-600 mb-1">
              <span className="text-xs font-semibold">กำไรสุทธิเดือนนี้ (Net Profit)</span>
              <DollarSign className={`w-4 h-4 ${monthNetProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
            </div>
            <div className={`text-2xl font-bold tracking-tight ${
              monthNetProfit >= 0 ? 'text-emerald-700' : 'text-red-700'
            }`}>
              {monthNetProfit >= 0 ? '+' : ''}฿{monthNetProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div className="text-[11px] text-stone-600 mt-1">
              สัดส่วนกำไร {monthNetMargin.toFixed(1)}% ของยอดขายรวม
            </div>
          </div>
          <div className="text-[10px] text-stone-500 mt-2 pt-2 border-t border-stone-200/60 flex justify-between">
            <span>หัก COGS ฿{monthCogs.toLocaleString()}</span>
            <span>หัก ค่าใช้จ่าย ฿{monthExpenses.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* 4. กราฟเปรียบเทียบยอดขายและกำไรย้อนหลัง 6 เดือน (Recharts) */}
      <section className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-stone-100">
          <div>
            <h3 className="font-bold text-stone-900 text-sm">
              เปรียบเทียบยอดขายและกำไรย้อนหลัง 6 เดือน
            </h3>
            <p className="text-[11px] text-stone-500">
              แนวโน้มยอดขายสุทธิเทียบกำไรสุทธิในแต่ละเดือน
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
              <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" /> ยอดขายสุทธิ
            </span>
            <span className="flex items-center gap-1.5 text-blue-700 font-medium">
              <span className="w-3 h-1.5 bg-blue-600 inline-block" /> กำไรสุทธิ
            </span>
          </div>
        </div>

        {/* Chart Container */}
        <div className="w-full h-64 sm:h-72 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={sixMonthsChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#78716c' }}
                axisLine={{ stroke: '#d6d3d1' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#78716c' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(val) => `฿${val >= 1000 ? `${Math.round(val / 1000)}k` : val}`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    return (
                      <div className="bg-stone-900 text-white p-3 rounded-xl shadow-lg text-xs space-y-1">
                        <div className="font-bold text-stone-200 border-b border-stone-700 pb-1">
                          เดือน {label} ({item.monthKey})
                        </div>
                        <div className="text-emerald-400 font-semibold">
                          ยอดขายสุทธิ: ฿{item.ยอดขายสุทธิ?.toLocaleString()}
                        </div>
                        <div className="text-blue-300 font-semibold">
                          กำไรสุทธิ: ฿{item.กำไรสุทธิ?.toLocaleString()}
                        </div>
                        <div className="text-amber-300 text-[11px] pt-1 border-t border-stone-800">
                          Food Cost: {item.foodCostPercent}%
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="ยอดขายสุทธิ" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={38} />
              <Line
                type="monotone"
                dataKey="กำไรสุทธิ"
                stroke="#2563eb"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#2563eb', strokeWidth: 1.5, stroke: '#ffffff' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* 1. สรุปยอดขายวันนี้และเดือนนี้ แยกตามช่องทาง (หน้าร้าน / เดลิเวอรี่แต่ละแพลตฟอร์ม) */}
      <section className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-stone-100">
          <div>
            <h3 className="font-bold text-stone-900 text-sm">
              ยอดขายแยกตามช่องทาง (หน้าร้าน & แพลตฟอร์มเดลิเวอรี่)
            </h3>
            <p className="text-[11px] text-stone-500">
              วิเคราะห์รายรับ ค่า GP ที่ถูกหัก และยอดสุทธิที่เข้ากระเป๋าจริง
            </p>
          </div>

          {/* สลับตัวเลือกระหว่าง "วันนี้" กับ "เดือนนี้" */}
          <div className="flex items-center p-1 bg-stone-100 rounded-xl self-start sm:self-auto">
            <button
              onClick={() => setSalesViewPeriod('today')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                salesViewPeriod === 'today'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              ยอดขายวันนี้
            </button>
            <button
              onClick={() => setSalesViewPeriod('month')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                salesViewPeriod === 'month'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              ยอดขายเดือนนี้
            </button>
          </div>
        </div>

        {/* ยอดรวมช่วงเวลาที่เลือก */}
        <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 mb-3.5 flex items-center justify-between">
          <span className="text-xs font-medium text-stone-600">
            {salesViewPeriod === 'today' ? 'ยอดรวมวันนี้ทั้งหมด:' : `ยอดรวมเดือนนี้ (${thisMonthStr}):`}
          </span>
          <div className="text-right">
            <span className="text-sm font-bold text-stone-900">
              ฿{periodGrossTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
            <span className="text-[11px] text-emerald-700 font-semibold ml-2">
              (สุทธิ ฿{(salesViewPeriod === 'today' ? todayNet : monthNet).toLocaleString(undefined, { maximumFractionDigits: 0 })})
            </span>
          </div>
        </div>

        {/* รายการแต่ละแพลตฟอร์ม */}
        <div className="space-y-2.5">
          {channelDataList.map((item) => {
            const sharePercent = periodGrossTotal > 0
              ? Math.round((item.gross / periodGrossTotal) * 100)
              : 0;

            return (
              <div
                key={item.channel.id}
                className="p-3 rounded-xl border border-stone-200 bg-stone-50/50 hover:bg-stone-50 transition-colors"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-stone-900">
                      {item.channel.name}
                    </span>
                    {item.channel.commissionRatePercent > 0 ? (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-medium">
                        GP {item.channel.commissionRatePercent}%
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-medium">
                        ไม่มี GP
                      </span>
                    )}
                    {item.orders > 0 && (
                      <span className="text-[10px] text-stone-400">
                        ({item.orders} บิล)
                      </span>
                    )}
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-stone-900">
                      ฿{item.gross.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                    <span className="text-[10px] text-stone-400 ml-1.5">
                      ({sharePercent}%)
                    </span>
                  </div>
                </div>

                {/* Progress Bar สัดส่วนยอดขาย */}
                <div className="w-full bg-stone-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-1.5 rounded-full"
                    style={{ width: `${sharePercent}%` }}
                  />
                </div>

                {/* รายละเอียดหัก GP และสุทธิ */}
                <div className="mt-1.5 text-[11px] text-stone-500 flex justify-between">
                  <span>
                    {item.comm > 0 ? (
                      <span className="text-amber-700">
                        หัก GP: -฿{item.comm.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    ) : (
                      <span className="text-emerald-600">รับเต็มไม่หัก</span>
                    )}
                  </span>
                  <span className="text-stone-700 font-semibold">
                    ยอดสุทธิเข้ากระเป๋า: ฿{item.net.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-stone-100 flex justify-end">
          <button
            onClick={() => onNavigate('income')}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
          >
            ไปที่หน้าบันทึกรายรับรายวัน <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>
    </div>
  );
};
