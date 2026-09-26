/**
 * หน้าการตั้งค่า (Settings View)
 * 1. ตั้งชื่อร้าน, สาขา, เจ้าของร้าน, เบอร์โทร
 * 2. ตั้งค่าแพลตฟอร์มเดลิเวอรี่/ช่องทางการขาย พร้อมอัตรา % ค่าคอมมิชชั่น (GP)
 * 3. ฟังก์ชัน Export ข้อมูลทั้งหมดเป็นไฟล์ .json ดาวน์โหลดเข้าเครื่อง
 * 4. ฟังก์ชัน Import กู้คืนข้อมูลจากไฟล์ .json พร้อมระบบตรวจสอบความถูกต้อง
 * 5. รีเซ็ตข้อมูลทั้งหมดกลับเป็นค่าเริ่มต้น
 */

import React, { useState, useRef } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { SalesChannel } from '../../types/restaurant';
import {
  Store,
  Percent,
  Download,
  Upload,
  RotateCcw,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileJson,
  Save,
  HelpCircle
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    data,
    updateSettings,
    updateSalesChannel,
    addSalesChannel,
    deleteSalesChannel,
    exportData,
    importData,
    resetAllData,
    seedSampleData
  } = useRestaurant();

  // สถานะฟอร์มข้อมูลร้าน
  const [restaurantName, setRestaurantName] = useState(data.settings.restaurantName);
  const [branchName, setBranchName] = useState(data.settings.branchName);
  const [ownerName, setOwnerName] = useState(data.settings.ownerName);
  const [phoneNumber, setPhoneNumber] = useState(data.settings.phoneNumber);
  const [targetDailySales, setTargetDailySales] = useState(data.settings.targetDailySales);
  const [targetFoodCostPercent, setTargetFoodCostPercent] = useState(data.settings.targetFoodCostPercent);
  const [foodCostAlertThresholdPercent, setFoodCostAlertThresholdPercent] = useState(
    data.settings.foodCostAlertThresholdPercent ?? 5
  );

  // สถานะการแจ้งเตือน
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string | null;
  }>({ type: null, message: null });

  // ฟอร์มเพิ่มช่องทางการขายใหม่
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelGP, setNewChannelGP] = useState<number>(32.1);
  const [newChannelVat, setNewChannelVat] = useState(true);

  // Ref สำหรับ Input File Upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  // บันทึกข้อมูลร้าน
  const handleSaveStoreInfo = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      restaurantName,
      branchName,
      ownerName,
      phoneNumber,
      targetDailySales: Number(targetDailySales) || 0,
      targetFoodCostPercent: Number(targetFoodCostPercent) || 30,
      foodCostAlertThresholdPercent: Number(foodCostAlertThresholdPercent) || 5
    });
    setSaveSuccessMsg('บันทึกข้อมูลร้านเรียบร้อยแล้ว');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // เพิ่มช่องทางเดลิเวอรี่/การขายใหม่
  const handleAddChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;

    addSalesChannel({
      name: newChannelName.trim(),
      code: `custom_${Date.now()}`,
      commissionRatePercent: Number(newChannelGP) || 0,
      vatIncluded: newChannelVat,
      isActive: true,
      color: '#3b82f6'
    });

    setNewChannelName('');
    setNewChannelGP(0);
    setShowAddChannel(false);
  };

  // จัดการการอัปโหลดไฟล์ JSON เพื่อ Import
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) {
        setImportStatus({ type: 'error', message: 'ไม่พบเนื้อหาในไฟล์ที่เลือก' });
        return;
      }

      const result = importData(content);
      if (result.success) {
        setImportStatus({
          type: 'success',
          message: `นำเข้าข้อมูลร้าน "${result.summary?.restaurantName}" สำเร็จ! (${result.summary?.incomeCount} รายรับ, ${result.summary?.expenseCount} รายจ่าย)`
        });
        // ซิงค์ state ในหน้านี้
        if (result.data) {
          setRestaurantName(result.data.settings.restaurantName);
          setBranchName(result.data.settings.branchName);
          setOwnerName(result.data.settings.ownerName);
          setPhoneNumber(result.data.settings.phoneNumber);
          setTargetDailySales(result.data.settings.targetDailySales);
          setTargetFoodCostPercent(result.data.settings.targetFoodCostPercent);
        }
      } else {
        setImportStatus({ type: 'error', message: result.message });
      }
    };
    reader.onerror = () => {
      setImportStatus({ type: 'error', message: 'เกิดข้อผิดพลาดในการอ่านไฟล์' });
    };
    reader.readAsText(file);

    // รีเซ็ต input value เพื่อให้สามารถเลือกไฟล์เดิมซ้ำได้
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* หัวข้อหน้า */}
      <div>
        <h2 className="text-xl font-bold text-stone-900">ตั้งค่าระบบ (Settings)</h2>
        <p className="text-xs text-stone-500 mt-0.5">
          จัดการข้อมูลร้านอาหาร อัตราค่าคอมมิชชั่น GP เดลิเวอรี่ และสำรอง/กู้คืนข้อมูล
        </p>
      </div>

      {/* ข้อความแจ้งเตือนบันทึกสำเร็จ */}
      {saveSuccessMsg && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* 1. ส่วนตั้งชื่อร้านและข้อมูลพื้นฐาน */}
      <section className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-xs">
        <div className="flex items-center gap-2 pb-3 mb-4 border-b border-stone-100">
          <Store className="w-5 h-5 text-emerald-600" />
          <h3 className="font-semibold text-stone-900 text-sm">ข้อมูลร้านอาหาร</h3>
        </div>

        <form onSubmit={handleSaveStoreInfo} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                ชื่อร้านอาหาร <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                placeholder="เช่น ครัวรสเด็ด อาหารตามสั่ง"
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                ชื่อสาขา
              </label>
              <input
                type="text"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="เช่น สาขา 1 / สาขาหน้ามหาลัย"
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                ชื่อเจ้าของร้าน / ผู้ดูแล
              </label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="เช่น สมชาย ใจดี"
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                เบอร์โทรศัพท์ติดต่อ
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="081-xxx-xxxx"
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                เป้าหมายยอดขายต่อวัน (บาท)
              </label>
              <input
                type="number"
                min="0"
                step="500"
                value={targetDailySales}
                onChange={(e) => setTargetDailySales(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                เป้าหมาย Food Cost สูงสุด (%)
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={targetFoodCostPercent}
                onChange={(e) => setTargetFoodCostPercent(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                เกณฑ์เตือน Food Cost % สูงกว่าเดือนก่อน (%)
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="1"
                  max="50"
                  step="1"
                  value={foodCostAlertThresholdPercent}
                  onChange={(e) => setFoodCostAlertThresholdPercent(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
                <span className="text-xs text-stone-500 font-medium">%</span>
              </div>
              <p className="text-[10px] text-stone-400 mt-0.5">
                เตือนบนหน้า Dashboard เมื่อ % Food Cost เดือนนี้พุ่งสูงกว่าเดือนก่อนเกินค่านี้
              </p>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              บันทึกข้อมูลร้าน
            </button>
          </div>
        </form>
      </section>

      {/* 2. ตั้งค่าแพลตฟอร์มเดลิเวอรี่และ % ค่าคอมมิชชั่น GP */}
      <section className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-xs">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <Percent className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="font-semibold text-stone-900 text-sm">
                ช่องทางการขาย & ค่าคอมมิชชั่น (GP %)
              </h3>
              <p className="text-[11px] text-stone-500">
                ตั้ง % ค่าธรรมเนียม GP ที่แต่ละแพลตฟอร์มเรียกเก็บ เพื่อคำนวณรายรับสุทธิอัตโนมัติ
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAddChannel(!showAddChannel)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            เพิ่มช่องทาง
          </button>
        </div>

        {/* ฟอร์มเพิ่มช่องทางใหม่ */}
        {showAddChannel && (
          <form
            onSubmit={handleAddChannel}
            className="mb-4 p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-3"
          >
            <div className="text-xs font-semibold text-stone-800">เพิ่มแพลตฟอร์ม / ช่องทางการขาย</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <input
                type="text"
                required
                placeholder="ชื่อช่องทาง เช่น Robinhood / รับทำข้าวกล่อง"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-stone-300 bg-white outline-none"
              />
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="ค่าคอมมิชชั่น % (เช่น 32.1)"
                  value={newChannelGP}
                  onChange={(e) => setNewChannelGP(parseFloat(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 bg-white outline-none"
                />
                <span className="text-xs text-stone-500">%</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium"
                >
                  บันทึก
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddChannel(false)}
                  className="px-2.5 py-1.5 bg-stone-200 text-stone-700 rounded-lg text-xs"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          </form>
        )}

        {/* รายการช่องทางและเดลิเวอรี่ที่ใช้อยู่ */}
        <div className="space-y-2.5">
          {data.settings.salesChannels.map((channel: SalesChannel) => (
            <div
              key={channel.id}
              className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                channel.isActive
                  ? 'bg-stone-50/60 border-stone-200'
                  : 'bg-stone-100/50 border-stone-200 opacity-60'
              }`}
            >
              {/* ชื่อและสวิตช์เปิด/ปิด */}
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={channel.isActive}
                  onChange={(e) =>
                    updateSalesChannel(channel.id, { isActive: e.target.checked })
                  }
                  id={`channel_active_${channel.id}`}
                  className="w-4 h-4 text-emerald-600 rounded border-stone-300 focus:ring-emerald-500 cursor-pointer"
                />
                <label
                  htmlFor={`channel_active_${channel.id}`}
                  className="text-xs font-semibold text-stone-800 cursor-pointer"
                >
                  {channel.name}
                </label>
                {channel.commissionRatePercent === 0 ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                    ไม่มีหัก GP (0%)
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">
                    หัก GP {channel.commissionRatePercent}%
                  </span>
                )}
              </div>

              {/* ปรับอัตรา GP % และปุ่มลบ */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <div className="flex items-center gap-1 text-xs text-stone-600">
                  <span className="text-[11px] text-stone-500">อัตรา GP:</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={channel.commissionRatePercent}
                    onChange={(e) =>
                      updateSalesChannel(channel.id, {
                        commissionRatePercent: parseFloat(e.target.value) || 0
                      })
                    }
                    className="w-16 px-2 py-1 text-xs text-right font-medium rounded-md border border-stone-300 bg-white"
                  />
                  <span>%</span>
                </div>

                {/* ปุ่มลบ (ถ้าไม่ใช่ช่องทางหลักหน้าร้าน) */}
                {channel.code !== 'dine_in' && (
                  <button
                    onClick={() => deleteSalesChannel(channel.id)}
                    title="ลบช่องทางนี้"
                    className="p-1 text-stone-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 text-[11px] text-stone-500 flex items-start gap-1 bg-stone-50 p-2.5 rounded-lg border border-stone-200">
          <HelpCircle className="w-3.5 h-3.5 text-stone-400 mt-0.5 shrink-0" />
          <span>
            หมายเหตุ: LINE MAN, Grab, ShopeeFood มักคิดค่าธรรมเนียม GP 30% + VAT 7% = <strong>32.1%</strong> ของยอดขายรวม
          </span>
        </div>
      </section>

      {/* 3. การ Export & Import ข้อมูล JSON */}
      <section className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-xs">
        <div className="flex items-center gap-2 pb-3 mb-4 border-b border-stone-100">
          <FileJson className="w-5 h-5 text-emerald-600" />
          <div>
            <h3 className="font-semibold text-stone-900 text-sm">
              จัดการข้อมูล (Export & Import JSON)
            </h3>
            <p className="text-[11px] text-stone-500">
              สำรองข้อมูลร้านทั้งหมดเก็บไว้ หรือนำเข้าไฟล์ JSON เพื่อย้ายเครื่อง
            </p>
          </div>
        </div>

        {/* แสดงผลสถานะ Import */}
        {importStatus.message && (
          <div
            className={`mb-4 p-3 rounded-xl text-xs flex items-start gap-2 border ${
              importStatus.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {importStatus.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className="font-medium">{importStatus.message}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* การ์ด Export JSON */}
          <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/70 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Download className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-bold text-stone-800">Export ข้อมูล (ดาวน์โหลด)</h4>
              </div>
              <p className="text-[11px] text-stone-500 mb-3">
                ดาวน์โหลดข้อมูลทั้งหมด (รายรับ, รายจ่าย, เมนู, สูตรอาหาร, ค่า GP) เป็นไฟล์ <code>.json</code> ไว้บนอุปกรณ์ของคุณ
              </p>
              <div className="text-[10px] text-stone-600 space-y-0.5 bg-white p-2 rounded-lg border border-stone-200 mb-3">
                <div>• รายการรายรับ: {data.incomes.length} รายการ</div>
                <div>• บันทึกต้นทุนวัตถุดิบ (COGS): {(data.cogsRecords || []).length} รายการ</div>
                <div>• รายการค่าใช้จ่าย: {data.expenses.length} รายการ</div>
                <div>• เมนูอาหาร: {data.menuItems.length} เมนู ({data.ingredients.length} วัตถุดิบ)</div>
              </div>
            </div>

            <button
              onClick={() => exportData()}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              ดาวน์โหลดไฟล์ JSON
            </button>
          </div>

          {/* การ์ด Import JSON */}
          <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/70 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Upload className="w-4 h-4 text-blue-600" />
                <h4 className="text-xs font-bold text-stone-800">Import ข้อมูล (นำเข้า)</h4>
              </div>
              <p className="text-[11px] text-stone-500 mb-3">
                เลือกไฟล์สำรอง <code>.json</code> เพื่อนำข้อมูลกลับเข้ามาในระบบ (ข้อมูลปัจจุบันจะถูกแทนที่ด้วยข้อมูลจากไฟล์)
              </p>
              <div className="text-[10px] text-stone-600 bg-blue-50/70 border border-blue-200 p-2 rounded-lg mb-3">
                รองรับไฟล์ที่ Export ออกมาจากระบบ KinKhorng ทุกเวอร์ชัน
              </div>
            </div>

            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileUpload}
                className="hidden"
                id="json-file-input"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                เลือกไฟล์ JSON เพื่อนำเข้า
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 4. รีเซ็ต / คืนค่าเริ่มต้น */}
      <section className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-xs">
        <div className="flex items-center gap-2 pb-3 mb-3 border-b border-stone-100">
          <RotateCcw className="w-5 h-5 text-amber-600" />
          <h3 className="font-semibold text-stone-900 text-sm">จัดการข้อมูลทดสอบ</h3>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => {
              if (window.confirm('คุณต้องการโหลดข้อมูลตัวอย่างสำหรับทดลองระบบหรือไม่?')) {
                seedSampleData();
                setSaveSuccessMsg('โหลดข้อมูลตัวอย่างสำเร็จ');
              }
            }}
            className="flex-1 py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-medium border border-stone-300 transition-colors"
          >
            โหลดข้อมูลตัวอย่าง (Sample Starter Data)
          </button>

          <button
            onClick={() => {
              if (window.confirm('คำเตือน: คุณต้องการล้างข้อมูลทั้งหมดในเครื่องและเริ่มต้นใหม่ใช่หรือไม่?')) {
                resetAllData();
                setSaveSuccessMsg('รีเซ็ตข้อมูลเริ่มต้นเรียบร้อยแล้ว');
              }
            }}
            className="flex-1 py-2 px-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-medium border border-red-200 transition-colors"
          >
            ล้างข้อมูลทั้งหมด (Reset to Defaults)
          </button>
        </div>
      </section>
    </div>
  );
};
