/**
 * ระบบจัดการข้อมูลผ่าน LocalStorage และการ Export/Import ไฟล์ JSON
 * มีระบบตรวจสอบ Schema ความถูกต้องของข้อมูลก่อนนำเข้า
 */

import { RestaurantData, RestaurantSettings } from '../types/restaurant';

export const STORAGE_KEY = 'kinkhorng_restaurant_data_v1';
export const CURRENT_SCHEMA_VERSION = '1.0.0';

/**
 * ข้อมูลเริ่มต้น (Default Starter Data) สำหรับร้านอาหารใหม่
 * มีช่องทางการขาย GP เดลิเวอรี่ หมวดหมู่รายจ่าย และตัวอย่างเมนู/สูตรอาหารพร้อมใช้
 */
export const DEFAULT_RESTAURANT_DATA: RestaurantData = {
  version: CURRENT_SCHEMA_VERSION,
  exportDate: new Date().toISOString(),
  lastUpdated: new Date().toISOString(),
  settings: {
    restaurantName: 'ครัวรสเด็ด อาหารตามสั่ง',
    branchName: 'สาขา 1 (หน้ามหาลัย)',
    ownerName: 'คุณสมชาย ใจดี',
    phoneNumber: '081-234-5678',
    taxId: '',
    currency: '฿',
    targetDailySales: 8000,
    targetFoodCostPercent: 32,
    foodCostAlertThresholdPercent: 5, // แจ้งเตือนเมื่อ food cost % เดือนนี้สูงกว่าเดือนก่อนเกิน 5%
    categoriesList: ['อาหารจานเดียว', 'ต้ม-แกง', 'ของทานเล่น', 'เครื่องดื่ม'],
    cogsCategories: ['เนื้อสัตว์', 'ผัก', 'เครื่องปรุง', 'ของแห้ง', 'อาหารทะเล', 'อื่นๆ'],
    salesChannels: [
      {
        id: 'channel_dine_in',
        name: 'หน้าร้าน (Dine-in / รับที่ร้าน)',
        code: 'dine_in',
        commissionRatePercent: 0,
        vatIncluded: false,
        isActive: true,
        color: '#10b981' // เขียว
      },
      {
        id: 'channel_lineman',
        name: 'LINE MAN',
        code: 'lineman',
        commissionRatePercent: 32.1, // GP 30% + VAT 7% = 32.1%
        vatIncluded: true,
        isActive: true,
        color: '#06c755' // เขียว LINE
      },
      {
        id: 'channel_grab',
        name: 'GrabFood',
        code: 'grab',
        commissionRatePercent: 32.1,
        vatIncluded: true,
        isActive: true,
        color: '#00b14f' // เขียว Grab
      },
      {
        id: 'channel_shopee',
        name: 'ShopeeFood',
        code: 'shopee',
        commissionRatePercent: 32.1,
        vatIncluded: true,
        isActive: true,
        color: '#ee4d2d' // ส้ม Shopee
      },
      {
        id: 'channel_robinhood',
        name: 'Robinhood',
        code: 'robinhood',
        commissionRatePercent: 0,
        vatIncluded: false,
        isActive: false,
        color: '#6b21a8' // ม่วง Robinhood
      },
      {
        id: 'channel_catering',
        name: 'ข้าวกล่องจัดเลี้ยง / พรีออเดอร์',
        code: 'catering',
        commissionRatePercent: 0,
        vatIncluded: false,
        isActive: true,
        color: '#f59e0b' // อำพัน
      }
    ],
    paymentAccounts: [
      {
        id: 'acc_drawer_cash',
        name: 'เงินสดในลิ้นชักหน้าร้าน',
        type: 'cash',
        initialBalance: 2000,
        isActive: true
      },
      {
        id: 'acc_kbank',
        name: 'บัญชี กสิกรไทย (สแกน QR ร้าน)',
        type: 'bank',
        accountNumber: '123-2-45678-9',
        initialBalance: 15000,
        isActive: true
      },
      {
        id: 'acc_delivery_wallet',
        name: 'กระเป๋าพักเงิน เดลิเวอรี่ (รอโอนรอบบิล)',
        type: 'delivery_credit',
        initialBalance: 0,
        isActive: true
      }
    ],
    expenseCategories: [
      {
        id: 'exp_raw_material',
        name: 'ต้นทุนวัตถุดิบอาหารและเครื่องปรุง (Food Cost)',
        type: 'variable',
        description: 'เนื้อสัตว์ ผัก ไข่ เครื่องปรุง ซอส น้ำมัน'
      },
      {
        id: 'exp_packaging',
        name: 'ต้นทุนบรรจุภัณฑ์ (Packaging)',
        type: 'variable',
        description: 'กล่องข้าว ถุงหิ้ว ช้อนส้อม ถ้วยน้ำจิ้ม แก้วน้ำ'
      },
      {
        id: 'exp_gas_ice',
        name: 'ค่าแก๊สหุงต้ม / น้ำแข็ง',
        type: 'variable',
        description: 'แก๊สถัง ค่าน้ำแข็งหลอดประจำวัน'
      },
      {
        id: 'exp_rent',
        name: 'ค่าเช่าสถานที่ / ค่าแผง',
        type: 'fixed',
        description: 'ค่าเช่าร้าน ค่าส่วนกลางประจำเดือน'
      },
      {
        id: 'exp_wages',
        name: 'เงินเดือนและค่าจ้างพนักงาน',
        type: 'fixed',
        description: 'เงินเดือนแม่ครัว ผู้ช่วย เด็กเสิร์ฟ'
      },
      {
        id: 'exp_utilities',
        name: 'ค่าน้ำประปา / ค่าไฟฟ้า / ค่าเน็ต',
        type: 'fixed',
        description: 'ค่าสาธารณูปโภคประจำเดือน'
      },
      {
        id: 'exp_delivery_ads',
        name: 'ค่าโฆษณา / โปรโมทแอปเดลิเวอรี่',
        type: 'variable',
        description: 'ยิงแอด Grab/LINE MAN, ค่าทำป้าย'
      },
      {
        id: 'exp_maintenance',
        name: 'ค่าซ่อมบำรุง / อุปกรณ์ครัว',
        type: 'variable',
        description: 'ซ่อมตู้เย็น ซ่อมเตา ซื้อกระทะใหม่'
      },
      {
        id: 'exp_misc',
        name: 'ค่าใช้จ่ายเบ็ดเตล็ด',
        type: 'variable',
        description: 'น้ำยาล้างจาน ถุงขยะ ทิชชู่ อุปกรณ์ทำความสะอาด'
      }
    ]
  },
  ingredients: [
    {
      id: 'ing_1',
      name: 'หมูสับ',
      unit: 'กก.',
      unitCost: 150,
      currentStock: 5,
      minStockAlert: 2,
      supplier: 'เขียงหมูป้าพร ตลาดสด',
      updatedAt: new Date().toISOString()
    },
    {
      id: 'ing_2',
      name: 'ไข่ไก่ เบอร์ 2',
      unit: 'ฟอง',
      unitCost: 4.2,
      currentStock: 60,
      minStockAlert: 30,
      supplier: 'แผงไข่เจ๊แดง',
      updatedAt: new Date().toISOString()
    },
    {
      id: 'ing_3',
      name: 'ใบกะเพราและพริกกระเทียม',
      unit: 'ชุด',
      unitCost: 3.5,
      currentStock: 50,
      minStockAlert: 10,
      supplier: 'ร้านผักสดลุงหมาย',
      updatedAt: new Date().toISOString()
    },
    {
      id: 'ing_4',
      name: 'ข้าวสวยหอมมะลิ (หุงแล้ว)',
      unit: 'จาน (200g)',
      unitCost: 4.0,
      currentStock: 100,
      minStockAlert: 20,
      supplier: 'ตราฉัตร',
      updatedAt: new Date().toISOString()
    },
    {
      id: 'ing_5',
      name: 'ซอสผัดกะเพราปรุงสำเร็จ',
      unit: 'ช้อนโต๊ะ',
      unitCost: 2.0,
      currentStock: 200,
      minStockAlert: 30,
      supplier: 'ผสมเอง',
      updatedAt: new Date().toISOString()
    },
    {
      id: 'ing_6',
      name: 'กล่องข้าวกระดาษคราฟท์ + ช้อน',
      unit: 'ชุด',
      unitCost: 3.8,
      currentStock: 150,
      minStockAlert: 50,
      supplier: 'แม็คโคร',
      updatedAt: new Date().toISOString()
    }
  ],
  menuItems: [
    {
      id: 'menu_1',
      name: 'ข้าวกะเพราหมูสับไข่ดาว',
      category: 'อาหารจานเดียว',
      dineInPrice: 65,
      deliveryPrice: 85,
      recipe: [
        {
          ingredientId: 'ing_1',
          ingredientName: 'หมูสับ (100g)',
          quantity: 0.1,
          unit: 'กก.',
          costPerServing: 15.0
        },
        {
          ingredientId: 'ing_2',
          ingredientName: 'ไข่ไก่ เบอร์ 2',
          quantity: 1,
          unit: 'ฟอง',
          costPerServing: 4.2
        },
        {
          ingredientId: 'ing_3',
          ingredientName: 'ใบกะเพรา+พริกกระเทียม',
          quantity: 1,
          unit: 'ชุด',
          costPerServing: 3.5
        },
        {
          ingredientId: 'ing_4',
          ingredientName: 'ข้าวสวยหอมมะลิ',
          quantity: 1,
          unit: 'จาน',
          costPerServing: 4.0
        },
        {
          ingredientId: 'ing_5',
          ingredientName: 'ซอสผัดกะเพรา',
          quantity: 1,
          unit: 'ช้อนโต๊ะ',
          costPerServing: 2.0
        }
      ],
      packagingCost: 3.8,
      totalCostPerDish: 32.5, // 15 + 4.2 + 3.5 + 4 + 2 + 3.8 = 32.5 บ.
      targetFoodCostPercent: 35,
      isActive: true,
      notes: 'เมนูขายดีประจำร้าน'
    }
  ],
  incomes: [
    {
      id: 'inc_sample_1',
      date: new Date().toISOString().split('T')[0],
      time: '12:15',
      channelId: 'channel_dine_in',
      channelName: 'หน้าร้าน (Dine-in / รับที่ร้าน)',
      grossAmount: 3250,
      commissionRatePercent: 0,
      commissionAmount: 0,
      netAmount: 3250,
      paymentAccountId: 'acc_drawer_cash',
      orderCount: 42,
      notes: 'ยอดขายหน้าร้านรอบเที่ยง',
      createdAt: new Date().toISOString()
    },
    {
      id: 'inc_sample_2',
      date: new Date().toISOString().split('T')[0],
      time: '13:00',
      channelId: 'channel_lineman',
      channelName: 'LINE MAN',
      grossAmount: 2450,
      commissionRatePercent: 32.1,
      commissionAmount: 786.45,
      netAmount: 1663.55,
      paymentAccountId: 'acc_delivery_wallet',
      orderCount: 22,
      notes: 'ออเดอร์ LINE MAN มื้อเที่ยง',
      createdAt: new Date().toISOString()
    },
    {
      id: 'inc_sample_3',
      date: new Date().toISOString().split('T')[0],
      time: '14:20',
      channelId: 'channel_grab',
      channelName: 'GrabFood',
      grossAmount: 1890,
      commissionRatePercent: 32.1,
      commissionAmount: 606.69,
      netAmount: 1283.31,
      paymentAccountId: 'acc_delivery_wallet',
      orderCount: 16,
      notes: 'ออเดอร์ GrabFood ช่วงบ่าย',
      createdAt: new Date().toISOString()
    }
  ],
  expenses: [
    {
      id: 'exp_sample_1',
      date: new Date().toISOString().split('T')[0],
      categoryId: 'exp_raw_material',
      categoryName: 'ต้นทุนวัตถุดิบอาหารและเครื่องปรุง (Food Cost)',
      costType: 'variable',
      title: 'ซื้อเนื้อหมู ไข่ไก่ ผักสด ตลาดเช้า',
      amount: 1850,
      paymentAccountId: 'acc_drawer_cash',
      supplier: 'ตลาดสดเทศบาล',
      createdAt: new Date().toISOString()
    },
    {
      id: 'exp_sample_2',
      date: new Date().toISOString().split('T')[0],
      categoryId: 'exp_packaging',
      categoryName: 'ต้นทุนบรรจุภัณฑ์ (Packaging)',
      costType: 'variable',
      title: 'ซื้อกล่องข้าวกระดาษ 2 ลัง + ช้อนพลาสติก',
      amount: 620,
      paymentAccountId: 'acc_kbank',
      supplier: 'แม็คโคร',
      createdAt: new Date().toISOString()
    },
    {
      id: 'exp_sample_3',
      date: new Date().toISOString().split('T')[0],
      categoryId: 'exp_rent',
      categoryName: 'ค่าเช่าสถานที่ / ค่าแผง',
      costType: 'fixed',
      isMonthlyFixed: true,
      month: new Date().toISOString().substring(0, 7),
      title: 'ค่าเช่าร้านประจำเดือน',
      amount: 12000,
      paymentAccountId: 'acc_kbank',
      createdAt: new Date().toISOString()
    },
    {
      id: 'exp_sample_4',
      date: new Date().toISOString().split('T')[0],
      categoryId: 'exp_gas_ice',
      categoryName: 'ค่าแก๊สหุงต้ม / น้ำแข็ง',
      costType: 'variable',
      title: 'สั่งแก๊ส ปตท. 15 กก. 1 ถัง + น้ำแข็งหลอด',
      amount: 520,
      paymentAccountId: 'acc_drawer_cash',
      createdAt: new Date().toISOString()
    }
  ],
  cogsRecords: [
    {
      id: 'cogs_sample_1',
      date: new Date().toISOString().split('T')[0],
      periodType: 'daily',
      category: 'เนื้อสัตว์',
      title: 'หมูสับ 10 กก. + อกไก่สด',
      amount: 1450,
      supplier: 'เขียงหมูป้าพร',
      notes: 'เนื้อสัตว์สำหรับรอบเช้า',
      createdAt: new Date().toISOString()
    },
    {
      id: 'cogs_sample_2',
      date: new Date().toISOString().split('T')[0],
      periodType: 'daily',
      category: 'ผัก',
      title: 'กะเพรา พริกขี้หนู แตงกวา ต้นหอม',
      amount: 320,
      supplier: 'ร้านผักสดลุงหมาย',
      createdAt: new Date().toISOString()
    },
    {
      id: 'cogs_sample_3',
      date: new Date().toISOString().split('T')[0],
      periodType: 'weekly',
      weekEndDate: new Date().toISOString().split('T')[0],
      category: 'ของแห้ง',
      title: 'ข้าวหอมมะลิ 2 กระสอบ (100 กก.)',
      amount: 3200,
      supplier: 'โรงสีข้าวเจริญผล',
      notes: 'สต็อกสำหรับ 1-2 สัปดาห์',
      createdAt: new Date().toISOString()
    }
  ],
  cashFlows: [
    {
      id: 'cf_sample_1',
      date: new Date().toISOString().split('T')[0],
      type: 'petty_cash_in',
      title: 'เงินทอนเปิดร้านรอบเช้า',
      toAccountId: 'acc_drawer_cash',
      amount: 2000,
      notes: 'แบงก์ 20/50/100 และเหรียญ',
      createdAt: new Date().toISOString()
    }
  ]
};

