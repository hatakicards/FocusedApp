import { useState } from 'react';
import { Plus, X, Pencil, Check } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { FOOD_CATEGORIES, getFoodsByCategory, getFoodById, computeFoodMacros } from '@/lib/foodDatabase';
import BottomSelect from '@/components/BottomSelect';
import CustomFoodDialog from './CustomFoodDialog';

export default function FoodTracker({ foodLog, onAdd, onRemove, onEdit, customFoods = [], onAddCustomFood }) {
  const t = useT();
  const [category, setCategory] = useState('');
  const [foodId, setFoodId] = useState('');
  const [grams, setGrams] = useState('');
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editGrams, setEditGrams] = useState('');

  const foods = category ? getFoodsByCategory(category, customFoods) : [];

  const handleAdd = () => {
    if (!foodId || !grams) return;
    onAdd(foodId, parseInt(grams));
    setFoodId('');
    setGrams('');
  };

  const startEdit = (index, currentGrams) => {
    setEditingIndex(index);
    setEditGrams(String(currentGrams));
  };

  const confirmEdit = () => {
    if (editingIndex == null || !editGrams) {
      setEditingIndex(null);
      return;
    }
    onEdit?.(editingIndex, parseInt(editGrams));
    setEditingIndex(null);
    setEditGrams('');
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 mb-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{t('bf_food_tracker')}</p>

      <div className="mb-2">
        <BottomSelect
          value={category}
          onValueChange={(v) => { setCategory(v); setFoodId(''); }}
          placeholder={t('bf_select_category')}
          label={t('bf_select_category')}
          options={FOOD_CATEGORIES.map((cat) => ({
            value: cat.id,
            label: `${cat.emoji} ${t(cat.labelKey)}`,
          }))}
        />
      </div>

      {category && (
        <div className="mb-2">
          <BottomSelect
            value={foodId}
            onValueChange={setFoodId}
            placeholder={t('bf_select_food')}
            label={t('bf_select_food')}
            options={foods.map((food) => ({
              value: food.id,
              label: `${food.name} (${food.kcal} kcal/100g)`,
            }))}
          />
        </div>
      )}

      {category === 'personal' && (
        <button
          onClick={() => setShowCustomDialog(true)}
          className="mb-2 w-full rounded-xl border border-dashed border-border py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors flex items-center justify-center gap-1.5"
        >
          <Plus size={14} /> {t('bf_add_custom_food')}
        </button>
      )}

      <div className="flex gap-2">
        <input
          type="number"
          inputMode="numeric"
          value={grams}
          onChange={(e) => setGrams(e.target.value)}
          placeholder={t('bf_grams_ph')}
          className="flex-1 min-w-0 rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none [color-scheme:dark]"
        />
        <button
          onClick={handleAdd}
          disabled={!foodId || !grams}
          className="rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background disabled:opacity-40 flex items-center gap-1 shrink-0"
        >
          <Plus size={16} /> <span className="hidden sm:inline">{t('bf_add_food')}</span>
        </button>
      </div>

      {foodLog.length > 0 ? (
        <div className="mt-3 space-y-2">
          {foodLog.map((item, i) => {
            const food = getFoodById(item.food_id, customFoods);
            if (!food) return null;
            const macros = computeFoodMacros(item.food_id, item.grams, customFoods);
            const isEditing = editingIndex === i;
            return (
              <div key={i} className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{food.name}</p>
                  {isEditing ? (
                    <div className="flex items-center gap-1.5 mt-1">
                      <input
                        type="number"
                        inputMode="numeric"
                        value={editGrams}
                        onChange={(e) => setEditGrams(e.target.value)}
                        className="w-20 rounded-lg border border-border bg-background px-2 py-1 text-xs outline-none [color-scheme:dark]"
                      />
                      <span className="text-xs text-muted-foreground">{t('bf_g')}</span>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">{item.grams}{t('bf_g')} · {macros.kcal} {t('bf_kcal')} · P{macros.protein} C{macros.carbs} L{macros.lipids}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {isEditing ? (
                    <button onClick={confirmEdit} className="text-emerald-500 hover:text-emerald-400">
                      <Check size={16} />
                    </button>
                  ) : (
                    <button onClick={() => startEdit(i, item.grams)} className="text-muted-foreground hover:text-foreground">
                      <Pencil size={14} />
                    </button>
                  )}
                  <button onClick={() => onRemove(i)} className="text-muted-foreground hover:text-destructive">
                    <X size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center mt-3">{t('bf_no_foods')}</p>
      )}

      <CustomFoodDialog
        open={showCustomDialog}
        onClose={() => setShowCustomDialog(false)}
        onSave={onAddCustomFood}
      />
    </div>
  );
}