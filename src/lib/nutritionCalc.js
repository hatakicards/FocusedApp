// Professional BMR/TDEE/BMI calculation library
// Uses Harris-Benedict for normal/underweight, Mifflin-St. Jeor for overweight/obese

export const LIFESTYLE_LEVELS = [
  { id: 'sedentary', multiplier: 1.2 },
  { id: 'light', multiplier: 1.375 },
  { id: 'moderate', multiplier: 1.55 },
  { id: 'active', multiplier: 1.725 },
  { id: 'athlete', multiplier: 1.9 },
];

export const FITNESS_GOALS = ['lose', 'gain', 'maintain', 'personalized'];

export const GOAL_INTENSITIES = {
  light: { deficit: 300, label: 'light' },
  intense: { deficit: 500, label: 'intense' },
  drastic: { deficit: 800, label: 'drastic' },
};

export const BMI_CATEGORIES = [
  { id: 'underweight', min: 0, max: 18.4 },
  { id: 'normal', min: 18.5, max: 24.9 },
  { id: 'overweight', min: 25, max: 29.9 },
  { id: 'obese1', min: 30, max: 34.9 },
  { id: 'obese2', min: 35, max: 39.9 },
  { id: 'obese3', min: 40, max: 100 },
];

export function calculateBMI(weightKg, heightCm) {
  if (!weightKg || !heightCm) return null;
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

export function getBMICategory(bmi) {
  if (bmi == null) return null;
  return BMI_CATEGORIES.find((c) => bmi >= c.min && bmi <= c.max)?.id || 'obese3';
}

export function getAgeFromBirthDate(birthDate) {
  if (!birthDate) return null;
  const birth = new Date(birthDate + 'T00:00:00');
  if (isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

// Harris-Benedict formula
function harrisBenedict(sex, weightKg, heightCm, age) {
  if (sex === 'male') {
    return 66.5 + 13.75 * weightKg + 5.003 * heightCm - 6.755 * age;
  }
  return 655.1 + 9.563 * weightKg + 1.85 * heightCm - 4.676 * age;
}

// Mifflin-St. Jeor formula
function mifflinStJeor(sex, weightKg, heightCm, age) {
  if (sex === 'male') {
    return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  }
  return 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
}

export function calculateBMR(sex, weightKg, heightCm, age) {
  if (!sex || !weightKg || !heightCm || !age) return null;
  const bmi = calculateBMI(weightKg, heightCm);
  const bmiCat = getBMICategory(bmi);
  // Use Mifflin for overweight/obese, Harris-Benedict for normal/underweight
  if (bmiCat === 'overweight' || bmiCat?.startsWith('obese')) {
    return mifflinStJeor(sex, weightKg, heightCm, age);
  }
  return harrisBenedict(sex, weightKg, heightCm, age);
}

export function calculateTDEE(bmr, lifestyleLevel) {
  if (!bmr || !lifestyleLevel) return null;
  const level = LIFESTYLE_LEVELS.find((l) => l.id === lifestyleLevel);
  if (!level) return null;
  return bmr * level.multiplier;
}

export function calculateTargetCalories(tdee, goal, intensity) {
  if (!tdee) return null;
  if (goal === 'maintain' || goal === 'personalized') return Math.round(tdee);
  const intens = GOAL_INTENSITIES[intensity];
  if (!intens) return Math.round(tdee);
  if (goal === 'lose') return Math.round(tdee - intens.deficit);
  if (goal === 'gain') return Math.round(tdee + intens.deficit);
  return Math.round(tdee);
}

export function calculateMacros(targetCalories, weightKg, lifestyleLevel) {
  if (!targetCalories || !weightKg) return null;
  // Protein: varies by activity level (g per kg body weight)
  const proteinPerKg = {
    sedentary: 1.2,
    light: 1.4,
    moderate: 1.6,
    active: 1.8,
    athlete: 2.0,
  };
  const proteinGrams = Math.round(weightKg * (proteinPerKg[lifestyleLevel] || 1.4));
  const proteinKcal = proteinGrams * 4;

  // Fat: 25% of total calories
  const fatKcal = targetCalories * 0.25;
  const fatGrams = Math.round(fatKcal / 9);

  // Carbs: remaining calories
  const carbsKcal = targetCalories - proteinKcal - fatKcal;
  const carbsGrams = Math.round(carbsKcal / 4);

  return {
    protein: proteinGrams,
    fat: fatGrams,
    carbs: Math.max(0, carbsGrams),
  };
}

export function calculateNutritionPlan({ sex, age, weightKg, heightCm, lifestyleLevel, goal, intensity }) {
  const bmi = calculateBMI(weightKg, heightCm);
  const bmiCategory = getBMICategory(bmi);
  const bmr = calculateBMR(sex, weightKg, heightCm, age);
  const tdee = calculateTDEE(bmr, lifestyleLevel);
  const targetCalories = calculateTargetCalories(tdee, goal, intensity);
  const macros = calculateMacros(targetCalories, weightKg, lifestyleLevel);

  return {
    bmi: bmi ? Math.round(bmi * 10) / 10 : null,
    bmiCategory,
    bmr: bmr ? Math.round(bmr) : null,
    tdee: tdee ? Math.round(tdee) : null,
    targetCalories,
    protein: macros?.protein || 0,
    carbs: macros?.carbs || 0,
    fat: macros?.fat || 0,
  };
}