export const FOOD_CATEGORIES = [
  { id: 'carne', labelKey: 'cat_carne', emoji: '🥩' },
  { id: 'pesce', labelKey: 'cat_pesce', emoji: '🐟' },
  { id: 'carboidrati', labelKey: 'cat_carboidrati', emoji: '🍞' },
  { id: 'frutta', labelKey: 'cat_frutta', emoji: '🍎' },
  { id: 'verdura', labelKey: 'cat_verdura', emoji: '🥬' },
  { id: 'latticini', labelKey: 'cat_latticini', emoji: '🥚' },
  { id: 'grassi', labelKey: 'cat_grassi', emoji: '🫒' },
  { id: 'sfizi', labelKey: 'cat_sfizi', emoji: '🍔' },
  { id: 'bevande', labelKey: 'cat_bevande', emoji: '🥤' },
  { id: 'colazione', labelKey: 'cat_colazione', emoji: '🥐' },
  { id: 'personal', labelKey: 'cat_personal', emoji: '⭐' },
];

export const FOODS = [
  // 1. Carne
  { id: 'carne_bianca', category: 'carne', name: 'Carne bianca (pollo/tacchino)', kcal: 107, protein: 23, carbs: 0, lipids: 1.5 },
  { id: 'carne_rossa_magra', category: 'carne', name: 'Carne rossa magra (fesa)', kcal: 120, protein: 21.5, carbs: 0, lipids: 3.5 },
  { id: 'carne_rossa_semigrassa', category: 'carne', name: 'Carne rossa semigrassa (maiale)', kcal: 225, protein: 19, carbs: 0, lipids: 13.5 },
  { id: 'macinato_misto', category: 'carne', name: 'Macinato misto', kcal: 220, protein: 18, carbs: 0, lipids: 16.5 },

  // 2. Pesce
  { id: 'pesce_magro', category: 'pesce', name: 'Pesce magro (merluzzo/orata)', kcal: 87, protein: 17, carbs: 0, lipids: 1.5 },
  { id: 'pesce_semigrasso', category: 'pesce', name: 'Pesce semigrasso (salmone/tonno)', kcal: 170, protein: 19, carbs: 0, lipids: 10 },
  { id: 'tonno_naturale', category: 'pesce', name: "Tonno in scatola (al naturale)", kcal: 100, protein: 24.5, carbs: 0, lipids: 1 },
  { id: 'tonno_olio', category: 'pesce', name: "Tonno in scatola (sott'olio)", kcal: 205, protein: 23, carbs: 0, lipids: 11 },

  // 3. Carboidrati
  { id: 'pasta', category: 'carboidrati', name: 'Pasta (di semola)', kcal: 355, protein: 11.5, carbs: 72.5, lipids: 1.25 },
  { id: 'riso', category: 'carboidrati', name: 'Riso (bianco)', kcal: 345, protein: 6.5, carbs: 79, lipids: 0.5 },
  { id: 'pane', category: 'carboidrati', name: 'Pane (bianco/cafone)', kcal: 270, protein: 8.5, carbs: 52.5, lipids: 1.5 },
  { id: 'pancarre', category: 'carboidrati', name: 'Pane in cassetta/pancarre', kcal: 290, protein: 8.5, carbs: 52.5, lipids: 1.5 },
  { id: 'frise', category: 'carboidrati', name: 'Frise/Freselle', kcal: 370, protein: 10.5, carbs: 72.5, lipids: 2.5 },
  { id: 'patate_crude', category: 'carboidrati', name: 'Patate (crude)', kcal: 80, protein: 2, carbs: 17.5, lipids: 0.1 },
  { id: 'patate_bollite', category: 'carboidrati', name: 'Patate (bollite)', kcal: 87, protein: 2, carbs: 17.5, lipids: 0.1 },

  // 4. Frutta
  { id: 'mele', category: 'frutta', name: 'Mele', kcal: 52, protein: 0.3, carbs: 11.5, lipids: 0.2 },
  { id: 'pesche', category: 'frutta', name: 'Pesche', kcal: 40, protein: 0.8, carbs: 9.5, lipids: 0.1 },
  { id: 'banane', category: 'frutta', name: 'Banane', kcal: 87, protein: 1.2, carbs: 22.5, lipids: 0.3 },
  { id: 'arance_mandarini', category: 'frutta', name: 'Arance/Mandarini', kcal: 40, protein: 0.8, carbs: 9.5, lipids: 0.2 },
  { id: 'anguria_melone', category: 'frutta', name: 'Anguria/Melone', kcal: 32, protein: 0.5, carbs: 7.5, lipids: 0.2 },
  { id: 'frutti_bosco', category: 'frutta', name: 'Frutti di bosco', kcal: 35, protein: 0.5, carbs: 8, lipids: 0.2 },

  // 5. Verdura
  { id: 'pomodori', category: 'verdura', name: 'Pomodori', kcal: 19, protein: 1, carbs: 3.5, lipids: 0.2 },
  { id: 'insalata', category: 'verdura', name: 'Insalata (lattuga/rucola)', kcal: 17, protein: 2, carbs: 1.75, lipids: 0.3 },
  { id: 'zucchine_melanzane_peperoni', category: 'verdura', name: 'Zucchine/Melanzane/Peperoni', kcal: 22, protein: 1.15, carbs: 3.5, lipids: 0.2 },
  { id: 'broccoli_cavolfiori', category: 'verdura', name: 'Broccoli/Cavolfiori', kcal: 27, protein: 3.5, carbs: 4, lipids: 0.3 },
  { id: 'carote', category: 'verdura', name: 'Carote', kcal: 37, protein: 1, carbs: 8, lipids: 0.2 },

  // 6. Latticini, Uova, Vegetali
  { id: 'uova_intere', category: 'latticini', name: 'Uova intere', kcal: 145, protein: 12.5, carbs: 0.7, lipids: 10.5 },
  { id: 'albume', category: 'latticini', name: "Albume d'uovo", kcal: 52, protein: 10.5, carbs: 0.7, lipids: 0.1 },
  { id: 'latte_scremato', category: 'latticini', name: 'Latte (parz. scremato)', kcal: 47, protein: 3.3, carbs: 4.8, lipids: 1.65 },
  { id: 'yogurt_greco', category: 'latticini', name: 'Yogurt greco', kcal: 75, protein: 9.5, carbs: 3.5, lipids: 0.3 },
  { id: 'formaggi_freschi', category: 'latticini', name: 'Formaggi freschi (ricotta/fiocchi)', kcal: 127, protein: 10, carbs: 3, lipids: 8 },
  { id: 'formaggi_stagionati', category: 'latticini', name: 'Formaggi stagionati (Parmigiano)', kcal: 390, protein: 33.5, carbs: 0, lipids: 29 },
  { id: 'legumi_secchi', category: 'latticini', name: 'Legumi secchi (ceci/fagioli)', kcal: 320, protein: 22, carbs: 55, lipids: 3.25 },
  { id: 'legumi_scatola', category: 'latticini', name: 'Legumi in scatola (cotti)', kcal: 100, protein: 7.5, carbs: 13.5, lipids: 0.75 },

  // 7. Grassi e Condimenti
  { id: 'olio', category: 'grassi', name: 'Olio EVO/di semi', kcal: 900, protein: 0, carbs: 0, lipids: 99.5 },
  { id: 'burro', category: 'grassi', name: 'Burro', kcal: 732, protein: 0.5, carbs: 0.5, lipids: 81 },
  { id: 'frutta_secca', category: 'grassi', name: 'Frutta secca (noci/mandorle)', kcal: 625, protein: 17.5, carbs: 9, lipids: 57.5 },

  // 8. Cibo Spazzatura, Sfizi e Snack
  { id: 'gelato_artigianale', category: 'sfizi', name: 'Gelato artigianale (crema/cioccolato)', kcal: 225, protein: 3.5, carbs: 27.5, lipids: 10 },
  { id: 'gelato_industriale', category: 'sfizi', name: 'Gelato industriale (stecco/cono)', kcal: 315, protein: 4, carbs: 35, lipids: 18.5 },
  { id: 'pizza_tonda', category: 'sfizi', name: 'Pizza tonda al piatto (margherita)', kcal: 260, protein: 10, carbs: 32.5, lipids: 9.5 },
  { id: 'pizza_trancio', category: 'sfizi', name: 'Pizza al trancio/in teglia', kcal: 305, protein: 9, carbs: 38.5, lipids: 12 },
  { id: 'patatine_fritte', category: 'sfizi', name: 'Patatine fritte (fast food)', kcal: 330, protein: 3.5, carbs: 41, lipids: 16.5 },
  { id: 'patatine_busta', category: 'sfizi', name: 'Patatine in busta (chips)', kcal: 525, protein: 5.5, carbs: 52.5, lipids: 32.5 },

  // 9. Bevande e Drinks
  { id: 'acqua_caffe_tè', category: 'bevande', name: 'Acqua / Caffè amaro / Tè non zuccherato', kcal: 0, protein: 0, carbs: 0, lipids: 0 },
  { id: 'latte_scremato_bev', category: 'bevande', name: 'Latte vaccino (parz. scremato)', kcal: 48, protein: 3.3, carbs: 4.8, lipids: 1.65 },
  { id: 'latte_intero', category: 'bevande', name: 'Latte vaccino (intero)', kcal: 62, protein: 3.2, carbs: 4.7, lipids: 3.5 },
  { id: 'bibite_gassate', category: 'bevande', name: 'Bibite gassate zuccherate (Cola/Fanta)', kcal: 42, protein: 0, carbs: 10, lipids: 0 },
  { id: 'bibite_zero', category: 'bevande', name: 'Bibite zero / light (Cola Zero)', kcal: 1, protein: 0, carbs: 0, lipids: 0 },
  { id: 'succo_frutta', category: 'bevande', name: 'Succo di frutta confezionato', kcal: 55, protein: 0.3, carbs: 13, lipids: 0.1 },
  { id: 'birra', category: 'bevande', name: 'Birra (chiara commerciale 5%)', kcal: 42, protein: 0.5, carbs: 3.75, lipids: 0 },
  { id: 'vino', category: 'bevande', name: 'Vino (rosso/bianco secco 12-13%)', kcal: 78, protein: 0.1, carbs: 1, lipids: 0 },
  { id: 'caffe_zuccherato', category: 'bevande', name: 'Caffè zuccherato (1 cucchiaino zucchero)', kcal: 22, protein: 0, carbs: 5, lipids: 0 },

  // 10. Colazione, Snack Dolci e Spalmature
  { id: 'biscotti_secchi', category: 'colazione', name: 'Biscotti secchi (tipo Oro Saiwa/Marie)', kcal: 420, protein: 7.5, carbs: 72.5, lipids: 11 },
  { id: 'biscotti_frollini', category: 'colazione', name: 'Biscotti frollini (gocce/ripieni)', kcal: 485, protein: 6.5, carbs: 62.5, lipids: 22 },
  { id: 'yogurt_bianco_intero', category: 'colazione', name: 'Yogurt bianco intero (non zuccherato)', kcal: 62, protein: 3.75, carbs: 4.75, lipids: 3.25 },
  { id: 'yogurt_bianco_magro', category: 'colazione', name: 'Yogurt bianco magro (non zuccherato)', kcal: 40, protein: 4.25, carbs: 4.5, lipids: 0.5 },
  { id: 'fette_biscottate', category: 'colazione', name: 'Fette biscottate (classiche)', kcal: 390, protein: 10.5, carbs: 72.5, lipids: 6 },
  { id: 'marmellata', category: 'colazione', name: 'Marmellata/Confettura di frutta', kcal: 260, protein: 0.3, carbs: 62.5, lipids: 0 },
  { id: 'crema_nocciole', category: 'colazione', name: 'Crema spalmabile alle nocciole (Nutella)', kcal: 540, protein: 6.5, carbs: 56.5, lipids: 31 },
  { id: 'cereali_avena', category: 'colazione', name: 'Cereali - fiocchi d\u2019avena naturali', kcal: 380, protein: 13, carbs: 62.5, lipids: 7.5 },
  { id: 'cereali_zuccherati', category: 'colazione', name: 'Cereali zuccherati/cioccolatosi', kcal: 425, protein: 7, carbs: 72.5, lipids: 11.5 },
];

