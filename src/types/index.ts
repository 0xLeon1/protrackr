
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

  // Fields for editing and recalculation
  servingAmount: number;
  servingUnit: string;
  foodDetails: FoodDataItem | null; // Details of the base food, null if custom entry
};

export interface FoodDataItem {
    id: string;
    name: string;
    brandName?: string;
    description?: string;
    // Macros per 100g
    calories?: number;
    protein?: number;
    carbs?: number;
    fats?: number;
    dataType: 'branded' | 'common';
    // Optional serving info
    servingQty?: number;
    servingUnit?: string;
    servingWeightGrams?: number;
    caloriesPerServing?: number;
}
