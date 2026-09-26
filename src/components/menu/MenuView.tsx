/**
 * หน้าจัดการเมนูอาหารและระบบ Recipe Costing:
 * 1. เพิ่ม/แก้ไข/ลบ เมนูอาหาร พร้อมกำหนดราคาขาย และสูตรวัตถุดิบ (BOM)
 * 2. คำนวณต้นทุนต่อจานอัตโนมัติจากผลรวมวัตถุดิบ (Food Cost per Dish)
 * 3. แสดง % กำไรต่อเมนู (Margin) และไฮไลต์เมนูที่ Margin ต่ำกว่าเกณฑ์ (ตั้งค่าได้ใน Settings เช่น 60%)
 * 4. เรียงลำดับเมนูทั้งหมดตาม Margin จากต่ำไปสูง เพื่อให้เห็นเมนูที่ควรปรับราคาหรือปรับสูตร
 * 5. แนะนำราคาขายใหม่ (Suggested Selling Price) เพื่อให้ได้ Margin ตามเกณฑ์เป้าหมาย
 */

import React, { useState, useMemo } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { Ingredient, MenuItem, RecipeItem } from '../../types/restaurant';
import {
  ChefHat,
  Package,
  Plus,
  Trash2,
  Edit2,
  TrendingUp,
  Percent,
  Calculator,
  AlertTriangle,
  ArrowUpDown,
  Filter,
  CheckCircle2,
  X,
  Sparkles,
  DollarSign,
  HelpCircle,
  ArrowRight
} from 'lucide-react';

