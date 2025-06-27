
import type { FoodDataItem } from "@/types";

// A mock food database and search service.
// In a real app, this would be a call to an external API.

const mockFoodDatabase: FoodDataItem[] = [
    { id: 'food_1', name: 'Chicken Breast, grilled', calories: 165, protein: 31, carbs: 0, fats: 3.6 },
    { id: 'food_2', name: 'Brown Rice, cooked', calories: 123, protein: 2.7, carbs: 25.6, fats: 1 },
    { id: 'food_3', name: 'Olive Oil', calories: 884, protein: 0, carbs: 0, fats: 100 },
    { id: 'food_4', name: 'Apple, raw', calories: 52, protein: 0.3, carbs: 14, fats: 0.2 },
    { id: 'food_5', name: 'Banana, raw', calories: 89, protein: 1.1, carbs: 23, fats: 0.3 },
    { id: 'food_6', name: 'Salmon, baked', calories: 206, protein: 22, carbs: 0, fats: 12 },
    { id: 'food_7', name: 'Broccoli, steamed', calories: 35, protein: 2.4, carbs: 7.2, fats: 0.4 },
    { id: 'food_8', name: 'Almonds, raw', calories: 579, protein: 21, carbs: 22, fats: 49 },
    { id: 'food_9', name: 'Egg, large', calories: 155, protein: 13, carbs: 1.1, fats: 11 },
    { id: 'food_10', name: 'Whole Milk', calories: 61, protein: 3.2, carbs: 4.8, fats: 3.3 },
    { id: 'food_11', name: 'Greek Yogurt, plain, non-fat', calories: 59, protein: 10, carbs: 3.6, fats: 0.4 },
    { id: 'food_12', name: 'Oats, rolled', calories: 389, protein: 16.9, carbs: 66.3, fats: 6.9 },
    { id: 'food_13', name: 'White Bread', calories: 265, protein: 9, carbs: 49, fats: 3.2 },
    { id: 'food_14', name: 'Peanut Butter, smooth', calories: 588, protein: 25, carbs: 20, fats: 50 },
    { id: 'food_15', name: 'Cheddar Cheese', calories: 404, protein: 25, carbs: 1.3, fats: 33 },
];

export async function searchFoods(query: string): Promise<FoodDataItem[]> {
    if (!query) {
        return [];
    }
    const lowercasedQuery = query.toLowerCase();
    const results = mockFoodDatabase.filter(food => 
        food.name.toLowerCase().includes(lowercasedQuery)
    );
    // Simulate network delay
    return new Promise(resolve => setTimeout(() => resolve(results), 200));
}
