

export type SetPerformance = {
  id: string;
  reps: number | '';
  weight: number | '';
  completed: boolean;
};

export type Exercise = {
  id:string;
  name: string;
  sets: number | '';
  reps: number | '';
  weight: number | '';
  notes: string;
  performance?: SetPerformance[];
};

export type Workout = {
  id:string;
  name: string;
  exercises: Exercise[];
};

export type Program = {
  id: string;
  name: string;
  workouts: Workout[];
};

export type WorkoutLogEntry = {
    logId: string;
    workoutId: string;
    programName: string;
    completedAt: string;
    workoutSnapshot: Workout;
};

export type BodyWeightLogEntry = {
  id: string;
  weight: number;
  date: string; // ISO String
};

export type CheckinLogEntry = {
  id: string;
  date: string; // ISO String
  energy: number;
  trained: boolean;
  hitMacros: boolean;
};

export type SleepLogEntry = {
  id: string;
  date: string; // ISO String
  hours: number;
};

export type MacroGoals = {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
};

export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks' | 'Other';

export type FoodLogEntry = {
  id: string;
  date: string; // ISO string for the day
  mealType: MealType;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  // Fields for editing
  foodId?: string | null;
  quantity: number;
  servingUnit: string;
  customBaseMacros?: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  } | null;
};

export type RecipeIngredient = {
  id: string; 
  name: string;
  quantity: number;
  servingUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  foodId?: string | null;
  customBaseMacros?: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  } | null;
};

export type Recipe = {
  id: string;
  name: string;
  servings: number;
  ingredients: RecipeIngredient[];
};


export type FoodDBItem = {
    food_id: string;
    name: string;
    category: string;
    serving_size: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
    common_names: string[];
    unit_conversions: { [key: string]: number };
    search_terms?: string[];
};



