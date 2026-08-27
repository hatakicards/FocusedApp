// Smoking product categories with substance estimation data.
// Values are approximate absorbed substance per unit (mg).
// These are general estimates for illustrative purposes only.
//
// Tracked substances:
// - nicotine: mg of nicotine absorbed
// - thc: mg of THC absorbed (cannabis products)
// - tar: mg of tar inhaled (combustion products only)
// - co: mg of carbon monoxide inhaled (combustion products only)

export const SMOKING_CATEGORIES = [
  {
    id: 'traditional',
    name: 'Prodotti Tradizionali a Base di Tabacco (Combustione)',
    products: [
      { id: 'industrial_cigs', name: 'Sigarette industriali', nicotinePerUnit: 1, thcPerUnit: 0, tarPerUnit: 10, coPerUnit: 10, unit: 'sigarette' },
      { id: 'rolling_tobacco', name: 'Tabacco sfuso (cartine o pipa)', nicotinePerUnit: 1.5, thcPerUnit: 0, tarPerUnit: 15, coPerUnit: 15, unit: 'sigarette' },
      { id: 'cigars', name: 'Sigari e Sigarillos', nicotinePerUnit: 2.5, thcPerUnit: 0, tarPerUnit: 20, coPerUnit: 20, unit: 'unità' },
    ],
  },
  {
    id: 'heat_not_burn',
    name: 'Prodotti a Tabacco Riscaldato (Heat-not-Burn)',
    products: [
      { id: 'iqos_heets', name: 'IQOS (stick Heets)', nicotinePerUnit: 0.8, thcPerUnit: 0, tarPerUnit: 1, coPerUnit: 0.3, unit: 'stick' },
      { id: 'iqos_terea', name: 'IQOS Terea', nicotinePerUnit: 0.9, thcPerUnit: 0, tarPerUnit: 1, coPerUnit: 0.3, unit: 'stick' },
      { id: 'glo_ploom', name: 'Altri brand (Glo, Ploom)', nicotinePerUnit: 0.8, thcPerUnit: 0, tarPerUnit: 1, coPerUnit: 0.3, unit: 'stick' },
    ],
  },
  {
    id: 'ecig',
    name: 'Sigarette Elettroniche e Sistemi di Inalazione a Liquido',
    products: [
      { id: 'puff', name: 'Puff (usa e getta)', nicotinePerUnit: 3, thcPerUnit: 0, tarPerUnit: 0, coPerUnit: 0, unit: 'dispositivo' },
      { id: 'pod_mod', name: 'Kiwi / Pod Mod ricaricabili', nicotinePerUnit: 1.5, thcPerUnit: 0, tarPerUnit: 0, coPerUnit: 0, unit: 'pod' },
      { id: 'box_mod', name: 'Big Battery / Box Mod', nicotinePerUnit: 2, thcPerUnit: 0, tarPerUnit: 0, coPerUnit: 0, unit: 'sessione' },
    ],
  },
  {
    id: 'herbal',
    name: 'Sostanze Vegetali e Alternative Naturali (Cannabis e Simili)',
    products: [
      { id: 'joint', name: 'Canne / Joint', nicotinePerUnit: 0, thcPerUnit: 7, tarPerUnit: 15, coPerUnit: 10, unit: 'unità', substance: 'THC' },
      { id: 'weed', name: 'Erba (Infiorescenze di Cannabis)', nicotinePerUnit: 0, thcPerUnit: 150, tarPerUnit: 0, coPerUnit: 0, unit: 'grammi', substance: 'THC' },
      { id: 'hash', name: 'Hashish (Fumo)', nicotinePerUnit: 0, thcPerUnit: 400, tarPerUnit: 0, coPerUnit: 0, unit: 'grammi', substance: 'THC' },
      { id: 'herbal_blends', name: 'Herbal Blends (senza tabacco)', nicotinePerUnit: 0, thcPerUnit: 0, tarPerUnit: 5, coPerUnit: 3, unit: 'unità', substance: 'Nessuna' },
    ],
  },
  {
    id: 'other_nicotine',
    name: 'Altre categorie (nicotina senza fumo)',
    products: [
      { id: 'snus', name: 'Snus / Nicotine Pouches', nicotinePerUnit: 6, thcPerUnit: 0, tarPerUnit: 0, coPerUnit: 0, unit: 'bustina' },
      { id: 'snuff', name: 'Tabacco da fiuto (Snuff)', nicotinePerUnit: 1.5, thcPerUnit: 0, tarPerUnit: 0, coPerUnit: 0, unit: 'pizzico' },
      { id: 'dry_herb_vape', name: 'Vaporizzatori di erbe secche', nicotinePerUnit: 0, thcPerUnit: 100, tarPerUnit: 0, coPerUnit: 0, unit: 'sessione', substance: 'THC' },
    ],
  },
];

// Flatten all products for easy lookup
export const ALL_SMOKING_PRODUCTS = SMOKING_CATEGORIES.flatMap((cat) =>
  cat.products.map((p) => ({ ...p, categoryId: cat.id, categoryName: cat.name }))
);

export function getProductById(id) {
  return ALL_SMOKING_PRODUCTS.find((p) => p.id === id);
}

// Calculate estimated nicotine from a list of entries
export function estimateNicotine(entries) {
  if (!entries || entries.length === 0) return 0;
  return entries.reduce((total, entry) => {
    const product = getProductById(entry.product);
    if (!product) return total;
    return total + (product.nicotinePerUnit || 0) * (entry.quantity || 0);
  }, 0);
}

// Calculate estimated THC from a list of entries
export function estimateTHC(entries) {
  if (!entries || entries.length === 0) return 0;
  return entries.reduce((total, entry) => {
    const product = getProductById(entry.product);
    if (!product) return total;
    return total + (product.thcPerUnit || 0) * (entry.quantity || 0);
  }, 0);
}

// Calculate estimated tar from a list of entries
export function estimateTar(entries) {
  if (!entries || entries.length === 0) return 0;
  return entries.reduce((total, entry) => {
    const product = getProductById(entry.product);
    if (!product) return total;
    return total + (product.tarPerUnit || 0) * (entry.quantity || 0);
  }, 0);
}

// Calculate estimated carbon monoxide from a list of entries
export function estimateCO(entries) {
  if (!entries || entries.length === 0) return 0;
  return entries.reduce((total, entry) => {
    const product = getProductById(entry.product);
    if (!product) return total;
    return total + (product.coPerUnit || 0) * (entry.quantity || 0);
  }, 0);
}

// Calculate all substances from a list of entries
export function estimateAllSubstances(entries) {
  return {
    nicotine: estimateNicotine(entries),
    thc: estimateTHC(entries),
    tar: estimateTar(entries),
    co: estimateCO(entries),
  };
}

// Check if any entry has nicotine
export function hasNicotine(entries) {
  return entries.some((entry) => {
    const product = getProductById(entry.product);
    return product && product.nicotinePerUnit > 0;
  });
}