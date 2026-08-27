export const CATEGORIES = [
  { id: 'fitness', name: 'Fitness e Benessere', short: 'Fitness' },
  { id: 'mente', name: 'Mentalità e Stile di Vita', short: 'Mente' },
  { id: 'apprendimento', name: 'Apprendimento e Cultura', short: 'Cultura' },
  { id: 'sport', name: 'Sport', short: 'Sport' },
  { id: 'work', name: 'Lavoro', short: 'Work' },
  { id: 'studies', name: 'Studi', short: 'Studi' },
  { id: 'lifestyle', name: 'Lifestyle', short: 'Lifestyle' },
];

export const CATEGORY_NAMES = {
  fitness: 'Fitness e Benessere',
  mente: 'Mentalità e Stile di Vita',
  apprendimento: 'Apprendimento e Cultura',
  sport: 'Sport',
  work: 'Lavoro',
  studies: 'Studi',
  lifestyle: 'Lifestyle',
};

export const RANKS = [
  { id: 'bronzo', name: 'Bronzo', image: '/images/bronzo.png' },
  { id: 'argento', name: 'Argento', image: '/images/argento.png' },
  { id: 'oro', name: 'Oro', image: '/images/oro.png' },
  { id: 'pro', name: 'Pro', image: '/images/pro.png' },
  { id: 'elite', name: 'Elite', image: '/images/elite.png' },
];

export const LOGO_URL = '/images/logo_senza_sfondo_x_video.png';

export const RATING_INFO = {
  1: { label: 'Pessimo', color: '#EF4444' },
  2: { label: 'Male', color: '#EF4444' },
  3: { label: 'Nella media', color: '#EAB308' },
  4: { label: 'Bene', color: '#22C55E' },
  5: { label: 'Eccellente', color: '#22C55E' },
};

export const RATING_COLORS = {
  1: '#EF4444',
  2: '#EF4444',
  3: '#EAB308',
  4: '#22C55E',
  5: '#22C55E',
};

export const DIFFICULTY_INFO = {
  easy: { label: 'Facile', color: '#22C55E' },
  medium: { label: 'Medio', color: '#EAB308' },
  hard: { label: 'Difficile', color: '#EF4444' },
};

export const TIMEFRAME_INFO = {
  daily: 'Giornaliero',
  weekly: 'Settimanale',
  monthly: 'Mensile',
  annual: 'Annuale',
  lifetime: 'Una volta nella vita',
};

export const RANK_REQUIREMENTS = {
  fitness: [
    { id: 'streak_week', label: 'Ottieni una streak di una settimana' },
    { id: 'goal_medium', label: 'Raggiungi un obiettivo di difficoltà media o superiore' },
    { id: 'streak_month', label: 'Ottieni una streak di un mese' },
    { id: 'goal_hard', label: 'Raggiungi un obiettivo di difficoltà difficile' },
    { id: 'five_days_20', label: 'Raggiungi 20 giornate con voto 5' },
  ],
  mente: [
    { id: 'goal_easy', label: 'Raggiungi un obiettivo di difficoltà facile' },
    { id: 'goal_medium', label: 'Raggiungi un obiettivo di difficoltà media' },
    { id: 'goal_hard', label: 'Raggiungi un obiettivo di difficoltà difficile' },
    { id: 'streak_2weeks', label: 'Raggiungi una streak di due settimane' },
    { id: 'all_five_5', label: 'Raggiungi 5 giorni di fila con tutti 5' },
  ],
  apprendimento: [
    { id: 'goal_easy', label: 'Raggiungi un obiettivo di difficoltà facile' },
    { id: 'goal_medium', label: 'Raggiungi un obiettivo di difficoltà media' },
    { id: 'goal_hard', label: 'Raggiungi un obiettivo di difficoltà difficile' },
    { id: 'streak_2weeks', label: 'Raggiungi una streak di due settimane' },
    { id: 'all_five_5', label: 'Raggiungi 5 giorni di fila con tutti 5' },
  ],
  sport: [
    { id: 'streak_week', label: 'Ottieni una streak di una settimana' },
    { id: 'goal_medium', label: 'Raggiungi un obiettivo di difficoltà media o superiore' },
    { id: 'streak_month', label: 'Ottieni una streak di un mese' },
    { id: 'goal_hard', label: 'Raggiungi un obiettivo di difficoltà difficile' },
    { id: 'five_days_20', label: 'Raggiungi 20 giornate con voto 5' },
  ],
  work: [
    { id: 'goal_easy', label: 'Raggiungi un obiettivo di difficoltà facile' },
    { id: 'goal_medium', label: 'Raggiungi un obiettivo di difficoltà media' },
    { id: 'goal_hard', label: 'Raggiungi un obiettivo di difficoltà difficile' },
    { id: 'streak_2weeks', label: 'Raggiungi una streak di due settimane' },
    { id: 'all_five_5', label: 'Raggiungi 5 giorni di fila con tutti 5' },
  ],
  studies: [
    { id: 'grade_above_90', label: 'Ottieni un voto superiore al 90%' },
    { id: 'avg_above_80', label: 'Ottieni una media generale di 80' },
    { id: 'grade_above_85_3', label: 'Ottieni un voto superiore a 85% in 3 test' },
    { id: 'grade_above_85_5', label: 'Ottieni un voto superiore a 85% in 5 test' },
    { id: 'grade_above_85_10', label: 'Ottieni un voto superiore a 85% in 10 test' },
  ],
  lifestyle: [
    { id: 'goal_easy', label: 'Raggiungi un obiettivo di difficoltà facile' },
    { id: 'goal_medium', label: 'Raggiungi un obiettivo di difficoltà media' },
    { id: 'goal_hard', label: 'Raggiungi un obiettivo di difficoltà difficile' },
    { id: 'streak_2weeks', label: 'Raggiungi una streak di due settimane' },
    { id: 'all_five_5', label: 'Raggiungi 5 giorni di fila con tutti 5' },
  ],
};

