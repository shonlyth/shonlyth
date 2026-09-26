/**
 * โครงสร้างข้อมูล (Data Schema) สำหรับระบบบัญชีร้านอาหาร
 * ออกแบบเพื่อรองรับ:
 * 1. รายรับแยกตามช่องทางการขาย (หน้าร้าน, Grab, LINE MAN, Shopee, ฯลฯ) พร้อมคำนวณหัก GP
 * 2. บันทึกรายจ่ายแยกประเภทคงที่ (Fixed Costs) และผันแปร (Variable Costs)
 * 3. ต้นทุนวัตถุดิบและสูตรอาหาร (Menu & Recipe BOM) คำนวณ Food Cost ต่อจาน
 * 4. บันทึกกระแสเงินสดและการตรวจนับเงินสดประจำวัน (Cash Flow & Drawer Reconciliation)
 * 5. การสำรองและถ่ายโอนข้อมูล (Export/Import JSON)
 */

// ประเภทของค่าใช้จ่าย: ค่าใช้จ่ายคงที่ หรือ ค่าใช้จ่ายผันแปร
export type CostType = 'fixed' | 'variable';

// ประเภทช่องทางการชำระเงิน / บัญชีการเงิน
export type PaymentAccountType = 'cash' | 'bank' | 'promptpay' | 'delivery_credit';

// ช่องทางการขาย (เช่น หน้าร้าน, Grab, LINE MAN, Robinhood, ShopeeFood)
export interface SalesChannel {
  id: string;
  name: string;                 // ชื่อช่องทาง เช่น "หน้าร้าน (Dine-in)", "Grab Food"
  code: string;                 // รหัสอ้างอิง เช่น "dine_in", "grab", "lineman"
  commissionRatePercent: number;// อัตราค่าคอมมิชชั่น/GP % เช่น 32.1 (รวม VAT) หรือ 0 สำหรับหน้าร้าน
  vatIncluded: boolean;         // คิดภาษีมูลค่าเพิ่มใน GP หรือไม่
  isActive: boolean;            // เปิดใช้งานช่องทางนี้หรือไม่
  color?: string;               // สีสำหรับแสดงในกราฟหรือ badge
}

// บัญชีการเงิน/กระเป๋าเงิน (สำหรับติดตามกระแสเงินสด)
export interface PaymentAccount {
  id: string;
  name: string;                 // เช่น "เงินสดในลิ้นชัก", "บัญชี กสิกรไทย ร้าน", "กระเป๋า LINE MAN"
  type: PaymentAccountType;
  accountNumber?: string;       // เลขบัญชี (ถ้ามี)
  initialBalance: number;       // ยอดตั้งต้น
  isActive: boolean;
}

// หมวดหมู่ค่าใช้จ่าย
export interface ExpenseCategory {
  id: string;
  name: string;                 // เช่น "วัตถุดิบอาหารสด", "ค่าเช่าที่", "เงินเดือนพนักงาน", "ค่าแก๊ส/ค่าน้ำ/ค่าไฟ"
  type: CostType;               // 'fixed' = ต้นทุนคงที่, 'variable' = ต้นทุนผันแปร
  description?: string;
  icon?: string;
}

// วัตถุดิบ (Raw Material / Ingredient)
export interface Ingredient {
  id: string;
  name: string;                 // ชื่อวัตถุดิบ เช่น "หมูสันนอก", "ไข่ไก่เบอร์ 2", "น้ำมันพืช", "ข้าวหอมมะลิ"
  unit: string;                 // หน่วยนับ เช่น "กก.", "ฟอง", "ลิตร", "กรัม"
  unitCost: number;             // ต้นทุนต่อหน่วย (บาท)
  currentStock?: number;        // จำนวนคงเหลือในคลัง (ถ้าบันทึก)
  minStockAlert?: number;       // ปริมาณขั้นต่ำแจ้งเตือน
  supplier?: string;            // ร้านค้า/ตลาดที่ซื้อประจำ
  updatedAt: string;            // วันที่อัปเดตราคาล่าสุด (ISO string)
}

