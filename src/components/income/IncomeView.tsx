/**
 * หน้าบันทึกรายรับรายวัน (Daily Income Entry)
 * ฟีเจอร์:
 * 1. เลือกวันที่
 * 2. กรอกยอดขายแยกตามช่องทาง (หน้าร้าน + แพลตฟอร์มเดลิเวอรี่ที่ตั้งค่าไว้ใน Settings)
 * 3. คำนวณยอดสุทธิหลังหักค่าคอมมิชชั่นแต่ละแพลตฟอร์มอัตโนมัติ แสดงทั้งยอดรวมก่อนหักและหลังหัก
 * 4. ประวัติรายการย้อนหลังด้านล่าง พร้อมฟังก์ชันแก้ไข (Edit) และลบ (Delete)
 */

import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { IncomeRecord, SalesChannel } from '../../types/restaurant';
import {
  TrendingUp,
  Calendar,
  Save,
  Trash2,
  Edit2,
  CheckCircle2,
  Percent,
  Plus,
  X,
  Clock,
  Filter
} from 'lucide-react';

export const IncomeView: React.FC = () => {
  const { data, batchSaveDailyIncomes, updateIncome, deleteIncome } = useRestaurant();
  const { settings, incomes } = data;

  const todayStr = new Date().toISOString().split('T')[0];

  // สถานะฟอร์มบันทึกรายวัน
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedAccount, setSelectedAccount] = useState<string>(
    settings.paymentAccounts[0]?.id || ''
  );
  const [dailyNotes, setDailyNotes] = useState<string>('');

  // ยอดขายแยกตามแต่ละช่องทาง { [channelId]: string }
  const [channelInputs, setChannelInputs] = useState<Record<string, string>>({});
  const [channelOrders, setChannelOrders] = useState<Record<string, string>>({});

  // การแจ้งเตือนบันทึกสำเร็จ
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // สถานะการแก้ไขรายการ (Modal หรือ Form)
  const [editingRecord, setEditingRecord] = useState<IncomeRecord | null>(null);
  const [editGross, setEditGross] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editOrders, setEditOrders] = useState<string>('');
  const [editChannelId, setEditChannelId] = useState<string>('');

  // ฟิลเตอร์ดูประวัติ
  const [filterMonth, setFilterMonth] = useState<string>('all');

  // เฉพาะช่องทางการขายที่เปิดใช้งาน (Active)
  const activeChannels = settings.salesChannels.filter((c) => c.isActive);

  // อัปเดตค่ายอดขายของแต่ละช่องทาง
  const handleGrossChange = (channelId: string, val: string) => {
    setChannelInputs((prev) => ({
      ...prev,
      [channelId]: val
    }));
  };

  const handleOrdersChange = (channelId: string, val: string) => {
    setChannelOrders((prev) => ({
      ...prev,
      [channelId]: val
    }));
  };

  // คำนวณยอดรวมของฟอร์มปัจจุบัน
  let formTotalGross = 0;
  let formTotalCommission = 0;
  let formTotalNet = 0;

  activeChannels.forEach((ch) => {
    const gross = parseFloat(channelInputs[ch.id] || '0') || 0;
    if (gross > 0) {
      const comm = (gross * ch.commissionRatePercent) / 100;
      const net = gross - comm;
      formTotalGross += gross;
      formTotalCommission += comm;
      formTotalNet += net;
    }
  });

  // บันทึกยอดขายรายวันทั้งหมดที่กรอก
  const handleSaveDaily = (e: React.FormEvent) => {
    e.preventDefault();

    // ดึงเฉพาะช่องทางที่มียอดขาย > 0
    const recordsToSave: Omit<IncomeRecord, 'id' | 'createdAt' | 'date'>[] = [];

    activeChannels.forEach((ch) => {
      const gross = parseFloat(channelInputs[ch.id] || '0');
      if (gross && gross > 0) {
        const comm = (gross * ch.commissionRatePercent) / 100;
        const net = gross - comm;
        const orders = parseInt(channelOrders[ch.id] || '0', 10);

        recordsToSave.push({
          time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
          channelId: ch.id,
          channelName: ch.name,
          grossAmount: gross,
          commissionRatePercent: ch.commissionRatePercent,
          commissionAmount: parseFloat(comm.toFixed(2)),
          netAmount: parseFloat(net.toFixed(2)),
          paymentAccountId: selectedAccount,
          orderCount: orders > 0 ? orders : undefined,
          notes: dailyNotes.trim() || undefined
        });
      }
    });

    if (recordsToSave.length === 0) {
      alert('กรุณากรอกยอดขายอย่างน้อย 1 ช่องทาง');
      return;
    }

    batchSaveDailyIncomes(selectedDate, recordsToSave);

    // ล้างฟอร์ม
    setChannelInputs({});
    setChannelOrders({});
    setDailyNotes('');
    setSuccessMsg(`บันทึกยอดขายประจำวันที่ ${selectedDate} เรียบร้อยแล้ว (${recordsToSave.length} ช่องทาง)`);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  // เปิด modal แก้ไขรายการ
  const startEditing = (record: IncomeRecord) => {
    setEditingRecord(record);
    setEditDate(record.date);
    setEditGross(record.grossAmount.toString());
    setEditNotes(record.notes || '');
    setEditOrders(record.orderCount ? record.orderCount.toString() : '');
    setEditChannelId(record.channelId);
  };

  // บันทึกการแก้ไข
  const handleUpdateRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    const gross = parseFloat(editGross) || 0;
    if (gross <= 0) return;

    const channel = settings.salesChannels.find((c) => c.id === editChannelId) || {
      name: editingRecord.channelName,
      commissionRatePercent: editingRecord.commissionRatePercent
    };

    const comm = (gross * channel.commissionRatePercent) / 100;
    const net = gross - comm;

    updateIncome(editingRecord.id, {
      date: editDate,
      channelId: editChannelId,
      channelName: channel.name,
      grossAmount: gross,
      commissionRatePercent: channel.commissionRatePercent,
      commissionAmount: parseFloat(comm.toFixed(2)),
      netAmount: parseFloat(net.toFixed(2)),
      orderCount: editOrders ? parseInt(editOrders, 10) : undefined,
      notes: editNotes.trim() || undefined
    });

    setEditingRecord(null);
    setSuccessMsg('แก้ไขข้อมูลรายรับเรียบร้อยแล้ว');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // กรองรายการย้อนหลัง
  const filteredIncomes = incomes.filter((item) => {
    if (filterMonth === 'all') return true;
    return item.date.startsWith(filterMonth);
  });

  return (
    <div className="space-y-6 pb-12">
      {/* หัวข้อหน้า */}
      <div>
        <h2 className="text-xl font-bold text-stone-900">บันทึกรายรับรายวัน (Daily Income)</h2>
        <p className="text-xs text-stone-500 mt-0.5">
          กรอกยอดขายแยกตามหน้าร้านและแพลตฟอร์มเดลิเวอรี่ คำนวณหัก GP อัตโนมัติ
        </p>
      </div>

      {/* แจ้งเตือนสำเร็จ */}
      {successMsg && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 1. ฟอร์มบันทึกยอดขายประจำวัน */}
      <section className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-xs">
        <form onSubmit={handleSaveDaily} className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <label htmlFor="daily-income-date" className="text-xs font-bold text-stone-800">
                เลือกวันที่บันทึกยอด:
              </label>
              <input
                id="daily-income-date"
                type="date"
                required
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-stone-300 outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-500">บัญชีรับเงิน:</span>
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="px-2 py-1 text-xs rounded-lg border border-stone-300 bg-white outline-none"
              >
                {settings.paymentAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ตารางกรอกยอดแยกแต่ละแพลตฟอร์ม */}
          <div className="space-y-2.5">
            <div className="text-xs font-semibold text-stone-700 mb-1 flex items-center justify-between">
              <span>ยอดขายแยกตามช่องทาง:</span>
              <span className="text-[11px] text-stone-400 font-normal">
                (ช่องทางใดไม่มียอด ให้เว้นว่างไว้หรือใส่ 0)
              </span>
            </div>

            <div className="space-y-2">
              {activeChannels.map((channel: SalesChannel) => {
                const currentGross = parseFloat(channelInputs[channel.id] || '0') || 0;
                const comm = (currentGross * channel.commissionRatePercent) / 100;
                const net = currentGross - comm;

                return (
                  <div
                    key={channel.id}
                    className={`p-3 rounded-xl border transition-all ${
                      currentGross > 0
                        ? 'bg-emerald-50/40 border-emerald-300'
                        : 'bg-stone-50/70 border-stone-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      {/* ชื่อช่องทางและอัตรา GP */}
                      <div className="min-w-44">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-stone-900">
                            {channel.name}
                          </span>
                          {channel.commissionRatePercent > 0 ? (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-medium">
                              GP {channel.commissionRatePercent}%
                            </span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-medium">
                              GP 0%
                            </span>
                          )}
                        </div>
                        {currentGross > 0 && channel.commissionRatePercent > 0 && (
                          <div className="text-[11px] text-stone-500 mt-0.5">
                            หัก GP: -฿{comm.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                          </div>
                        )}
                      </div>

                      {/* ช่องกรอกยอดขาย Gross และจำนวนบิล */}
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="ยอดขายรวม (บาท)"
                            value={channelInputs[channel.id] || ''}
                            onChange={(e) => handleGrossChange(channel.id, e.target.value)}
                            className="w-36 sm:w-40 px-2.5 py-1.5 text-xs font-bold rounded-lg border border-stone-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-right pr-6 bg-white"
                          />
                          <span className="absolute right-2 top-2 text-[11px] text-stone-400">฿</span>
                        </div>

                        <div className="relative w-20">
                          <input
                            type="number"
                            min="0"
                            placeholder="บิล"
                            value={channelOrders[channel.id] || ''}
                            onChange={(e) => handleOrdersChange(channel.id, e.target.value)}
                            className="w-full px-2 py-1.5 text-xs rounded-lg border border-stone-300 outline-none text-right pr-6 bg-white"
                          />
                          <span className="absolute right-1.5 top-2 text-[10px] text-stone-400">บิล</span>
                        </div>

                        {/* ยอดสุทธิหลังหัก GP ของช่องทางนี้ */}
                        <div className="w-24 text-right">
                          <span className="text-[10px] text-stone-500 block">ยอดสุทธิ (Net)</span>
                          <span className={`text-xs font-bold ${currentGross > 0 ? 'text-emerald-700' : 'text-stone-400'}`}>
                            ฿{net.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* หมายเหตุประจำวัน */}
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              หมายเหตุประจำวัน (ถ้ามี)
            </label>
            <input
              type="text"
              placeholder="เช่น ออเดอร์เช้าดีมาก, ฝนตกช่วง 17:00, มีรับข้าวกล่องจัดเลี้ยง 50 กล่อง"
              value={dailyNotes}
              onChange={(e) => setDailyNotes(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 outline-none"
            />
          </div>

          {/* แถบสรุปผลลัพธ์การคำนวณทั้งหมดก่อนบันทึก */}
          <div className="p-3.5 bg-stone-900 text-white rounded-xl shadow-xs">
            <div className="text-[11px] text-stone-300 mb-2 font-medium">
              สรุปยอดขายประจำวันที่ {selectedDate}:
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-stone-800/80 p-2 rounded-lg border border-stone-700">
                <span className="text-[10px] text-stone-400 block">ยอดรวมก่อนหัก (Gross)</span>
                <span className="text-sm sm:text-base font-bold text-white">
                  ฿{formTotalGross.toLocaleString()}
                </span>
              </div>
              <div className="bg-stone-800/80 p-2 rounded-lg border border-stone-700">
                <span className="text-[10px] text-amber-400 block">ค่าคอมมิชชั่น GP รวม</span>
                <span className="text-sm sm:text-base font-bold text-amber-400">
                  -฿{formTotalCommission.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="bg-emerald-950/80 p-2 rounded-lg border border-emerald-600">
                <span className="text-[10px] text-emerald-300 block font-semibold">ยอดรวมหลังหัก (Net)</span>
                <span className="text-sm sm:text-base font-bold text-emerald-400">
                  ฿{formTotalNet.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={formTotalGross <= 0}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <Save className="w-4 h-4" />
              บันทึกยอดขายประจำวัน
            </button>
          </div>
        </form>
      </section>

      {/* 2. ประวัติรายการย้อนหลัง พร้อมฟังก์ชันแก้ไข/ลบ */}
      <section className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-xs">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-100">
          <div>
            <h3 className="font-semibold text-stone-900 text-sm">ประวัติบันทึกยอดขายย้อนหลัง</h3>
            <p className="text-[11px] text-stone-500">
              ตรวจสอบ แก้ไขยอดขาย หรือลบรายการที่บันทึกผิด
            </p>
          </div>

          <div className="text-xs text-stone-500">
            {filteredIncomes.length} รายการ
          </div>
        </div>

        {filteredIncomes.length === 0 ? (
          <div className="py-8 text-center text-xs text-stone-400">
            ยังไม่มีประวัติการบันทึกรายรับ
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {filteredIncomes.map((item) => (
              <div
                key={item.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-stone-50/60 transition-colors px-1 rounded-lg"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-stone-900">
                      {item.channelName}
                    </span>
                    {item.commissionRatePercent > 0 ? (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-medium">
                        GP {item.commissionRatePercent}%
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-medium">
                        หน้าร้าน
                      </span>
                    )}
                    <span className="text-xs text-stone-500">• {item.date}</span>
                  </div>

                  <div className="text-[11px] text-stone-500 flex items-center gap-2 mt-0.5">
                    {item.orderCount && <span>{item.orderCount} บิล</span>}
                    {item.notes && <span className="text-stone-600 italic">"{item.notes}"</span>}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-xs font-bold text-stone-900">
                      ยอดรวม ฿{item.grossAmount.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-stone-500">
                      {item.commissionAmount > 0 && (
                        <span>หัก ฿{item.commissionAmount.toLocaleString()} | </span>
                      )}
                      <span className="text-emerald-700 font-semibold">
                        สุทธิ ฿{item.netAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* ปุ่มแก้ไข / ลบ */}
                  <div className="flex items-center gap-1 border-l pl-2 border-stone-200">
                    <button
                      onClick={() => startEditing(item)}
                      title="แก้ไขรายการนี้"
                      className="p-1.5 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`คุณต้องการลบรายการยอดขาย ${item.channelName} วันที่ ${item.date} ใช่หรือไม่?`)) {
                          deleteIncome(item.id);
                        }
                      }}
                      title="ลบรายการนี้"
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

      {/* MODAL แก้ไขรายการรายรับ */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-4 sm:p-5 shadow-xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <h4 className="text-sm font-bold text-stone-900">แก้ไขรายการรายรับ</h4>
              <button
                onClick={() => setEditingRecord(null)}
                className="text-stone-400 hover:text-stone-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateRecord} className="space-y-3">
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
                  ช่องทางการขาย
                </label>
                <select
                  value={editChannelId}
                  onChange={(e) => setEditChannelId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-300 bg-white outline-none"
                >
                  {settings.salesChannels.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.name} (GP {ch.commissionRatePercent}%)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  ยอดขายรวมก่อนหัก GP (Gross)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={editGross}
                  onChange={(e) => setEditGross(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-stone-300 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  จำนวนบิล / ออเดอร์
                </label>
                <input
                  type="number"
                  min="0"
                  value={editOrders}
                  onChange={(e) => setEditOrders(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-300 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  หมายเหตุ
                </label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
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
