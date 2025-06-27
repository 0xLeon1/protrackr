import type { FoodDataItem } from "@/types";

interface Nutrient {
    nutrientName: string;
    unitName: string;
    value: number;
}

interface FoodFromAPI {
    fdcId: number;
    description: string;
    foodNutrients: Nutrient[];
}

// A helper to safely find a nutrient from the array and return its value or 0
const getNutrientValue = (nutrients: Nutrient[], name: string): number => {
    // The nutrient names can vary slightly, so we check for common variations.
    const normalizedName = name.toLowerCase();
    const nutrient = nutrients.find(n => n.nutrientName.toLowerCase().includes(normalizedName));
    return nutrient ? nutrient.value : 0;
};

export async function searchFoods(query: string): Promise<FoodDataItem[]> {
    const apiKey = process.env.NEXT_PUBLIC_USDA_API_KEY;

    if (!apiKey || apiKey === "YOUR_API_KEY_HERE") {
        console.error("USDA API key is missing. Please add it to your .env file.");
        return [];
    }
    
    if (!query.trim()) {
        return [];
    }

    const API_URL = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}&query=${encodeURIComponent(query)}&dataType=Foundation,SR%20Legacy,Branded&pageSize=50`;

    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            console.error("Failed to fetch from USDA API:", response.statusText);
            return [];
        }

        const data = await response.json();
        
        const foods: FoodDataItem[] = (data.foods || []).map((food: FoodFromAPI) => ({
            id: String(food.fdcId),
            name: food.description,
            // All values from USDA API are per 100g serving
            calories: getNutrientValue(food.foodNutrients, 'Energy'),
            protein: getNutrientValue(food.foodNutrients, 'Protein'),
            carbs: getNutrientValue(food.foodNutrients, 'Carbohydrate, by difference'),
            fats: getNutrientValue(food.foodNutrients, 'Total lipid (fat)'),
        }));

        return foods;

    } catch (error) {
        console.error("Error searching for foods:", error);
        return [];
    }
}