// วัตถุดิบในสูตรอาหาร 1 รายการ (Recipe Item)
export interface RecipeItem {
  ingredientId: string;         // อ้างอิง ID ของ Ingredient
  ingredientName: string;       // บันทึกชื่อไว้เพื่อความรวดเร็วในการแสดงผล
  quantity: number;             // ปริมาณที่ใช้ต่อ 1 เสิร์ฟ/จาน
  unit: string;                 // หน่วยที่ใช้ เช่น "กรัม", "ฟอง"
  costPerServing: number;       // ต้นทุนคำนวณต่อเสิร์ฟ (บาท)
}

// เมนูอาหารและสูตรต้นทุน (Menu Item & Recipe)
export interface MenuItem {
  id: string;
  name: string;                 // ชื่อเมนู เช่น "ข้าวกะเพราหมูกรอบไข่ดาว"
  category: string;             // หมวดหมู่ เช่น "อาหารจานเดียว", "เครื่องดื่ม", "ของทานเล่น"
  dineInPrice: number;          // ราคาขายหน้าร้าน (บาท)
  deliveryPrice: number;        // ราคาขายบนเดลิเวอรี่ (บาท)
  recipe: RecipeItem[];         // วัตถุดิบในสูตร
  packagingCost: number;        // ค่าบรรจุภัณฑ์ กล่อง/ถุง/ช้อน (บาท)
  laborCostPerDish?: number;    // ค่าแรงโดยประมาณต่อจาน (บาท, ถ้าต้องการคำนวณ)
  totalCostPerDish: number;     // ต้นทุนรวมต่อจาน (วัตถุดิบ + บรรจุภัณฑ์)
  targetFoodCostPercent: number;// เป้าหมาย Food Cost % (เช่น 30-35%)
  isActive: boolean;
  notes?: string;
}

// บันทึกรายการรายรับ (Income Transaction)
export interface IncomeRecord {
  id: string;
  date: string;                 // วันที่เกิดรายการ YYYY-MM-DD
  time?: string;                // เวลา เช่น 12:30
  channelId: string;            // อ้างอิง SalesChannel
  channelName: string;          // ชื่อช่องทาง
  grossAmount: number;          // ยอดขายรวมก่อนหัก GP (บาท)
  commissionRatePercent: number;// % GP ที่ใช้คิดในรายการนี้
  commissionAmount: number;     // จำนวนเงิน GP ที่โดนหัก (grossAmount * commissionRatePercent / 100)
  netAmount: number;            // ยอดสุทธิที่ร้านได้รับจริง (grossAmount - commissionAmount)
  paymentAccountId: string;     // รับเข้าบัญชีใด (เงินสด, ธนาคาร, ฯลฯ)
  orderCount?: number;          // จำนวนออเดอร์/บิล
  notes?: string;               // หมายเหตุ เช่น "ยอดขายช่วงเที่ยง", "งานจัดเลี้ยง"
  createdAt: string;            // ISO timestamp
}

// บันทึกรายการรายจ่าย (Expense Transaction)
export interface ExpenseRecord {
  id: string;
  date: string;                 // วันที่จ่าย YYYY-MM-DD
  month?: string;               // เดือนรอบบัญชี เช่น 2026-09 (สำหรับค่าใช้จ่ายคงที่รายเดือน)
  isMonthlyFixed?: boolean;     // เครื่องหมายว่าเป็นค่าใช้จ่ายคงที่ประจำเดือน
  categoryId: string;           // หมวดหมู่ค่าใช้จ่าย
  categoryName: string;         // ชื่อหมวดหมู่
  costType: CostType;           // 'fixed' หรือ 'variable'
  title: string;                // รายละเอียด เช่น "ค่าเช่าร้านประจำเดือน ก.ย.", "ค่าน้ำ-ค่าไฟ"
  amount: number;               // จำนวนเงิน (บาท)
  paymentAccountId: string;     // จ่ายจากบัญชีใด
  receiptNumber?: string;       // เลขที่ใบเสร็จ (ถ้ามี)
  supplier?: string;            // ผู้ขาย/เจ้าหนี้
  relatedIngredientId?: string; // ถ้าเป็นค่าวัตถุดิบ ผูกกับ Ingredient ตัวไหน
  quantityPurchased?: number;   // จำนวนที่ซื้อมา
  notes?: string;
  createdAt: string;
}

