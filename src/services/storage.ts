/**
 * ระบบจัดการข้อมูลผ่าน LocalStorage และการ Export/Import ไฟล์ JSON
 * มีระบบตรวจสอบ Schema ความถูกต้องของข้อมูลก่อนนำเข้า
 */

import { RestaurantData, RestaurantSettings, IncomeRecord, ExpenseRecord, CogsRecord } from '../types/restaurant';

export const STORAGE_KEY = 'kinkhorng_restaurant_data_v1';
export const CURRENT_SCHEMA_VERSION = '1.0.0';

/**
 * สร้างข้อมูลประวัติย้อนหลัง 12 เดือน (รวมเดือนปัจจุบัน) อย่างสมจริง
 * สำหรับนำไปวิเคราะห์ในกราฟ % Food Cost 12 เดือน และกราฟเปรียบเทียบกำไรสุทธิ
 */
export function generateHistoricalSeedRecords(): {
  incomes: IncomeRecord[];
  expenses: ExpenseRecord[];
  cogsRecords: CogsRecord[];
} {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const incomes: IncomeRecord[] = [
    {
      id: 'inc_sample_today_1',
      date: todayStr,
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
      createdAt: now.toISOString()
    },
    {
      id: 'inc_sample_today_2',
      date: todayStr,
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
      createdAt: now.toISOString()
    },
    {
      id: 'inc_sample_today_3',
      date: todayStr,
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
      createdAt: now.toISOString()
    }
  ];

  const expenses: ExpenseRecord[] = [
    {
      id: 'exp_sample_today_1',
      date: todayStr,
      categoryId: 'exp_raw_material',
      categoryName: 'ต้นทุนวัตถุดิบอาหารและเครื่องปรุง (Food Cost)',
      costType: 'variable',
      title: 'ซื้อเนื้อหมู ไข่ไก่ ผักสด ตลาดเช้า',
      amount: 1850,
      paymentAccountId: 'acc_drawer_cash',
      supplier: 'ตลาดสดเทศบาล',
      createdAt: now.toISOString()
    },
    {
      id: 'exp_sample_today_2',
      date: todayStr,
      categoryId: 'exp_packaging',
      categoryName: 'ต้นทุนบรรจุภัณฑ์ (Packaging)',
      costType: 'variable',
      title: 'ซื้อกล่องข้าวกระดาษ 2 ลัง + ช้อนพลาสติก',
      amount: 620,
      paymentAccountId: 'acc_kbank',
      supplier: 'แม็คโคร',
      createdAt: now.toISOString()
    },
    {
      id: 'exp_sample_today_3',
      date: todayStr,
      categoryId: 'exp_rent',
      categoryName: 'ค่าเช่าสถานที่ / ค่าแผง',
      costType: 'fixed',
      isMonthlyFixed: true,
      month: todayStr.substring(0, 7),
      title: 'ค่าเช่าร้านประจำเดือน',
      amount: 12000,
      paymentAccountId: 'acc_kbank',
      createdAt: now.toISOString()
    },
    {
      id: 'exp_sample_today_4',
      date: todayStr,
      categoryId: 'exp_gas_ice',
      categoryName: 'ค่าแก๊สหุงต้ม / น้ำแข็ง',
      costType: 'variable',
      title: 'สั่งแก๊ส ปตท. 15 กก. 1 ถัง + น้ำแข็งหลอด',
      amount: 520,
      paymentAccountId: 'acc_drawer_cash',
      createdAt: now.toISOString()
    }
  ];

  const cogsRecords: CogsRecord[] = [
    {
      id: 'cogs_sample_today_1',
      date: todayStr,
      periodType: 'daily',
      category: 'เนื้อสัตว์',
      title: 'หมูสับ 10 กก. + อกไก่สด',
      amount: 1450,
      supplier: 'เขียงหมูป้าพร',
      notes: 'เนื้อสัตว์สำหรับรอบเช้า',
      createdAt: now.toISOString()
    },
    {
      id: 'cogs_sample_today_2',
      date: todayStr,
      periodType: 'daily',
      category: 'ผัก',
      title: 'กะเพรา พริกขี้หนู แตงกวา ต้นหอม',
      amount: 320,
      supplier: 'ร้านผักสดลุงหมาย',
      createdAt: now.toISOString()
    },
    {
      id: 'cogs_sample_today_3',
      date: todayStr,
      periodType: 'weekly',
      weekEndDate: todayStr,
      category: 'ของแห้ง',
      title: 'ข้าวหอมมะลิ 2 กระสอบ (100 กก.)',
      amount: 3200,
      supplier: 'โรงสีข้าวเจริญผล',
      notes: 'สต็อกสำหรับ 1-2 สัปดาห์',
      createdAt: now.toISOString()
    }
  ];

  // โปรไฟล์จำลองย้อนหลัง 12 เดือน (offset 11 = 11 เดือนก่อนหน้า, offset 0 = เดือนปัจจุบัน)
  const monthlyProfiles = [
    { offset: 11, grossBase: 195000, foodCostPct: 31.4, festival: 'งานตักบาตรเทโว' },
    { offset: 10, grossBase: 205000, foodCostPct: 32.0, festival: 'เปิดเทอม 2' },
    { offset: 9, grossBase: 268000, foodCostPct: 30.5, festival: 'เทศกาลปีใหม่ & ปลายปี' },
    { offset: 8, grossBase: 215000, foodCostPct: 32.2, festival: 'ต้นปีใหม่' },
    { offset: 7, grossBase: 202000, foodCostPct: 33.8, festival: 'วาเลนไทน์' },
    { offset: 6, grossBase: 228000, foodCostPct: 31.6, festival: 'หน้าร้อน' },
    { offset: 5, grossBase: 275000, foodCostPct: 34.2, festival: 'เทศกาลสงกรานต์' },
    { offset: 4, grossBase: 218000, foodCostPct: 32.5, festival: 'เปิดเทอมใหญ่' },
    { offset: 3, grossBase: 212000, foodCostPct: 31.2, festival: 'กลางปี' },
    { offset: 2, grossBase: 225000, foodCostPct: 32.8, festival: 'วันหยุดยาว ก.ค.' },
    { offset: 1, grossBase: 220000, foodCostPct: 31.0, festival: 'วันแม่แห่งชาติ' },
    { offset: 0, grossBase: 198000, foodCostPct: 32.3, festival: 'รอบเดือนปัจจุบัน' },
  ];

  monthlyProfiles.forEach(({ offset, grossBase, foodCostPct, festival }) => {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 15);
    const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const dateStr = `${mStr}-15`;

    const dineGross = Math.round(grossBase * 0.48);
    const linemanGross = Math.round(grossBase * 0.25);
    const grabGross = Math.round(grossBase * 0.17);
    const shopeeGross = Math.round(grossBase * 0.06);
    const cateringGross = Math.round(grossBase * 0.04);

    const linemanComm = parseFloat((linemanGross * 0.321).toFixed(2));
    const grabComm = parseFloat((grabGross * 0.321).toFixed(2));
    const shopeeComm = parseFloat((shopeeGross * 0.321).toFixed(2));

    const totalNet = dineGross + (linemanGross - linemanComm) + (grabGross - grabComm) + (shopeeGross - shopeeComm) + cateringGross;

    incomes.push(
      {
        id: `inc_hist_${mStr}_dine`,
        date: dateStr,
        time: '18:00',
        channelId: 'channel_dine_in',
        channelName: 'หน้าร้าน (Dine-in / รับที่ร้าน)',
        grossAmount: dineGross,
        commissionRatePercent: 0,
        commissionAmount: 0,
        netAmount: dineGross,
        paymentAccountId: 'acc_drawer_cash',
        orderCount: Math.round(dineGross / 75),
        notes: `ยอดขายหน้าร้านสะสม (${festival})`,
        createdAt: d.toISOString()
      },
      {
        id: `inc_hist_${mStr}_lm`,
        date: dateStr,
        time: '18:30',
        channelId: 'channel_lineman',
        channelName: 'LINE MAN',
        grossAmount: linemanGross,
        commissionRatePercent: 32.1,
        commissionAmount: linemanComm,
        netAmount: linemanGross - linemanComm,
        paymentAccountId: 'acc_delivery_wallet',
        orderCount: Math.round(linemanGross / 110),
        notes: `ยอดขาย LINE MAN สะสม`,
        createdAt: d.toISOString()
      },
      {
        id: `inc_hist_${mStr}_grab`,
        date: dateStr,
        time: '19:00',
        channelId: 'channel_grab',
        channelName: 'GrabFood',
        grossAmount: grabGross,
        commissionRatePercent: 32.1,
        commissionAmount: grabComm,
        netAmount: grabGross - grabComm,
        paymentAccountId: 'acc_delivery_wallet',
        orderCount: Math.round(grabGross / 115),
        notes: `ยอดขาย GrabFood สะสม`,
        createdAt: d.toISOString()
      },
      {
        id: `inc_hist_${mStr}_shopee`,
        date: dateStr,
        time: '19:30',
        channelId: 'channel_shopee',
        channelName: 'ShopeeFood',
        grossAmount: shopeeGross,
        commissionRatePercent: 32.1,
        commissionAmount: shopeeComm,
        netAmount: shopeeGross - shopeeComm,
        paymentAccountId: 'acc_delivery_wallet',
        orderCount: Math.round(shopeeGross / 100),
        notes: `ยอดขาย ShopeeFood สะสม`,
        createdAt: d.toISOString()
      },
      {
        id: `inc_hist_${mStr}_cat`,
        date: `${mStr}-20`,
        time: '11:00',
        channelId: 'channel_catering',
        channelName: 'ข้าวกล่องจัดเลี้ยง / พรีออเดอร์',
        grossAmount: cateringGross,
        commissionRatePercent: 0,
        commissionAmount: 0,
        netAmount: cateringGross,
        paymentAccountId: 'acc_kbank',
        orderCount: Math.round(cateringGross / 600),
        notes: `ออเดอร์จัดเลี้ยงประจำเดือน`,
        createdAt: d.toISOString()
      }
    );

    // COGS วัตถุดิบ
    const totalCogsTarget = Math.round(totalNet * (foodCostPct / 100));
    const meatCogs = Math.round(totalCogsTarget * 0.48);
    const vegCogs = Math.round(totalCogsTarget * 0.16);
    const dryCogs = Math.round(totalCogsTarget * 0.15);
    const seasonCogs = Math.round(totalCogsTarget * 0.11);
    const seafoodCogs = totalCogsTarget - (meatCogs + vegCogs + dryCogs + seasonCogs);

    cogsRecords.push(
      {
        id: `cogs_hist_${mStr}_meat`,
        date: `${mStr}-05`,
        periodType: 'daily',
        category: 'เนื้อสัตว์',
        title: 'หมูสด ไก่สด หมูกรอบ ประจำเดือน',
        amount: meatCogs,
        supplier: 'เขียงหมูป้าพร',
        notes: `ต้นทุนเนื้อสัตว์รอบเดือน`,
        createdAt: d.toISOString()
      },
      {
        id: `cogs_hist_${mStr}_veg`,
        date: `${mStr}-10`,
        periodType: 'daily',
        category: 'ผัก',
        title: 'ผักสด คะน้า พริก แตงกวา ใบกะเพรา',
        amount: vegCogs,
        supplier: 'ร้านผักสดลุงหมาย',
        createdAt: d.toISOString()
      },
      {
        id: `cogs_hist_${mStr}_dry`,
        date: `${mStr}-12`,
        periodType: 'weekly',
        category: 'ของแห้ง',
        title: 'ข้าวสารหอมมะลิ เส้นก๋วยเตี๋ยว แป้ง',
        amount: dryCogs,
        supplier: 'โรงสีข้าวเจริญผล',
        createdAt: d.toISOString()
      },
      {
        id: `cogs_hist_${mStr}_season`,
        date: `${mStr}-18`,
        periodType: 'weekly',
        category: 'เครื่องปรุง',
        title: 'น้ำมันพืช ซอสปรุงรส ซีอิ๊ว น้ำตาล น้ำปลา',
        amount: seasonCogs,
        supplier: 'แม็คโคร',
        createdAt: d.toISOString()
      },
      {
        id: `cogs_hist_${mStr}_seafood`,
        date: `${mStr}-22`,
        periodType: 'daily',
        category: 'อาหารทะเล',
        title: 'กุ้งสด หมึกสด ปลากะพง',
        amount: seafoodCogs,
        supplier: 'แพปลาสมุทรสาคร',
        createdAt: d.toISOString()
      }
    );

    // ค่าใช้จ่ายคงที่และผันแปร
    expenses.push(
      {
        id: `exp_hist_${mStr}_rent`,
        date: `${mStr}-01`,
        month: mStr,
        isMonthlyFixed: true,
        categoryId: 'exp_rent',
        categoryName: 'ค่าเช่าสถานที่ / ค่าแผง',
        costType: 'fixed',
        title: `ค่าเช่าร้านประจำเดือน ${mStr}`,
        amount: 12000,
        paymentAccountId: 'acc_kbank',
        createdAt: d.toISOString()
      },
      {
        id: `exp_hist_${mStr}_wages`,
        date: `${mStr}-28`,
        month: mStr,
        isMonthlyFixed: true,
        categoryId: 'exp_wages',
        categoryName: 'เงินเดือนและค่าจ้างพนักงาน',
        costType: 'fixed',
        title: `เงินเดือนพ่อครัวและผู้ช่วย 2 คน`,
        amount: 22000,
        paymentAccountId: 'acc_kbank',
        createdAt: d.toISOString()
      },
      {
        id: `exp_hist_${mStr}_util`,
        date: `${mStr}-15`,
        month: mStr,
        isMonthlyFixed: true,
        categoryId: 'exp_utilities',
        categoryName: 'ค่าน้ำประปา / ไฟฟ้า / อินเทอร์เน็ต',
        costType: 'fixed',
        title: `ค่าน้ำ-ค่าไฟ-เน็ตประจำร้าน`,
        amount: 5400 + Math.round((offset % 3) * 200),
        paymentAccountId: 'acc_kbank',
        createdAt: d.toISOString()
      },
      {
        id: `exp_hist_${mStr}_pack`,
        date: `${mStr}-08`,
        month: mStr,
        categoryId: 'exp_packaging',
        categoryName: 'ต้นทุนบรรจุภัณฑ์ (Packaging)',
        costType: 'variable',
        title: `กล่องข้าวกระดาษ ถุงหิ้ว ช้อนส้อม`,
        amount: Math.round(grossBase * 0.033),
        paymentAccountId: 'acc_kbank',
        createdAt: d.toISOString()
      },
      {
        id: `exp_hist_${mStr}_gas`,
        date: `${mStr}-16`,
        month: mStr,
        categoryId: 'exp_gas_ice',
        categoryName: 'ค่าแก๊สหุงต้ม / น้ำแข็ง',
        costType: 'variable',
        title: `แก๊สถัง 15 กก. 4 ถัง + น้ำแข็งหลอด`,
        amount: Math.round(grossBase * 0.024),
        paymentAccountId: 'acc_drawer_cash',
        createdAt: d.toISOString()
      }
    );
  });

  return { incomes, expenses, cogsRecords };
}