export const MenuView: React.FC = () => {
  const {
    data,
    addIngredient,
    updateIngredient,
    deleteIngredient,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem
  } = useRestaurant();

  const { ingredients, menuItems, settings } = data;
  const minMarginThreshold = settings.minMarginAlertThresholdPercent ?? 60;
  const cogsCategories = settings.cogsCategories || ['เนื้อสัตว์', 'ผัก', 'เครื่องปรุง', 'ของแห้ง', 'อาหารทะเล', 'อื่นๆ'];

  // แท็บย่อย: 'menu' (เมนูและสูตร) หรือ 'ingredients' (คลังวัตถุดิบ)
  const [subTab, setSubTab] = useState<'menu' | 'ingredients'>('menu');

  // ตัวเลือกเรียงลำดับเมนู (ตั้งต้น: 'margin_asc' จากต่ำไปสูง ตาม requirement 4)
  const [sortOption, setSortOption] = useState<'margin_asc' | 'margin_desc' | 'price_desc' | 'name' | 'low_margin_only'>('margin_asc');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  // ข้อความแจ้งเตือน
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  // =========================================================================
  // ฟอร์มเพิ่ม/แก้ไขเมนูอาหาร (Modal or Inline Form)
  // =========================================================================
  const [showAddMenuModal, setShowAddMenuModal] = useState<boolean>(false);
  const [editingMenuItemId, setEditingMenuItemId] = useState<string | null>(null);

  const [formMenuName, setFormMenuName] = useState<string>('');
  const [formCategory, setFormCategory] = useState<string>(settings.categoriesList[0] || 'อาหารจานเดียว');
  const [formDineInPrice, setFormDineInPrice] = useState<string>('');
  const [formDeliveryPrice, setFormDeliveryPrice] = useState<string>('');
  const [formPackagingCost, setFormPackagingCost] = useState<string>('3.5');
  const [formNotes, setFormNotes] = useState<string>('');
  const [formRecipeItems, setFormRecipeItems] = useState<RecipeItem[]>([]);

  // ส่วนเลือกวัตถุดิบเพิ่มในสูตร
  const [builderIngredientId, setBuilderIngredientId] = useState<string>(ingredients[0]?.id || '');
  const [builderQuantity, setBuilderQuantity] = useState<string>('1');
  const [builderUnitCost, setBuilderUnitCost] = useState<string>(ingredients[0]?.unitCost?.toString() || '');
  const [builderCustomName, setBuilderCustomName] = useState<string>('');
  const [builderCustomCost, setBuilderCustomCost] = useState<string>('');
  const [builderCustomUnit, setBuilderCustomUnit] = useState<string>('กรัม');
  const [builderCustomCat, setBuilderCustomCat] = useState<string>(cogsCategories[0] || 'เนื้อสัตว์');
  const [isAddingNewIngInline, setIsAddingNewIngInline] = useState<boolean>(false);

  // ฟอร์มเพิ่ม/แก้ไขวัตถุดิบ (แท็บคลังวัตถุดิบ)
  const [showAddIngForm, setShowAddIngForm] = useState<boolean>(false);
  const [editingIngredientId, setEditingIngredientId] = useState<string | null>(null);
  const [ingName, setIngName] = useState<string>('');
  const [ingUnit, setIngUnit] = useState<string>('กก.');
  const [ingCost, setIngCost] = useState<string>('');
  const [ingCategory, setIngCategory] = useState<string>(cogsCategories[0] || 'เนื้อสัตว์');
  const [ingSupplier, setIngSupplier] = useState<string>('');

  const handleSelectBuilderIngredient = (id: string) => {
    setBuilderIngredientId(id);
    const found = ingredients.find((i) => i.id === id);
    if (found) {
      setBuilderUnitCost(found.unitCost.toString());
    }
  };

  // =========================================================================
  // คำนวณ Margin และคัดแยกเมนู
  // =========================================================================
  const processedMenuItems = useMemo(() => {
    return menuItems.map((item) => {
      const price = item.dineInPrice || 0;
      const cost = item.totalCostPerDish || 0;
      const profit = price - cost;
      const marginPercent = price > 0 ? (profit / price) * 100 : 0;
      const foodCostPercent = price > 0 ? (cost / price) * 100 : 0;
      const isLowMargin = marginPercent < minMarginThreshold;

      // ราคาขายแนะนำเพื่อให้ได้ margin ตามเกณฑ์ขั้นต่ำ เช่น 60%
      // สูตร: ราคาแนะนำ = ต้นทุน / (1 - (margin / 100))
      const targetMarginDecimal = minMarginThreshold / 100;
      const suggestedDineInPrice = targetMarginDecimal < 1
        ? Math.ceil(cost / (1 - targetMarginDecimal))
        : price;

      return {
        ...item,
        marginPercent,
        foodCostPercent,
        profitPerDish: profit,
        isLowMargin,
        suggestedDineInPrice
      };
    });
  }, [menuItems, minMarginThreshold]);

  // สรุปสถิติ Recipe Costing
  const totalMenus = processedMenuItems.length;
  const lowMarginCount = processedMenuItems.filter((m) => m.isLowMargin).length;
  const avgMargin = totalMenus > 0
    ? processedMenuItems.reduce((s, m) => s + m.marginPercent, 0) / totalMenus
    : 0;

  // กรองและเรียงลำดับ
  const sortedMenuItems = useMemo(() => {
    let list = [...processedMenuItems];

    if (selectedCategoryFilter !== 'all') {
      list = list.filter((m) => m.category === selectedCategoryFilter);
    }

    if (sortOption === 'low_margin_only') {
      list = list.filter((m) => m.isLowMargin);
    }

    return list.sort((a, b) => {
      if (sortOption === 'margin_asc' || sortOption === 'low_margin_only') {
        return a.marginPercent - b.marginPercent; // จากต่ำไปสูง ตาม Requirement 4
      }
      if (sortOption === 'margin_desc') {
        return b.marginPercent - a.marginPercent;
      }
      if (sortOption === 'price_desc') {
        return b.dineInPrice - a.dineInPrice;
      }
      if (sortOption === 'name') {
        return a.name.localeCompare(b.name, 'th');
      }
      return a.marginPercent - b.marginPercent;
    });
  }, [processedMenuItems, sortOption, selectedCategoryFilter]);

  // คำนวณต้นทุนรวมของฟอร์มที่กำลังเปิดอยู่ (Real-time)
  const currentRecipeRawCost = formRecipeItems.reduce((s, item) => s + (Number(item.costPerServing) || 0), 0);
  const currentPackagingCost = parseFloat(formPackagingCost) || 0;
  const currentTotalDishCost = currentRecipeRawCost + currentPackagingCost;
  const currentDineInPrice = parseFloat(formDineInPrice) || 0;
  const currentMargin = currentDineInPrice > 0
    ? ((currentDineInPrice - currentTotalDishCost) / currentDineInPrice) * 100
    : 0;

  // =========================================================================
  // เพิ่มวัตถุดิบเข้าสูตร (Recipe Builder)
  // =========================================================================
  const handleAddIngredientToRecipe = () => {
    if (isAddingNewIngInline) {
      // เพิ่มวัตถุดิบใหม่แบบด่วน
      const costPerUnit = parseFloat(builderCustomCost);
      const qty = parseFloat(builderQuantity);
      if (!builderCustomName.trim() || isNaN(costPerUnit) || isNaN(qty) || qty <= 0) {
        alert('กรุณากรอกชื่อวัตถุดิบ, ราคาต่อหน่วย, และปริมาณให้ถูกต้อง');
        return;
      }

      // บันทึกเข้าคลังวัตถุดิบกลางด้วย
      addIngredient({
        name: builderCustomName.trim(),
        unit: builderCustomUnit.trim() || 'หน่วย',
        unitCost: costPerUnit
      });

      const costPerServing = parseFloat((qty * costPerUnit).toFixed(2));
      setFormRecipeItems((prev) => [
        ...prev,
        {
          ingredientId: `ing_${Date.now()}`,
          ingredientName: builderCustomName.trim(),
          category: builderCustomCat,
          quantity: qty,
          unit: builderCustomUnit.trim() || 'หน่วย',
          unitCost: costPerUnit,
          costPerServing
        }
      ]);

      setBuilderCustomName('');
      setBuilderCustomCost('');
      setBuilderQuantity('1');
      setIsAddingNewIngInline(false);
    } else {
      // ดึงจากวัตถุดิบที่มีอยู่
      const ing = ingredients.find((i) => i.id === builderIngredientId);
      const qty = parseFloat(builderQuantity);
      const customCost = parseFloat(builderUnitCost);
      const effectiveCost = !isNaN(customCost) && customCost >= 0 ? customCost : (ing?.unitCost || 0);
      if (!ing || isNaN(qty) || qty <= 0) return;

      const costPerServing = parseFloat((qty * effectiveCost).toFixed(2));
      setFormRecipeItems((prev) => [
        ...prev,
        {
          ingredientId: ing.id,
          ingredientName: ing.name,
          category: ing.category || builderCustomCat,
          quantity: qty,
          unit: ing.unit,
          unitCost: effectiveCost,
          costPerServing
        }
      ]);

      setBuilderQuantity('1');
    }
  };

  const handleRemoveRecipeItem = (index: number) => {
    setFormRecipeItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // =========================================================================
  // เปิดแก้ไขเมนู (Edit Menu Item)
  // =========================================================================
  const handleStartEditMenu = (item: MenuItem) => {
    setEditingMenuItemId(item.id);
    setFormMenuName(item.name);
    setFormCategory(item.category || settings.categoriesList[0] || 'อาหารจานเดียว');
    setFormDineInPrice(item.dineInPrice.toString());
    setFormDeliveryPrice(item.deliveryPrice ? item.deliveryPrice.toString() : item.dineInPrice.toString());
    setFormPackagingCost(item.packagingCost ? item.packagingCost.toString() : '0');
    setFormNotes(item.notes || '');
    setFormRecipeItems(item.recipe || []);
    if (ingredients.length > 0) {
      setBuilderIngredientId(ingredients[0].id);
      setBuilderUnitCost(ingredients[0].unitCost.toString());
    }
    setShowAddMenuModal(true);
  };

  const handleStartCreateMenu = () => {
    setEditingMenuItemId(null);
    setFormMenuName('');
    setFormCategory(settings.categoriesList[0] || 'อาหารจานเดียว');
    setFormDineInPrice('');
    setFormDeliveryPrice('');
    setFormPackagingCost('3.5');
    setFormNotes('');
    setFormRecipeItems([]);
    if (ingredients.length > 0) {
      setBuilderIngredientId(ingredients[0].id);
      setBuilderUnitCost(ingredients[0].unitCost.toString());
    }
    setShowAddMenuModal(true);
  };

  // บันทึกเมนู (ทั้งสร้างใหม่และแก้ไข)
  const handleSaveMenu = (e: React.FormEvent) => {
    e.preventDefault();
    const dineIn = parseFloat(formDineInPrice);
    if (!formMenuName.trim() || isNaN(dineIn) || dineIn <= 0) {
      alert('กรุณากรอกชื่อเมนูและราคาขายให้ถูกต้อง');
      return;
    }

    const delivery = parseFloat(formDeliveryPrice) || dineIn;
    const packaging = parseFloat(formPackagingCost) || 0;
    const totalCost = parseFloat(currentTotalDishCost.toFixed(2));

    if (editingMenuItemId) {
      updateMenuItem(editingMenuItemId, {
        name: formMenuName.trim(),
        category: formCategory,
        dineInPrice: dineIn,
        deliveryPrice: delivery,
        packagingCost: packaging,
        totalCostPerDish: totalCost,
        recipe: formRecipeItems,
        notes: formNotes.trim() || undefined
      });
      setAlertMsg(`อัปเดตสูตรและราคาเมนู "${formMenuName.trim()}" สำเร็จ`);
    } else {
      addMenuItem({
        name: formMenuName.trim(),
        category: formCategory,
        dineInPrice: dineIn,
        deliveryPrice: delivery,
        packagingCost: packaging,
        totalCostPerDish: totalCost,
        recipe: formRecipeItems,
        targetFoodCostPercent: 100 - minMarginThreshold,
        isActive: true,
        notes: formNotes.trim() || undefined
      });
      setAlertMsg(`เพิ่มเมนูอาหาร "${formMenuName.trim()}" สำเร็จ`);
    }

    setShowAddMenuModal(false);
    setTimeout(() => setAlertMsg(null), 3500);
  };

  // บันทึกวัตถุดิบใหม่/แก้ไขในแท็บคลังวัตถุดิบ
  const handleSaveIngredient = (e: React.FormEvent) => {
    e.preventDefault();
    const cost = parseFloat(ingCost);
    if (!ingName.trim() || isNaN(cost) || cost < 0) return;

    if (editingIngredientId) {
      updateIngredient(editingIngredientId, {
        name: ingName.trim(),
        category: ingCategory,
        unit: ingUnit.trim() || 'ชิ้น',
        unitCost: cost,
        supplier: ingSupplier.trim() || undefined
      });
      setAlertMsg(`อัปเดตข้อมูลวัตถุดิบ "${ingName.trim()}" สำเร็จ`);
    } else {
      addIngredient({
        name: ingName.trim(),
        category: ingCategory,
        unit: ingUnit.trim() || 'ชิ้น',
        unitCost: cost,
        supplier: ingSupplier.trim() || undefined
      });
      setAlertMsg(`เพิ่มวัตถุดิบ "${ingName.trim()}" สำเร็จ`);
    }

    setEditingIngredientId(null);
    setIngName('');
    setIngCost('');
    setIngSupplier('');
    setShowAddIngForm(false);
    setTimeout(() => setAlertMsg(null), 3000);
  };

  const handleStartEditIngredient = (ing: Ingredient) => {
    setEditingIngredientId(ing.id);
    setIngName(ing.name);
    setIngCategory(ing.category || cogsCategories[0] || 'เนื้อสัตว์');
    setIngUnit(ing.unit);
    setIngCost(ing.unitCost.toString());
    setIngSupplier(ing.supplier || '');
    setShowAddIngForm(true);
  };

  return (
    <div className="space-y-5 pb-12">
      {/* ส่วนหัวหน้า */}
      <div>
        <h2 className="text-xl font-bold text-stone-900">จัดการเมนู & คำนวณสูตร (Recipe Costing)</h2>
        <p className="text-xs text-stone-500 mt-0.5">
          คำนวณต้นทุนต่อจานอัตโนมัติจากสูตรวัตถุดิบ ติดตาม % Margin และปรับราคาให้ได้กำไรตามเป้า
        </p>
      </div>

      {/* แจ้งเตือน */}
      {alertMsg && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{alertMsg}</span>
        </div>
      )}

      {/* สลับแท็บ เมนูอาหาร vs คลังวัตถุดิบ */}
      <div className="flex items-center gap-2 p-1 bg-stone-200/80 rounded-xl">
        <button
          onClick={() => setSubTab('menu')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
            subTab === 'menu'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <ChefHat className="w-4 h-4 text-emerald-600" />
          เมนูและคำนวณต้นทุนสูตร ({menuItems.length})
        </button>
        <button
          onClick={() => setSubTab('ingredients')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
            subTab === 'ingredients'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Package className="w-4 h-4 text-emerald-600" />
          คลังวัตถุดิบ ({ingredients.length})
        </button>
      </div>

      {/* ========================================================================= */}
      {/* แท็บเมนูอาหาร & RECIPE COSTING */}
      {/* ========================================================================= */}
      {subTab === 'menu' && (
        <div className="space-y-4">
          {/* การ์ดสรุป Recipe Costing Matrix (Highlight Margin) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* เมนูทั้งหมด */}
            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-[11px] text-stone-500 block">เมนูอาหารทั้งหมด</span>
              <div className="text-xl font-bold text-stone-900 mt-0.5">
                {totalMenus} เมนู
              </div>
              <span className="text-[10px] text-stone-400 mt-1 block">
                คำนวณต้นทุนต่อจานตามสูตร BOM
              </span>
            </div>

            {/* เมนู Margin ต่ำกว่าเกณฑ์ */}
            <div className={`p-3.5 sm:p-4 rounded-2xl border shadow-xs ${
              lowMarginCount > 0 ? 'bg-amber-50/80 border-amber-300' : 'bg-white border-stone-200'
            }`}>
              <div className="flex items-center justify-between text-stone-600">
                <span className="text-[11px] font-semibold">Margin ต่ำกว่าเกณฑ์ (&lt;{minMarginThreshold}%)</span>
                {lowMarginCount > 0 && <AlertTriangle className="w-4 h-4 text-amber-600" />}
              </div>
              <div className={`text-xl font-bold mt-0.5 ${lowMarginCount > 0 ? 'text-amber-800' : 'text-emerald-700'}`}>
                {lowMarginCount} เมนู
              </div>
              <span className="text-[10px] text-stone-500 mt-1 block">
                {lowMarginCount > 0 ? 'ควรพิจารณาปรับราคาขายหรือปรับสูตร' : 'ทุกเมนูผ่านเกณฑ์ขั้นต่ำ'}
              </span>
            </div>

            {/* Margin เฉลี่ยร้าน */}
            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-[11px] text-stone-500 block">Margin เฉลี่ยของเมนูทั้งหมด</span>
              <div className="text-xl font-bold text-emerald-700 mt-0.5">
                {avgMargin.toFixed(1)}%
              </div>
              <span className="text-[10px] text-stone-400 mt-1 block">
                เกณฑ์แจ้งเตือนใน Settings: {minMarginThreshold}%
              </span>
            </div>
          </div>

          {/* แถบตัวกรองและปุ่มสร้างเมนูใหม่ */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-stone-200 shadow-xs">
            {/* ตัวเลือกเรียงลำดับ (Requirement 4: เรียงจาก margin ต่ำไปสูง) */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-stone-500 font-medium flex items-center gap-1">
                <ArrowUpDown className="w-3.5 h-3.5 text-stone-400" /> เรียงตาม:
              </span>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as any)}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-stone-300 bg-stone-50 text-stone-800 outline-none"
              >
                <option value="margin_asc">Margin ต่ำ ➔ สูง (เมนูที่ควรปรับราคา/สูตร)</option>
                <option value="low_margin_only">เฉพาะเมนู Margin ต่ำกว่าเกณฑ์ (&lt;{minMarginThreshold}%)</option>
                <option value="margin_desc">Margin สูง ➔ ต่ำ (เมนูทำกำไรดี)</option>
                <option value="price_desc">ราคาขาย สูง ➔ ต่ำ</option>
                <option value="name">ชื่อเมนู ก-ฮ</option>
              </select>

              {/* กรองหมวดหมู่อาหาร */}
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-stone-300 bg-white text-stone-700 outline-none"
              >
                <option value="all">ทุกหมวดหมู่อาหาร</option>
                {settings.categoriesList.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleStartCreateMenu}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              สร้างเมนูอาหารใหม่
            </button>
          </div>

          {/* รายการเมนูอาหารทั้งหมด เรียงตาม Margin */}
          <div className="space-y-3.5">
            {sortedMenuItems.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-stone-200 text-center text-xs text-stone-400">
                ไม่พบเมนูอาหารในเงื่อนไขที่เลือก
              </div>
            ) : (
              sortedMenuItems.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition-all shadow-xs space-y-3.5 ${
                    item.isLowMargin
                      ? 'bg-amber-50/50 border-amber-300 ring-1 ring-amber-300/60'
                      : 'bg-white border-stone-200'
                  }`}
                >
                  {/* หัวการ์ดเมนู */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm sm:text-base font-bold text-stone-900">
                          {item.name}
                        </h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-medium">
                          {item.category}
                        </span>

                        {/* ไฮไลต์ถ้า Margin ต่ำกว่าเกณฑ์ */}
                        {item.isLowMargin ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-bold flex items-center gap-1 animate-pulse">
                            <AlertTriangle className="w-3 h-3" />
                            Margin ต่ำกว่าเกณฑ์ ({item.marginPercent.toFixed(1)}% &lt; {minMarginThreshold}%)
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                            Margin ผ่านเกณฑ์ ({item.marginPercent.toFixed(1)}%)
                          </span>
                        )}
                      </div>

                      {item.notes && (
                        <p className="text-[11px] text-stone-500 mt-1 italic">
                          "{item.notes}"
                        </p>
                      )}
                    </div>

                    {/* ปุ่มแก้ไข / ลบ */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleStartEditMenu(item)}
                        title="แก้ไขสูตรหรือราคาขาย"
                        className="p-1.5 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`คุณต้องการลบเมนู "${item.name}" ใช่หรือไม่?`)) {
                            deleteMenuItem(item.id);
                          }
                        }}
                        title="ลบเมนูนี้"
                        className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* สรุปตัวเลขทางการเงินของเมนูนี้ */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                      <span className="text-[10px] text-stone-500 block">ราคาขายหน้าร้าน</span>
                      <span className="font-bold text-stone-900 text-sm">฿{item.dineInPrice}</span>
                      {item.deliveryPrice && item.deliveryPrice !== item.dineInPrice && (
                        <span className="text-[10px] text-stone-400 block">
                          เดลิเวอรี่ ฿{item.deliveryPrice}
                        </span>
                      )}
                    </div>

                    <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                      <span className="text-[10px] text-stone-500 block">ต้นทุนรวมต่อจาน (BOM)</span>
                      <span className="font-bold text-red-600 text-sm">฿{item.totalCostPerDish.toFixed(2)}</span>
                      <span className="text-[10px] text-stone-400 block">
                        วัตถุดิบ + บรรจุภัณฑ์
                      </span>
                    </div>

                    <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                      <span className="text-[10px] text-stone-500 block">กำไรต่อจาน (บาท)</span>
                      <span className="font-bold text-emerald-700 text-sm">
                        +฿{item.profitPerDish.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-stone-400 block">
                        Food Cost {item.foodCostPercent.toFixed(1)}%
                      </span>
                    </div>

                    <div className={`p-2.5 rounded-xl border ${
                      item.isLowMargin
                        ? 'bg-red-50 border-red-300 text-red-900'
                        : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    }`}>
                      <span className="text-[10px] font-semibold block">
                        % กำไรต่อจาน (Margin)
                      </span>
                      <span className="font-bold text-base sm:text-lg">
                        {item.marginPercent.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* แนะนำราคาขายใหม่ หาก Margin ต่ำกว่าเกณฑ์ */}
                  {item.isLowMargin && (
                    <div className="p-2.5 rounded-xl bg-amber-100/70 border border-amber-300 text-amber-950 text-xs flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-700 shrink-0" />
                        <span>
                          เพื่อให้ได้ Margin <strong>{minMarginThreshold}%</strong> แนะนำตั้งราคาขายอย่างน้อย{' '}
                          <strong className="text-amber-900 font-bold underline">฿{item.suggestedDineInPrice}</strong>{' '}
                          (เพิ่ม +฿{item.suggestedDineInPrice - item.dineInPrice})
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          updateMenuItem(item.id, { dineInPrice: item.suggestedDineInPrice });
                          setAlertMsg(`ปรับราคาขาย "${item.name}" เป็น ฿${item.suggestedDineInPrice} เรียบร้อยแล้ว`);
                          setTimeout(() => setAlertMsg(null), 3000);
                        }}
                        className="px-2.5 py-1 bg-amber-800 hover:bg-amber-900 text-white rounded-lg text-[11px] font-semibold shrink-0"
                      >
                        ปรับราคาตามนี้
                      </button>
                    </div>
                  )}

                  {/* รายการวัตถุดิบในสูตรอาหาร */}
                  {item.recipe && item.recipe.length > 0 && (
                    <div className="pt-2 border-t border-stone-200/80">
                      <span className="text-[11px] font-semibold text-stone-700 block mb-1.5">
                        รายการวัตถุดิบที่ใช้ ({item.recipe.length} รายการ):
                      </span>
                      <div className="flex flex-wrap gap-1.5 text-xs">
                        {item.recipe.map((r, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 rounded-lg bg-stone-100 border border-stone-200 text-stone-700 flex items-center gap-1.5"
                          >
                            <span className="font-medium">{r.ingredientName}</span>
                            <span className="text-stone-400">
                              {r.quantity} {r.unit}
                            </span>
                            <span className="font-bold text-stone-800">
                              (฿{r.costPerServing.toFixed(2)})
                            </span>
                          </span>
                        ))}
                        {item.packagingCost > 0 && (
                          <span className="px-2.5 py-1 rounded-lg bg-stone-100 border border-stone-200 text-stone-600">
                            กล่อง/ช้อน: ฿{item.packagingCost}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* แท็บคลังวัตถุดิบ (INGREDIENTS) */}
      {/* ========================================================================= */}
      {subTab === 'ingredients' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200 shadow-xs">
            <div>
              <h3 className="font-bold text-stone-900 text-sm">คลังวัตถุดิบและราคาต่อหน่วย</h3>
              <p className="text-[11px] text-stone-500">
                วัตถุดิบทั้งหมดใช้สำหรับนำไปผูกในสูตรอาหารเพื่อคิดต้นทุนอัตโนมัติ
              </p>
            </div>
            <button
              onClick={() => setShowAddIngForm(!showAddIngForm)}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              เพิ่มวัตถุดิบ
            </button>
          </div>

          {/* ฟอร์มเพิ่มวัตถุดิบใหม่ */}
          {showAddIngForm && (
            <form
              onSubmit={handleSaveIngredient}
              className="bg-white rounded-2xl p-4 sm:p-5 border border-emerald-200 shadow-sm space-y-3.5"
            >
              <div className="flex items-center gap-2 pb-2 border-b border-stone-100">
                <Package className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-bold text-stone-900">
                  {editingIngredientId ? 'แก้ไขข้อมูลวัตถุดิบ' : 'เพิ่มวัตถุดิบใหม่เข้าคลัง'}
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    ชื่อวัตถุดิบ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น หมูสันคอ, ข้าวสารหอมมะลิ"
                    value={ingName}
                    onChange={(e) => setIngName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    หน่วยนับ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="กก., ฟอง, ลิตร, ถุง, ฟอง"
                    value={ingUnit}
                    onChange={(e) => setIngUnit(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    ต้นทุนต่อหน่วย (บาท) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="เช่น 160"
                    value={ingCost}
                    onChange={(e) => setIngCost(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 outline-none font-semibold text-right"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    หมวดหมู่วัตถุดิบ
                  </label>
                  <select
                    value={ingCategory}
                    onChange={(e) => setIngCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 outline-none bg-white"
                  >
                    {cogsCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    แหล่งซื้อ / ตลาด
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น ตลาดสดเทศบาล, แม็คโคร"
                    value={ingSupplier}
                    onChange={(e) => setIngSupplier(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddIngForm(false);
                    setEditingIngredientId(null);
                    setIngName('');
                    setIngCost('');
                    setIngSupplier('');
                  }}
                  className="px-3 py-1.5 text-xs text-stone-600 bg-stone-100 rounded-lg"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs"
                >
                  บันทึกวัตถุดิบ
                </button>
              </div>
            </form>
          )}

          {/* ตารางวัตถุดิบ */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="divide-y divide-stone-100">
              {ingredients.map((ing: Ingredient) => (
                <div
                  key={ing.id}
                  className="p-3.5 hover:bg-stone-50/70 transition-colors flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-stone-900">{ing.name}</span>
                      {ing.category && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                          {ing.category}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-stone-500 block sm:inline sm:ml-2">
                      หน่วย: {ing.unit} {ing.supplier ? `• แหล่งซื้อ: ${ing.supplier}` : ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <span className="text-xs font-bold text-stone-900">
                        ฿{ing.unitCost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] text-stone-500 block">/ {ing.unit}</span>
                    </div>

                    <button
                      onClick={() => handleStartEditIngredient(ing)}
                      title="แก้ไขวัตถุดิบ"
                      className="p-1.5 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => {
                        if (window.confirm(`คุณต้องการลบวัตถุดิบ "${ing.name}" ใช่หรือไม่?`)) {
                          deleteIngredient(ing.id);
                        }
                      }}
                      className="p-1.5 text-stone-300 hover:text-red-500 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL เพิ่ม / แก้ไขเมนูอาหาร (BOM RECIPE BUILDER) */}
      {/* ========================================================================= */}
      {showAddMenuModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-5 shadow-xl border border-stone-200 space-y-4 my-8">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-stone-900">
                  {editingMenuItemId ? 'แก้ไขเมนูอาหาร & ปรับสูตร' : 'สร้างเมนูอาหารใหม่ & คำนวณสูตร (BOM)'}
                </h3>
              </div>
              <button
                onClick={() => setShowAddMenuModal(false)}
                className="text-stone-400 hover:text-stone-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMenu} className="space-y-4">
              {/* ข้อมูลเมนู */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    ชื่อเมนูอาหาร <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ข้าวกะเพราหมูสับไข่ดาว"
                    value={formMenuName}
                    onChange={(e) => setFormMenuName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    หมวดหมู่อาหาร
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 outline-none bg-white"
                  >
                    {settings.categoriesList.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ราคาขายหน้าร้าน / เดลิเวอรี่ / กล่อง */}
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    ราคาขายหน้าร้าน (บาท) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    placeholder="65"
                    value={formDineInPrice}
                    onChange={(e) => setFormDineInPrice(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-stone-300 outline-none text-right"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    ราคาเดลิเวอรี่ (บาท)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    placeholder="85"
                    value={formDeliveryPrice}
                    onChange={(e) => setFormDeliveryPrice(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-300 outline-none text-right"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    ค่าบรรจุภัณฑ์ (บาท)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="3.5"
                    value={formPackagingCost}
                    onChange={(e) => setFormPackagingCost(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-300 outline-none text-right"
                  />
                </div>
              </div>

              {/* สูตรวัตถุดิบ (Recipe BOM Builder) */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-800">
                    รายการวัตถุดิบในสูตรอาหาร
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAddingNewIngInline(!isAddingNewIngInline)}
                    className="text-[11px] text-emerald-600 hover:text-emerald-700 font-semibold"
                  >
                    {isAddingNewIngInline ? 'เลือกจากคลังที่มี' : '+ เพิ่มวัตถุดิบใหม่เข้าสูตร'}
                  </button>
                </div>

                {/* ตัวกรอกวัตถุดิบ */}
                {isAddingNewIngInline ? (
                  <div className="p-2.5 bg-white rounded-lg border border-emerald-300 space-y-2 text-xs">
                    <div className="font-semibold text-emerald-800 text-[11px]">
                      เพิ่มวัตถุดิบใหม่แบบด่วน:
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="ชื่อวัตถุดิบ (เช่น กุ้งแชบ๊วย)"
                        value={builderCustomName}
                        onChange={(e) => setBuilderCustomName(e.target.value)}
                        className="px-2 py-1 border rounded"
                      />
                      <select
                        value={builderCustomCat}
                        onChange={(e) => setBuilderCustomCat(e.target.value)}
                        className="px-2 py-1 border rounded bg-white"
                      >
                        {cogsCategories.map((c) => (
                          <option key={c} value={c}>
                            หมวด: {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="ราคาต่อหน่วย"
                        value={builderCustomCost}
                        onChange={(e) => setBuilderCustomCost(e.target.value)}
                        className="px-2 py-1 border rounded text-right"
                      />
                      <input
                        type="text"
                        placeholder="หน่วย (เช่น กก.)"
                        value={builderCustomUnit}
                        onChange={(e) => setBuilderCustomUnit(e.target.value)}
                        className="px-2 py-1 border rounded"
                      />
                      <input
                        type="number"
                        step="0.001"
                        placeholder="ปริมาณในจาน"
                        value={builderQuantity}
                        onChange={(e) => setBuilderQuantity(e.target.value)}
                        className="px-2 py-1 border rounded text-right"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddIngredientToRecipe}
                      className="w-full py-1 bg-emerald-600 text-white rounded font-medium text-xs"
                    >
                      + ใส่ในสูตร
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="flex-1">
                        <label className="block text-[11px] font-medium text-stone-600 mb-0.5">เลือกวัตถุดิบ:</label>
                        <select
                          value={builderIngredientId}
                          onChange={(e) => handleSelectBuilderIngredient(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-300 bg-white"
                        >
                          {ingredients.map((ing) => (
                            <option key={ing.id} value={ing.id}>
                              {ing.name} {ing.category ? `[${ing.category}]` : ''} (฿{ing.unitCost}/{ing.unit})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-24">
                        <label className="block text-[11px] font-medium text-stone-600 mb-0.5">ราคา/หน่วย:</label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={builderUnitCost}
                            onChange={(e) => setBuilderUnitCost(e.target.value)}
                            className="w-full px-2 py-1.5 text-xs rounded-lg border border-stone-300 bg-white text-right"
                          />
                          <span className="text-[11px] text-stone-400">฿</span>
                        </div>
                      </div>

                      <div className="w-28">
                        <label className="block text-[11px] font-medium text-stone-600 mb-0.5">ปริมาณต่อจาน:</label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.001"
                            min="0.001"
                            placeholder="ปริมาณ"
                            value={builderQuantity}
                            onChange={(e) => setBuilderQuantity(e.target.value)}
                            className="w-full px-2 py-1.5 text-xs rounded-lg border border-stone-300 bg-white text-right font-medium"
                          />
                          <span className="text-xs text-stone-500 min-w-8">
                            {ingredients.find((i) => i.id === builderIngredientId)?.unit || ''}
                          </span>
                        </div>
                      </div>

                      <div className="self-end pb-0.5">
                        <button
                          type="button"
                          onClick={handleAddIngredientToRecipe}
                          className="px-3 py-1.5 bg-stone-800 hover:bg-stone-900 text-white rounded-lg text-xs font-semibold shrink-0"
                        >
                          + ใส่ในสูตร
                        </button>
                      </div>
                    </div>

                    {/* แสดงการคำนวณย่อย */}
                    {builderIngredientId && (
                      <div className="text-[11px] text-stone-500 flex items-center justify-between px-1">
                        <span>
                          ต้นทุนวัตถุดิบนี้ต่อจาน:{' '}
                          <strong className="text-stone-800">
                            ฿{((parseFloat(builderQuantity) || 0) * (parseFloat(builderUnitCost) || 0)).toFixed(2)}
                          </strong>
                        </span>
                        {ingredients.find((i) => i.id === builderIngredientId)?.category && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-200 text-stone-700">
                            หมวด: {ingredients.find((i) => i.id === builderIngredientId)?.category}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* รายการวัตถุดิบในสูตร */}
                {formRecipeItems.length === 0 ? (
                  <div className="text-center py-3 text-[11px] text-stone-400">
                    ยังไม่มีวัตถุดิบในสูตรเมนูนี้
                  </div>
                ) : (
                  <div className="divide-y divide-stone-200 border border-stone-200 rounded-lg bg-white overflow-hidden text-xs max-h-48 overflow-y-auto">
                    {formRecipeItems.map((item, idx) => (
                      <div key={idx} className="p-2 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-stone-800">{item.ingredientName}</span>
                            {item.category && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-100 text-stone-600 font-medium">
                                {item.category}
                              </span>
                            )}
                          </div>
                          <span className="text-stone-500 text-[11px]">
                            {item.quantity} {item.unit} {item.unitCost ? `(฿${item.unitCost}/${item.unit})` : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-stone-900">
                            ฿{item.costPerServing.toFixed(2)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveRecipeItem(idx)}
                            className="text-stone-400 hover:text-red-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* สรุปต้นทุนและ Margin อัตโนมัติ (Live Calculation) */}
                <div className="p-2.5 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-stone-600 block">ต้นทุนวัตถุดิบรวมต่อจาน:</span>
                    <span className="font-bold text-stone-900 text-sm">
                      ฿{currentTotalDishCost.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-stone-600 block">% Margin ที่ได้:</span>
                    <span className={`font-bold text-sm ${
                      currentMargin >= minMarginThreshold ? 'text-emerald-700' : 'text-amber-700'
                    }`}>
                      {currentMargin.toFixed(1)}% {currentMargin < minMarginThreshold && `(ต่ำกว่าเกณฑ์ ${minMarginThreshold}%)`}
                    </span>
                  </div>
                </div>
              </div>

              {/* หมายเหตุ */}
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  หมายเหตุ / เคล็ดลับสูตร
                </label>
                <input
                  type="text"
                  placeholder="เช่น เสิร์ฟคู่กับน้ำซุปกระดูกหมู"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowAddMenuModal(false)}
                  className="px-3 py-1.5 text-xs text-stone-600 bg-stone-100 rounded-lg"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs"
                >
                  {editingMenuItemId ? 'บันทึกการแก้ไข' : 'บันทึกเมนูใหม่'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