export const PROFILE_TYPES = [
  { id: 'base', image: LOGO_URL, color: '#a855f7' },
  { id: 'atleta', image: 'https://media.base44.com/images/public/6a624883cde1a354b7f68217/9bedf331b_athlete.png', color: '#ef4444' },
  { id: 'studente', image: '/images/student.png', color: '#3b82f6' },
  { id: 'professionista', image: '/images/worker.png', color: '#22c55e' },
];

export const PROFILE_ROUTES = {
  atleta: '/body-fuel',
  studente: '/lezioni',
  professionista: '/workspace',
};

export const PROFILE_GRADIENTS = {
  base: 'radial-gradient(circle at 50% 0%, rgba(168,85,247,0.08), transparent 55%)',
  atleta: 'radial-gradient(circle at 50% 0%, rgba(239,68,68,0.12), transparent 55%)',
  studente: 'radial-gradient(circle at 50% 0%, rgba(59,130,246,0.12), transparent 55%)',
  professionista: 'radial-gradient(circle at 50% 0%, rgba(34,197,94,0.12), transparent 55%)',
};

export const GYM_IMAGE_URL = 'https://media.base44.com/images/public/6a624883cde1a354b7f68217/523b6dc90_Gemini_Generated_Image_k36f8rk36f8rk36f.png';

export const STUDY_IMAGE_URL = '/images/study.png';
export const PHONE_IMAGE_URL = '/images/phone.png';

export const QUIT_SMOKING_IMAGE_URL = 'https://media.base44.com/images/public/6a624883cde1a354b7f68217/6ee4a8fcb_generated_image.png';

export const PRESET_ACTIVITIES = [
  { presetType: 'gym', name: 'Gym', category: 'fitness', imageUrl: GYM_IMAGE_URL, emoji: 'dumbbell' },
  { presetType: 'phone_time', name: 'Reducing Phone Time', category: 'lifestyle', imageUrl: PHONE_IMAGE_URL, emoji: 'smartphone' },
  { presetType: 'reading', name: 'Reading', category: 'apprendimento', imageUrl: STUDY_IMAGE_URL, emoji: 'bookopen' },
  { presetType: 'quit_smoking', name: 'Quit Smoking', category: 'lifestyle', imageUrl: QUIT_SMOKING_IMAGE_URL, emoji: 'flame' },
];

export const PROFILE_VIDEOS = {
  atleta: 'https://media.base44.com/videos/public/6a624883cde1a354b7f68217/407bccbde_athletehappy.mp4',
  studente: 'https://media.base44.com/videos/public/6a624883cde1a354b7f68217/968cd4f53_studenthappy.mp4',
  professionista: '/images/workerhappy.mp4',
};

const STUDY_KEYWORDS = ['study', 'studi', 'school', 'scuola', 'universit', 'uni', 'college', 'lezion', 'esam', 'compit', 'materia', 'libro', 'reading', 'homework', 'ripasso', 'appunt', 'tesi', 'thesis', 'learning', 'imparare', 'apprendimento', 'corso', 'lecture', 'academic', 'laurea', 'dottorato', 'master', 'diploma'];

const PHONE_KEYWORDS = ['phone', 'telefono', 'cellulare', 'screen', 'schermo', 'social', 'instagram', 'tiktok', 'facebook', 'youtube', 'netflix', 'scroll', 'internet', 'gaming', 'game', 'videogame', 'twitch', 'discord', 'whatsapp', 'messenger', 'telegram', 'reddit', 'twitter', 'spotify', 'musica', 'music', 'notifica', 'messagg', 'chat'];

export function getActivityBackground(name, customCategoryName) {
  const text = [name, customCategoryName].filter(Boolean).join(' ').toLowerCase();
  if (!text) return null;
  for (const kw of STUDY_KEYWORDS) {
    if (text.includes(kw)) return STUDY_IMAGE_URL;
  }
  for (const kw of PHONE_KEYWORDS) {
    if (text.includes(kw)) return PHONE_IMAGE_URL;
  }
  return null;
}

export const ACTIVITY_ICONS = [
  'star', 'dumbbell', 'footprints', 'bike', 'waves', 'target', 'bookopen', 'pencil',
  'graduation', 'brain', 'laptop', 'briefcase', 'coins', 'file', 'palette', 'music',
  'guitar', 'zap', 'flame', 'gem', 'sparkle', 'moon', 'sun', 'sprout',
  'tree', 'droplet', 'apple', 'heart', 'book', 'check', 'gamepad', 'trophy',
  'medal', 'puzzle', 'flask',
];