/**
 * ดึงข้อมูลทั้งหมดจาก LocalStorage
 */
export function loadRestaurantData(): RestaurantData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // ครั้งแรก บันทึกข้อมูลเริ่มต้นลงเครื่อง
      saveRestaurantData(DEFAULT_RESTAURANT_DATA);
      return DEFAULT_RESTAURANT_DATA;
    }
    const parsed = JSON.parse(raw);
    // ตรวจสอบความสมบูรณ์ขั้นพื้นฐาน
    if (!parsed || !parsed.settings || !Array.isArray(parsed.incomes)) {
      console.warn('Invalid data found in localStorage, falling back to default data');
      return DEFAULT_RESTAURANT_DATA;
    }

    // เติมฟิลด์ที่อาจยังไม่มีจากเวอร์ชันก่อนหน้า
    if (!Array.isArray(parsed.settings.cogsCategories)) {
      parsed.settings.cogsCategories = DEFAULT_RESTAURANT_DATA.settings.cogsCategories;
    }
    if (typeof parsed.settings.foodCostAlertThresholdPercent !== 'number') {
      parsed.settings.foodCostAlertThresholdPercent = 5;
    }
    if (!Array.isArray(parsed.cogsRecords)) {
      parsed.cogsRecords = DEFAULT_RESTAURANT_DATA.cogsRecords || [];
    }

    return parsed as RestaurantData;
  } catch (err) {
    console.error('Error loading restaurant data from localStorage:', err);
    return DEFAULT_RESTAURANT_DATA;
  }
}

