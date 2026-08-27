import { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { SMOKING_CATEGORIES } from '@/lib/smokingData';

export default function ProductSelector({ entries, onChange, quantityField }) {
  const [expanded, setExpanded] = useState(null);

  const isSelected = (productId) => entries.some((e) => e.product === productId);
  const getEntry = (productId) => entries.find((e) => e.product === productId);

  const toggleProduct = (product, categoryId) => {
    if (isSelected(product.id)) {
      onChange(entries.filter((e) => e.product !== product.id));
    } else {
      onChange([...entries, { category: categoryId, product: product.id, [quantityField]: 0 }]);
    }
  };

  const updateQuantity = (productId, value) => {
    onChange(entries.map((e) => (e.product === productId ? { ...e, [quantityField]: value } : e)));
  };

  return (
    <div className="space-y-2">
      {SMOKING_CATEGORIES.map((cat) => {
        const isOpen = expanded === cat.id;
        const selectedCount = cat.products.filter((p) => isSelected(p.id)).length;
        return (
          <div key={cat.id} className="rounded-xl border border-border bg-background overflow-hidden">
            <button
              type="button"
              onClick={() => setExpanded(isOpen ? null : cat.id)}
              className="w-full flex items-center justify-between p-3 text-left active:bg-accent transition-colors"
            >
              <span className="text-xs font-medium pr-2 leading-tight">{cat.name}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                {selectedCount > 0 && (
                  <span className="text-[10px] font-semibold bg-foreground text-background rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                    {selectedCount}
                  </span>
                )}
                <ChevronDown size={14} className={`text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            </button>
            {isOpen && (
              <div className="px-3 pb-3 space-y-2 border-t border-border/50">
                {cat.products.map((product) => {
                  const selected = isSelected(product.id);
                  const entry = getEntry(product.id);
                  return (
                    <div key={product.id} className="flex items-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => toggleProduct(product, cat.id)}
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${selected ? 'bg-foreground border-foreground' : 'border-border'}`}
                      >
                        {selected && <Check size={12} className="text-background" />}
                      </button>
                      <span className="text-xs flex-1 min-w-0 leading-tight">{product.name}</span>
                      {selected && (
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="0.5"
                          value={entry?.[quantityField] || 0}
                          onChange={(e) => updateQuantity(product.id, parseFloat(e.target.value) || 0)}
                          className="w-16 rounded-lg border border-border bg-background px-2 py-1 text-xs text-center outline-none [color-scheme:dark]"
                        />
                      )}
                      <span className="text-[10px] text-muted-foreground w-14 shrink-0">{product.unit}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}