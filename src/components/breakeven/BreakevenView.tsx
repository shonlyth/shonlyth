/**
 * BreakevenView.tsx: เครื่องมือคำนวณจุดคุ้มทุน (Break-even Point Calculator) สำหรับร้านอาหาร
 * 
 * คุณสมบัติหลัก:
 * 1. ดึงค่าใช้จ่ายคงที่รายเดือนจากข้อมูลที่มีอยู่ (Fixed Costs) มาคำนวณอัตโนมัติ พร้อมแสดงรายการแจกแจง
 * 2. คำนวณ Margin เฉลี่ยจากข้อมูลยอดขายและต้นทุนขายย้อนหลัง (Contribution Margin %) อัตโนมัติ หรือให้ผู้ใช้ปรับ % เองได้
 * 3. แสดงผล: ยอดขายขั้นต่ำต่อเดือนและต่อวันที่ต้องทำเพื่อคุ้มทุน, จำนวนบิล/ออเดอร์ขั้นต่ำต่อวัน, ส่วนเผื่อความปลอดภัย (Margin of Safety)
 * 4. ระบบ Interactive What-If Scenario Simulator: ให้ผู้ใช้ลองปรับเปลี่ยนค่าใช้จ่ายคงที่, Margin, วันเปิดร้าน หรือเป้าหมายกำไร เพื่อดูว่าจุดคุ้มทุนเปลี่ยนไปอย่างไร
 * 5. กราฟจำลอง Cost-Volume-Profit (CVP Chart) แสดงเส้นรายได้ ต้นทุนรวม และจุดคุ้มทุนแบบเห็นภาพชัดเจน
 * 6. ตารางวิเคราะห์ความไว (Sensitivity Analysis Table) และฟังก์ชันพิมพ์ / บันทึกรายงาน PDF
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { TabType } from '../layout/BottomNav';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceDot
} from 'recharts';
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  Calendar,
  Layers,
  RotateCcw,
  Sparkles,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Printer,
  Copy,
  Sliders,
  Scale,
  Target,
  FileSpreadsheet,
  Info,
  ChevronDown,
  ChevronUp,
  Check
} from 'lucide-react';

interface BreakevenViewProps {
  onNavigate?: (tab: TabType) => void;
}

// แหล่งข้อมูลช่วงเวลาสำหรับดึงค่าใช้จ่ายคงที่และ Margin
type BaselinePeriod = 'current_month' | 'last_month' | 'avg_3_months' | 'avg_6_months' | 'avg_12_months';

export const BreakevenView: React.FC<BreakevenViewProps> = ({ onNavigate }) => {
  const { data } = useRestaurant();
  const { settings, incomes, expenses } = data;
  const cogsRecords = data.cogsRecords || [];

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const thisMonthStr = todayStr.substring(0, 7); // e.g. "2026-09"

  // ---------------------------------------------------------------------------
  // 1. การเลือกช่วงเวลาข้อมูลอ้างอิง (Baseline Selection)
  // ---------------------------------------------------------------------------
  const [fixedCostPeriod, setFixedCostPeriod] = useState<BaselinePeriod>('current_month');
  const [marginPeriod, setMarginPeriod] = useState<BaselinePeriod>('avg_6_months');

  // สเตทสำหรับดูรายละเอียดรายการค่าใช้จ่ายคงที่
  const [showFixedDetails, setShowFixedDetails] = useState<boolean>(false);
  const [showFormulaDetails, setShowFormulaDetails] = useState<boolean>(false);

  // สเตทแจ้งเตือนคัดลอกข้อความ
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);

  // ---------------------------------------------------------------------------
  // ฟังก์ชันช่วยเหลือคำนวณช่วงเดือน
  // ---------------------------------------------------------------------------
  const getMonthsForPeriod = (period: BaselinePeriod): string[] => {
    const months: string[] = [];
    let count = 1;
    let startOffset = 0;

    if (period === 'current_month') {
      count = 1;
      startOffset = 0;
    } else if (period === 'last_month') {
      count = 1;
      startOffset = 1;
    } else if (period === 'avg_3_months') {
      count = 3;
      startOffset = 0;
    } else if (period === 'avg_6_months') {
      count = 6;
      startOffset = 0;
    } else if (period === 'avg_12_months') {
      count = 12;
      startOffset = 0;
    }

    for (let i = startOffset; i < startOffset + count; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push(mStr);
    }
    return months;
  };

  // ---------------------------------------------------------------------------
  // 1. ดึงค่าใช้จ่ายคงที่รายเดือนจากข้อมูลจริงในระบบ (Auto-fetch Fixed Costs)
  // ---------------------------------------------------------------------------
  const autoFixedCostData = useMemo(() => {
    const targetMonths = getMonthsForPeriod(fixedCostPeriod);
    const numMonths = Math.max(1, targetMonths.length);

    // กรองรายการค่าใช้จ่ายคงที่ (costType === 'fixed') ในเดือนที่เลือก
    const matchingFixedExpenses = expenses.filter((e) => {
      if (e.costType !== 'fixed') return false;
      const expMonth = e.month || e.date.substring(0, 7);
      return targetMonths.includes(expMonth);
    });

    // หากไม่มีในเดือนที่เลือก ลองดูจากรายการที่มีทั้งหมดแล้วหารเฉลี่ย
    const fallbackFixedExpenses = expenses.filter((e) => e.costType === 'fixed');
    const expensesToUse = matchingFixedExpenses.length > 0 ? matchingFixedExpenses : fallbackFixedExpenses;
    const effectiveMonthsCount = matchingFixedExpenses.length > 0 ? numMonths : 1;

    // จัดกลุ่มตามหมวดหมู่
    const categoryTotals = new Map<string, { name: string; amount: number; count: number }>();

    expensesToUse.forEach((e) => {
      const catKey = e.categoryId || e.categoryName || 'อื่นๆ';
      const existing = categoryTotals.get(catKey) || {
        name: e.categoryName || 'ค่าใช้จ่ายคงที่ทั่วไป',
        amount: 0,
        count: 0
      };
      existing.amount += Number(e.amount) || 0;
      existing.count += 1;
      categoryTotals.set(catKey, existing);
    });

    const categoriesArray = Array.from(categoryTotals.entries()).map(([id, item]) => ({
      id,
      name: item.name,
      totalAmount: item.amount,
      monthlyAvgAmount: Math.round(item.amount / effectiveMonthsCount)
    })).sort((a, b) => b.monthlyAvgAmount - a.monthlyAvgAmount);

    const totalRaw = expensesToUse.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const monthlyAverage = Math.round(totalRaw / effectiveMonthsCount);

    return {
      totalMonthlyFixed: monthlyAverage > 0 ? monthlyAverage : 39400, // ค่าเริ่มต้นสมเหตุสมผลหากยังไม่มีบันทึก
      categories: categoriesArray,
      rawExpenses: expensesToUse,
      monthCount: effectiveMonthsCount,
      periodMonths: targetMonths
    };
  }, [expenses, fixedCostPeriod, now]);

  // ---------------------------------------------------------------------------
  // 2. คำนวณ Margin เฉลี่ยจากข้อมูลยอดขายและต้นทุนขายย้อนหลัง (Auto-calculate Historical Margin)
  // ---------------------------------------------------------------------------
  const autoMarginData = useMemo(() => {
    const targetMonths = getMonthsForPeriod(marginPeriod);

    // ยอดขายสุทธิรวม (Net Sales = Gross - GP Commission)
    const matchingIncomes = incomes.filter((i) => {
      const incMonth = i.date.substring(0, 7);
      return targetMonths.includes(incMonth);
    });

    const totalGross = matchingIncomes.reduce((s, i) => s + (Number(i.grossAmount) || 0), 0);
    const totalCommission = matchingIncomes.reduce((s, i) => s + (Number(i.commissionAmount) || 0), 0);
    const totalNetSales = totalGross - totalCommission;

    // ต้นทุนวัตถุดิบ COGS รวม
    const matchingCogs = cogsRecords.filter((c) => {
      const cogsMonth = c.date.substring(0, 7);
      return targetMonths.includes(cogsMonth);
    });
    const totalCogs = matchingCogs.reduce((s, c) => s + (Number(c.amount) || 0), 0);

    // ค่าใช้จ่ายผันแปรอื่นๆ (Packaging, แก๊ส, น้ำแข็ง, แอดเดลิเวอรี่)
    const matchingVariableExpenses = expenses.filter((e) => {
      if (e.costType !== 'variable') return false;
      const expMonth = e.month || e.date.substring(0, 7);
      return targetMonths.includes(expMonth);
    });
    const totalOtherVarExpenses = matchingVariableExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

    // ต้นทุนผันแปรทั้งหมด = COGS + ค่าใช้จ่ายผันแปรอื่นๆ
    const totalVariableCosts = totalCogs + totalOtherVarExpenses;

    // กำไรส่วนเกิน (Contribution Margin) = ยอดขายสุทธิ - ต้นทุนผันแปร
    const totalContributionMargin = totalNetSales - totalVariableCosts;

    // Contribution Margin Ratio %
    const contributionMarginPercent = totalNetSales > 0
      ? (totalContributionMargin / totalNetSales) * 100
      : 58.5; // ค่าเริ่มต้นมาตรฐานร้านอาหารไทย (ประมาณ 55-65%)

    // คำนวณ Food Cost %
    const foodCostPercent = totalNetSales > 0 ? (totalCogs / totalNetSales) * 100 : 32.5;

    // คำนวณ Other Variable Cost %
    const otherVarPercent = totalNetSales > 0 ? (totalOtherVarExpenses / totalNetSales) * 100 : 9.0;

    // ยอดซื้อเฉลี่ยต่อบิล (Average Ticket Size)
    const totalOrders = matchingIncomes.reduce((s, i) => s + (Number(i.orderCount) || 0), 0);
    const avgTicket = totalOrders > 0 ? Math.round(totalNetSales / totalOrders) : 120;

    return {
      marginPercent: Math.round(contributionMarginPercent * 10) / 10,
      foodCostPercent: Math.round(foodCostPercent * 10) / 10,
      otherVarPercent: Math.round(otherVarPercent * 10) / 10,
      totalNetSales,
      totalVariableCosts,
      totalCogs,
      totalOtherVarExpenses,
      totalContributionMargin,
      avgTicket: avgTicket > 0 ? avgTicket : 120,
      targetMonths
    };
  }, [incomes, cogsRecords, expenses, marginPeriod, now]);

  // ---------------------------------------------------------------------------
  // 4. สเตท Interactive What-If Scenario: ผู้ใช้สามารถปรับค่าได้แบบ Real-Time
  // ---------------------------------------------------------------------------
  // ค่าใช้จ่ายคงที่ต่อเดือนที่ใช้คำนวณ (บาท)
  const [fixedCostsInput, setFixedCostsInput] = useState<number>(autoFixedCostData.totalMonthlyFixed);

  // อัตรากำไรส่วนเกิน % (Margin %) ที่ใช้คำนวณ
  const [marginPercentInput, setMarginPercentInput] = useState<number>(autoMarginData.marginPercent);

  // จำนวนวันเปิดร้านต่อเดือน (วัน)
  const [operatingDays, setOperatingDays] = useState<number>(30);

  // ยอดซื้อเฉลี่ยต่อบิล (บาท)
  const [averageTicket, setAverageTicket] = useState<number>(autoMarginData.avgTicket);

  // เป้าหมายกำไรสุทธิต่อเดือนที่ต้องการ (What-if Target Net Profit)
  const [targetProfit, setTargetProfit] = useState<number>(0);

  // เมื่อข้อมูลจากระบบเปลี่ยน (หรือผู้ใช้เปลี่ยนตัวเลือกช่วงเวลา) ปรับค่าเริ่มต้นตามระบบ
  useEffect(() => {
    setFixedCostsInput(autoFixedCostData.totalMonthlyFixed);
  }, [autoFixedCostData.totalMonthlyFixed]);

  useEffect(() => {
    setMarginPercentInput(autoMarginData.marginPercent);
    setAverageTicket(autoMarginData.avgTicket);
  }, [autoMarginData.marginPercent, autoMarginData.avgTicket]);

  // ฟังก์ชันรีเซ็ตค่ากลับเป็นค่าเฉลี่ยจริงตามระบบ
  const handleResetToBaseline = () => {
    setFixedCostsInput(autoFixedCostData.totalMonthlyFixed);
    setMarginPercentInput(autoMarginData.marginPercent);
    setOperatingDays(30);
    setAverageTicket(autoMarginData.avgTicket);
    setTargetProfit(0);
  };

  // ---------------------------------------------------------------------------
  // 3. คำนวณผลลัพธ์จุดคุ้มทุน (Break-even Calculations)
  // ---------------------------------------------------------------------------
  const marginRatio = Math.max(0.01, marginPercentInput / 100);

  // ยอดขายขั้นต่ำต่อเดือนที่ต้องทำเพื่อคุ้มทุน = Fixed Costs ÷ Margin %
  const monthlyBreakEven = Math.round(fixedCostsInput / marginRatio);

  // ยอดขายขั้นต่ำต่อวันที่ต้องทำเพื่อคุ้มทุน = Monthly Break-even ÷ จำนวนวันเปิดทำการ
  const safeOperatingDays = Math.max(1, operatingDays);
  const dailyBreakEven = Math.round(monthlyBreakEven / safeOperatingDays);

  // จำนวนบิล / ออเดอร์ที่ต้องขายต่อวัน
  const safeAverageTicket = Math.max(1, averageTicket);
  const dailyBreakEvenOrders = Math.ceil(dailyBreakEven / safeAverageTicket);

  // ยอดขายที่ต้องทำเมื่อมีเป้าหมายกำไรสุทธิ (Target Profit Revenue)
  const monthlyTargetRevenue = targetProfit > 0
    ? Math.round((fixedCostsInput + targetProfit) / marginRatio)
    : monthlyBreakEven;
  const dailyTargetRevenue = Math.round(monthlyTargetRevenue / safeOperatingDays);

  // ---------------------------------------------------------------------------
  // ข้อมูลจริงของเดือนปัจจุบัน สำหรับเปรียบเทียบ (Current Month Actual Comparison)
  // ---------------------------------------------------------------------------
  const currentMonthIncomes = incomes.filter((i) => i.date.startsWith(thisMonthStr));
  const currentMonthGross = currentMonthIncomes.reduce((s, i) => s + (Number(i.grossAmount) || 0), 0);
  const currentMonthComm = currentMonthIncomes.reduce((s, i) => s + (Number(i.commissionAmount) || 0), 0);
  const currentMonthNetSales = currentMonthGross - currentMonthComm;

  // เปอร์เซ็นต์ความคืบหน้าสู่จุดคุ้มทุนในเดือนนี้
  const progressPercent = monthlyBreakEven > 0
    ? Math.round((currentMonthNetSales / monthlyBreakEven) * 100)
    : 0;

  // ส่วนเผื่อความปลอดภัย (Margin of Safety) = (ยอดขายจริง - จุดคุ้มทุน) ÷ ยอดขายจริง x 100
  const marginOfSafetyPercent = currentMonthNetSales > 0
    ? Math.round(((currentMonthNetSales - monthlyBreakEven) / currentMonthNetSales) * 100)
    : 0;

  // ความแตกต่างเมื่อเทียบกับข้อมูลเดิมในระบบ
  const baselineMonthlyBE = Math.round(
    autoFixedCostData.totalMonthlyFixed / Math.max(0.01, autoMarginData.marginPercent / 100)
  );
  const breakEvenDiff = monthlyBreakEven - baselineMonthlyBE;
  const breakEvenDiffPercent = baselineMonthlyBE > 0
    ? Math.round((breakEvenDiff / baselineMonthlyBE) * 100)
    : 0;

  // ---------------------------------------------------------------------------
  // 5. ข้อมูลสำหรับกราฟ Cost-Volume-Profit (CVP Interactive Chart)
  // ---------------------------------------------------------------------------
  const chartData = useMemo(() => {
    const maxSales = Math.max(monthlyBreakEven * 1.8, currentMonthNetSales * 1.3, 100000);
    const steps = 10;
    const stepSize = Math.round(maxSales / steps);
    const points = [];

    // เพิ่มจุด 0
    points.push({
      sales: 0,
      totalRevenue: 0,
      fixedCost: fixedCostsInput,
      totalCost: fixedCostsInput,
      profit: -fixedCostsInput
    });

    for (let i = 1; i <= steps; i++) {
      const sales = i * stepSize;
      const variableCost = Math.round(sales * (1 - marginRatio));
      const totalCost = fixedCostsInput + variableCost;
      const profit = sales - totalCost;

      points.push({
        sales,
        totalRevenue: sales,
        fixedCost: fixedCostsInput,
        totalCost,
        profit
      });
    }

    // แทรกจุด Break-even ที่แน่นอน
    points.push({
      sales: monthlyBreakEven,
      totalRevenue: monthlyBreakEven,
      fixedCost: fixedCostsInput,
      totalCost: monthlyBreakEven,
      profit: 0,
      isBreakEvenPoint: true
    });

    // เรียงตามยอดขาย
    points.sort((a, b) => a.sales - b.sales);

    return points;
  }, [monthlyBreakEven, fixedCostsInput, marginRatio, currentMonthNetSales]);

  // ---------------------------------------------------------------------------
  // 6. ตารางวิเคราะห์ความไว (Sensitivity Analysis Matrix)
  // ---------------------------------------------------------------------------
  const sensitivityMatrix = useMemo(() => {
    // ปรับต้นทุนคงที่: -10%, เท่าเดิม, +10%
    const fixedMultipliers = [
      { label: '-10%', value: Math.round(fixedCostsInput * 0.9) },
      { label: 'ปัจจุบัน', value: fixedCostsInput },
      { label: '+10%', value: Math.round(fixedCostsInput * 1.1) }
    ];

    // ปรับ Margin: -5%, เท่าเดิม, +5%
    const marginDeltas = [-5, 0, 5];

    return fixedMultipliers.map((fixedItem) => {
      const rowData = marginDeltas.map((mDelta) => {
        const testMargin = Math.max(5, marginPercentInput + mDelta);
        const testRatio = testMargin / 100;
        const beSales = Math.round(fixedItem.value / testRatio);
        const beDaily = Math.round(beSales / safeOperatingDays);
        return {
          margin: testMargin,
          delta: mDelta,
          beSales,
          beDaily
        };
      });

      return {
        fixedLabel: fixedItem.label,
        fixedValue: fixedItem.value,
        data: rowData
      };
    });
  }, [fixedCostsInput, marginPercentInput, safeOperatingDays]);

  // ---------------------------------------------------------------------------
  // ฟังก์ชันพิมพ์ / บันทึก PDF
  // ---------------------------------------------------------------------------
  const handlePrint = () => {
    window.print();
  };

  // ---------------------------------------------------------------------------
  // ฟังก์ชันคัดลอกสรุปข้อความ (Copy Text Summary)
  // ---------------------------------------------------------------------------
  const handleCopySummary = () => {
    const summaryText = `📊 สรุปการวิเคราะห์จุดคุ้มทุน (Break-even Point)
ร้าน: ${settings.restaurantName || 'ร้านอาหาร'} (${settings.branchName || 'สาขาหลัก'})
วันที่วิเคราะห์: ${todayStr}

💰 ยอดขายขั้นต่ำเพื่อคุ้มทุน:
• ต่อเดือน: ฿${monthlyBreakEven.toLocaleString()} บาท/เดือน
• ต่อวัน (${operatingDays} วัน/เดือน): ฿${dailyBreakEven.toLocaleString()} บาท/วัน
• จำนวนบิลที่ต้องขาย (${averageTicket} บ./บิล): ~${dailyBreakEvenOrders} บิล/วัน

⚙️ ปัจจัยพื้นฐานที่ใช้คำนวณ:
• ค่าใช้จ่ายคงที่รายเดือน (Fixed Costs): ฿${fixedCostsInput.toLocaleString()} บาท
• อัตรากำไรส่วนเกิน (Contribution Margin): ${marginPercentInput.toFixed(1)}%
${targetProfit > 0 ? `• ยอดขายเพื่อเป้าหมายกำไร ฿${targetProfit.toLocaleString()} บาท: ฿${monthlyTargetRevenue.toLocaleString()} /เดือน\n` : ''}
📈 สถานะเดือนปัจจุบัน (${thisMonthStr}):
• ยอดขายสุทธิทำได้แล้ว: ฿${currentMonthNetSales.toLocaleString()} บาท (${progressPercent}% ของจุดคุ้มทุน)
• สถานะ: ${progressPercent >= 100 ? '✅ คุ้มทุนแล้ว (กำไร)' : `⚠️ ยังขาดอีก ฿${(monthlyBreakEven - currentMonthNetSales).toLocaleString()} บาท`}
• ส่วนเผื่อความปลอดภัย (Margin of Safety): ${marginOfSafetyPercent}%`;

    navigator.clipboard.writeText(summaryText);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  // ชื่อเดือนภาษาไทยสำหรับแสดงผล
  const thaiMonthStr = new Intl.DateTimeFormat('th-TH', { month: 'long', year: 'numeric' }).format(now);

  return (
    <div className="space-y-5 pb-12 print:space-y-4 print:pb-0">
      {/* ========================================================================= */}
      {/* 1. ส่วนหัวหน้า Break-even Point Calculator */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-stone-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
              <Scale className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-stone-900">
                  จุดคุ้มทุนร้านอาหาร (Break-even Point)
                </h2>
                <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                  What-If Simulator
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                คำนวณยอดขายขั้นต่ำที่ต้องทำให้ได้ต่อวันและต่อเดือน พร้อมระบบทดลองปรับตัวแปรเพื่อวางแผนธุรกิจ
              </p>
            </div>
          </div>

          {/* ปุ่มการทำงานด้านบน (Print / Copy / Reset) */}
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0 print:hidden">
            <button
              onClick={handleResetToBaseline}
              title="รีเซ็ตกลับเป็นตัวเลขจริงจากระบบบัญชี"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200/80 rounded-lg transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>รีเซ็ตค่าจริง</span>
            </button>

            <button
              onClick={handleCopySummary}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                copiedSummary
                  ? 'bg-emerald-600 text-white'
                  : 'text-stone-700 bg-stone-100 hover:bg-stone-200/80'
              }`}
            >
              {copiedSummary ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5 text-stone-500" />}
              <span>{copiedSummary ? 'คัดลอกแล้ว!' : 'คัดลอกสรุป'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-stone-800 hover:bg-stone-900 rounded-lg shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-stone-300" />
              <span>พิมพ์ / PDF</span>
            </button>
          </div>
        </div>

        {/* แถบเลือกช่วงเวลาข้อมูลอ้างอิงอัตโนมัติ (Data Source Toolbar) */}
        <div className="mt-4 pt-3.5 border-t border-stone-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs print:hidden">
          {/* 1. แหล่งดึง Fixed Costs */}
          <div className="flex items-center justify-between gap-2 p-2 bg-stone-50 rounded-lg border border-stone-200/60">
            <div className="flex items-center gap-1.5 text-stone-600 truncate">
              <Layers className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span className="truncate">ดึงค่าใช้จ่ายคงที่จาก:</span>
            </div>
            <select
              value={fixedCostPeriod}
              onChange={(e) => setFixedCostPeriod(e.target.value as BaselinePeriod)}
              className="bg-white border border-stone-300 rounded px-2 py-1 text-xs text-stone-800 font-medium focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
            >
              <option value="current_month">เดือนปัจจุบัน ({thisMonthStr})</option>
              <option value="last_month">เดือนก่อนหน้า</option>
              <option value="avg_3_months">เฉลี่ย 3 เดือนล่าสุด</option>
              <option value="avg_6_months">เฉลี่ย 6 เดือนล่าสุด</option>
              <option value="avg_12_months">เฉลี่ย 12 เดือนล่าสุด</option>
            </select>
          </div>

          {/* 2. แหล่งคำนวณ Margin % */}
          <div className="flex items-center justify-between gap-2 p-2 bg-stone-50 rounded-lg border border-stone-200/60">
            <div className="flex items-center gap-1.5 text-stone-600 truncate">
              <Percent className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span className="truncate">คำนวณ Margin เฉลี่ยจาก:</span>
            </div>
            <select
              value={marginPeriod}
              onChange={(e) => setMarginPeriod(e.target.value as BaselinePeriod)}
              className="bg-white border border-stone-300 rounded px-2 py-1 text-xs text-stone-800 font-medium focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
            >
              <option value="avg_6_months">เฉลี่ย 6 เดือนล่าสุด (แนะนำ)</option>
              <option value="avg_3_months">เฉลี่ย 3 เดือนล่าสุด</option>
              <option value="avg_12_months">เฉลี่ย 12 เดือนล่าสุด</option>
              <option value="current_month">เดือนปัจจุบัน ({thisMonthStr})</option>
            </select>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. การ์ดแสดงผลสรุปจุดคุ้มทุนหลัก (Primary Break-even Result Cards) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 print:grid-cols-2">
        {/* การ์ด 1: ยอดขายขั้นต่ำต่อเดือน */}
        <div className="bg-white rounded-xl p-4 border border-stone-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
            <span className="font-medium">ยอดขายขั้นต่ำต่อเดือน</span>
            <span className="text-[11px] text-stone-400">Monthly Break-even</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
            ฿{monthlyBreakEven.toLocaleString()}
          </div>
          <div className="mt-2 text-[11px] text-stone-500 flex items-center justify-between border-t border-stone-100 pt-2">
            <span>สูตร: ฿{fixedCostsInput.toLocaleString()} ÷ {marginPercentInput}%</span>
            {breakEvenDiff !== 0 && (
              <span className={`font-semibold ${breakEvenDiff > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {breakEvenDiff > 0 ? '+' : ''}{breakEvenDiffPercent}% จากฐาน
              </span>
            )}
          </div>
        </div>

        {/* การ์ด 2: ยอดขายขั้นต่ำต่อวัน */}
        <div className="bg-white rounded-xl p-4 border border-emerald-200/80 shadow-xs relative overflow-hidden bg-gradient-to-br from-white to-emerald-50/30">
          <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
            <span className="font-medium text-emerald-800">ยอดขายขั้นต่ำต่อวัน</span>
            <span className="text-[10.5px] font-medium text-emerald-700 bg-emerald-100/70 px-1.5 py-0.2 rounded">
              {operatingDays} วัน/เดือน
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700 tracking-tight">
            ฿{dailyBreakEven.toLocaleString()}
            <span className="text-sm font-medium text-emerald-600 ml-1">/ วัน</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-700/80 flex items-center justify-between border-t border-emerald-100 pt-2">
            <span>เป้าหมายขั้นต่ำต่อวัน</span>
            <span>฿{Math.round(dailyBreakEven / 10).toLocaleString()} / ชม. (10ชม.)</span>
          </div>
        </div>

        {/* การ์ด 3: จำนวนบิล / ออเดอร์ที่ต้องขายต่อวัน */}
        <div className="bg-white rounded-xl p-4 border border-stone-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
            <span className="font-medium">จำนวนบิลที่ต้องขาย</span>
            <span className="text-[11px] text-stone-400">Daily Target Orders</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-stone-800 tracking-tight">
            ~{dailyBreakEvenOrders.toLocaleString()}
            <span className="text-sm font-medium text-stone-500 ml-1">บิล / วัน</span>
          </div>
          <div className="mt-2 text-[11px] text-stone-500 flex items-center justify-between border-t border-stone-100 pt-2">
            <span>บิลเฉลี่ย: ฿{averageTicket} บาท</span>
            <span className="text-stone-400">~{Math.ceil(dailyBreakEvenOrders * 1.8)} จาน/วัน</span>
          </div>
        </div>

        {/* การ์ด 4: สถานะเดือนปัจจุบัน & ส่วนเผื่อความปลอดภัย */}
        <div className={`bg-white rounded-xl p-4 border shadow-xs relative overflow-hidden ${
          progressPercent >= 100
            ? 'border-emerald-200 bg-gradient-to-br from-white to-emerald-50/40'
            : 'border-amber-200 bg-gradient-to-br from-white to-amber-50/40'
        }`}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-medium text-stone-700">สถานะเดือนนี้ ({thaiMonthStr})</span>
            <span className={`text-[10.5px] font-bold px-1.5 py-0.2 rounded ${
              progressPercent >= 100
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
            }`}>
              {progressPercent >= 100 ? 'คุ้มทุนแล้ว' : 'กำลังดำเนินการ'}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
              progressPercent >= 100 ? 'text-emerald-700' : 'text-amber-700'
            }`}>
              {progressPercent}%
            </span>
            <span className="text-xs text-stone-500 truncate">
              (฿{currentMonthNetSales.toLocaleString()} บ.)
            </span>
          </div>
          {/* หลอด Progress สู่จุดคุ้มทุน */}
          <div className="mt-2 w-full bg-stone-100 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                progressPercent >= 100 ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min(100, progressPercent)}%` }}
            />
          </div>
          <div className="mt-1.5 text-[10.5px] text-stone-500 flex items-center justify-between">
            <span>Safety Margin: {marginOfSafetyPercent > 0 ? `+${marginOfSafetyPercent}%` : `${marginOfSafetyPercent}%`}</span>
            <span>{progressPercent >= 100 ? 'กำไรแล้ว' : `ขาด ฿${Math.max(0, monthlyBreakEven - currentMonthNetSales).toLocaleString()}`}</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. ส่วนเครื่องมือ Interactive What-If Scenario Simulator */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-stone-200/80 shadow-xs print:p-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-4 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm sm:text-base font-bold text-stone-900">
              เครื่องมือจำลองสถานการณ์ (What-If Scenario Simulator)
            </h3>
          </div>
          <div className="text-xs text-stone-500">
            ลองเลื่อนสไลเดอร์หรือปรับตัวเลข เพื่อดูผลกระทบต่อจุดคุ้มทุนทันที
          </div>
        </div>

        {/* แถบ Scenario Presets: ทางลัดลองสถานการณ์ที่พบบ่อย */}
        <div className="mb-5">
          <div className="text-[11.5px] font-medium text-stone-600 mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>สถานการณ์จำลองสำเร็จรูป (Quick Presets):</span>
          </div>
          <div className="flex flex-wrap gap-1.5 text-xs">
            <button
              onClick={() => {
                setFixedCostsInput(autoFixedCostData.totalMonthlyFixed + 12000);
              }}
              className="px-2.5 py-1 rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 transition-colors"
            >
              👤 จ้างพนักงานเพิ่ม (+12,000 บ.)
            </button>
            <button
              onClick={() => {
                setFixedCostsInput(Math.max(5000, autoFixedCostData.totalMonthlyFixed - 4000));
              }}
              className="px-2.5 py-1 rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 transition-colors"
            >
              🏷️ เจรจาลดค่าเช่า (-4,000 บ.)
            </button>
            <button
              onClick={() => {
                setMarginPercentInput(Math.max(10, autoMarginData.marginPercent - 5));
              }}
              className="px-2.5 py-1 rounded-lg border border-rose-200 bg-rose-50/50 hover:bg-rose-100/60 text-rose-700 transition-colors"
            >
              📉 วัตถุดิบขึ้นราคา (Margin -5%)
            </button>
            <button
              onClick={() => {
                setMarginPercentInput(Math.min(90, autoMarginData.marginPercent + 5));
              }}
              className="px-2.5 py-1 rounded-lg border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/60 text-emerald-700 transition-colors"
            >
              📈 ปรับราคา/คุมสูตร (Margin +5%)
            </button>
            <button
              onClick={() => {
                setTargetProfit(40000);
              }}
              className="px-2.5 py-1 rounded-lg border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100/60 text-indigo-700 transition-colors"
            >
              🎯 อยากได้กำไรสุทธิ 40,000 บ./ด.
            </button>
            <button
              onClick={handleResetToBaseline}
              className="px-2.5 py-1 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-500 transition-colors"
            >
              ↺ คืนค่าเดิม
            </button>
          </div>
        </div>

        {/* กริดสไลเดอร์และกล่องใส่ตัวเลข (Sliders & Numeric Controls) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          {/* 1. ตัวแปร: ค่าใช้จ่ายคงที่รายเดือน (Monthly Fixed Costs) */}
          <div className="p-4 rounded-xl bg-stone-50/80 border border-stone-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <span>1. ค่าใช้จ่ายคงที่ต่อเดือน (Fixed Costs)</span>
                </label>
                <p className="text-[11px] text-stone-500">
                  ค่าเช่า, เงินเดือนพนักงาน, เน็ต/ไฟขั้นต่ำ
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-stone-400">฿</span>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={fixedCostsInput}
                  onChange={(e) => setFixedCostsInput(Math.max(0, Number(e.target.value) || 0))}
                  className="w-28 px-2.5 py-1 text-sm font-bold text-stone-900 bg-white border border-stone-300 rounded-lg text-right focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Range Slider */}
            <input
              type="range"
              min="10000"
              max="150000"
              step="1000"
              value={fixedCostsInput}
              onChange={(e) => setFixedCostsInput(Number(e.target.value))}
              className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />

            {/* Quick Adjust Buttons */}
            <div className="flex items-center justify-between text-[11px] text-stone-500">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setFixedCostsInput((prev) => Math.max(0, prev - 5000))}
                  className="px-2 py-0.5 rounded bg-white border border-stone-200 hover:bg-stone-100 text-stone-700"
                >
                  -5,000
                </button>
                <button
                  onClick={() => setFixedCostsInput((prev) => prev + 5000)}
                  className="px-2 py-0.5 rounded bg-white border border-stone-200 hover:bg-stone-100 text-stone-700"
                >
                  +5,000
                </button>
              </div>
              <button
                onClick={() => setShowFixedDetails(!showFixedDetails)}
                className="text-emerald-700 hover:text-emerald-800 font-medium flex items-center gap-1"
              >
                <span>{showFixedDetails ? 'ซ่อนรายการ' : 'ดูรายละเอียด'} ({autoFixedCostData.categories.length} หมวด)</span>
                {showFixedDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            {/* กล่องแสดงรายการค่าใช้จ่ายคงที่แบบแจกแจง (Expandable breakdown) */}
            {showFixedDetails && (
              <div className="mt-2 pt-2 border-t border-stone-200 text-xs space-y-1.5">
                <div className="text-[11px] font-semibold text-stone-600">
                  รายการค่าใช้จ่ายคงที่ดึงอัตโนมัติ ({autoFixedCostData.monthCount} เดือน):
                </div>
                {autoFixedCostData.categories.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between text-[11.5px] py-0.5 text-stone-700">
                    <span className="truncate pr-2">• {cat.name}</span>
                    <span className="font-medium shrink-0">฿{cat.monthlyAvgAmount.toLocaleString()} / ด.</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. ตัวแปร: อัตรากำไรส่วนเกิน (Contribution Margin %) */}
          <div className="p-4 rounded-xl bg-stone-50/80 border border-stone-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <span>2. อัตรากำไรเฉลี่ย (Contribution Margin %)</span>
                </label>
                <p className="text-[11px] text-stone-500">
                  (ยอดขาย - วัตถุดิบ COGS - ค่าผันแปร) ÷ ยอดขาย
                </p>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="5"
                  max="95"
                  step="0.5"
                  value={marginPercentInput}
                  onChange={(e) => setMarginPercentInput(Math.min(95, Math.max(1, Number(e.target.value) || 0)))}
                  className="w-20 px-2.5 py-1 text-sm font-bold text-stone-900 bg-white border border-stone-300 rounded-lg text-right focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                />
                <span className="text-xs font-bold text-stone-500">%</span>
              </div>
            </div>

            {/* Range Slider */}
            <input
              type="range"
              min="15"
              max="85"
              step="0.5"
              value={marginPercentInput}
              onChange={(e) => setMarginPercentInput(Number(e.target.value))}
              className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />

            {/* Quick Adjust Buttons */}
            <div className="flex items-center justify-between text-[11px] text-stone-500">
              <div className="flex items-center gap-1">
                {[45, 55, 60, 65].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => setMarginPercentInput(pct)}
                    className={`px-1.5 py-0.5 rounded border ${
                      marginPercentInput === pct
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white border-stone-200 hover:bg-stone-100 text-stone-700'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowFormulaDetails(!showFormulaDetails)}
                className="text-emerald-700 hover:text-emerald-800 font-medium flex items-center gap-1"
              >
                <span>{showFormulaDetails ? 'ซ่อนที่มา' : 'ดูที่มา Margin'}</span>
                {showFormulaDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            {/* กล่องแสดงที่มา Margin เฉลี่ยจริง */}
            {showFormulaDetails && (
              <div className="mt-2 pt-2 border-t border-stone-200 text-xs space-y-1 bg-white p-2.5 rounded-lg border border-stone-200/60">
                <div className="text-[11px] font-semibold text-stone-700">
                  ข้อมูลย้อนหลัง ({marginPeriod}):
                </div>
                <div className="flex justify-between text-[11px] text-stone-600">
                  <span>ยอดขายสุทธิรวม:</span>
                  <span className="font-medium">฿{autoMarginData.totalNetSales.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[11px] text-stone-600">
                  <span>- ต้นทุนวัตถุดิบ COGS ({autoMarginData.foodCostPercent}%):</span>
                  <span className="font-medium text-rose-600">-฿{autoMarginData.totalCogs.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[11px] text-stone-600">
                  <span>- ค่าใช้จ่ายผันแปรอื่นๆ ({autoMarginData.otherVarPercent}%):</span>
                  <span className="font-medium text-rose-600">-฿{autoMarginData.totalOtherVarExpenses.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[11px] text-emerald-700 font-bold border-t border-stone-100 pt-1">
                  <span>= กำไรส่วนเกินจริงในระบบ:</span>
                  <span>{autoMarginData.marginPercent}%</span>
                </div>
              </div>
            )}
          </div>

          {/* 3. ตัวแปรเสริม: จำนวนวันเปิดร้านต่อเดือน */}
          <div className="p-4 rounded-xl bg-stone-50/80 border border-stone-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <span>3. จำนวนวันเปิดร้านต่อเดือน</span>
                </label>
                <p className="text-[11px] text-stone-500">
                  สำหรับแปลงยอดคุ้มทุนต่อเดือนเป็นต่อวัน
                </p>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={operatingDays}
                  onChange={(e) => setOperatingDays(Math.min(31, Math.max(1, Number(e.target.value) || 1)))}
                  className="w-16 px-2 py-1 text-sm font-bold text-stone-900 bg-white border border-stone-300 rounded-lg text-right focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                />
                <span className="text-xs text-stone-500">วัน</span>
              </div>
            </div>

            <input
              type="range"
              min="20"
              max="31"
              value={operatingDays}
              onChange={(e) => setOperatingDays(Number(e.target.value))}
              className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />

            <div className="flex items-center gap-1.5 text-[11px]">
              <button
                onClick={() => setOperatingDays(26)}
                className={`px-2 py-0.5 rounded border ${
                  operatingDays === 26
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white border-stone-200 text-stone-600'
                }`}
              >
                26 วัน (หยุดสัปดาห์ละ 1 วัน)
              </button>
              <button
                onClick={() => setOperatingDays(30)}
                className={`px-2 py-0.5 rounded border ${
                  operatingDays === 30
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white border-stone-200 text-stone-600'
                }`}
              >
                30 วัน (เปิดทุกวัน)
              </button>
            </div>
          </div>

          {/* 4. ตัวแปรเสริม: เป้าหมายกำไรสุทธิที่ต้องการ (Target Profit Goal) */}
          <div className="p-4 rounded-xl bg-stone-50/80 border border-stone-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-indigo-600" />
                  <span>4. เป้าหมายกำไรสุทธิส่วนเพิ่ม (Target Profit)</span>
                </label>
                <p className="text-[11px] text-stone-500">
                  ยอดขายที่ต้องทำหากต้องการมีกำไรเหลือเข้ากระเป๋า
                </p>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-stone-400">฿</span>
                <input
                  type="number"
                  min="0"
                  step="5000"
                  value={targetProfit}
                  onChange={(e) => setTargetProfit(Math.max(0, Number(e.target.value) || 0))}
                  placeholder="0"
                  className="w-24 px-2 py-1 text-sm font-bold text-stone-900 bg-white border border-stone-300 rounded-lg text-right focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            <input
              type="range"
              min="0"
              max="100000"
              step="5000"
              value={targetProfit}
              onChange={(e) => setTargetProfit(Number(e.target.value))}
              className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />

            {targetProfit > 0 ? (
              <div className="text-[11.5px] text-indigo-700 bg-indigo-50 p-2 rounded-lg border border-indigo-200/60 font-medium">
                🎯 หากต้องการกำไรสุทธิ ฿{targetProfit.toLocaleString()} บ./เดือน:
                <br />
                ต้องทำยอดขายให้ได้ <span className="font-bold underline">฿{monthlyTargetRevenue.toLocaleString()} บ./เดือน</span> (฿{dailyTargetRevenue.toLocaleString()} บ./วัน)
              </div>
            ) : (
              <div className="text-[11px] text-stone-400">
                (ใส่ตัวเลขกำไรที่ต้องการเพื่อคำนวณเป้าหมายยอดขาย)
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. กราฟจำลอง Cost-Volume-Profit (Interactive CVP Chart) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-stone-200/80 shadow-xs print:break-inside-avoid">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-stone-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>กราฟแสดงจุดคุ้มทุน (Cost-Volume-Profit Chart)</span>
            </h3>
            <p className="text-xs text-stone-500">
              จุดตัดระหว่าง <span className="text-emerald-600 font-semibold">เส้นรายได้รวม</span> และ <span className="text-rose-600 font-semibold">เส้นต้นทุนรวม</span> คือจุดคุ้มทุน
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-emerald-600 rounded-full" />
              <span className="text-stone-600 font-medium">รายได้รวม</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-rose-600 rounded-full" />
              <span className="text-stone-600 font-medium">ต้นทุนรวม</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-stone-400 border-dashed border-b border-stone-400" />
              <span className="text-stone-500">ต้นทุนคงที่</span>
            </div>
          </div>
        </div>

        {/* แคนวาสกราฟ Recharts */}
        <div className="w-full h-72 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 15, right: 15, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="sales"
                type="number"
                domain={[0, 'dataMax']}
                tickFormatter={(val) => `฿${Math.round(val / 1000)}k`}
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={{ stroke: '#cbd5e1' }}
              />
              <YAxis
                tickFormatter={(val) => `฿${Math.round(val / 1000)}k`}
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={{ stroke: '#cbd5e1' }}
                width={50}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    const isProfit = d.profit >= 0;
                    return (
                      <div className="bg-stone-900/95 text-white p-3 rounded-lg shadow-xl text-xs space-y-1.5 min-w-[190px]">
                        <div className="font-bold border-b border-stone-700 pb-1 text-amber-300">
                          ยอดขาย: ฿{d.sales.toLocaleString()}
                        </div>
                        <div className="flex justify-between text-stone-300">
                          <span>รายได้:</span>
                          <span className="font-semibold text-emerald-400">฿{d.totalRevenue.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-stone-300">
                          <span>ต้นทุนรวม:</span>
                          <span className="font-semibold text-rose-300">฿{d.totalCost.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-stone-400 text-[11px]">
                          <span>• คงที่:</span>
                          <span>฿{d.fixedCost.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-stone-400 text-[11px]">
                          <span>• ผันแปร:</span>
                          <span>฿{(d.totalCost - d.fixedCost).toLocaleString()}</span>
                        </div>
                        <div className={`flex justify-between pt-1 border-t border-stone-700 font-bold ${
                          isProfit ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          <span>{isProfit ? 'กำไรสุทธิ:' : 'ขาดทุนสุทธิ:'}</span>
                          <span>{isProfit ? '+' : ''}฿{d.profit.toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {/* เส้นรายได้รวม */}
              <Line
                type="monotone"
                dataKey="totalRevenue"
                stroke="#059669"
                strokeWidth={2.5}
                dot={false}
                name="รายได้รวม"
              />

              {/* เส้นต้นทุนรวม */}
              <Line
                type="monotone"
                dataKey="totalCost"
                stroke="#e11d48"
                strokeWidth={2.5}
                dot={false}
                name="ต้นทุนรวม"
              />

              {/* เส้นต้นทุนคงที่ (แนวนอน) */}
              <Line
                type="monotone"
                dataKey="fixedCost"
                stroke="#94a3b8"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                name="ต้นทุนคงที่"
              />

              {/* จุด Break-even Point Intersection Marker */}
              <ReferenceDot
                x={monthlyBreakEven}
                y={monthlyBreakEven}
                r={6}
                fill="#f59e0b"
                stroke="#ffffff"
                strokeWidth={2}
              />

              {/* เส้นอ้างอิงแนวดิ่ง: ยอดขายคุ้มทุน */}
              <ReferenceLine
                x={monthlyBreakEven}
                stroke="#f59e0b"
                strokeDasharray="3 3"
                label={{
                  value: `จุดคุ้มทุน ฿${Math.round(monthlyBreakEven / 1000)}k`,
                  position: 'top',
                  fill: '#d97706',
                  fontSize: 11,
                  fontWeight: 600
                }}
              />

              {/* เส้นอ้างอิงแนวดิ่ง: ยอดขายเดือนนี้ */}
              {currentMonthNetSales > 0 && (
                <ReferenceLine
                  x={currentMonthNetSales}
                  stroke="#0284c7"
                  strokeDasharray="3 3"
                  label={{
                    value: `เดือนนี้ ฿${Math.round(currentMonthNetSales / 1000)}k`,
                    position: 'insideBottomRight',
                    fill: '#0369a1',
                    fontSize: 11,
                    fontWeight: 600
                  }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* คำอธิบายสัญลักษณ์กราฟ */}
        <div className="mt-3 pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between text-xs text-stone-500 gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            <span>จุดสีเหลือง = <strong>จุดคุ้มทุน (Break-even: ฿{monthlyBreakEven.toLocaleString()})</strong></span>
          </div>
          <div className="text-[11px] text-stone-400">
            * ยอดขายด้านขวาของจุดสีเหลืองคือโซนกำไร (Profit Zone)
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. ตารางวิเคราะห์ความไว (Sensitivity Analysis Table) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-stone-200/80 shadow-xs print:break-inside-avoid">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-stone-900 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>ตารางวิเคราะห์ความเสี่ยงและความไว (Sensitivity Matrix)</span>
            </h3>
            <p className="text-xs text-stone-500">
              เปรียบเทียบจุดคุ้มทุนเมื่อค่าใช้จ่ายคงที่และ Margin มีการผันผวน
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 text-stone-600 border-b border-stone-200">
                <th className="py-2.5 px-3 font-semibold">ค่าใช้จ่ายคงที่ (Fixed Costs)</th>
                <th className="py-2.5 px-3 font-semibold text-center text-rose-700 bg-rose-50/50">
                  Margin ลด 5% ({Math.max(5, marginPercentInput - 5)}%)
                </th>
                <th className="py-2.5 px-3 font-semibold text-center text-stone-800 bg-stone-100/70">
                  Margin ปัจจุบัน ({marginPercentInput}%)
                </th>
                <th className="py-2.5 px-3 font-semibold text-center text-emerald-700 bg-emerald-50/50">
                  Margin เพิ่ม 5% ({marginPercentInput + 5}%)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {sensitivityMatrix.map((row, idx) => {
                const isCurrentRow = row.fixedLabel === 'ปัจจุบัน';
                return (
                  <tr
                    key={idx}
                    className={`hover:bg-stone-50/70 transition-colors ${
                      isCurrentRow ? 'bg-amber-50/30 font-medium' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 text-stone-800">
                      <div className="font-bold">
                        {row.fixedLabel} (฿{row.fixedValue.toLocaleString()})
                      </div>
                      <div className="text-[10.5px] text-stone-400">
                        {isCurrentRow ? 'ตามที่กำหนดไว้' : ''}
                      </div>
                    </td>
                    {row.data.map((col, cIdx) => {
                      const isBaseCell = isCurrentRow && col.delta === 0;
                      return (
                        <td
                          key={cIdx}
                          className={`py-2.5 px-3 text-center ${
                            isBaseCell ? 'bg-amber-100/50 font-bold text-amber-900 rounded' : ''
                          }`}
                        >
                          <div className="font-semibold text-stone-800">
                            ฿{col.beSales.toLocaleString()}
                          </div>
                          <div className="text-[10px] text-stone-500">
                            (฿{col.beDaily.toLocaleString()}/วัน)
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-[11px] text-stone-500 bg-stone-50 p-2.5 rounded-lg border border-stone-100">
          💡 <strong>ข้อสังเกตสำหรับเจ้าของร้าน:</strong> การเพิ่มอัตรากำไร (Margin) ขึ้นเพียง 5% สามารถช่วยลดจุดคุ้มทุนต่อเดือนลงได้มากกว่าการพยายามลดค่าเช่าร้านหลายพันบาท
        </p>
      </div>

      {/* ========================================================================= */}
      {/* 6. แนะนำแผนปฏิบัติการสำหรับร้าน (Restaurant Action Recommendations) */}
      {/* ========================================================================= */}
      <div className="bg-emerald-50/60 rounded-xl p-4 sm:p-5 border border-emerald-200/80 shadow-xs space-y-3 print:hidden">
        <h3 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>แนวทางบริหารเพื่อลดจุดคุ้มทุน (Lowering Your Break-even Point)</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-white p-3 rounded-lg border border-emerald-100 space-y-1">
            <div className="font-bold text-emerald-900">1. คุมต้นทุนวัตถุดิบ (COGS)</div>
            <p className="text-stone-600 text-[11.5px] leading-relaxed">
              การชั่งตวงวัตถุดิบตามสูตรมาตรฐาน (Recipe Costing) และลดของเสียในครัว จะเพิ่ม Margin ทันทีโดยไม่ต้องขึ้นราคาขาย
            </p>
          </div>
          <div className="bg-white p-3 rounded-lg border border-emerald-100 space-y-1">
            <div className="font-bold text-emerald-900">2. ผลักดันยอดขายหน้าร้าน (GP 0%)</div>
            <p className="text-stone-600 text-[11.5px] leading-relaxed">
              ช่องทางหน้าร้านไม่มีค่าคอมมิชชั่น 32.1% มาร์จิ้นสูงกว่าเดลิเวอรี่มาก ช่วยให้ถึงจุดคุ้มทุนเร็วขึ้นด้วยจำนวนบิลที่น้อยลง
            </p>
          </div>
          <div className="bg-white p-3 rounded-lg border border-emerald-100 space-y-1">
            <div className="font-bold text-emerald-900">3. เพิ่มยอดต่อบิล (Upselling)</div>
            <p className="text-stone-600 text-[11.5px] leading-relaxed">
              จัดเซ็ตคู่เครื่องดื่มหรือของทานเล่น หากยอดบิลเฉลี่ยเพิ่มจาก ฿{averageTicket} เป็น ฿{averageTicket + 30} จำนวนออเดอร์ที่ต้องทำต่อวันจะลดลง
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
