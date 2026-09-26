/**
 * หน้ารายงานกำไร-ขาดทุน (P&L Report View) แบบละเอียด:
 * 1. เลือกช่วงเวลาดูรายงานได้ (รายเดือน / กำหนดช่วงวันที่เอง / ไตรมาส / ปี / ทั้งหมด)
 * 2. แสดงรายละเอียดครบถ้วน:
 *    - รายรับสุทธิแต่ละช่องทางการขาย (หน้าร้าน + แพลตฟอร์มเดลิเวอรี่ พร้อมหัก GP)
 *    - รวมต้นทุนขาย (COGS) แยกตามหมวดหมู่วัตถุดิบ พร้อม % Food Cost ต่อยอดขายสุทธิ
 *    - รวมค่าใช้จ่ายคงที่ (Fixed Costs) และผันแปร (Variable Costs) แยกรายการ
 *    - สรุปกำไร/ขาดทุนสุทธิ (Net Operating Profit) และอัตรากำไร %
 * 3. กราฟ % Food Cost ย้อนหลัง 12 เดือน พร้อมเส้น Threshold เป้าหมายและเกณฑ์เฝ้าระวัง
 * 4. กราฟเปรียบเทียบกำไรสุทธิและรายรับรายเดือน 12 เดือน
 * 5. ฟีเจอร์พิมพ์รายงาน / บันทึกเป็น PDF (Print-ready) และ Export ข้อมูลเป็น Excel/CSV
 */

import React, { useState, useMemo, useRef } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell
} from 'recharts';
import {
  FileSpreadsheet,
  Printer,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Percent,
  Sparkles,
  ArrowRight,
  Filter,
  Layers,
  UtensilsCrossed,
  Clock,
  ShieldAlert,
  FileText
} from 'lucide-react';

export type ReportPeriodType =
  | 'this_month'
  | 'last_month'
  | 'select_month'
  | 'custom_range'
  | 'this_quarter'
  | 'this_year'
  | 'all';