/**
 * บันทึกข้อมูลลง LocalStorage
 */
export function saveRestaurantData(data: RestaurantData): boolean {
  try {
    const updatedData: RestaurantData = {
      ...data,
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData));
    return true;
  } catch (err) {
    console.error('Error saving restaurant data to localStorage:', err);
    return false;
  }
}

/**
 * รีเซ็ตข้อมูลทั้งหมดกลับเป็นค่าเริ่มต้น
 */
export function resetRestaurantData(): RestaurantData {
  saveRestaurantData(DEFAULT_RESTAURANT_DATA);
  return DEFAULT_RESTAURANT_DATA;
}

/**
 * ฟีเจอร์ Export ข้อมูลทั้งหมดเป็นไฟล์ JSON และสั่งดาวน์โหลดลงเครื่องของผู้ใช้
 */
export function exportDataAsJsonFile(data: RestaurantData, customFilename?: string): void {
  const exportPayload: RestaurantData = {
    ...data,
    exportDate: new Date().toISOString()
  };

  const jsonString = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  // สร้างชื่อไฟล์ที่อ่านง่าย เช่น kinkhorng_backup_ร้านครัวรสเด็ด_2026-09-25.json
  const safeName = (data.settings.restaurantName || 'restaurant')
    .replace(/[^a-zA-Z0-9\u0E00-\u0E7F_-]/g, '_')
    .slice(0, 30);
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = customFilename || `kinkhorng_backup_${safeName}_${dateStr}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * ผลลัพธ์จากการตรวจสอบและ Import ข้อมูล JSON
 */
export interface ImportResult {
  success: boolean;
  message: string;
  data?: RestaurantData;
  summary?: {
    restaurantName: string;
    incomeCount: number;
    expenseCount: number;
    menuItemCount: number;
    exportDate: string;
  };
}

/**
 * ฟีเจอร์ Import ข้อมูลจากข้อความ JSON พร้อมตรวจสอบ Schema ความถูกต้อง
 */
export function validateAndParseImportJson(jsonText: string): ImportResult {
  try {
    const parsed = JSON.parse(jsonText);

    // ตรวจสอบความถูกต้องของคีย์จำเป็น
    if (!parsed || typeof parsed !== 'object') {
      return { success: false, message: 'ไฟล์ไม่ใช่ JSON Object ที่ถูกต้อง' };
    }

    if (!parsed.settings || typeof parsed.settings !== 'object') {
      return { success: false, message: 'โครงสร้างข้อมูลไม่ถูกต้อง: ไม่พบส่วนการตั้งค่า (settings)' };
    }

    if (!Array.isArray(parsed.settings.salesChannels)) {
      return { success: false, message: 'โครงสร้างข้อมูลไม่ถูกต้อง: ไม่พบข้อมูลช่องทางการขาย (salesChannels)' };
    }

    if (!Array.isArray(parsed.incomes) || !Array.isArray(parsed.expenses)) {
      return { success: false, message: 'โครงสร้างข้อมูลไม่ถูกต้อง: ไม่พบรายการรายรับหรือรายจ่าย (incomes/expenses)' };
    }

    // ทำความสะอาดและเติมค่าเริ่มต้นให้กับฟิลด์ที่อาจขาดไปในเวอร์ชันเก่า
    const sanitizedData: RestaurantData = {
      version: parsed.version || CURRENT_SCHEMA_VERSION,
      exportDate: parsed.exportDate || new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      settings: {
        ...DEFAULT_RESTAURANT_DATA.settings,
        ...parsed.settings,
        salesChannels: Array.isArray(parsed.settings.salesChannels)
          ? parsed.settings.salesChannels
          : DEFAULT_RESTAURANT_DATA.settings.salesChannels,
        paymentAccounts: Array.isArray(parsed.settings.paymentAccounts)
          ? parsed.settings.paymentAccounts
          : DEFAULT_RESTAURANT_DATA.settings.paymentAccounts,
        expenseCategories: Array.isArray(parsed.settings.expenseCategories)
          ? parsed.settings.expenseCategories
          : DEFAULT_RESTAURANT_DATA.settings.expenseCategories,
        cogsCategories: Array.isArray(parsed.settings.cogsCategories)
          ? parsed.settings.cogsCategories
          : DEFAULT_RESTAURANT_DATA.settings.cogsCategories,
      },
      ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : [],
      menuItems: Array.isArray(parsed.menuItems) ? parsed.menuItems : [],
      incomes: Array.isArray(parsed.incomes) ? parsed.incomes : [],
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
      cogsRecords: Array.isArray(parsed.cogsRecords) ? parsed.cogsRecords : (DEFAULT_RESTAURANT_DATA.cogsRecords || []),
      cashFlows: Array.isArray(parsed.cashFlows) ? parsed.cashFlows : []
    };

    return {
      success: true,
      message: 'ตรวจสอบโครงสร้างไฟล์สำเร็จ ข้อมูลพร้อมใช้งาน',
      data: sanitizedData,
      summary: {
        restaurantName: sanitizedData.settings.restaurantName || 'ไม่ระบุชื่อ',
        incomeCount: sanitizedData.incomes.length,
        expenseCount: sanitizedData.expenses.length,
        menuItemCount: sanitizedData.menuItems.length,
        exportDate: sanitizedData.exportDate
      }
    };
  } catch (err) {
    return {
      success: false,
      message: `ไม่สามารถอ่านไฟล์ JSON ได้: ${err instanceof Error ? err.message : 'รูปแบบไม่ถูกต้อง'}`
    };
  }
}