const initialSeedTransactions = generateHistoricalSeedRecords();

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
    minMarginAlertThresholdPercent: 60, // เกณฑ์ % Margin ขั้นต่ำที่ต้องการ หากต่ำกว่า 60% ให้เตือน
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
      category: 'เนื้อสัตว์',
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
      category: 'ของแห้ง',
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
      category: 'ผัก',
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
      category: 'ของแห้ง',
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
      category: 'เครื่องปรุง',
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
      category: 'ของแห้ง',
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
      totalCostPerDish: 28.7, // 15 + 4.2 + 3.5 + 4 + 2 = 28.7 บ.
      targetFoodCostPercent: 35,
      isActive: true,
      notes: 'เมนูขายดีประจำร้าน (Margin 55.8% - ต่ำกว่าเกณฑ์ 60%)'
    },
    {
      id: 'menu_2',
      name: 'ต้มยำกุ้งน้ำข้น (ชาม)',
      category: 'ต้ม-แกง',
      dineInPrice: 150,
      deliveryPrice: 180,
      recipe: [
        {
          ingredientId: 'ing_seafood',
          ingredientName: 'กุ้งขาวสด (150g)',
          category: 'อาหารทะเล',
          quantity: 0.15,
          unit: 'กก.',
          unitCost: 280,
          costPerServing: 42.0
        },
        {
          ingredientId: 'ing_herbs',
          ingredientName: 'ชุดเครื่องต้มยำ (ข่า ตะไคร้ ใบมะกรูด เห็ด)',
          category: 'ผัก',
          quantity: 1,
          unit: 'ชุด',
          unitCost: 15,
          costPerServing: 15.0
        },
        {
          ingredientId: 'ing_seasoning',
          ingredientName: 'น้ำพริกเผา + นมสด + มะนาว',
          category: 'เครื่องปรุง',
          quantity: 1,
          unit: 'ชุด',
          unitCost: 12,
          costPerServing: 12.0
        }
      ],
      packagingCost: 4.5,
      totalCostPerDish: 73.5, // 42 + 15 + 12 + 4.5 = 73.5 บ.
      targetFoodCostPercent: 40,
      isActive: true,
      notes: 'ต้นทุนกุ้งสดสูง ทำให้ Margin อยู่ที่ 51.0% (ต่ำกว่าเกณฑ์ 60% ควรปรับราคา)'
    },
    {
      id: 'menu_3',
      name: 'ข้าวผัดหมูใส่ไข่',
      category: 'อาหารจานเดียว',
      dineInPrice: 65,
      deliveryPrice: 80,
      recipe: [
        {
          ingredientId: 'ing_1',
          ingredientName: 'หมูสันนอก (60g)',
          category: 'เนื้อสัตว์',
          quantity: 0.06,
          unit: 'กก.',
          unitCost: 150,
          costPerServing: 9.0
        },
        {
          ingredientId: 'ing_2',
          ingredientName: 'ไข่ไก่ เบอร์ 2',
          category: 'ของแห้ง',
          quantity: 1,
          unit: 'ฟอง',
          unitCost: 4.2,
          costPerServing: 4.2
        },
        {
          ingredientId: 'ing_4',
          ingredientName: 'ข้าวสวยหอมมะลิ',
          category: 'ของแห้ง',
          quantity: 1,
          unit: 'จาน',
          unitCost: 4.0,
          costPerServing: 4.0
        },
        {
          ingredientId: 'ing_veg',
          ingredientName: 'คะน้า มะเขือเทศ หอมใหญ่ ต้นหอม',
          category: 'ผัก',
          quantity: 1,
          unit: 'ชุด',
          unitCost: 3.5,
          costPerServing: 3.5
        }
      ],
      packagingCost: 3.8,
      totalCostPerDish: 24.5, // 9 + 4.2 + 4 + 3.5 + 3.8 = 24.5 บ.
      targetFoodCostPercent: 32,
      isActive: true,
      notes: 'Margin 62.3% (ผ่านเกณฑ์มาตรฐาน)'
    },
    {
      id: 'menu_4',
      name: 'ชาไทยเย็นโบราณ',
      category: 'เครื่องดื่ม',
      dineInPrice: 45,
      deliveryPrice: 55,
      recipe: [
        {
          ingredientId: 'ing_tea',
          ingredientName: 'ผงชาไทยตรามือ',
          category: 'ของแห้ง',
          quantity: 1,
          unit: 'ช็อต',
          unitCost: 3.5,
          costPerServing: 3.5
        },
        {
          ingredientId: 'ing_milk',
          ingredientName: 'นมข้นหวาน + นมสด',
          category: 'เครื่องปรุง',
          quantity: 1,
          unit: 'แก้ว',
          unitCost: 4.5,
          costPerServing: 4.5
        },
        {
          ingredientId: 'ing_ice',
          ingredientName: 'น้ำแข็งหลอด + แก้วฝาฮาล์ฟ',
          category: 'ของแห้ง',
          quantity: 1,
          unit: 'ชุด',
          unitCost: 3.5,
          costPerServing: 3.5
        }
      ],
      packagingCost: 0,
      totalCostPerDish: 11.5,
      targetFoodCostPercent: 25,
      isActive: true,
      notes: 'เมนูทำกำไรสูง (Margin 74.4% เป็น Star Item)'
    }
  ],
  incomes: initialSeedTransactions.incomes,
  expenses: initialSeedTransactions.expenses,
  cogsRecords: initialSeedTransactions.cogsRecords,
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
    if (typeof parsed.settings.minMarginAlertThresholdPercent !== 'number') {
      parsed.settings.minMarginAlertThresholdPercent = 60;
    }
    if (!Array.isArray(parsed.cogsRecords)) {
      parsed.cogsRecords = DEFAULT_RESTAURANT_DATA.cogsRecords || [];
    }

    // เติมข้อมูลประวัติ 12 เดือนให้ครบถ้วนหากข้อมูลมีจำนวนน้อย
    if (parsed.incomes.length < 15) {
      const histSeed = generateHistoricalSeedRecords();
      const existingIncomeIds = new Set(parsed.incomes.map((i: any) => i.id));
      const extraIncomes = histSeed.incomes.filter(i => !existingIncomeIds.has(i.id));
      parsed.incomes = [...parsed.incomes, ...extraIncomes];

      const existingExpIds = new Set((parsed.expenses || []).map((e: any) => e.id));
      const extraExpenses = histSeed.expenses.filter(e => !existingExpIds.has(e.id));
      parsed.expenses = [...(parsed.expenses || []), ...extraExpenses];

      const existingCogsIds = new Set((parsed.cogsRecords || []).map((c: any) => c.id));
      const extraCogs = histSeed.cogsRecords.filter(c => !existingCogsIds.has(c.id));
      parsed.cogsRecords = [...(parsed.cogsRecords || []), ...extraCogs];

      saveRestaurantData(parsed);
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
  const freshTransactions = generateHistoricalSeedRecords();
  const freshData: RestaurantData = {
    ...DEFAULT_RESTAURANT_DATA,
    incomes: freshTransactions.incomes,
    expenses: freshTransactions.expenses,
    cogsRecords: freshTransactions.cogsRecords,
    exportDate: new Date().toISOString(),
    lastUpdated: new Date().toISOString()
  };
  saveRestaurantData(freshData);
  return freshData;
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
