/**
 * หน้าเมนูอาหารและสูตรต้นทุน (Menu & Recipe Management):
 * 1. จัดการคลังวัตถุดิบ (Ingredients) พร้อมต้นทุนต่อหน่วย
 * 2. จัดการเมนูอาหารและสูตร (Recipe BOM - Bill of Materials)
 * 3. คำนวณต้นทุนวัตถุดิบต่อจาน (Food Cost Per Dish) และคำนวณกำไรขั้นต้นเทียบราคาหน้าร้าน/เดลิเวอรี่
 */

import React, { useState } from 'react';
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
  AlertTriangle
} from 'lucide-react';

export const MenuView: React.FC = () => {
  const {
    data,
    addIngredient,
    updateIngredient,
    deleteIngredient,
    addMenuItem,
    deleteMenuItem
  } = useRestaurant();
  const { ingredients, menuItems, settings } = data;

  // แท็บย่อย: 'menu' (เมนูและสูตร) หรือ 'ingredients' (วัตถุดิบ)
  const [subTab, setSubTab] = useState<'menu' | 'ingredients'>('menu');

  // ฟอร์มเพิ่มวัตถุดิบ
  const [showAddIng, setShowAddIng] = useState(false);
  const [ingName, setIngName] = useState('');
  const [ingUnit, setIngUnit] = useState('กก.');
  const [ingCost, setIngCost] = useState('');
  const [ingSupplier, setIngSupplier] = useState('');

  // ฟอร์มเพิ่มเมนูอาหาร
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [menuName, setMenuName] = useState('');
  const [menuCategory, setMenuCategory] = useState(settings.categoriesList[0] || 'อาหารจานเดียว');
  const [dineInPrice, setDineInPrice] = useState('');
  const [deliveryPrice, setDeliveryPrice] = useState('');
  const [packagingCost, setPackagingCost] = useState('3.5');
  const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([]);

  // เลือกวัตถุดิบที่จะเพิ่มเข้าสูตร
  const [selectedIngId, setSelectedIngId] = useState(ingredients[0]?.id || '');
  const [ingQuantity, setIngQuantity] = useState('1');

  // บันทึกวัตถุดิบใหม่
  const handleSaveIngredient = (e: React.FormEvent) => {
    e.preventDefault();
    const cost = parseFloat(ingCost);
    if (!ingName.trim() || isNaN(cost) || cost < 0) return;

    addIngredient({
      name: ingName.trim(),
      unit: ingUnit.trim() || 'ชิ้น',
      unitCost: cost,
      supplier: ingSupplier.trim() || undefined
    });

    setIngName('');
    setIngCost('');
    setIngSupplier('');
    setShowAddIng(false);
  };

  // เพิ่มวัตถุดิบเข้าไปในรายการสูตรอาหารชั่วคราว
  const handleAddIngredientToRecipe = () => {
    const ing = ingredients.find((i) => i.id === selectedIngId);
    const qty = parseFloat(ingQuantity);
    if (!ing || isNaN(qty) || qty <= 0) return;

    // คำนวณต้นทุนวัตถุดิบชิ้นนี้ในจาน
    const costPerServing = ing.unitCost * qty;

    setRecipeItems((prev) => [
      ...prev,
      {
        ingredientId: ing.id,
        ingredientName: ing.name,
        quantity: qty,
        unit: ing.unit,
        costPerServing: parseFloat(costPerServing.toFixed(2))
      }
    ]);

    setIngQuantity('1');
  };

  // ลบวัตถุดิบออกจากสูตร
  const handleRemoveRecipeItem = (index: number) => {
    setRecipeItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // คำนวณต้นทุนรวมของสูตรที่กำลังสร้าง
  const currentIngredientsCost = recipeItems.reduce((s, item) => s + item.costPerServing, 0);
  const packagingCostNum = parseFloat(packagingCost) || 0;
  const currentTotalDishCost = currentIngredientsCost + packagingCostNum;

  // บันทึกเมนูอาหารใหม่
  const handleSaveMenuItem = (e: React.FormEvent) => {
    e.preventDefault();
    const dineIn = parseFloat(dineInPrice) || 0;
    const delivery = parseFloat(deliveryPrice) || dineIn;
    if (!menuName.trim() || dineIn <= 0) return;

    addMenuItem({
      name: menuName.trim(),
      category: menuCategory,
      dineInPrice: dineIn,
      deliveryPrice: delivery,
      recipe: recipeItems,
      packagingCost: packagingCostNum,
      totalCostPerDish: parseFloat(currentTotalDishCost.toFixed(2)),
      targetFoodCostPercent: settings.targetFoodCostPercent || 35,
      isActive: true
    });

    // รีเซ็ตฟอร์ม
    setMenuName('');
    setDineInPrice('');
    setDeliveryPrice('');
    setRecipeItems([]);
    setShowAddMenu(false);
  };

  return (
    <div className="space-y-5 pb-12">
      {/* ส่วนหัวหน้า */}
      <div>
        <h2 className="text-xl font-bold text-stone-900">เมนู & สูตรอาหาร (Menu & Recipe)</h2>
        <p className="text-xs text-stone-500 mt-0.5">
          บริหารต้นทุนสูตรอาหาร (Food Cost BOM) คำนวณกำไรต่อจาน
        </p>
      </div>

      {/* แท็บสลับระหว่าง เมนูอาหาร กับ คลังวัตถุดิบ */}
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
          เมนูและสูตรต้นทุน ({menuItems.length})
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

      {/* ============================================================== */}
      {/* 1. แท็บเมนูอาหารและสูตร (MENU & RECIPES) */}
      {/* ============================================================== */}
      {subTab === 'menu' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-stone-600">
              รายการเมนูอาหารพร้อมสัดส่วนต้นทุน
            </span>
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              เพิ่มเมนูอาหาร
            </button>
          </div>

          {/* ฟอร์มเพิ่มเมนูอาหารและสร้างสูตร */}
          {showAddMenu && (
            <form
              onSubmit={handleSaveMenuItem}
              className="bg-white rounded-2xl p-4 sm:p-5 border border-emerald-200 shadow-sm space-y-4"
            >
              <div className="flex items-center gap-2 pb-2 border-b border-stone-100">
                <ChefHat className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-stone-900">สร้างเมนูอาหารใหม่พร้อมสูตรคำนวณต้นทุน</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    ชื่อเมนูอาหาร <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ข้าวกะเพราหมูสับไข่ดาว"
                    value={menuName}
                    onChange={(e) => setMenuName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    หมวดหมู่อาหาร
                  </label>
                  <select
                    value={menuCategory}
                    onChange={(e) => setMenuCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 outline-none bg-white"
                  >
                    {settings.categoriesList.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    ราคาขายหน้าร้าน (บาท) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    placeholder="เช่น 60"
                    value={dineInPrice}
                    onChange={(e) => setDineInPrice(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 outline-none font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    ราคาขายเดลิเวอรี่ (บาท)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    placeholder="เช่น 80 (เผื่อค่า GP)"
                    value={deliveryPrice}
                    onChange={(e) => setDeliveryPrice(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 outline-none font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    ค่าบรรจุภัณฑ์/กล่อง/ช้อน (บาท)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={packagingCost}
                    onChange={(e) => setPackagingCost(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 outline-none"
                  />
                </div>
              </div>

              {/* ส่วนเพิ่มวัตถุดิบลงสูตร (Recipe Builder) */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2.5">
                <div className="text-xs font-semibold text-stone-800 flex items-center justify-between">
                  <span>ส่วนประกอบวัตถุดิบในสูตร (Recipe)</span>
                  <span className="text-[11px] text-stone-500 font-normal">
                    ต้นทุนวัตถุดิบ: ฿{currentIngredientsCost.toFixed(2)}
                  </span>
                </div>

                {ingredients.length === 0 ? (
                  <div className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg">
                    กรุณาเพิ่มวัตถุดิบในแท็บ "คลังวัตถุดิบ" ก่อน เพื่อดึงมาประกอบสูตรอาหาร
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      value={selectedIngId}
                      onChange={(e) => setSelectedIngId(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-stone-300 bg-white"
                    >
                      {ingredients.map((ing) => (
                        <option key={ing.id} value={ing.id}>
                          {ing.name} (฿{ing.unitCost}/{ing.unit})
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.01"
                        min="0.001"
                        placeholder="ปริมาณ"
                        value={ingQuantity}
                        onChange={(e) => setIngQuantity(e.target.value)}
                        className="w-20 px-2 py-1.5 text-xs rounded-lg border border-stone-300 bg-white text-center"
                      />
                      <span className="text-xs text-stone-500 min-w-8">
                        {ingredients.find((i) => i.id === selectedIngId)?.unit || ''}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddIngredientToRecipe}
                      className="px-3 py-1.5 bg-stone-700 text-white rounded-lg text-xs font-medium hover:bg-stone-800"
                    >
                      + ใส่ในสูตร
                    </button>
                  </div>
                )}

                {/* รายการวัตถุดิบที่เพิ่มลงสูตรแล้ว */}
                {recipeItems.length > 0 && (
                  <div className="divide-y divide-stone-200 border border-stone-200 rounded-lg bg-white overflow-hidden text-xs">
                    {recipeItems.map((item, idx) => (
                      <div key={idx} className="p-2 flex items-center justify-between">
                        <div>
                          <span className="font-medium text-stone-800">{item.ingredientName}</span>
                          <span className="text-stone-500 ml-1.5">
                            ({item.quantity} {item.unit})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-stone-900">
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

                {/* สรุปต้นทุนต่อจาน */}
                <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-xs">
                  <span className="font-semibold text-stone-700">ต้นทุนรวมต่อจาน:</span>
                  <span className="font-bold text-emerald-700 text-sm">
                    ฿{currentTotalDishCost.toFixed(2)} บาท
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddMenu(false)}
                  className="px-3 py-1.5 text-xs text-stone-600 bg-stone-100 rounded-lg"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs"
                >
                  บันทึกเมนูอาหาร
                </button>
              </div>
            </form>
          )}

          {/* รายการเมนูอาหารทั้งหมด */}
          <div className="space-y-3">
            {menuItems.map((item: MenuItem) => {
              const dineInMargin = item.dineInPrice > 0
                ? Math.round(((item.dineInPrice - item.totalCostPerDish) / item.dineInPrice) * 100)
                : 0;
              const foodCostPercent = item.dineInPrice > 0
                ? Math.round((item.totalCostPerDish / item.dineInPrice) * 100)
                : 0;

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-stone-900">{item.name}</h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                          {item.category}
                        </span>
                      </div>
                      {item.notes && (
                        <p className="text-[11px] text-stone-500 mt-0.5">{item.notes}</p>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        if (window.confirm(`คุณต้องการลบเมนู "${item.name}" ใช่หรือไม่?`)) {
                          deleteMenuItem(item.id);
                        }
                      }}
                      className="p-1 text-stone-300 hover:text-red-500 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* สรุปราคาและกำไร */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                      <span className="text-[10px] text-stone-500 block">ราคาขายหน้าร้าน</span>
                      <span className="font-bold text-stone-900 text-sm">฿{item.dineInPrice}</span>
                    </div>

                    <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                      <span className="text-[10px] text-stone-500 block">ราคาเดลิเวอรี่</span>
                      <span className="font-bold text-stone-900 text-sm">฿{item.deliveryPrice || item.dineInPrice}</span>
                    </div>

                    <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                      <span className="text-[10px] text-stone-500 block">ต้นทุนรวมต่อจาน</span>
                      <span className="font-bold text-red-600 text-sm">฿{item.totalCostPerDish}</span>
                    </div>

                    <div className={`p-2.5 rounded-xl border ${
                      foodCostPercent <= 35 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
                    }`}>
                      <span className="text-[10px] text-stone-600 block">Food Cost %</span>
                      <span className={`font-bold text-sm ${
                        foodCostPercent <= 35 ? 'text-emerald-700' : 'text-amber-700'
                      }`}>
                        {foodCostPercent}% (กำไร {dineInMargin}%)
                      </span>
                    </div>
                  </div>

                  {/* วัตถุดิบในสูตร */}
                  {item.recipe && item.recipe.length > 0 && (
                    <div className="pt-2 border-t border-stone-100">
                      <div className="text-[11px] font-semibold text-stone-600 mb-1.5">
                        ส่วนประกอบสูตรอาหาร:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {item.recipe.map((r, i) => (
                          <span
                            key={i}
                            className="text-[11px] px-2 py-0.5 rounded-md bg-stone-100 text-stone-700"
                          >
                            {r.ingredientName}: {r.quantity} {r.unit} (฿{r.costPerServing})
                          </span>
                        ))}
                        {item.packagingCost > 0 && (
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                            กล่อง+ช้อน: ฿{item.packagingCost}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. แท็บคลังวัตถุดิบ (INGREDIENTS) */}
      {/* ============================================================== */}
      {subTab === 'ingredients' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-stone-600">
              รายการวัตถุดิบสำหรับนำไปคำนวณสูตรอาหาร
            </span>
            <button
              onClick={() => setShowAddIng(!showAddIng)}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              เพิ่มวัตถุดิบ
            </button>
          </div>

          {/* ฟอร์มเพิ่มวัตถุดิบใหม่ */}
          {showAddIng && (
            <form
              onSubmit={handleSaveIngredient}
              className="bg-white rounded-2xl p-4 sm:p-5 border border-emerald-200 shadow-sm space-y-3.5"
            >
              <div className="flex items-center gap-2 pb-2 border-b border-stone-100">
                <Package className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-stone-900">เพิ่มวัตถุดิบใหม่</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    ชื่อวัตถุดิบ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น หมูสันคอ, ข้าวสาร"
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
                    placeholder="กก., ฟอง, ลิตร, ถุง"
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
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 outline-none font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  แหล่งซื้อ / ร้านค้าประจำ
                </label>
                <input
                  type="text"
                  placeholder="เช่น แผงป้าพร ตลาดสด"
                  value={ingSupplier}
                  onChange={(e) => setIngSupplier(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddIng(false)}
                  className="px-3 py-1.5 text-xs text-stone-600 bg-stone-100 rounded-lg"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs"
                >
                  บันทึกวัตถุดิบ
                </button>
              </div>
            </form>
          )}

          {/* รายการวัตถุดิบ */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="divide-y divide-stone-100">
              {ingredients.map((ing: Ingredient) => (
                <div
                  key={ing.id}
                  className="p-3.5 hover:bg-stone-50/70 transition-colors flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="text-xs font-bold text-stone-900">{ing.name}</div>
                    <div className="text-[11px] text-stone-500 mt-0.5">
                      หน่วย: {ing.unit} {ing.supplier ? `• แหล่งซื้อ: ${ing.supplier}` : ''}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-xs font-bold text-stone-900">
                        ฿{ing.unitCost.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-stone-500 block">/ {ing.unit}</span>
                    </div>

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
    </div>
  );
};