// บันทึกต้นทุนขาย/วัตถุดิบ (COGS - Cost of Goods Sold)
export interface CogsRecord {
  id: string;
  date: string;                 // วันที่ซื้อ/บันทึก YYYY-MM-DD
  periodType: 'daily' | 'weekly'; // บันทึกรายวัน หรือ รายสัปดาห์
  weekEndDate?: string;         // วันสิ้นสุดสัปดาห์ (กรณีบันทึกรายสัปดาห์)
  category: string;             // หมวดหมู่วัตถุดิบ เช่น "เนื้อสัตว์", "ผัก", "เครื่องปรุง", "ของแห้ง", "อื่นๆ"
  title: string;                // รายละเอียด เช่น "หมูสับ 10 กก. + สันในไก่", "ผักตลาดสี่มุมเมือง"
  amount: number;               // จำนวนเงินต้นทุน (บาท)
  paymentAccountId?: string;    // บัญชีที่จ่าย
  supplier?: string;            // ร้านค้า / แหล่งซื้อ
  notes?: string;               // หมายเหตุ
  createdAt: string;
}

// บันทึกการเคลื่อนไหวของเงินสดและตรวจนับเงิน (Cash Flow & Drawer Log)
export interface CashFlowRecord {
  id: string;
  date: string;                 // YYYY-MM-DD
  type: 'transfer' | 'drawer_reconcile' | 'petty_cash_in' | 'petty_cash_out';
  title: string;                // เช่น "ปิดกะเงินสดรอบเย็น", "นำเงินสดฝากเข้าธนาคาร", "สำรองเงินทอนเปิดร้าน"
  fromAccountId?: string;       // โอนออกจาก
  toAccountId?: string;         // โอนเข้า
  amount: number;               // จำนวนเงิน
  expectedCash?: number;        // ยอดที่ควรมีตามระบบ (สำหรับปิดกะ)
  actualCash?: number;          // ยอดเงินสดที่นับได้จริง
  difference?: number;          // ส่วนต่าง (เกิน + / ขาด -)
  notes?: string;
  createdAt: string;
}

// ข้อมูลการตั้งค่าร้านอาหาร (Settings)
export interface RestaurantSettings {
  restaurantName: string;       // ชื่อร้านอาหาร
  branchName: string;           // สาขา
  ownerName: string;            // ชื่อเจ้าของร้าน
  phoneNumber: string;          // เบอร์โทรศัพท์
  taxId?: string;               // เลขประจำตัวผู้เสียภาษี
  currency: string;             // สัญลักษณ์เงิน เช่น "฿"
  targetDailySales: number;     // เป้าหมายยอดขายต่อวัน (บาท)
  targetFoodCostPercent: number;// เป้าหมาย Food Cost เฉลี่ยร้าน (%)
  foodCostAlertThresholdPercent: number; // เกณฑ์ % แจ้งเตือนเมื่อ Food Cost สูงกว่าเดือนก่อน (เช่น 5%)
  salesChannels: SalesChannel[];// แพลตฟอร์ม/ช่องทางการขายทั้งหมดพร้อม % GP
  paymentAccounts: PaymentAccount[]; // บัญชีการเงินในร้าน
  expenseCategories: ExpenseCategory[]; // หมวดหมู่ค่าใช้จ่าย
  categoriesList: string[];     // หมวดหมู่อาหารในร้าน เช่น อาหารจานเดียว, ต้ม/แกง, เครื่องดื่ม
  cogsCategories: string[];     // หมวดหมู่วัตถุดิบ COGS เช่น เนื้อสัตว์, ผัก, เครื่องปรุง, ของแห้ง, อื่นๆ
}

// ก้อนข้อมูลทั้งหมดของระบบ (Complete App State for JSON Export/Import)
export interface RestaurantData {
  version: string;              // Schema version เช่น "1.0.0"
  exportDate: string;           // วันที่ Export ข้อมูล
  lastUpdated: string;          // วันที่มีการแก้ไขล่าสุด
  settings: RestaurantSettings; // ข้อมูลร้านและการตั้งค่า
  ingredients: Ingredient[];    // ฐานข้อมูลวัตถุดิบ
  menuItems: MenuItem[];        // ฐานข้อมูลเมนูและสูตรต้นทุน
  incomes: IncomeRecord[];      // ประวัติรายรับทั้งหมด
  expenses: ExpenseRecord[];    // ประวัติรายจ่ายทั้งหมด
  cogsRecords?: CogsRecord[];   // ประวัติบันทึกต้นทุนวัตถุดิบ COGS
  cashFlows: CashFlowRecord[];  // ประวัติกระแสเงินสด
}