export const ReportView: React.FC = () => {
  const { data } = useRestaurant();
  const { settings, incomes, expenses } = data;
  const cogsRecords = data.cogsRecords || [];

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const thisMonthStr = todayStr.substring(0, 7); // e.g. "2026-09"

  // 1. การเลือกช่วงเวลาดูรายงาน (Period Selection)
  const [periodType, setPeriodType] = useState<ReportPeriodType>('this_month');
  const [selectedMonth, setSelectedMonth] = useState<string>(thisMonthStr);
  const [customStartDate, setCustomStartDate] = useState<string>(`${thisMonthStr}-01`);
  const [customEndDate, setCustomEndDate] = useState<string>(todayStr);

  // แท็บสลับดูกราฟย้อนหลัง 12 เดือน: 'food_cost' (Food Cost %) หรือ 'profit' (กำไรสุทธิ) หรือ 'both'
  const [chartViewTab, setChartViewTab] = useState<'food_cost' | 'profit'>('food_cost');

  // คำนวณช่วงวันที่เริ่มต้น - สิ้นสุด ตามตัวเลือก
  const { startDate, endDate, periodLabel } = useMemo(() => {
    if (periodType === 'this_month') {
      const year = now.getFullYear();
      const month = now.getMonth();
      const lastDay = new Date(year, month + 1, 0).getDate();
      const s = `${thisMonthStr}-01`;
      const e = `${thisMonthStr}-${String(lastDay).padStart(2, '0')}`;
      const thaiMonth = new Intl.DateTimeFormat('th-TH', { month: 'long', year: 'numeric' }).format(now);
      return { startDate: s, endDate: e, periodLabel: `เดือนนี้ (${thaiMonth})` };
    }

    if (periodType === 'last_month') {
      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const mStr = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;
      const lastDay = new Date(lastMonthDate.getFullYear(), lastMonthDate.getMonth() + 1, 0).getDate();
      const s = `${mStr}-01`;
      const e = `${mStr}-${String(lastDay).padStart(2, '0')}`;
      const thaiMonth = new Intl.DateTimeFormat('th-TH', { month: 'long', year: 'numeric' }).format(lastMonthDate);
      return { startDate: s, endDate: e, periodLabel: `เดือนก่อนหน้า (${thaiMonth})` };
    }

    if (periodType === 'select_month') {
      const [y, m] = selectedMonth.split('-').map(Number);
      const d = new Date(y, m - 1, 1);
      const lastDay = new Date(y, m, 0).getDate();
      const s = `${selectedMonth}-01`;
      const e = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`;
      const thaiMonth = new Intl.DateTimeFormat('th-TH', { month: 'long', year: 'numeric' }).format(d);
      return { startDate: s, endDate: e, periodLabel: `ประจำเดือน ${thaiMonth}` };
    }

    if (periodType === 'this_quarter') {
      const currentMonth = now.getMonth();
      const qStartMonth = Math.floor(currentMonth / 3) * 3;
      const quarterNum = Math.floor(currentMonth / 3) + 1;
      const startD = new Date(now.getFullYear(), qStartMonth, 1);
      const endD = new Date(now.getFullYear(), qStartMonth + 3, 0);
      const s = `${startD.getFullYear()}-${String(startD.getMonth() + 1).padStart(2, '0')}-01`;
      const e = `${endD.getFullYear()}-${String(endD.getMonth() + 1).padStart(2, '0')}-${String(endD.getDate()).padStart(2, '0')}`;
      return { startDate: s, endDate: e, periodLabel: `ไตรมาสที่ ${quarterNum} (${startD.getFullYear() + 543})` };
    }

    if (periodType === 'this_year') {
      const y = now.getFullYear();
      return { startDate: `${y}-01-01`, endDate: `${y}-12-31`, periodLabel: `ปี พ.ศ. ${y + 543}` };
    }

    if (periodType === 'custom_range') {
      const s = customStartDate || todayStr;
      const e = customEndDate || todayStr;
      return { startDate: s, endDate: e, periodLabel: `${s} ถึง ${e}` };
    }

    // 'all'
    return { startDate: '2000-01-01', endDate: '2099-12-31', periodLabel: 'ข้อมูลทั้งหมดที่มีในระบบ' };
  }, [periodType, selectedMonth, customStartDate, customEndDate, now, thisMonthStr]);

  // =========================================================================
  // การกรองข้อมูลตามช่วงเวลา (Transaction Filtering)
  // =========================================================================
  const filteredIncomes = useMemo(() => {
    return incomes.filter((i) => i.date >= startDate && i.date <= endDate);
  }, [incomes, startDate, endDate]);

  const filteredCogs = useMemo(() => {
    return cogsRecords.filter((c) => c.date >= startDate && c.date <= endDate);
  }, [cogsRecords, startDate, endDate]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (e.isMonthlyFixed && e.month) {
        // ถ้ารายการเป็นค่าใช้จ่ายประจำเดือน ตรวจสอบว่าเดือนตรงกับช่วงที่เลือกหรือไม่
        const expMonthStart = `${e.month}-01`;
        return expMonthStart >= startDate.substring(0, 7) + '-01' && expMonthStart <= endDate;
      }
      return e.date >= startDate && e.date <= endDate;
    });
  }, [expenses, startDate, endDate]);

  // =========================================================================
  // 2. คำนวณรายละเอียด: รายรับสุทธิแต่ละช่องทาง (Net Revenue by Channel)
  // =========================================================================
  const channelBreakdown = useMemo(() => {
    const channelMap = new Map<
      string,
      {
        channelId: string;
        channelName: string;
        commissionRatePercent: number;
        color?: string;
        grossAmount: number;
        commissionAmount: number;
        netAmount: number;
        orderCount: number;
      }
    >();

    // เริ่มต้นจากช่องทางที่มีใน Settings
    settings.salesChannels.forEach((ch) => {
      channelMap.set(ch.id, {
        channelId: ch.id,
        channelName: ch.name,
        commissionRatePercent: ch.commissionRatePercent || 0,
        color: ch.color,
        grossAmount: 0,
        commissionAmount: 0,
        netAmount: 0,
        orderCount: 0
      });
    });

    // บวกยอดจากรายการ Incomes ที่กรองได้
    filteredIncomes.forEach((inc) => {
      const existing = channelMap.get(inc.channelId) || {
        channelId: inc.channelId,
        channelName: inc.channelName || 'ช่องทางอื่นๆ',
        commissionRatePercent: inc.commissionRatePercent || 0,
        grossAmount: 0,
        commissionAmount: 0,
        netAmount: 0,
        orderCount: 0
      };

      existing.grossAmount += Number(inc.grossAmount) || 0;
      existing.commissionAmount += Number(inc.commissionAmount) || 0;
      existing.netAmount += Number(inc.netAmount) || 0;
      existing.orderCount += Number(inc.orderCount) || 0;

      channelMap.set(inc.channelId, existing);
    });

    return Array.from(channelMap.values())
      .filter((item) => item.grossAmount > 0 || settings.salesChannels.some((c) => c.id === item.channelId && c.isActive))
      .sort((a, b) => b.netAmount - a.netAmount);
  }, [settings.salesChannels, filteredIncomes]);

  const totalGrossSales = filteredIncomes.reduce((s, i) => s + (Number(i.grossAmount) || 0), 0);
  const totalGPCommission = filteredIncomes.reduce((s, i) => s + (Number(i.commissionAmount) || 0), 0);
  const totalNetSales = totalGrossSales - totalGPCommission;
  const totalOrders = filteredIncomes.reduce((s, i) => s + (Number(i.orderCount) || 0), 0);
  const avgOrderTicket = totalOrders > 0 ? totalNetSales / totalOrders : 0;

  // =========================================================================
  // 2. คำนวณรายละเอียด: รวมต้นทุนขายแยกหมวดหมู่ (COGS Breakdown by Category)
  // =========================================================================
  const cogsBreakdown = useMemo(() => {
    const catMap = new Map<string, number>();

    // เริ่มต้นจากหมวดหมู่ COGS ใน Settings
    const defaultCats = settings.cogsCategories || ['เนื้อสัตว์', 'ผัก', 'ของแห้ง', 'เครื่องปรุง', 'อื่นๆ'];
    defaultCats.forEach((c) => catMap.set(c, 0));

    filteredCogs.forEach((c) => {
      const cat = c.category || 'อื่นๆ';
      const cur = catMap.get(cat) || 0;
      catMap.set(cat, cur + (Number(c.amount) || 0));
    });

    const totalCogsAmount = Array.from(catMap.values()).reduce((a, b) => a + b, 0);

    return Array.from(catMap.entries())
      .map(([category, amount]) => {
        const shareOfCogs = totalCogsAmount > 0 ? (amount / totalCogsAmount) * 100 : 0;
        const foodCostPercent = totalNetSales > 0 ? (amount / totalNetSales) * 100 : 0;
        return {
          category,
          amount,
          shareOfCogs,
          foodCostPercent
        };
      })
      .filter((item) => item.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [settings.cogsCategories, filteredCogs, totalNetSales]);

  const totalCogs = filteredCogs.reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const overallFoodCostPercent = totalNetSales > 0 ? (totalCogs / totalNetSales) * 100 : 0;

  // =========================================================================
  // 2. คำนวณรายละเอียด: รวมค่าใช้จ่ายคงที่ / ผันแปร แยกรายการ (Itemized Expenses)
  // =========================================================================
  // ค่าใช้จ่ายผันแปร (Variable Costs)
  const variableExpensesList = useMemo(() => {
    return filteredExpenses.filter((e) => e.costType === 'variable');
  }, [filteredExpenses]);

  const otherVariableTotal = variableExpensesList.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  // รวมต้นทุนผันแปรทั้งหมด = วัตถุดิบ COGS + ค่าใช้จ่ายผันแปรอื่นๆ (บรรจุภัณฑ์, แก๊ส ฯลฯ)
  const totalVariableCosts = totalCogs + otherVariableTotal;

  // กำไรส่วนเกิน / กำไรขั้นต้น (Contribution Margin / Gross Profit)
  const grossProfit = totalNetSales - totalVariableCosts;
  const grossProfitMargin = totalNetSales > 0 ? (grossProfit / totalNetSales) * 100 : 0;

  // ค่าใช้จ่ายคงที่ (Fixed Costs)
  const fixedExpensesList = useMemo(() => {
    return filteredExpenses.filter((e) => e.costType === 'fixed');
  }, [filteredExpenses]);

  const totalFixedCosts = fixedExpensesList.reduce((s, e) => s + (Number(e.amount) || 0), 0);

  // กำไรสุทธิจากการดำเนินงาน (Net Operating Profit)
  const netOperatingProfit = grossProfit - totalFixedCosts;
  const netProfitMargin = totalNetSales > 0 ? (netOperatingProfit / totalNetSales) * 100 : 0;

  // รวมค่าใช้จ่ายดำเนินงานทั้งหมด (Total Operating Expenses)
  const totalAllExpenses = otherVariableTotal + totalFixedCosts;

  // สรุปค่าใช้จ่ายแยกตามหมวดหมู่ (Expense Category Breakdown)
  const categoryExpensesSummary = useMemo(() => {
    return settings.expenseCategories.map((cat) => {
      const catExpenses = filteredExpenses.filter((e) => e.categoryId === cat.id);
      const total = catExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
      const count = catExpenses.length;
      return {
        cat,
        total,
        count,
        percentOfSales: totalNetSales > 0 ? (total / totalNetSales) * 100 : 0
      };
    }).filter((c) => c.total > 0).sort((a, b) => b.total - a.total);
  }, [settings.expenseCategories, filteredExpenses, totalNetSales]);

  // =========================================================================
  // 3 & 4. กราฟย้อนหลัง 12 เดือน (% Food Cost และ เปรียบเทียบกำไรสุทธิ)
  // =========================================================================
  const twelveMonthsData = useMemo(() => {
    const list = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const mLabel = new Intl.DateTimeFormat('th-TH', { month: 'short' }).format(d);
      const yearShort = (d.getFullYear() + 543).toString().slice(-2);
      const displayLabel = `${mLabel} ${yearShort}`;

      // ยอดขายเดือนนี้
      const mIncs = incomes.filter((item) => item.date.startsWith(mStr));
      const mGross = mIncs.reduce((s, item) => s + (Number(item.grossAmount) || 0), 0);
      const mComm = mIncs.reduce((s, item) => s + (Number(item.commissionAmount) || 0), 0);
      const mNet = mGross - mComm;

      // ต้นทุนขาย (COGS)
      const mCogs = cogsRecords
        .filter((c) => c.date.startsWith(mStr))
        .reduce((s, c) => s + (Number(c.amount) || 0), 0);

      // ค่าใช้จ่ายผันแปรอื่นๆ และค่าใช้จ่ายคงที่
      const mExp = expenses
        .filter((e) => e.month === mStr || e.date.startsWith(mStr))
        .reduce((s, e) => s + (Number(e.amount) || 0), 0);

      // คำนวณตัวชี้วัด
      const mTotalCosts = mCogs + mExp;
      const mNetProfit = mNet - mTotalCosts;
      const mFoodCostPct = mNet > 0 ? parseFloat(((mCogs / mNet) * 100).toFixed(1)) : 0;
      const mProfitMarginPct = mNet > 0 ? parseFloat(((mNetProfit / mNet) * 100).toFixed(1)) : 0;

      const targetFoodCost = settings.targetFoodCostPercent ?? 32;
      const alertThreshold = (settings.targetFoodCostPercent ?? 32) + (settings.foodCostAlertThresholdPercent ?? 5);

      list.push({
        monthKey: mStr,
        label: displayLabel,
        rawMonth: mLabel,
        grossSales: Math.round(mGross),
        netSales: Math.round(mNet),
        cogs: Math.round(mCogs),
        expenses: Math.round(mExp),
        totalCosts: Math.round(mTotalCosts),
        netProfit: Math.round(mNetProfit),
        foodCostPercent: mFoodCostPct,
        profitMarginPercent: mProfitMarginPct,
        isAlert: mFoodCostPct >= alertThreshold,
        isAboveTarget: mFoodCostPct > targetFoodCost,
        targetFoodCost
      });
    }
    return list;
  }, [incomes, cogsRecords, expenses, settings, now]);

  // สถิติย้อนหลัง 12 เดือน
  const stats12m = useMemo(() => {
    const validMonths = twelveMonthsData.filter((m) => m.netSales > 0);
    if (validMonths.length === 0) return { avgFoodCost: 0, lowestFoodCost: 0, highestFoodCost: 0, totalProfit: 0, avgMonthlyProfit: 0, bestMonth: '-' };

    const totalProfit = validMonths.reduce((s, m) => s + m.netProfit, 0);
    const avgProfit = Math.round(totalProfit / validMonths.length);
    const avgFc = parseFloat((validMonths.reduce((s, m) => s + m.foodCostPercent, 0) / validMonths.length).toFixed(1));

    const sortedByFc = [...validMonths].sort((a, b) => a.foodCostPercent - b.foodCostPercent);
    const lowestFc = sortedByFc[0];
    const highestFc = sortedByFc[sortedByFc.length - 1];

    const sortedByProfit = [...validMonths].sort((a, b) => b.netProfit - a.netProfit);
    const bestProfitMonth = sortedByProfit[0];

    return {
      avgFoodCost: avgFc,
      lowestFoodCost: lowestFc.foodCostPercent,
      lowestMonthName: lowestFc.label,
      highestFoodCost: highestFc.foodCostPercent,
      highestMonthName: highestFc.label,
      totalProfit,
      avgMonthlyProfit: avgProfit,
      bestMonth: bestProfitMonth.label,
      bestProfit: bestProfitMonth.netProfit
    };
  }, [twelveMonthsData]);

  // =========================================================================
  // 5. ฟังก์ชัน Print / Export PDF และ Export CSV
  // =========================================================================
  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    // ส่งออกข้อมูลรายงาน P&L ในช่วงที่เลือกเป็นไฟล์ CSV (UTF-8 BOM สำหรับเปิดใน Excel ภาษาไทย)
    const bom = '\uFEFF';
    let csv = `${bom}`;

    csv += `รายงานงบกำไร-ขาดทุน (Profit & Loss Statement)\n`;
    csv += `ร้าน: "${settings.restaurantName || ''}" สาขา: "${settings.branchName || ''}"\n`;
    csv += `ช่วงเวลาที่เลือก: ${periodLabel} (${startDate} ถึง ${endDate})\n`;
    csv += `วันที่ออกรายงาน: ${new Date().toLocaleString('th-TH')}\n\n`;

    // 1. สรุปรายรับสุทธิแต่ละช่องทาง
    csv += `1. รายรับสุทธิแยกตามช่องทาง (Revenue by Channel)\n`;
    csv += `ช่องทางการขาย,ยอดขายรวม (Gross),หักค่า GP (%),จำนวนเงินหัก GP,ยอดขายสุทธิที่ได้รับ (Net),สัดส่วน %,จำนวนบิล\n`;
    channelBreakdown.forEach((ch) => {
      const share = totalNetSales > 0 ? ((ch.netAmount / totalNetSales) * 100).toFixed(1) : '0';
      csv += `"${ch.channelName}",${ch.grossAmount},${ch.commissionRatePercent}%,${ch.commissionAmount},${ch.netAmount},${share}%,${ch.orderCount}\n`;
    });
    csv += `รวมรายรับสุทธิทั้งหมด,${totalGrossSales},-,${totalGPCommission},${totalNetSales},100%,${totalOrders}\n\n`;

    // 2. ต้นทุนขายแยกหมวดหมู่
    csv += `2. รวมต้นทุนขายแยกหมวดหมู่วัตถุดิบ (COGS Breakdown)\n`;
    csv += `หมวดหมู่วัตถุดิบ,จำนวนเงิน (บาท),สัดส่วน % ต่อ COGS,% Food Cost ต่อยอดขายสุทธิ\n`;
    cogsBreakdown.forEach((cg) => {
      csv += `"${cg.category}",${cg.amount},${cg.shareOfCogs.toFixed(1)}%,${cg.foodCostPercent.toFixed(1)}%\n`;
    });
    csv += `รวมต้นทุนขาย (COGS),${totalCogs},100%,${overallFoodCostPercent.toFixed(1)}%\n\n`;

    // 3. ค่าใช้จ่ายผันแปร
    csv += `3. รวมค่าใช้จ่ายผันแปร (Variable Expenses)\n`;
    csv += `รายการ,ประเภท,จำนวนเงิน (บาท),% ต่อยอดขายสุทธิ\n`;
    csv += `"ต้นทุนวัตถุดิบ (COGS)",ผันแปร,${totalCogs},${overallFoodCostPercent.toFixed(1)}%\n`;
    variableExpensesList.forEach((e) => {
      const pct = totalNetSales > 0 ? ((e.amount / totalNetSales) * 100).toFixed(1) : '0';
      csv += `"${e.title} (${e.categoryName})",ผันแปร,${e.amount},${pct}%\n`;
    });
    csv += `รวมค่าใช้จ่ายผันแปรทั้งหมด,,${totalVariableCosts},${totalNetSales > 0 ? ((totalVariableCosts / totalNetSales) * 100).toFixed(1) : 0}%\n`;
    csv += `กำไรขั้นต้น (Gross Profit),,${grossProfit},${grossProfitMargin.toFixed(1)}%\n\n`;

    // 4. ค่าใช้จ่ายคงที่
    csv += `4. รวมค่าใช้จ่ายคงที่ (Fixed Costs)\n`;
    csv += `รายการ,ประเภท,จำนวนเงิน (บาท),% ต่อยอดขายสุทธิ\n`;
    fixedExpensesList.forEach((e) => {
      const pct = totalNetSales > 0 ? ((e.amount / totalNetSales) * 100).toFixed(1) : '0';
      csv += `"${e.title} (${e.categoryName})",คงที่,${e.amount},${pct}%\n`;
    });
    csv += `รวมค่าใช้จ่ายคงที่ทั้งหมด,,${totalFixedCosts},${totalNetSales > 0 ? ((totalFixedCosts / totalNetSales) * 100).toFixed(1) : 0}%\n\n`;

    // 5. สรุปกำไรสุทธิ
    csv += `5. สรุปกำไรสุทธิ (Net Operating Profit)\n`;
    csv += `รายการ,จำนวนเงิน (บาท),% ต่อยอดขายสุทธิ\n`;
    csv += `ยอดขายสุทธิ (Net Revenue),${totalNetSales},100%\n`;
    csv += `หัก: รวมค่าใช้จ่ายผันแปร,-${totalVariableCosts},${totalNetSales > 0 ? ((totalVariableCosts / totalNetSales) * 100).toFixed(1) : 0}%\n`;
    csv += `กำไรขั้นต้น (Gross Profit),${grossProfit},${grossProfitMargin.toFixed(1)}%\n`;
    csv += `หัก: รวมค่าใช้จ่ายคงที่,-${totalFixedCosts},${totalNetSales > 0 ? ((totalFixedCosts / totalNetSales) * 100).toFixed(1) : 0}%\n`;
    csv += `กำไรจากการดำเนินงานสุทธิ (Net Profit),${netOperatingProfit},${netProfitMargin.toFixed(1)}%\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `PNL_Report_${settings.restaurantName || 'restaurant'}_${startDate}_${endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // รายการเดือนที่มีให้เลือก
  const availableMonthOptions = useMemo(() => {
    const list = [];
    for (let i = 0; i < 18; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = new Intl.DateTimeFormat('th-TH', { month: 'long', year: 'numeric' }).format(d);
      list.push({ val, label });
    }
    return list;
  }, [now]);

  const targetFoodCost = settings.targetFoodCostPercent ?? 32;
  const alertThreshold = (settings.targetFoodCostPercent ?? 32) + (settings.foodCostAlertThresholdPercent ?? 5);

  return (
    <div className="space-y-6 pb-16 print:p-0 print:space-y-4 print:pb-0">
      {/* ========================================================================= */}
      {/* หัวกระดาษสำหรับพิมพ์ (Print Only Header - A4 Friendly) */}
      {/* ========================================================================= */}
      <div className="hidden print:block border-b-2 border-stone-800 pb-4 mb-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">
              {settings.restaurantName || 'ร้านอาหาร'}
            </h1>
            <p className="text-xs text-stone-600">
              สาขา: {settings.branchName || 'สำนักงานใหญ่'} • โทรศัพท์: {settings.phoneNumber || '-'}
              {settings.taxId ? ` • เลขประจำตัวผู้เสียภาษี: ${settings.taxId}` : ''}
            </p>
          </div>
          <div className="text-right">
            <span className="inline-block px-2.5 py-1 text-xs font-bold uppercase tracking-wider bg-stone-100 text-stone-800 rounded border border-stone-300">
              รายงานงบกำไร-ขาดทุน (P&L Statement)
            </span>
            <p className="text-[11px] text-stone-500 mt-1">
              วันที่พิมพ์: {new Intl.DateTimeFormat('th-TH', { dateStyle: 'long', timeStyle: 'short' }).format(new Date())}
            </p>
          </div>
        </div>
        <div className="mt-2.5 p-2 bg-stone-50 border border-stone-200 rounded text-xs flex justify-between">
          <span><strong>รอบระยะเวลารายงาน:</strong> {periodLabel}</span>
          <span><strong>ช่วงวันที่:</strong> {startDate} ถึง {endDate}</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* แถบด้านบน: หัวข้อ, ปุ่มเลือกช่วงเวลา, และปุ่ม Export/Print (Screen Only) */}
      {/* ========================================================================= */}
      <div className="print:hidden space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center shadow-xs">
                <FileSpreadsheet className="w-4.5 h-4.5" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-stone-900 tracking-tight">
                รายงานกำไร-ขาดทุน (P&L Statement)
              </h2>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              สรุปรายรับสุทธิ ต้นทุนขาย COGS ค่าใช้จ่ายคงที่/ผันแปร และวิเคราะห์สุขภาพการเงินของร้าน
            </p>
          </div>

          {/* 5. ปุ่ม Print/PDF และ Export CSV */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handlePrint}
              title="พิมพ์รายงานหรือบันทึกเป็น PDF"
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์ / PDF</span>
            </button>

            <button
              onClick={handleExportCsv}
              title="ส่งออกข้อมูล P&L เป็นไฟล์ CSV/Excel"
              className="flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold border border-stone-200 shadow-xs transition-colors"
            >
              <Download className="w-4 h-4 text-emerald-700" />
              <span>Excel/CSV</span>
            </button>
          </div>
        </div>

        {/* 1. เครื่องมือเลือกช่วงเวลาดูรายงาน (Period Selection Bar) */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>เลือกช่วงเวลาดูรายงาน</span>
            </div>
            <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              {periodLabel}
            </span>
          </div>

          {/* ปุ่มตัวเลือก Preset แบบด่วน */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-stone-100 rounded-xl">
            <button
              onClick={() => setPeriodType('this_month')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                periodType === 'this_month'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              เดือนนี้
            </button>
            <button
              onClick={() => setPeriodType('last_month')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                periodType === 'last_month'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              เดือนที่แล้ว
            </button>
            <button
              onClick={() => setPeriodType('select_month')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                periodType === 'select_month'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              เลือกเดือน...
            </button>
            <button
              onClick={() => setPeriodType('custom_range')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                periodType === 'custom_range'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              กำหนดช่วงเอง...
            </button>
            <button
              onClick={() => setPeriodType('this_quarter')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                periodType === 'this_quarter'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              ไตรมาสนี้
            </button>
            <button
              onClick={() => setPeriodType('this_year')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                periodType === 'this_year'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              ปีนี้
            </button>
            <button
              onClick={() => setPeriodType('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                periodType === 'all'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              ทั้งหมด
            </button>
          </div>

          {/* รายละเอียดเพิ่มเติมเมื่อเลือก "เลือกเดือน" */}
          {periodType === 'select_month' && (
            <div className="pt-2 flex items-center gap-3">
              <label className="text-xs font-medium text-stone-600">เลือกเดือนที่ต้องการดู:</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {availableMonthOptions.map((opt) => (
                  <option key={opt.val} value={opt.val}>
                    {opt.label} ({opt.val})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* รายละเอียดเพิ่มเติมเมื่อเลือก "กำหนดช่วงเอง" */}
          {periodType === 'custom_range' && (
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-stone-500">จากวันที่:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-2.5 py-1 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-stone-500">ถึงวันที่:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-2.5 py-1 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <span className="text-[11px] text-stone-400">
                (กรองตามวันที่บันทึกรายรับ-รายจ่าย)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4 การ์ดสรุปตัวเลข P&L สำคัญ (Executive Summary KPI Cards) */}
      {/* ========================================================================= */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 print:grid-cols-4 print:gap-2">
        {/* การ์ด 1: ยอดขายสุทธิ */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-1">
            <span className="text-xs font-medium">ยอดขายสุทธิ (Net Sales)</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-base sm:text-xl font-bold text-stone-900 tracking-tight">
            ฿{Math.round(totalNetSales).toLocaleString()}
          </div>
          <div className="text-[11px] text-stone-500 mt-1 flex justify-between">
            <span>ก่อนหัก GP: ฿{Math.round(totalGrossSales).toLocaleString()}</span>
            {totalOrders > 0 && <span className="font-medium text-stone-600">{totalOrders} บิล</span>}
          </div>
        </div>

        {/* การ์ด 2: ต้นทุนขายวัตถุดิบ (COGS) */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-1">
            <span className="text-xs font-medium">ต้นทุนขาย (Food Cost)</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              overallFoodCostPercent > alertThreshold
                ? 'bg-red-100 text-red-800'
                : overallFoodCostPercent > targetFoodCost
                ? 'bg-amber-100 text-amber-800'
                : 'bg-emerald-100 text-emerald-800'
            }`}>
              {overallFoodCostPercent.toFixed(1)}%
            </span>
          </div>
          <div className="text-base sm:text-xl font-bold text-stone-900 tracking-tight">
            ฿{Math.round(totalCogs).toLocaleString()}
          </div>
          <div className="text-[11px] text-stone-500 mt-1 flex items-center justify-between">
            <span>เป้าหมายร้าน: {targetFoodCost}%</span>
            {overallFoodCostPercent > targetFoodCost ? (
              <span className="text-amber-600 font-semibold">เกินเป้า +{(overallFoodCostPercent - targetFoodCost).toFixed(1)}%</span>
            ) : (
              <span className="text-emerald-600 font-semibold">ตามเป้าหมาย</span>
            )}
          </div>
        </div>

        {/* การ์ด 3: ค่าใช้จ่ายดำเนินงานรวม */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-1">
            <span className="text-xs font-medium">ค่าใช้จ่ายร้าน (Expenses)</span>
            <TrendingDown className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-base sm:text-xl font-bold text-stone-900 tracking-tight">
            ฿{Math.round(totalAllExpenses).toLocaleString()}
          </div>
          <div className="text-[11px] text-stone-500 mt-1 flex justify-between">
            <span>คงที่: ฿{Math.round(totalFixedCosts).toLocaleString()}</span>
            <span>ผันแปร: ฿{Math.round(otherVariableTotal).toLocaleString()}</span>
          </div>
        </div>

        {/* การ์ด 4: กำไรจากการดำเนินงานสุทธิ */}
        <div className={`p-3.5 sm:p-4 rounded-2xl border shadow-xs ${
          netOperatingProfit >= 0
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
            : 'bg-red-50/70 border-red-200 text-red-950'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold">กำไรสุทธิ (Net Profit)</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              netOperatingProfit >= 0 ? 'bg-emerald-200 text-emerald-900' : 'bg-red-200 text-red-900'
            }`}>
              มาร์จิ้น: {netProfitMargin.toFixed(1)}%
            </span>
          </div>
          <div className={`text-base sm:text-xl font-extrabold tracking-tight ${
            netOperatingProfit >= 0 ? 'text-emerald-800' : 'text-red-700'
          }`}>
            {netOperatingProfit >= 0 ? '+' : ''}฿{Math.round(netOperatingProfit).toLocaleString()}
          </div>
          <div className="text-[11px] mt-1 font-medium opacity-85">
            {netOperatingProfit >= 0 ? 'กำไรจากการดำเนินงาน' : 'ขาดทุนสุทธิรอบระยะเวลานี้'}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. รายละเอียด: ตารางงบกำไร-ขาดทุนแบบมาตรฐาน (Formal P&L Statement) */}
      {/* ========================================================================= */}
      <section className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-xs print:border print:shadow-none print-avoid-break">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-700" />
            <div>
              <h3 className="font-bold text-stone-900 text-sm">
                งบกำไรขาดทุนอย่างละเอียด (Comprehensive Income Statement)
              </h3>
              <p className="text-[11px] text-stone-500">
                แสดงลำดับขั้นรายรับ ต้นทุนผันแปร กำไรขั้นต้น และต้นทุนคงที่
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-stone-500 hidden sm:inline">
            สกุลเงิน: บาท (THB)
          </span>
        </div>

        <div className="space-y-1.5 text-xs">
          {/* 1. รายได้จากยอดขาย */}
          <div className="flex justify-between py-2 border-b border-stone-100 font-bold text-stone-900">
            <span>1. รายรับจากยอดขายรวมทุกช่องทาง (Gross Revenue)</span>
            <span className="text-sm">฿{Math.round(totalGrossSales).toLocaleString()}</span>
          </div>

          <div className="flex justify-between py-1 text-stone-600 pl-4">
            <span className="text-stone-500">หัก: ค่าคอมมิชชั่น GP แพลตฟอร์มเดลิเวอรี่ (GP Commissions)</span>
            <span className="text-amber-700">
              -฿{totalGPCommission.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* 2. ยอดขายสุทธิ */}
          <div className="flex justify-between py-2.5 px-3 bg-emerald-50/60 rounded-xl font-bold text-emerald-950 border border-emerald-200/60">
            <div>
              <span>2. ยอดขายสุทธิที่ได้รับจริง (Net Sales Revenue)</span>
              <span className="text-[10px] text-emerald-700 font-normal ml-2">
                (100.0% ของรายรับสุทธิ)
              </span>
            </div>
            <span className="text-sm sm:text-base font-extrabold text-emerald-800">
              ฿{Math.round(totalNetSales).toLocaleString()}
            </span>
          </div>

          {/* 3. ต้นทุนขายและค่าใช้จ่ายผันแปร */}
          <div className="pt-2 text-stone-800 font-semibold">
            3. ต้นทุนขายและค่าใช้จ่ายผันแปร (Cost of Goods Sold & Variable Expenses)
          </div>

          <div className="flex justify-between py-1 text-stone-600 pl-4">
            <span>- ต้นทุนวัตถุดิบและเครื่องปรุง (COGS Food Cost)</span>
            <span className="text-red-700">
              -฿{Math.round(totalCogs).toLocaleString()} ({overallFoodCostPercent.toFixed(1)}%)
            </span>
          </div>

          {variableExpensesList.map((exp) => {
            const pct = totalNetSales > 0 ? (exp.amount / totalNetSales) * 100 : 0;
            return (
              <div key={exp.id} className="flex justify-between py-0.5 text-stone-600 pl-4">
                <span>- {exp.title} ({exp.categoryName})</span>
                <span className="text-red-700">
                  -฿{Math.round(exp.amount).toLocaleString()} ({pct.toFixed(1)}%)
                </span>
              </div>
            );
          })}

          <div className="flex justify-between py-1.5 pl-4 font-semibold text-stone-700 border-t border-stone-100">
            <span>รวมค่าใช้จ่ายผันแปรทั้งหมด (Total Variable Costs)</span>
            <span className="text-red-700 font-bold">
              -฿{Math.round(totalVariableCosts).toLocaleString()} ({totalNetSales > 0 ? ((totalVariableCosts / totalNetSales) * 100).toFixed(1) : 0}%)
            </span>
          </div>

          {/* 4. กำไรขั้นต้น */}
          <div className="flex justify-between py-2.5 px-3 bg-stone-100 rounded-xl font-bold text-stone-900 border border-stone-200">
            <div>
              <span>4. กำไรส่วนเกิน / กำไรขั้นต้น (Gross Profit / Contribution Margin)</span>
              <span className="text-[10px] text-stone-600 font-normal ml-2">
                (อัตรากำไรขั้นต้น: {grossProfitMargin.toFixed(1)}%)
              </span>
            </div>
            <span className={`text-sm sm:text-base font-extrabold ${grossProfit >= 0 ? 'text-emerald-800' : 'text-red-700'}`}>
              ฿{Math.round(grossProfit).toLocaleString()}
            </span>
          </div>

          {/* 5. ค่าใช้จ่ายคงที่ในการดำเนินงาน */}
          <div className="pt-2 text-stone-800 font-semibold">
            5. ค่าใช้จ่ายคงที่ในการดำเนินงานร้าน (Fixed Operating Expenses)
          </div>

          {fixedExpensesList.map((exp) => {
            const pct = totalNetSales > 0 ? (exp.amount / totalNetSales) * 100 : 0;
            return (
              <div key={exp.id} className="flex justify-between py-0.5 text-stone-600 pl-4">
                <span>- {exp.title} ({exp.categoryName})</span>
                <span className="text-red-700">
                  -฿{Math.round(exp.amount).toLocaleString()} ({pct.toFixed(1)}%)
                </span>
              </div>
            );
          })}

          <div className="flex justify-between py-1.5 pl-4 font-semibold text-stone-700 border-t border-stone-100">
            <span>รวมค่าใช้จ่ายคงที่ทั้งหมด (Total Fixed Costs)</span>
            <span className="text-red-700 font-bold">
              -฿{Math.round(totalFixedCosts).toLocaleString()} ({totalNetSales > 0 ? ((totalFixedCosts / totalNetSales) * 100).toFixed(1) : 0}%)
            </span>
          </div>

          {/* 6. กำไรสุทธิสุดท้าย */}
          <div className={`flex justify-between items-center py-3 px-3.5 rounded-xl border mt-3 font-bold ${
            netOperatingProfit >= 0
              ? 'bg-emerald-600 text-white border-emerald-700'
              : 'bg-red-600 text-white border-red-700'
          }`}>
            <div>
              <div className="text-sm sm:text-base">กำไรจากการดำเนินงานสุทธิ (Net Operating Profit)</div>
              <div className="text-[11px] font-normal opacity-90">
                สัดส่วนกำไรสุทธิ: {netProfitMargin.toFixed(1)}% ของยอดขายสุทธิ
              </div>
            </div>
            <div className="text-lg sm:text-2xl font-black tracking-tight text-right">
              {netOperatingProfit >= 0 ? '+' : ''}฿{Math.round(netOperatingProfit).toLocaleString()}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. รายละเอียด: รายรับสุทธิแต่ละช่องทาง & ต้นทุนขายแยกหมวดหมู่ (Side by Side) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-3">
        {/* รายรับสุทธิแต่ละช่องทางการขาย */}
        <section className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-xs print:border print-avoid-break">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-stone-900 text-xs sm:text-sm">
                รายรับสุทธิแต่ละช่องทาง (Net Sales by Channel)
              </h3>
            </div>
            <span className="text-[11px] text-stone-500 font-medium">
              {channelBreakdown.length} ช่องทาง
            </span>
          </div>

          <div className="space-y-3">
            {channelBreakdown.map((ch) => {
              const share = totalNetSales > 0 ? (ch.netAmount / totalNetSales) * 100 : 0;
              return (
                <div key={ch.channelId} className="p-2.5 rounded-xl bg-stone-50 border border-stone-100 text-xs">
                  <div className="flex items-center justify-between font-semibold text-stone-900 mb-1">
                    <div className="flex items-center gap-1.5">
                      <span>{ch.channelName}</span>
                      {ch.commissionRatePercent > 0 ? (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-medium">
                          GP {ch.commissionRatePercent}%
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-medium">
                          ไม่มี GP
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-emerald-800">
                      ฿{Math.round(ch.netAmount).toLocaleString()}
                    </span>
                  </div>

                  <div className="w-full bg-stone-200 rounded-full h-1.5 overflow-hidden mb-1">
                    <div
                      className="bg-emerald-600 h-1.5 rounded-full"
                      style={{ width: `${Math.min(100, Math.max(0, share))}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[11px] text-stone-500">
                    <span>
                      ยอดขายรวม: ฿{Math.round(ch.grossAmount).toLocaleString()}
                      {ch.commissionAmount > 0 && ` (หัก GP ฿${Math.round(ch.commissionAmount).toLocaleString()})`}
                    </span>
                    <span className="font-medium text-stone-700">
                      สัดส่วน {share.toFixed(1)}% {ch.orderCount > 0 ? `(${ch.orderCount} บิล)` : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* รวมต้นทุนขายแยกหมวดหมู่วัตถุดิบ (COGS Breakdown) */}
        <section className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-xs print:border print-avoid-break">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-stone-900 text-xs sm:text-sm">
                ต้นทุนขายแยกหมวดหมู่วัตถุดิบ (COGS by Category)
              </h3>
            </div>
            <span className="text-[11px] font-bold text-stone-700">
              รวม ฿{Math.round(totalCogs).toLocaleString()}
            </span>
          </div>

          {cogsBreakdown.length === 0 ? (
            <div className="py-8 text-center text-xs text-stone-400">
              ยังไม่มีการบันทึกต้นทุนวัตถุดิบในช่วงเวลานี้
            </div>
          ) : (
            <div className="space-y-3">
              {cogsBreakdown.map((item) => (
                <div key={item.category} className="p-2.5 rounded-xl bg-stone-50 border border-stone-100 text-xs">
                  <div className="flex justify-between font-semibold text-stone-900 mb-1">
                    <span className="text-stone-800">{item.category}</span>
                    <div className="text-right">
                      <span className="font-bold text-stone-900">
                        ฿{Math.round(item.amount).toLocaleString()}
                      </span>
                      <span className="text-[11px] text-stone-500 ml-1.5">
                        ({item.shareOfCogs.toFixed(1)}% ของ COGS)
                      </span>
                    </div>
                  </div>

                  <div className="w-full bg-stone-200 rounded-full h-1.5 overflow-hidden mb-1">
                    <div
                      className="bg-amber-500 h-1.5 rounded-full"
                      style={{ width: `${Math.min(100, Math.max(0, item.shareOfCogs))}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[11px] text-stone-500">
                    <span>สัดส่วน Food Cost ต่อยอดขายสุทธิ:</span>
                    <span className="font-semibold text-stone-700">
                      {item.foodCostPercent.toFixed(1)}% ของยอดขาย
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ========================================================================= */}
      {/* 2. รายละเอียด: หมวดหมู่ค่าใช้จ่ายดำเนินงานทั้งหมด (Expense Category Detail) */}
      {/* ========================================================================= */}
      <section className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-xs print:border print-avoid-break">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-stone-900 text-xs sm:text-sm">
              สรุปค่าใช้จ่ายแยกตามหมวดหมู่ (Expense Category Breakdown)
            </h3>
          </div>
          <span className="text-[11px] text-stone-500">
            รวมค่าใช้จ่ายร้าน: ฿{Math.round(totalAllExpenses).toLocaleString()}
          </span>
        </div>

        {categoryExpensesSummary.length === 0 ? (
          <div className="py-6 text-center text-xs text-stone-400">
            ยังไม่มีรายการค่าใช้จ่ายดำเนินงานในช่วงเวลานี้
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {categoryExpensesSummary.map((item) => (
              <div
                key={item.cat.id}
                className="p-3 rounded-xl border border-stone-100 bg-stone-50/60 text-xs space-y-1.5"
              >
                <div className="flex justify-between items-start">
                  <span className="font-bold text-stone-900 leading-snug">
                    {item.cat.name}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                    item.cat.type === 'variable'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-purple-100 text-purple-800'
                  }`}>
                    {item.cat.type === 'variable' ? 'ผันแปร' : 'คงที่'}
                  </span>
                </div>
                <div className="text-sm font-bold text-stone-800">
                  ฿{Math.round(item.total).toLocaleString()}
                </div>
                <div className="text-[11px] text-stone-500 flex justify-between">
                  <span>{item.count} รายการ</span>
                  <span>{item.percentOfSales.toFixed(1)}% ของยอดขาย</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* 3 & 4. กราฟย้อนหลัง 12 เดือน (% Food Cost และ กราฟเปรียบเทียบกำไรสุทธิ) */}
      {/* ========================================================================= */}
      <section className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-xs space-y-4 print-avoid-break">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
          <div>
            <h3 className="font-bold text-stone-900 text-sm">
              แนวโน้มและสถิติย้อนหลัง 12 เดือน (12-Month Performance Analytics)
            </h3>
            <p className="text-[11px] text-stone-500">
              วิเคราะห์ความเสถียรของต้นทุน Food Cost และการเติบโตของกำไรสุทธิ
            </p>
          </div>

          {/* สลับมุมมองกราฟ (Screen Only) */}
          <div className="flex items-center p-1 bg-stone-100 rounded-xl self-start sm:self-auto print:hidden">
            <button
              onClick={() => setChartViewTab('food_cost')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                chartViewTab === 'food_cost'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              % Food Cost 12 เดือน
            </button>
            <button
              onClick={() => setChartViewTab('profit')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                chartViewTab === 'profit'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              เปรียบเทียบกำไรสุทธิ
            </button>
          </div>
        </div>

        {/* 3. กราฟ % Food Cost ย้อนหลัง 12 เดือน พร้อมเส้น Threshold */}
        {(chartViewTab === 'food_cost' || typeof window !== 'undefined') && (
          <div className={`${chartViewTab === 'food_cost' ? 'block' : 'hidden print:block'} space-y-3`}>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                  <span className="w-3 h-3 rounded bg-emerald-500 inline-block" />
                  % Food Cost ปกติ
                </span>
                <span className="flex items-center gap-1.5 text-amber-700 font-semibold">
                  <span className="w-3 h-3 rounded bg-amber-500 inline-block" />
                  เกินเป้าหมาย ({targetFoodCost}%)
                </span>
                <span className="flex items-center gap-1.5 text-red-700 font-semibold">
                  <span className="w-3 h-3 rounded bg-red-500 inline-block" />
                  เฝ้าระวังวิกฤต ({alertThreshold}%)
                </span>
              </div>
              <div className="text-[11px] text-stone-500">
                เฉลี่ย 12 เดือน: <strong>{stats12m.avgFoodCost}%</strong>
              </div>
            </div>

            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={twelveMonthsData} margin={{ top: 15, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    domain={[0, 45]}
                    unit="%"
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
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
                            <div className="flex justify-between gap-4 text-emerald-400">
                              <span>ยอดขายสุทธิ:</span>
                              <strong>฿{item.netSales?.toLocaleString()}</strong>
                            </div>
                            <div className="flex justify-between gap-4 text-amber-300">
                              <span>ต้นทุน COGS:</span>
                              <strong>฿{item.cogs?.toLocaleString()}</strong>
                            </div>
                            <div className="flex justify-between gap-4 text-white font-bold pt-1 border-t border-stone-800">
                              <span>Food Cost %:</span>
                              <span className={item.isAlert ? 'text-red-400' : item.isAboveTarget ? 'text-amber-400' : 'text-emerald-400'}>
                                {item.foodCostPercent}%
                              </span>
                            </div>
                            <div className="text-[10px] text-stone-400 pt-0.5">
                              {item.isAlert
                                ? '⚠️ สูงเกินเกณฑ์เฝ้าระวัง'
                                : item.isAboveTarget
                                ? '⚡ สูงกว่าเป้าหมาย'
                                : '✓ ควบคุมได้ตามเกณฑ์'}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />

                  {/* เส้น Threshold เป้าหมายร้านอาหาร */}
                  <ReferenceLine
                    y={targetFoodCost}
                    stroke="#10b981"
                    strokeWidth={1.8}
                    strokeDasharray="4 4"
                    label={{
                      value: `เป้าหมาย ${targetFoodCost}%`,
                      fill: '#047857',
                      fontSize: 10,
                      position: 'insideTopLeft'
                    }}
                  />

                  {/* เส้น Threshold เตือนเฝ้าระวัง (Alert Level) */}
                  <ReferenceLine
                    y={alertThreshold}
                    stroke="#ef4444"
                    strokeWidth={1.8}
                    strokeDasharray="4 4"
                    label={{
                      value: `เฝ้าระวัง ${alertThreshold}%`,
                      fill: '#b91c1c',
                      fontSize: 10,
                      position: 'insideTopRight'
                    }}
                  />

                  <Bar dataKey="foodCostPercent" radius={[4, 4, 0, 0]} maxBarSize={32}>
                    {twelveMonthsData.map((entry, index) => {
                      let color = '#10b981'; // เขียว ปกติ
                      if (entry.isAlert) color = '#ef4444'; // แดง เกินเกณฑ์เตือน
                      else if (entry.isAboveTarget) color = '#f59e0b'; // ส้ม เกินเป้า
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Bar>
                  <Line
                    type="monotone"
                    dataKey="foodCostPercent"
                    stroke="#047857"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#047857' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* ไฮไลต์ตัวเลขสำคัญ 12 เดือน */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-stone-100 text-xs">
              <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-100 text-center">
                <span className="text-[11px] text-stone-500 block">Food Cost เฉลี่ย</span>
                <span className="text-sm font-bold text-stone-800">{stats12m.avgFoodCost}%</span>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100 text-center">
                <span className="text-[11px] text-emerald-800 block">เดือนที่คุมได้ดีที่สุด</span>
                <span className="text-sm font-bold text-emerald-700">
                  {stats12m.lowestFoodCost}% ({stats12m.lowestMonthName})
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-100 text-center">
                <span className="text-[11px] text-amber-900 block">เดือนที่ต้นทุนสูงสุด</span>
                <span className="text-sm font-bold text-amber-800">
                  {stats12m.highestFoodCost}% ({stats12m.highestMonthName})
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 4. กราฟเปรียบเทียบกำไรสุทธิรายเดือน 12 เดือน */}
        {(chartViewTab === 'profit' || typeof window !== 'undefined') && (
          <div className={`${chartViewTab === 'profit' ? 'block' : 'hidden print:block'} space-y-3`}>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-blue-700 font-semibold">
                  <span className="w-3 h-3 rounded bg-blue-500 inline-block" />
                  ยอดขายสุทธิ
                </span>
                <span className="flex items-center gap-1.5 text-amber-700 font-semibold">
                  <span className="w-3 h-3 rounded bg-amber-500 inline-block" />
                  ต้นทุนรวม + ค่าใช้จ่าย
                </span>
                <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                  <span className="w-3 h-3 rounded bg-emerald-600 inline-block" />
                  กำไรสุทธิ
                </span>
              </div>
              <div className="text-[11px] text-stone-500">
                กำไรสุทธิเฉลี่ย: <strong>฿{stats12m.avgMonthlyProfit.toLocaleString()}/เดือน</strong>
              </div>
            </div>

            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={twelveMonthsData} margin={{ top: 15, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11 }}
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
                            <div className="text-blue-400">
                              รายรับสุทธิ: ฿{item.netSales?.toLocaleString()}
                            </div>
                            <div className="text-amber-400">
                              ต้นทุน+ค่าใช้จ่าย: ฿{item.totalCosts?.toLocaleString()}
                            </div>
                            <div className="text-emerald-400 font-bold pt-1 border-t border-stone-800">
                              กำไรสุทธิ: ฿{item.netProfit?.toLocaleString()} ({item.profitMarginPercent}%)
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="netSales" name="ยอดขายสุทธิ" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="totalCosts" name="ต้นทุน+ค่าใช้จ่าย" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={22} />
                  <Line
                    type="monotone"
                    dataKey="netProfit"
                    name="กำไรสุทธิ"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#10b981', strokeWidth: 1.5, stroke: '#ffffff' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* ไฮไลต์กำไรสุทธิ 12 เดือน */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-stone-100 text-xs">
              <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-100 text-center">
                <span className="text-[11px] text-stone-500 block">กำไรสุทธิรวม 12 เดือน</span>
                <span className="text-sm font-bold text-stone-800">฿{stats12m.totalProfit.toLocaleString()}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100 text-center">
                <span className="text-[11px] text-emerald-800 block">เดือนที่กำไรสูงสุด</span>
                <span className="text-sm font-bold text-emerald-700">
                  {stats12m.bestMonth} (฿{stats12m.bestProfit?.toLocaleString()})
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-100 text-center">
                <span className="text-[11px] text-blue-900 block">กำไรเฉลี่ยต่อเดือน</span>
                <span className="text-sm font-bold text-blue-800">฿{stats12m.avgMonthlyProfit.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* ลายเซ็นและหมายเหตุสำหรับการพิมพ์รายงาน (Print Only Footer) */}
      {/* ========================================================================= */}
      <div className="hidden print:block pt-8 mt-6 border-t border-stone-300 text-xs print-avoid-break">
        <div className="grid grid-cols-2 gap-12 text-center">
          <div>
            <div className="border-b border-stone-400 pb-12" />
            <p className="mt-2 font-semibold text-stone-800">ลงชื่อผู้จัดทำรายงาน / ฝ่ายบัญชี</p>
            <p className="text-[10px] text-stone-500">วันที่: ..... / ..... / ..........</p>
          </div>
          <div>
            <div className="border-b border-stone-400 pb-12" />
            <p className="mt-2 font-semibold text-stone-800">
              ลงชื่อผู้อนุมัติ / เจ้าของร้าน ({settings.ownerName || 'คุณสมชาย ใจดี'})
            </p>
            <p className="text-[10px] text-stone-500">วันที่: ..... / ..... / ..........</p>
          </div>
        </div>
      </div>
    </div>
  );
};
