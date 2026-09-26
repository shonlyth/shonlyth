/**
 * หน้าหลัก (Dashboard View):
 * ภาพรวมรายรับ รายจ่าย กำไรสุทธิ และยอดหัก GP เดลิเวอรี่
 * พร้อมปุ่มลัดสำหรับบันทึกรายการด่วน
 */

import React from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { TabType } from '../layout/BottomNav';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  PlusCircle,
  ShoppingBag,
  ArrowRight,
  Layers
} from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (tab: TabType) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { data } = useRestaurant();
  const { incomes, expenses, settings } = data;
  const cogsRecords = data.cogsRecords || [];

  // คำนวณตัวเลขภาพรวมทั้งหมด
  const totalGrossIncome = incomes.reduce((sum, item) => sum + (Number(item.grossAmount) || 0), 0);
  const totalCommission = incomes.reduce((sum, item) => sum + (Number(item.commissionAmount) || 0), 0);
  const totalNetIncome = incomes.reduce((sum, item) => sum + (Number(item.netAmount) || 0), 0);

  // คำนวณต้นทุนวัตถุดิบ COGS
  const totalCogs = cogsRecords.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  // คำนวณรายจ่ายแยกตามประเภท
  const variableExpenses = expenses
    .filter((e) => e.costType === 'variable')
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0) + totalCogs;
  const fixedExpenses = expenses
    .filter((e) => e.costType === 'fixed')
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const totalExpenses = variableExpenses + fixedExpenses;

  // กำไรสุทธิ (Net Profit) = ยอดขายสุทธิหลังหัก GP - รายจ่ายทั้งหมด
  const netProfit = totalNetIncome - totalExpenses;

  // รวมยอดขายแยกตามช่องทาง
  const channelBreakdown = settings.salesChannels.map((channel) => {
    const channelIncomes = incomes.filter((inc) => inc.channelId === channel.id);
    const gross = channelIncomes.reduce((sum, i) => sum + (Number(i.grossAmount) || 0), 0);
    const comm = channelIncomes.reduce((sum, i) => sum + (Number(i.commissionAmount) || 0), 0);
    const net = channelIncomes.reduce((sum, i) => sum + (Number(i.netAmount) || 0), 0);
    return {
      channel,
      gross,
      comm,
      net,
      orderCount: channelIncomes.reduce((sum, i) => sum + (Number(i.orderCount) || 0), 0)
    };
  }).filter(c => c.gross > 0);

  // รายการล่าสุด (5 รายการ)
  const recentTransactions = [
    ...incomes.map((inc) => ({
      id: inc.id,
      date: inc.date,
      type: 'income' as const,
      title: `${inc.channelName} (${inc.notes || 'ยอดขาย'})`,
      amount: inc.grossAmount,
      net: inc.netAmount,
      commission: inc.commissionAmount
    })),
    ...cogsRecords.map((cogs) => ({
      id: cogs.id,
      date: cogs.date,
      type: 'expense' as const,
      title: `วัตถุดิบ [${cogs.category}]: ${cogs.title}`,
      amount: cogs.amount,
      net: cogs.amount,
      commission: 0
    })),
    ...expenses.map((exp) => ({
      id: exp.id,
      date: exp.date,
      type: 'expense' as const,
      title: `${exp.categoryName}: ${exp.title}`,
      amount: exp.amount,
      net: exp.amount,
      commission: 0
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

  return (
    <div className="space-y-5 pb-12">
      {/* ส่วนต้อนรับและปุ่มลัดบันทึกข้อมูล */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-emerald-800 to-teal-700 text-white p-4 sm:p-5 rounded-2xl shadow-sm">
        <div>
          <span className="text-[11px] font-medium tracking-wide uppercase text-emerald-200">
            ระบบบัญชีร้านอาหาร
          </span>
          <h2 className="text-lg sm:text-xl font-bold mt-0.5">
            {settings.restaurantName}
          </h2>
          <p className="text-xs text-emerald-100 mt-1">
            บันทึกรายรับ แยก GP เดลิเวอรี่ และควบคุมต้นทุนอาหาร
          </p>
        </div>

        {/* ปุ่มลัด Action ด่วน */}
        <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0">
          <button
            onClick={() => onNavigate('income')}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-white text-emerald-800 font-semibold rounded-xl text-xs shadow-xs hover:bg-emerald-50 transition-colors"
          >
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            + บันทึกรายรับ
          </button>
          <button
            onClick={() => onNavigate('cogs')}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-700/80 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs transition-colors border border-emerald-500/40"
          >
            <ShoppingBag className="w-4 h-4 text-amber-300" />
            + ต้นทุน COGS
          </button>
          <button
            onClick={() => onNavigate('expenses')}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-900/60 hover:bg-emerald-900/80 text-white font-medium rounded-xl text-xs transition-colors border border-emerald-600/40"
          >
            <TrendingDown className="w-4 h-4 text-red-300" />
            + บันทึกรายจ่าย
          </button>
        </div>
      </div>

      {/* สรุปตัวเลขทางการเงิน (Financial Metric Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* ยอดขายรวม (Gross) */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-1">
            <span className="text-xs font-medium">ยอดขายรวม (Gross)</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-stone-900">
            ฿{totalGrossIncome.toLocaleString()}
          </div>
          <div className="text-[11px] text-stone-500 mt-0.5">
            ยอดก่อนหัก GP เดลิเวอรี่
          </div>
        </div>

        {/* ค่า GP ที่โดนหัก */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-1">
            <span className="text-xs font-medium">ค่าคอมมิชชั่น GP รวม</span>
            <Percent className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-amber-600">
            -฿{totalCommission.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-stone-500 mt-0.5">
            หักเข้าแพลตฟอร์มเดลิเวอรี่
          </div>
        </div>

        {/* รายจ่ายรวมทั้งหมด */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-1">
            <span className="text-xs font-medium">รายจ่ายรวมทั้งหมด</span>
            <TrendingDown className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-red-600">
            ฿{totalExpenses.toLocaleString()}
          </div>
          <div className="text-[11px] text-stone-500 mt-0.5">
            คงที่ ฿{fixedExpenses.toLocaleString()} | ผันแปร ฿{variableExpenses.toLocaleString()}
          </div>
        </div>

        {/* กำไรสุทธิ (Net Profit) */}
        <div className={`p-3.5 sm:p-4 rounded-xl border shadow-xs ${
          netProfit >= 0 ? 'bg-emerald-50/70 border-emerald-200' : 'bg-red-50/70 border-red-200'
        }`}>
          <div className="flex items-center justify-between text-stone-600 mb-1">
            <span className="text-xs font-semibold">กำไรสุทธิ (Net Profit)</span>
            <DollarSign className={`w-4 h-4 ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
          </div>
          <div className={`text-lg sm:text-xl font-bold ${
            netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'
          }`}>
            {netProfit >= 0 ? '+' : ''}฿{netProfit.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-stone-500 mt-0.5">
            (ยอดรับสุทธิ - รายจ่ายรวม)
          </div>
        </div>
      </div>

      {/* สรุปยอดขายแยกช่องทาง (Sales Channel Breakdown) */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-xs">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-emerald-600" />
            <h3 className="font-semibold text-stone-900 text-sm">
              ยอดขายแยกตามช่องทาง & GP เดลิเวอรี่
            </h3>
          </div>
          <button
            onClick={() => onNavigate('income')}
            className="text-xs text-emerald-600 font-medium hover:underline flex items-center gap-1"
          >
            ดูทั้งหมด <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {channelBreakdown.length === 0 ? (
          <div className="py-6 text-center text-xs text-stone-400">
            ยังไม่มีรายการยอดขายบันทึกไว้
          </div>
        ) : (
          <div className="space-y-3">
            {channelBreakdown.map((item) => {
              const percentOfTotal = totalGrossIncome > 0
                ? Math.round((item.gross / totalGrossIncome) * 100)
                : 0;

              return (
                <div key={item.channel.id} className="p-3 rounded-xl bg-stone-50/70 border border-stone-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-stone-800">
                        {item.channel.name}
                      </span>
                      {item.channel.commissionRatePercent > 0 && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-medium">
                          GP {item.channel.commissionRatePercent}%
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-stone-900">
                        ฿{item.gross.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-stone-500">
                        สุทธิ ฿{item.net.toLocaleString(undefined, { maximumFractionDigits: 0 })} ({percentOfTotal}%)
                      </div>
                    </div>
                  </div>

                  {/* แถบ Progress แสดงสัดส่วน */}
                  <div className="w-full bg-stone-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-1.5 rounded-full"
                      style={{ width: `${percentOfTotal}%` }}
                    />
                  </div>

                  {item.comm > 0 && (
                    <div className="mt-1.5 text-[11px] text-stone-500 flex justify-between">
                      <span>โดนหัก GP รวม:</span>
                      <span className="text-amber-700 font-medium">
                        -฿{item.comm.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* รายการล่าสุด (Recent Transactions) */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-xs">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600" />
            <h3 className="font-semibold text-stone-900 text-sm">รายการบันทึกล่าสุด</h3>
          </div>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="py-6 text-center text-xs text-stone-400">
            ยังไม่มีประวัติการบันทึกรายการ
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {recentTransactions.map((tx) => (
              <div key={tx.id} className="py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    tx.type === 'income'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {tx.type === 'income' ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-stone-900 truncate">
                      {tx.title}
                    </p>
                    <p className="text-[10px] text-stone-500">{tx.date}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className={`text-xs font-bold ${
                    tx.type === 'income' ? 'text-emerald-700' : 'text-red-700'
                  }`}>
                    {tx.type === 'income' ? '+' : '-'}฿{tx.amount.toLocaleString()}
                  </p>
                  {tx.type === 'income' && tx.commission > 0 && (
                    <p className="text-[10px] text-stone-500">
                      สุทธิ ฿{tx.net.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
