/**
 * RestaurantContext: ตัวจัดการ State กลางของแอปพลิเคชัน
 * เชื่อมต่อกับ LocalStorage อัตโนมัติทุกครั้งที่มีการเพิ่ม/ลบ/แก้ไขข้อมูล
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  RestaurantData,
  RestaurantSettings,
  SalesChannel,
  IncomeRecord,
  ExpenseRecord,
  CogsRecord,
  ExpenseCategory,
  Ingredient,
  MenuItem,
  CashFlowRecord
} from '../types/restaurant';
import {
  loadRestaurantData,
  saveRestaurantData,
  resetRestaurantData,
  exportDataAsJsonFile,
  validateAndParseImportJson,
  ImportResult,
  DEFAULT_RESTAURANT_DATA
} from '../services/storage';

interface RestaurantContextType {
  data: RestaurantData;
  isLoading: boolean;

  // การจัดการการตั้งค่า (Settings & Channels)
  updateSettings: (newSettings: Partial<RestaurantSettings>) => void;
  updateSalesChannel: (id: string, updates: Partial<SalesChannel>) => void;
  addSalesChannel: (channel: Omit<SalesChannel, 'id'>) => void;
  deleteSalesChannel: (id: string) => void;

  // การจัดการรายรับ (Income)
  addIncome: (income: Omit<IncomeRecord, 'id' | 'createdAt'>) => void;
  updateIncome: (id: string, updates: Partial<IncomeRecord>) => void;
  deleteIncome: (id: string) => void;
  batchSaveDailyIncomes: (date: string, channelRecords: Omit<IncomeRecord, 'id' | 'createdAt' | 'date'>[]) => void;

  // การจัดการรายจ่าย (Expense)
  addExpense: (expense: Omit<ExpenseRecord, 'id' | 'createdAt'>) => void;
  updateExpense: (id: string, updates: Partial<ExpenseRecord>) => void;
  deleteExpense: (id: string) => void;
  addExpenseCategory: (cat: Omit<ExpenseCategory, 'id'>) => void;
  deleteExpenseCategory: (id: string) => void;

  // การจัดการต้นทุนขาย (COGS / วัตถุดิบ)
  addCogsRecord: (record: Omit<CogsRecord, 'id' | 'createdAt'>) => void;
  updateCogsRecord: (id: string, updates: Partial<CogsRecord>) => void;
  deleteCogsRecord: (id: string) => void;
  addCogsCategory: (categoryName: string) => void;
  deleteCogsCategory: (categoryName: string) => void;

  // การจัดการวัตถุดิบและเมนู (Ingredients & Recipes)
  addIngredient: (ingredient: Omit<Ingredient, 'id' | 'updatedAt'>) => void;
  updateIngredient: (id: string, updates: Partial<Ingredient>) => void;
  deleteIngredient: (id: string) => void;

  addMenuItem: (menuItem: Omit<MenuItem, 'id'>) => void;
  updateMenuItem: (id: string, updates: Partial<MenuItem>) => void;
  deleteMenuItem: (id: string) => void;

  // การจัดการกระแสเงินสด (Cash Flow)
  addCashFlow: (record: Omit<CashFlowRecord, 'id' | 'createdAt'>) => void;

  // นำเข้า/ส่งออกข้อมูล (Export/Import JSON)
  exportData: (filename?: string) => void;
  importData: (jsonString: string) => ImportResult;
  resetAllData: () => void;
  seedSampleData: () => void;
}

const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined);

export const RestaurantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [data, setData] = useState<RestaurantData>(loadRestaurantData);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // บันทึกลง localStorage เมื่อ state เปลี่ยน
  useEffect(() => {
    saveRestaurantData(data);
  }, [data]);

  // ฟังก์ชันอัปเดตการตั้งค่าร้าน
  const updateSettings = (newSettings: Partial<RestaurantSettings>) => {
    setData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        ...newSettings
      }
    }));
  };

  // แก้ไขข้อมูลช่องทางการขาย/GP เดลิเวอรี่
  const updateSalesChannel = (id: string, updates: Partial<SalesChannel>) => {
    setData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        salesChannels: prev.settings.salesChannels.map((ch) =>
          ch.id === id ? { ...ch, ...updates } : ch
        )
      }
    }));
  };

  // เพิ่มช่องทางการขายใหม่
  const addSalesChannel = (channel: Omit<SalesChannel, 'id'>) => {
    const newChannel: SalesChannel = {
      ...channel,
      id: `channel_${Date.now()}`
    };
    setData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        salesChannels: [...prev.settings.salesChannels, newChannel]
      }
    }));
  };

  // ลบช่องทางการขาย
  const deleteSalesChannel = (id: string) => {
    setData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        salesChannels: prev.settings.salesChannels.filter((ch) => ch.id !== id)
      }
    }));
  };

  // หมวดหมู่ค่าใช้จ่าย
  const addExpenseCategory = (cat: Omit<ExpenseCategory, 'id'>) => {
    const newCat: ExpenseCategory = {
      ...cat,
      id: `exp_cat_${Date.now()}`
    };
    setData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        expenseCategories: [...prev.settings.expenseCategories, newCat]
      }
    }));
  };

  const deleteExpenseCategory = (id: string) => {
    setData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        expenseCategories: prev.settings.expenseCategories.filter((c) => c.id !== id)
      }
    }));
  };

  // บันทึกรายรับใหม่ (ทีละรายการ)
  const addIncome = (income: Omit<IncomeRecord, 'id' | 'createdAt'>) => {
    const newRecord: IncomeRecord = {
      ...income,
      id: `inc_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString()
    };
    setData((prev) => ({
      ...prev,
      incomes: [newRecord, ...prev.incomes]
    }));
  };

  // แก้ไขรายรับ
  const updateIncome = (id: string, updates: Partial<IncomeRecord>) => {
    setData((prev) => ({
      ...prev,
      incomes: prev.incomes.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      )
    }));
  };

  // บันทึกรายรับรายวันรวมหลายช่องทางพร้อมกันในครั้งเดียว
  const batchSaveDailyIncomes = (
    date: string,
    channelRecords: Omit<IncomeRecord, 'id' | 'createdAt' | 'date'>[]
  ) => {
    const nowIso = new Date().toISOString();
    const newRecords: IncomeRecord[] = channelRecords.map((rec, index) => ({
      ...rec,
      date,
      id: `inc_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 4)}`,
      createdAt: nowIso
    }));

    setData((prev) => ({
      ...prev,
      incomes: [...newRecords, ...prev.incomes]
    }));
  };

  // ลบรายการรายรับ
  const deleteIncome = (id: string) => {
    setData((prev) => ({
      ...prev,
      incomes: prev.incomes.filter((item) => item.id !== id)
    }));
  };

  // บันทึกรายจ่ายใหม่
  const addExpense = (expense: Omit<ExpenseRecord, 'id' | 'createdAt'>) => {
    const newRecord: ExpenseRecord = {
      ...expense,
      id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString()
    };
    setData((prev) => ({
      ...prev,
      expenses: [newRecord, ...prev.expenses]
    }));
  };

  // แก้ไขรายการรายจ่าย
  const updateExpense = (id: string, updates: Partial<ExpenseRecord>) => {
    setData((prev) => ({
      ...prev,
      expenses: prev.expenses.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      )
    }));
  };

  // ลบรายการรายจ่าย
  const deleteExpense = (id: string) => {
    setData((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((item) => item.id !== id)
    }));
  };

  // ต้นทุนขาย (COGS)
  const addCogsRecord = (record: Omit<CogsRecord, 'id' | 'createdAt'>) => {
    const newRecord: CogsRecord = {
      ...record,
      id: `cogs_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString()
    };
    setData((prev) => ({
      ...prev,
      cogsRecords: [newRecord, ...(prev.cogsRecords || [])]
    }));
  };

  const updateCogsRecord = (id: string, updates: Partial<CogsRecord>) => {
    setData((prev) => ({
      ...prev,
      cogsRecords: (prev.cogsRecords || []).map((item) =>
        item.id === id ? { ...item, ...updates } : item
      )
    }));
  };

  const deleteCogsRecord = (id: string) => {
    setData((prev) => ({
      ...prev,
      cogsRecords: (prev.cogsRecords || []).filter((item) => item.id !== id)
    }));
  };

  const addCogsCategory = (categoryName: string) => {
    const trimmed = categoryName.trim();
    if (!trimmed) return;
    setData((prev) => {
      const currentList = prev.settings.cogsCategories || DEFAULT_RESTAURANT_DATA.settings.cogsCategories;
      if (currentList.includes(trimmed)) return prev;
      return {
        ...prev,
        settings: {
          ...prev.settings,
          cogsCategories: [...currentList, trimmed]
        }
      };
    });
  };

  const deleteCogsCategory = (categoryName: string) => {
    setData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        cogsCategories: (prev.settings.cogsCategories || []).filter((c) => c !== categoryName)
      }
    }));
  };

  // การจัดการวัตถุดิบ (Ingredient)
  const addIngredient = (ingredient: Omit<Ingredient, 'id' | 'updatedAt'>) => {
    const newIng: Ingredient = {
      ...ingredient,
      id: `ing_${Date.now()}`,
      updatedAt: new Date().toISOString()
    };
    setData((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, newIng]
    }));
  };

  const updateIngredient = (id: string, updates: Partial<Ingredient>) => {
    setData((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((ing) =>
        ing.id === id ? { ...ing, ...updates, updatedAt: new Date().toISOString() } : ing
      )
    }));
  };

  const deleteIngredient = (id: string) => {
    setData((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((ing) => ing.id !== id)
    }));
  };

  // การจัดการเมนูและสูตร (Menu Item)
  const addMenuItem = (menuItem: Omit<MenuItem, 'id'>) => {
    const newItem: MenuItem = {
      ...menuItem,
      id: `menu_${Date.now()}`
    };
    setData((prev) => ({
      ...prev,
      menuItems: [...prev.menuItems, newItem]
    }));
  };

  const updateMenuItem = (id: string, updates: Partial<MenuItem>) => {
    setData((prev) => ({
      ...prev,
      menuItems: prev.menuItems.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      )
    }));
  };

  const deleteMenuItem = (id: string) => {
    setData((prev) => ({
      ...prev,
      menuItems: prev.menuItems.filter((item) => item.id !== id)
    }));
  };

  // บันทึกกระแสเงินสด
  const addCashFlow = (record: Omit<CashFlowRecord, 'id' | 'createdAt'>) => {
    const newRecord: CashFlowRecord = {
      ...record,
      id: `cf_${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setData((prev) => ({
      ...prev,
      cashFlows: [newRecord, ...prev.cashFlows]
    }));
  };

  // ส่งออกเป็นไฟล์ JSON
  const exportData = (filename?: string) => {
    exportDataAsJsonFile(data, filename);
  };

  // นำเข้าจากข้อความ JSON
  const importData = (jsonString: string): ImportResult => {
    setIsLoading(true);
    const result = validateAndParseImportJson(jsonString);
    if (result.success && result.data) {
      setData(result.data);
      saveRestaurantData(result.data);
    }
    setIsLoading(false);
    return result;
  };

  // ล้างข้อมูลทั้งหมด
  const resetAllData = () => {
    const fresh = resetRestaurantData();
    setData(fresh);
  };

  // โหลดข้อมูลตัวอย่าง
  const seedSampleData = () => {
    setData(DEFAULT_RESTAURANT_DATA);
    saveRestaurantData(DEFAULT_RESTAURANT_DATA);
  };

  return (
    <RestaurantContext.Provider
      value={{
        data,
        isLoading,
        updateSettings,
        updateSalesChannel,
        addSalesChannel,
        deleteSalesChannel,
        addIncome,
        updateIncome,
        deleteIncome,
        batchSaveDailyIncomes,
        addExpense,
        updateExpense,
        deleteExpense,
        addExpenseCategory,
        deleteExpenseCategory,
        addCogsRecord,
        updateCogsRecord,
        deleteCogsRecord,
        addCogsCategory,
        deleteCogsCategory,
        addIngredient,
        updateIngredient,
        deleteIngredient,
        addMenuItem,
        updateMenuItem,
        deleteMenuItem,
        addCashFlow,
        exportData,
        importData,
        resetAllData,
        seedSampleData
      }}
    >
      {children}
    </RestaurantContext.Provider>
  );
};

export const useRestaurant = () => {
  const context = useContext(RestaurantContext);
  if (!context) {
    throw new Error('useRestaurant must be used within a RestaurantProvider');
  }
  return context;
};