export function getFoodById(id, customFoods = []) {
  const staticFood = FOODS.find((f) => f.id === id);
  if (staticFood) return staticFood;
  const custom = (customFoods || []).find((f) => f.id === id);
  if (custom) return { ...custom, category: 'personal' };
  return undefined;
}

export function getFoodsByCategory(categoryId, customFoods = []) {
  if (categoryId === 'personal') {
    return (customFoods || []).map((f) => ({ ...f, category: 'personal' }));
  }
  return FOODS.filter((f) => f.category === categoryId);
}

export function computeFoodMacros(foodId, grams, customFoods = []) {
  const food = getFoodById(foodId, customFoods);
  if (!food) return { kcal: 0, protein: 0, carbs: 0, lipids: 0 };
  const factor = grams / 100;
  return {
    kcal: Math.round(food.kcal * factor),
    protein: Math.round(food.protein * factor * 10) / 10,
    carbs: Math.round(food.carbs * factor * 10) / 10,
    lipids: Math.round(food.lipids * factor * 10) / 10,
  };
}

export function computeFoodLogTotals(foodLog, customFoods = []) {
  return (foodLog || []).reduce(
    (acc, item) => {
      const macros = computeFoodMacros(item.food_id, item.grams, customFoods);
      return {
        kcal: acc.kcal + macros.kcal,
        protein: Math.round((acc.protein + macros.protein) * 10) / 10,
        carbs: Math.round((acc.carbs + macros.carbs) * 10) / 10,
        lipids: Math.round((acc.lipids + macros.lipids) * 10) / 10,
      };
    },
    { kcal: 0, protein: 0, carbs: 0, lipids: 0 }
  );
}

export function computeCalorieRating(consumed, goal) {
  if (!goal || goal <= 0 || !consumed) return 0;
  const diff = Math.abs(consumed - goal);
  if (diff <= 200) return 5;
  return Math.max(1, 5 - Math.ceil((diff - 200) / 150));
}

export function computeSleepRating(hours, minutes) {
  const totalMinutes = (hours || 0) * 60 + (minutes || 0);
  if (totalMinutes === 0) return 0;
  const optimalLow = 450; // 7h30
  const optimalHigh = 510; // 8h30
  if (totalMinutes >= optimalLow && totalMinutes <= optimalHigh) return 5;
  const diff = totalMinutes < optimalLow ? optimalLow - totalMinutes : totalMinutes - optimalHigh;
  return Math.max(1, 5 - Math.floor(diff / 45));
}