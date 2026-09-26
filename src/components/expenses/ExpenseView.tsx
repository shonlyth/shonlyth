/**
 * หน้าบันทึกค่าใช้จ่าย (Operating Expenses):
 * 1. ค่าใช้จ่ายคงที่ (Fixed Costs - ตั้งครั้งเดียวต่อเดือน): ค่าเช่า, เงินเดือน, ค่าน้ำ-ไฟ
 * 2. ค่าใช้จ่ายผันแปร (Variable Costs): แก๊ส, บรรจุภัณฑ์, เบ็ดเตล็ด (เพิ่มรายการและหมวดหมู่เองได้)
 * 3. รายการย้อนหลังแสดงด้านล่าง พร้อมแก้ไข (Edit) และลบ (Delete) ได้ทุกรายการ
 */

import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { ExpenseRecord, CostType, ExpenseCategory } from '../../types/restaurant';
import {
  TrendingDown,
  Calendar,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Filter,
  Layers,
  X,
  Building,
  Flame,
  Package,
  Wrench,
  Tag
} from 'lucide-react';

export const ExpenseView: React.FC = () => {
  const {
    data,
    addExpense,
    updateExpense,
    deleteExpense,
    addExpenseCategory
  } = useRestaurant();

  const { settings, expenses } = data;

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const currentMonthStr = todayStr.substring(0, 7); // "YYYY-MM"

  // เลือกแท็บบันทึก: 'fixed' (ค่าใช้จ่ายคงที่รายเดือน) vs 'variable' (ค่าใช้จ่ายผันแปร)
  const [expenseMode, setExpenseMode] = useState<CostType>('variable');

  // ข้อมูลสำหรับค่าใช้จ่ายคงที่ (รายเดือน)
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [fixedCategory, setFixedCategory] = useState<string>('ค่าเช่าสถานที่ / ค่าแผง');
  const [fixedTitle, setFixedTitle] = useState<string>('ค่าเช่าร้านประจำเดือน');
  const [fixedAmount, setFixedAmount] = useState<string>('');
  const [fixedAccount, setFixedAccount] = useState<string>(settings.paymentAccounts[0]?.id || '');
  const [fixedNotes, setFixedNotes] = useState<string>('');

  // ข้อมูลสำหรับค่าใช้จ่ายผันแปร
  const [varDate, setVarDate] = useState<string>(todayStr);
  const [varCategory, setVarCategory] = useState<string>('ค่าแก๊สหุงต้ม / น้ำแข็ง');
  const [varTitle, setVarTitle] = useState<string>('');
  const [varAmount, setVarAmount] = useState<string>('');
  const [varAccount, setVarAccount] = useState<string>(settings.paymentAccounts[0]?.id || '');
  const [varSupplier, setVarSupplier] = useState<string>('');
  const [varNotes, setVarNotes] = useState<string>('');

  // เพิ่มหมวดหมู่ค่าใช้จ่ายใหม่
  const [showAddCatModal, setShowAddCatModal] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState<string>('');
  const [newCatType, setNewCatType] = useState<CostType>('variable');

  // ข้อความแจ้งเตือน
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  // สถานะแก้ไข
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editAmount, setEditAmount] = useState<string>('');
  const [editCategory, setEditCategory] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');
  const [editCostType, setEditCostType] = useState<CostType>('variable');
  const [editMonth, setEditMonth] = useState<string>('');
  const [editSupplier, setEditSupplier] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');

  // ตัวกรองรายการย้อนหลัง
  const [filterType, setFilterType] = useState<'all' | 'fixed' | 'variable'>('all');

  // เพิ่มหมวดหมู่ใหม่
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    addExpenseCategory({
      name: newCatName.trim(),
      type: newCatType
    });

    if (newCatType === 'fixed') {
      setFixedCategory(newCatName.trim());
    } else {
      setVarCategory(newCatName.trim());
    }

    setNewCatName('');
    setShowAddCatModal(false);
    setAlertMsg(`เพิ่มหมวดหมู่ "${newCatName.trim()}" สำเร็จ`);
    setTimeout(() => setAlertMsg(null), 3000);
  };

  // บันทึกค่าใช้จ่ายคงที่รายเดือน
  const handleSaveFixedExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(fixedAmount);
    if (!amountNum || amountNum <= 0 || !fixedTitle.trim()) return;

    // หาหมวดหมู่
    const cat = settings.expenseCategories.find((c) => c.name === fixedCategory);

    addExpense({
      date: `${selectedMonth}-01`,
      month: selectedMonth,
      isMonthlyFixed: true,
      categoryId: cat?.id || `fixed_${Date.now()}`,
      categoryName: fixedCategory,
      costType: 'fixed',
      title: fixedTitle.trim(),
      amount: amountNum,
      paymentAccountId: fixedAccount,
      notes: fixedNotes.trim() || undefined
    });

    setFixedAmount('');
    setFixedNotes('');
    setAlertMsg(`บันทึกค่าใช้จ่ายคงที่ประจำเดือน ${selectedMonth} สำเร็จ`);
    setTimeout(() => setAlertMsg(null), 3500);
  };

  // บันทึกค่าใช้จ่ายผันแปร
  const handleSaveVariableExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(varAmount);
    if (!amountNum || amountNum <= 0 || !varTitle.trim()) return;

    const cat = settings.expenseCategories.find((c) => c.name === varCategory);

    addExpense({
      date: varDate,
      month: varDate.substring(0, 7),
      isMonthlyFixed: false,
      categoryId: cat?.id || `var_${Date.now()}`,
      categoryName: varCategory,
      costType: 'variable',
      title: varTitle.trim(),
      amount: amountNum,
      paymentAccountId: varAccount,
      supplier: varSupplier.trim() || undefined,
      notes: varNotes.trim() || undefined
    });

    setVarTitle('');
    setVarAmount('');
    setVarSupplier('');
    setVarNotes('');
    setAlertMsg('บันทึกค่าใช้จ่ายผันแปรสำเร็จ');
    setTimeout(() => setAlertMsg(null), 3000);
  };

  // เริ่มแก้ไข
  const startEdit = (item: ExpenseRecord) => {
    setEditingExpense(item);
    setEditTitle(item.title);
    setEditAmount(item.amount.toString());
    setEditCategory(item.categoryName);
    setEditDate(item.date);
    setEditCostType(item.costType);
    setEditMonth(item.month || item.date.substring(0, 7));
    setEditSupplier(item.supplier || '');
    setEditNotes(item.notes || '');
  };

  // บันทึกการแก้ไข
  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;
    const amountNum = parseFloat(editAmount);
    if (!amountNum || amountNum <= 0 || !editTitle.trim()) return;

    updateExpense(editingExpense.id, {
      title: editTitle.trim(),
      amount: amountNum,
      categoryName: editCategory,
      costType: editCostType,
      date: editDate,
      month: editCostType === 'fixed' ? editMonth : editDate.substring(0, 7),
      isMonthlyFixed: editCostType === 'fixed',
      supplier: editSupplier.trim() || undefined,
      notes: editNotes.trim() || undefined
    });

    setEditingExpense(null);
    setAlertMsg('อัปเดตรายการค่าใช้จ่ายเรียบร้อยแล้ว');
    setTimeout(() => setAlertMsg(null), 3000);
  };

  // กรองรายการย้อนหลัง
  const filteredExpenses = expenses.filter((item) => {
    if (filterType === 'all') return true;
    return item.costType === filterType;
  });

  const totalFilteredAmount = filteredExpenses.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const totalFixedAmount = expenses
    .filter((e) => e.costType === 'fixed')
    .reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const totalVariableAmount = expenses
    .filter((e) => e.costType === 'variable')
    .reduce((s, i) => s + (Number(i.amount) || 0), 0);

  // รายการหมวดหมู่แยกตามประเภท
  const fixedCategories = settings.expenseCategories.filter((c) => c.type === 'fixed');
  const variableCategories = settings.expenseCategories.filter((c) => c.type === 'variable');

  return (
    <div className="space-y-6 pb-12">
      {/* ส่วนหัวหน้า */}
      <div>
        <h2 className="text-xl font-bold text-stone-900">บันทึกค่าใช้จ่าย (Expenses)</h2>
        <p className="text-xs text-stone-500 mt-0.5">
          จัดการค่าใช้จ่ายคงที่รายเดือน (ค่าเช่า/เงินเดือน/น้ำไฟ) และค่าใช้จ่ายผันแปร (แก๊ส/บรรจุภัณฑ์/เบ็ดเตล็ด)
        </p>
      </div>

      {/* แจ้งเตือน */}
      {alertMsg && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{alertMsg}</span>
        </div>
      )}

      {/* สลับประเภทค่าใช้จ่ายที่จะบันทึก */}
      <div className="flex items-center gap-2 p-1 bg-stone-200/80 rounded-xl">
        <button
          type="button"
          onClick={() => setExpenseMode('variable')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
            expenseMode === 'variable'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Flame className="w-4 h-4 text-amber-500" />
          ค่าใช้จ่ายผันแปร (แก๊ส/บรรจุภัณฑ์/เบ็ดเตล็ด)
        </button>
        <button
          type="button"
          onClick={() => setExpenseMode('fixed')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
            expenseMode === 'fixed'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Building className="w-4 h-4 text-blue-600" />
          ค่าใช้จ่ายคงที่ (ตั้งเดือนละครั้ง)
        </button>
      </div>

      {/* 1. ฟอร์มบันทึกค่าใช้จ่ายผันแปร (Variable Costs) */}
      {expenseMode === 'variable' && (
        <section className="bg-white rounded-2xl p-4 sm:p-5 border border-amber-200/70 shadow-xs">
          <form onSubmit={handleSaveVariableExpense} className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-bold text-stone-900">
                  บันทึกค่าใช้จ่ายผันแปร (Variable Cost)
                </h3>
              </div>

              <button
                type="button"
                onClick={() => {
                  setNewCatType('variable');
                  setShowAddCatModal(true);
                }}
                className="text-[11px] text-amber-600 hover:text-amber-700 font-semibold flex items-center gap-0.5"
              >
                <Plus className="w-3 h-3" /> เพิ่มหมวดหมู่ผันแปร
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  วันที่จ่าย <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={varDate}
                  onChange={(e) => setVarDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  หมวดหมู่ค่าใช้จ่ายผันแปร <span className="text-red-500">*</span>
                </label>
                <select
                  value={varCategory}
                  onChange={(e) => setVarCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 outline-none bg-white font-medium"
                >
                  <option value="ค่าแก๊สหุงต้ม / น้ำแข็ง">ค่าแก๊สหุงต้ม / น้ำแข็ง</option>
                  <option value="ต้นทุนบรรจุภัณฑ์ (Packaging)">ต้นทุนบรรจุภัณฑ์ (Packaging)</option>
                  <option value="ค่าใช้จ่ายเบ็ดเตล็ด">ค่าใช้จ่ายเบ็ดเตล็ด</option>
                  <option value="ค่าโฆษณา / โปรโมทแอปเดลิเวอรี่">ค่าโฆษณา / ยิงแอดเดลิเวอรี่</option>
                  <option value="ค่าซ่อมบำรุง / อุปกรณ์ครัว">ค่าซ่อมบำรุง / อุปกรณ์ครัว</option>
                  {variableCategories
                    .filter(
                      (c) =>
                        ![
                          'ค่าแก๊สหุงต้ม / น้ำแข็ง',
                          'ต้นทุนบรรจุภัณฑ์ (Packaging)',
                          'ค่าใช้จ่ายเบ็ดเตล็ด',
                          'ค่าโฆษณา / โปรโมทแอปเดลิเวอรี่',
                          'ค่าซ่อมบำรุง / อุปกรณ์ครัว'
                        ].includes(c.name)
                    )
                    .map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  รายการ / รายละเอียด <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น สั่งแก๊ส ปตท. 15 กก., ซื้อกล่องกระดาษ 100 ชิ้น, ซื้อน้ำยาล้างจาน"
                  value={varTitle}
                  onChange={(e) => setVarTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  จำนวนเงิน (บาท) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={varAmount}
                    onChange={(e) => setVarAmount(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-semibold rounded-lg border border-stone-300 outline-none pr-8 text-right"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-stone-400">บาท</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  ร้านค้า / ผู้รับเงิน (ถ้ามี)
                </label>
                <input
                  type="text"
                  placeholder="เช่น ร้านแก๊สเสรี, แม็คโคร, ร้านขายของชำ"
                  value={varSupplier}
                  onChange={(e) => setVarSupplier(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  จ่ายจากบัญชี
                </label>
                <select
                  value={varAccount}
                  onChange={(e) => setVarAccount(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 outline-none bg-white"
                >
                  {settings.paymentAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                บันทึกค่าใช้จ่ายผันแปร
              </button>
            </div>
          </form>
        </section>
      )}

      {/* 2. ฟอร์มบันทึกค่าใช้จ่ายคงที่รายเดือน (Fixed Costs) */}
      {expenseMode === 'fixed' && (
        <section className="bg-white rounded-2xl p-4 sm:p-5 border border-blue-200/80 shadow-xs">
          <form onSubmit={handleSaveFixedExpense} className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-blue-600" />
                <div>
                  <h3 className="text-xs font-bold text-stone-900">
                    ตั้งค่าใช้จ่ายคงที่ (รายเดือน - ตั้งครั้งเดียว)
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    เช่น ค่าเช่าร้าน, เงินเดือนพนักงาน, ค่าน้ำ-ค่าไฟ-ค่าเน็ต
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setNewCatType('fixed');
                  setShowAddCatModal(true);
                }}
                className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-0.5"
              >
                <Plus className="w-3 h-3" /> เพิ่มหมวดคงที่
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  เดือนรอบบัญชี <span className="text-red-500">*</span>
                </label>
                <input
                  type="month"
                  required
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-stone-300 outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  หมวดหมู่ค่าใช้จ่ายคงที่ <span className="text-red-500">*</span>
                </label>
                <select
                  value={fixedCategory}
                  onChange={(e) => {
                    setFixedCategory(e.target.value);
                    if (e.target.value === 'ค่าเช่าสถานที่ / ค่าแผง') setFixedTitle('ค่าเช่าร้านประจำเดือน');
                    else if (e.target.value === 'เงินเดือนและค่าจ้างพนักงาน') setFixedTitle('เงินเดือนพนักงานรวม');
                    else if (e.target.value === 'ค่าน้ำประปา / ค่าไฟฟ้า / ค่าเน็ต') setFixedTitle('ค่าน้ำประปาและค่าไฟฟ้า');
                  }}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 outline-none bg-white font-medium"
                >
                  <option value="ค่าเช่าสถานที่ / ค่าแผง">ค่าเช่าสถานที่ / ค่าแผง</option>
                  <option value="เงินเดือนและค่าจ้างพนักงาน">เงินเดือนและค่าจ้างพนักงาน</option>
                  <option value="ค่าน้ำประปา / ค่าไฟฟ้า / ค่าเน็ต">ค่าน้ำประปา / ค่าไฟฟ้า / ค่าเน็ต</option>
                  {fixedCategories
                    .filter(
                      (c) =>
                        ![
                          'ค่าเช่าสถานที่ / ค่าแผง',
                          'เงินเดือนและค่าจ้างพนักงาน',
                          'ค่าน้ำประปา / ค่าไฟฟ้า / ค่าเน็ต'
                        ].includes(c.name)
                    )
                    .map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  รายการ / รายละเอียด <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ค่าเช่าร้านงวด ก.ย., เงินเดือนพนักงาน 2 คน, ค่าไฟ+ค่าน้ำ"
                  value={fixedTitle}
                  onChange={(e) => setFixedTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  จำนวนเงิน (บาท/เดือน) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={fixedAmount}
                    onChange={(e) => setFixedAmount(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-semibold rounded-lg border border-stone-300 outline-none pr-8 text-right"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-stone-400">บาท</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  จ่ายจากบัญชี
                </label>
                <select
                  value={fixedAccount}
                  onChange={(e) => setFixedAccount(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 outline-none bg-white"
                >
                  {settings.paymentAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  หมายเหตุ
                </label>
                <input
                  type="text"
                  placeholder="เช่น จ่ายทุกวันที่ 1 ของเดือน"
                  value={fixedNotes}
                  onChange={(e) => setFixedNotes(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 outline-none"
                />
              </div>
            </div>

            {/* รายการค่าใช้จ่ายคงที่ของเดือนที่เลือก */}
            <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
              <span className="text-[11px] font-semibold text-stone-700 block mb-1">
                ค่าใช้จ่ายคงที่ประจำเดือน {selectedMonth} ที่บันทึกไว้แล้ว:
              </span>
              {expenses.filter((e) => e.costType === 'fixed' && (e.month === selectedMonth || e.date.startsWith(selectedMonth))).length === 0 ? (
                <div className="text-[11px] text-stone-400 italic">
                  ยังไม่ได้ตั้งค่าใช้จ่ายคงที่สำหรับเดือนนี้
                </div>
              ) : (
                <div className="divide-y divide-stone-200 text-xs">
                  {expenses
                    .filter((e) => e.costType === 'fixed' && (e.month === selectedMonth || e.date.startsWith(selectedMonth)))
                    .map((item) => (
                      <div key={item.id} className="py-1.5 flex justify-between">
                        <span className="text-stone-700">{item.title}</span>
                        <span className="font-semibold text-stone-900">฿{item.amount.toLocaleString()}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                บันทึกค่าใช้จ่ายคงที่ประจำเดือน
              </button>
            </div>
          </form>
        </section>
      )}

      {/* สรุปแถบข้อมูลย่อ */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-white p-3 rounded-xl border border-stone-200 text-center shadow-xs">
          <span className="text-[10px] text-stone-500 block">รายจ่ายรวมทั้งหมด</span>
          <span className="text-sm font-bold text-red-600">
            ฿{(totalFixedAmount + totalVariableAmount).toLocaleString()}
          </span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-stone-200 text-center shadow-xs">
          <span className="text-[10px] text-stone-500 block">ต้นทุนคงที่ (รายเดือน)</span>
          <span className="text-sm font-bold text-blue-700">
            ฿{totalFixedAmount.toLocaleString()}
          </span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-stone-200 text-center shadow-xs">
          <span className="text-[10px] text-stone-500 block">ต้นทุนผันแปร (ตามการใช้)</span>
          <span className="text-sm font-bold text-amber-700">
            ฿{totalVariableAmount.toLocaleString()}
          </span>
        </div>
      </div>

      {/* 3. ประวัติรายการย้อนหลัง พร้อมฟังก์ชันแก้ไข/ลบ */}
      <section className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 mb-3 border-b border-stone-100">
          <div>
            <h3 className="font-semibold text-stone-900 text-sm">ประวัติค่าใช้จ่ายทั้งหมด</h3>
            <p className="text-[11px] text-stone-500">
              {filteredExpenses.length} รายการ
            </p>
          </div>

          {/* ฟิลเตอร์เลือกประเภทต้นทุน */}
          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg text-xs self-start sm:self-auto">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filterType === 'all'
                  ? 'bg-white text-stone-900 shadow-xs font-semibold'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => setFilterType('variable')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filterType === 'variable'
                  ? 'bg-white text-stone-900 shadow-xs font-semibold'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              ผันแปร
            </button>
            <button
              onClick={() => setFilterType('fixed')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filterType === 'fixed'
                  ? 'bg-white text-stone-900 shadow-xs font-semibold'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              คงที่ (รายเดือน)
            </button>
          </div>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="py-8 text-center text-xs text-stone-400">
            ยังไม่มีรายการค่าใช้จ่ายในหมวดที่เลือก
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {filteredExpenses.map((item) => (
              <div
                key={item.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-stone-50/60 transition-colors px-1 rounded-lg"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-stone-900">
                      {item.title}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        item.costType === 'fixed'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {item.costType === 'fixed' ? 'คงที่ (รายเดือน)' : 'ผันแปร'}
                    </span>
                  </div>

                  <div className="text-[11px] text-stone-500 flex items-center gap-2 mt-0.5 flex-wrap">
                    <span>หมวด: {item.categoryName}</span>
                    <span>• {item.costType === 'fixed' && item.month ? `เดือน ${item.month}` : item.date}</span>
                    {item.supplier && <span>• ผู้รับ: {item.supplier}</span>}
                    {item.notes && <span className="italic">({item.notes})</span>}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                  <div className="text-right">
                    <span className="text-xs font-bold text-red-600">
                      -฿{item.amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* ปุ่มแก้ไข / ลบ */}
                  <div className="flex items-center gap-1 border-l pl-2 border-stone-200">
                    <button
                      onClick={() => startEdit(item)}
                      title="แก้ไขรายการ"
                      className="p-1.5 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`คุณต้องการลบรายการ "${item.title}" ใช่หรือไม่?`)) {
                          deleteExpense(item.id);
                        }
                      }}
                      title="ลบรายการ"
                      className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* MODAL เพิ่มหมวดหมู่ค่าใช้จ่ายใหม่ */}
      {showAddCatModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-4 sm:p-5 shadow-xl border border-stone-200 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <h4 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-emerald-600" />
                เพิ่มหมวดหมู่ค่าใช้จ่ายใหม่
              </h4>
              <button onClick={() => setShowAddCatModal(false)} className="text-stone-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCategory} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  ชื่อหมวดหมู่ใหม่ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ค่าภาษีป้าย, ค่าทำความสะอาดดูดควัน"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  ประเภทต้นทุน
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewCatType('variable')}
                    className={`py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      newCatType === 'variable'
                        ? 'bg-amber-50 border-amber-400 text-amber-900 font-bold'
                        : 'border-stone-200 text-stone-600'
                    }`}
                  >
                    ต้นทุนผันแปร
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewCatType('fixed')}
                    className={`py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      newCatType === 'fixed'
                        ? 'bg-blue-50 border-blue-400 text-blue-900 font-bold'
                        : 'border-stone-200 text-stone-600'
                    }`}
                  >
                    ต้นทุนคงที่ (รายเดือน)
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCatModal(false)}
                  className="px-3 py-1.5 text-xs text-stone-600 bg-stone-100 rounded-lg"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs"
                >
                  บันทึกหมวดหมู่
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL แก้ไขรายการค่าใช้จ่าย */}
      {editingExpense && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-4 sm:p-5 shadow-xl border border-stone-200 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <h4 className="text-sm font-bold text-stone-900">แก้ไขรายการค่าใช้จ่าย</h4>
              <button onClick={() => setEditingExpense(null)} className="text-stone-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  ประเภทต้นทุน
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditCostType('variable')}
                    className={`py-1 text-xs rounded-lg border ${
                      editCostType === 'variable'
                        ? 'bg-amber-50 border-amber-400 text-amber-900 font-bold'
                        : 'border-stone-200 text-stone-600'
                    }`}
                  >
                    ผันแปร
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditCostType('fixed')}
                    className={`py-1 text-xs rounded-lg border ${
                      editCostType === 'fixed'
                        ? 'bg-blue-50 border-blue-400 text-blue-900 font-bold'
                        : 'border-stone-200 text-stone-600'
                    }`}
                  >
                    คงที่ (รายเดือน)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  {editCostType === 'fixed' ? 'เดือนรอบบัญชี' : 'วันที่จ่าย'}
                </label>
                {editCostType === 'fixed' ? (
                  <input
                    type="month"
                    required
                    value={editMonth}
                    onChange={(e) => setEditMonth(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-300 outline-none"
                  />
                ) : (
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-300 outline-none"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  รายการ / รายละเอียด
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-300 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  จำนวนเงิน (บาท)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-stone-300 outline-none text-right"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  ผู้รับเงิน / ร้านค้า
                </label>
                <input
                  type="text"
                  value={editSupplier}
                  onChange={(e) => setEditSupplier(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-300 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  className="px-3 py-1.5 text-xs text-stone-600 bg-stone-100 rounded-lg"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs"
                >
                  บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
