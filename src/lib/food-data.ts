
import type { FoodDBItem } from '@/types';

// This file contains the initial food data to be seeded into your Firestore database.
// You can add more food items to this array by following the same format.
// After adding data, go to the /nutrition page and click the "Seed Food Database" button.

export const foodDatabase: FoodDBItem[] = [
  {
    food_id: 'chicken_breast_grilled_0',
    name: 'Chicken Breast (Grilled)',
    category: 'Protein',
    serving_size: '100g',
    calories: 165,
    protein_g: 31,
    carbs_g: 0,
    fat_g: 3.6,
    fiber_g: 0,
    common_names: [ 'grilled chicken', 'chicken breast' ],
    unit_conversions: { '1 piece (120g)': 1.2, '1 oz': 0.28 }
  },
  {
    food_id: 'white_rice_cooked_0',
    name: 'White Rice (Cooked)',
    category: 'Carb',
    serving_size: '100g',
    calories: 130,
    protein_g: 2.4,
    carbs_g: 28,
    fat_g: 0.3,
    fiber_g: 0.4,
    common_names: [ 'white rice' ],
    unit_conversions: { '1 cup': 1.58 }
  },
  {
    food_id: 'banana_0',
    name: 'Banana',
    category: 'Fruit',
    serving_size: '100g',
    calories: 89,
    protein_g: 1.1,
    carbs_g: 23,
    fat_g: 0.3,
    fiber_g: 2.6,
    common_names: [ 'banana' ],
    unit_conversions: { '1 medium (118g)': 1.18 }
  },
  {
    food_id: 'whole_egg_0',
    name: 'Egg (Whole)',
    category: 'Protein',
    serving_size: '1 large',
    calories: 72,
    protein_g: 6.3,
    carbs_g: 0.4,
    fat_g: 4.8,
    fiber_g: 0,
    common_names: [ 'egg', 'whole egg' ],
    unit_conversions: { '100g': 2 }
  },
  {
    food_id: 'broccoli_steamed_0',
    name: 'Broccoli (Steamed)',
    category: 'Vegetable',
    serving_size: '100g',
    calories: 35,
    protein_g: 2.4,
    carbs_g: 7,
    fat_g: 0.4,
    fiber_g: 3.3,
    common_names: [ 'broccoli' ],
    unit_conversions: { '1 cup': 1.56 }
  }
];
