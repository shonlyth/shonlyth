/**
 * หน้าบันทึกต้นทุนขาย (COGS - Cost of Goods Sold):
 * 1. กรอกค่าวัตถุดิบ แยกหมวดหมู่ (เนื้อสัตว์, ผัก, เครื่องปรุง, ของแห้ง, อื่นๆ)
 * 2. รองรับการเพิ่มหมวดหมู่วัตถุดิบเองได้ (Add Custom Category)
 * 3. บันทึกได้ทั้งแบบรายวัน (Daily) และรายสัปดาห์ (Weekly)
 * 4. รายการย้อนหลังแสดงด้านล่าง พร้อมปุ่มแก้ไข (Edit) และลบ (Delete)
 */

import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { CogsRecord } from '../../types/restaurant';
import {
  ShoppingCart,
  Calendar,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Filter,
  Layers,
  X,
  Tag
} from 'lucide-react';

export const CogsView: React.FC = () => {
  const {
    data,
    addCogsRecord,
    updateCogsRecord,
    deleteCogsRecord,
    addCogsCategory,
    deleteCogsCategory
  } = useRestaurant();

  const { settings } = data;
  const cogsRecords: CogsRecord[] = data.cogsRecords || [];
  const categories: string[] = settings.cogsCategories || [
    'เนื้อสัตว์',
    'ผัก',
    'เครื่องปรุง',
    'ของแห้ง',
    'อื่นๆ'
  ];

  const todayStr = new Date().toISOString().split('T')[0];

  // ฟอร์มบันทึก
  const [periodType, setPeriodType] = useState<'daily' | 'weekly'>('daily');
  const [date, setDate] = useState<string>(todayStr);
  const [weekEndDate, setWeekEndDate] = useState<string>(todayStr);
  const [category, setCategory] = useState<string>(categories[0] || 'เนื้อสัตว์');
  const [title, setTitle] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [supplier, setSupplier] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // เพิ่มหมวดหมู่ใหม่
  const [showAddCatModal, setShowAddCatModal] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState<string>('');

  // การแจ้งเตือน
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  // สถานะแก้ไข
  const [editingRecord, setEditingRecord] = useState<CogsRecord | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editAmount, setEditAmount] = useState<string>('');
  const [editCategory, setEditCategory] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');
  const [editPeriodType, setEditPeriodType] = useState<'daily' | 'weekly'>('daily');
  const [editSupplier, setEditSupplier] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');

  // ฟิลเตอร์รายการย้อนหลัง
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'daily' | 'weekly'>('all');

  // เพิ่มหมวดหมู่ใหม่
  const handleAddNewCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    addCogsCategory(newCatName.trim());
    setCategory(newCatName.trim());
    setNewCatName('');
    setShowAddCatModal(false);
    setAlertMsg(`เพิ่มหมวดหมู่ "${newCatName.trim()}" สำเร็จ`);
    setTimeout(() => setAlertMsg(null), 3000);
  };

  // ส่งฟอร์มบันทึก COGS
  const handleSaveCogs = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0 || !title.trim()) return;

    addCogsRecord({
      date,
      periodType,
      weekEndDate: periodType === 'weekly' ? weekEndDate : undefined,
      category,
      title: title.trim(),
      amount: amountNum,
      supplier: supplier.trim() || undefined,
      notes: notes.trim() || undefined
    });

    // รีเซ็ตฟอร์ม
    setTitle('');
    setAmount('');
    setSupplier('');
    setNotes('');
    setAlertMsg('บันทึกต้นทุนวัตถุดิบเรียบร้อยแล้ว');
    setTimeout(() => setAlertMsg(null), 3000);
  };

  // เริ่มแก้ไข
  const startEdit = (rec: CogsRecord) => {
    setEditingRecord(rec);
    setEditTitle(rec.title);
    setEditAmount(rec.amount.toString());
    setEditCategory(rec.category);
    setEditDate(rec.date);
    setEditPeriodType(rec.periodType);
    setEditSupplier(rec.supplier || '');
    setEditNotes(rec.notes || '');
  };

  // บันทึกการแก้ไข
  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    const amountNum = parseFloat(editAmount);
    if (!amountNum || amountNum <= 0 || !editTitle.trim()) return;

    updateCogsRecord(editingRecord.id, {
      title: editTitle.trim(),
      amount: amountNum,
      category: editCategory,
      date: editDate,
      periodType: editPeriodType,
      supplier: editSupplier.trim() || undefined,
      notes: editNotes.trim() || undefined
    });

    setEditingRecord(null);
    setAlertMsg('อัปเดตรายการต้นทุนวัตถุดิบเรียบร้อยแล้ว');
    setTimeout(() => setAlertMsg(null), 3000);
  };

  // กรองรายการย้อนหลัง
  const filteredRecords = cogsRecords.filter((rec) => {
    if (filterCategory !== 'all' && rec.category !== filterCategory) return false;
    if (filterPeriod !== 'all' && rec.periodType !== filterPeriod) return false;
    return true;
  });

  // คำนวณสรุปยอดรวม
  const totalCogs = filteredRecords.reduce((s, r) => s + (Number(r.amount) || 0), 0);

  return (
    <div className="space-y-6 pb-12">
      {/* ส่วนหัวหน้า */}
      <div>
        <h2 className="text-xl font-bold text-stone-900">บันทึกต้นทุนขาย (COGS)</h2>
        <p className="text-xs text-stone-500 mt-0.5">
          บันทึกค่าวัตถุดิบแยกหมวดหมู่ (เนื้อสัตว์, ผัก, เครื่องปรุง, ของแห้ง) ทั้งรายวันและรายสัปดาห์
        </p>
      </div>

      {/* แจ้งเตือน */}
      {alertMsg && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{alertMsg}</span>
        </div>
      )}

      {/* 1. ฟอร์มบันทึกต้นทุนวัตถุดิบ */}
      <section className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-xs">
        <form onSubmit={handleSaveCogs} className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-bold text-stone-900">บันทึกค่าวัตถุดิบเข้าร้าน</h3>
            </div>

            {/* สลับรอบการบันทึก: รายวัน vs รายสัปดาห์ */}
            <div className="flex items-center p-1 bg-stone-100 rounded-lg">
              <button
                type="button"
                onClick={() => setPeriodType('daily')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  periodType === 'daily'
                    ? 'bg-white text-stone-900 shadow-xs font-semibold'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                บันทึกรายวัน
              </button>
              <button
                type="button"
                onClick={() => setPeriodType('weekly')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  periodType === 'weekly'
                    ? 'bg-white text-stone-900 shadow-xs font-semibold'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                บันทึกรายสัปดาห์
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* วันที่บันทึก */}
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                {periodType === 'daily' ? 'วันที่ซื้อวัตถุดิบ' : 'วันที่เริ่มสัปดาห์'} <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* ถ้าเป็นรายสัปดาห์ ให้มีวันสิ้นสุดสัปดาห์ */}
            {periodType === 'weekly' && (
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  ถึงวันที่ (สิ้นสุดสัปดาห์)
                </label>
                <input
                  type="date"
                  value={weekEndDate}
                  onChange={(e) => setWeekEndDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 outline-none"
                />
              </div>
            )}

            {/* หมวดหมู่วัตถุดิบ + ปุ่มเพิ่มหมวดหมู่ */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-stone-700">
                  หมวดหมู่วัตถุดิบ <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowAddCatModal(true)}
                  className="text-[11px] text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" /> เพิ่มหมวดหมู่
                </button>
              </div>

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 outline-none bg-white font-medium"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* รายละเอียดวัตถุดิบ */}
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                รายการวัตถุดิบ <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="เช่น หมูบด 10 กก. + อกไก่, ผักสดกาดขาวต้นหอม"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 outline-none"
              />
            </div>

            {/* จำนวนเงิน */}
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
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-semibold rounded-lg border border-stone-300 outline-none pr-8 text-right"
                />
                <span className="absolute right-3 top-2.5 text-xs text-stone-400">บาท</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* แหล่งซื้อ / ซัพพลายเออร์ */}
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                แหล่งซื้อ / ซัพพลายเออร์ (ถ้ามี)
              </label>
              <input
                type="text"
                placeholder="เช่น ตลาดสดเทศบาล, แม็คโคร, เขียงหมูป้าพร"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 outline-none"
              />
            </div>

            {/* หมายเหตุ */}
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                หมายเหตุเพิ่มเติม
              </label>
              <input
                type="text"
                placeholder="เช่น สต็อกสำหรับเสาร์-อาทิตย์"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              บันทึกต้นทุนวัตถุดิบ
            </button>
          </div>
        </form>
      </section>

      {/* สรุปยอดรวมและตัวกรอง */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-900 text-white p-4 rounded-2xl shadow-xs">
        <div>
          <span className="text-[11px] text-stone-400 block font-medium">
            ยอดรวมต้นทุนวัตถุดิบที่แสดง
          </span>
          <span className="text-xl sm:text-2xl font-bold text-emerald-400">
            ฿{totalCogs.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* ตัวกรองรอบบันทึกและหมวดหมู่ */}
        <div className="flex flex-wrap items-center gap-2">
          {/* ตัวกรองรอบ */}
          <div className="flex items-center bg-stone-800 p-1 rounded-lg border border-stone-700 text-xs">
            <button
              onClick={() => setFilterPeriod('all')}
              className={`px-2 py-0.5 rounded ${filterPeriod === 'all' ? 'bg-stone-700 text-white font-medium' : 'text-stone-400'}`}
            >
              รอบทั้งหมด
            </button>
            <button
              onClick={() => setFilterPeriod('daily')}
              className={`px-2 py-0.5 rounded ${filterPeriod === 'daily' ? 'bg-stone-700 text-white font-medium' : 'text-stone-400'}`}
            >
              รายวัน
            </button>
            <button
              onClick={() => setFilterPeriod('weekly')}
              className={`px-2 py-0.5 rounded ${filterPeriod === 'weekly' ? 'bg-stone-700 text-white font-medium' : 'text-stone-400'}`}
            >
              รายสัปดาห์
            </button>
          </div>

          {/* ตัวกรองหมวดหมู่ */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-2.5 py-1 text-xs rounded-lg bg-stone-800 border border-stone-700 text-stone-200 outline-none"
          >
            <option value="all">ทุกหมวดหมู่วัตถุดิบ</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. รายการย้อนหลังแสดงด้านล่าง พร้อมปุ่มแก้ไข/ลบ */}
      <section className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-xs">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-100">
          <div>
            <h3 className="font-semibold text-stone-900 text-sm">ประวัติต้นทุนวัตถุดิบ (COGS History)</h3>
            <p className="text-[11px] text-stone-500">
              {filteredRecords.length} รายการ
            </p>
          </div>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="py-8 text-center text-xs text-stone-400">
            ยังไม่มีรายการบันทึกต้นทุนวัตถุดิบในหมวดที่เลือก
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {filteredRecords.map((item) => (
              <div
                key={item.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-stone-50/60 transition-colors px-1 rounded-lg"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-stone-900">
                      {item.title}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">
                      {item.category}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-100 text-stone-600">
                      {item.periodType === 'daily' ? 'รายวัน' : 'รายสัปดาห์'}
                    </span>
                  </div>

                  <div className="text-[11px] text-stone-500 flex items-center gap-2 mt-0.5 flex-wrap">
                    <span>วันที่: {item.date}</span>
                    {item.weekEndDate && <span>- {item.weekEndDate}</span>}
                    {item.supplier && <span>• แหล่งซื้อ: {item.supplier}</span>}
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
                          deleteCogsRecord(item.id);
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

      {/* MODAL เพิ่มหมวดหมู่วัตถุดิบใหม่ */}
      {showAddCatModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-4 sm:p-5 shadow-xl border border-stone-200 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <h4 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-emerald-600" />
                เพิ่มหมวดหมู่วัตถุดิบใหม่
              </h4>
              <button onClick={() => setShowAddCatModal(false)} className="text-stone-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddNewCategory} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  ชื่อหมวดหมู่ใหม่ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ซีฟู้ด/อาหารทะเล, เครื่องดื่มชา-กาแฟ"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* หมวดหมู่ที่มีอยู่แล้ว */}
              <div>
                <span className="text-[11px] text-stone-500 block mb-1">หมวดหมู่ที่มีอยู่เดิม:</span>
                <div className="flex flex-wrap gap-1">
                  {categories.map((c) => (
                    <span key={c} className="text-[10px] px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                      {c}
                    </span>
                  ))}
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

      {/* MODAL แก้ไขรายการ COGS */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-4 sm:p-5 shadow-xl border border-stone-200 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <h4 className="text-sm font-bold text-stone-900">แก้ไขรายการต้นทุนวัตถุดิบ</h4>
              <button onClick={() => setEditingRecord(null)} className="text-stone-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  วันที่
                </label>
                <input
                  type="date"
                  required
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-300 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  หมวดหมู่วัตถุดิบ
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-300 bg-white outline-none"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  รายการวัตถุดิบ
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
                  แหล่งซื้อ / ซัพพลายเออร์
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
                  onClick={() => setEditingRecord(null)}
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
