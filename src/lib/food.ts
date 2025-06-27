
import type { FoodDataItem } from "@/types";

// Type definitions for the Nutritionix API responses
interface NutritionixBrandedFood {
    food_name: string;
    nix_item_id: string;
    serving_qty: number;
    serving_unit: string;
    serving_weight_grams: number | null;
    nf_calories: number | null;
    nf_total_fat: number | null;
    nf_total_carbohydrate: number | null;
    nf_protein: number | null;
    brand_name?: string;
}

interface NutritionixCommonFood {
    food_name: string;
    tag_id: string;
}

interface NutritionixSearchResponse {
    common: NutritionixCommonFood[];
    branded: NutritionixBrandedFood[];
}

interface NutritionixNaturalResponse {
    foods: {
        food_name: string;
        serving_qty: number;
        serving_unit: string;
        serving_weight_grams: number;
        nf_calories: number;
        nf_total_fat: number;
        nf_total_carbohydrate: number;
        nf_protein: number;
    }[];
}

// Function to search for foods using the Nutritionix Instant Search endpoint
export async function searchFoods(query: string): Promise<FoodDataItem[]> {
    const appId = process.env.NEXT_PUBLIC_NUTRITIONIX_APP_ID;
    const apiKey = process.env.NEXT_PUBLIC_NUTRITIONIX_API_KEY;

    if (!appId || !apiKey || appId === "YOUR_APP_ID_HERE" || apiKey === "YOUR_API_KEY_HERE") {
        console.error("Nutritionix API credentials are missing. Please add them to your .env file.");
        return [];
    }
    
    if (!query.trim()) {
        return [];
    }

    const API_URL = `https://trackapi.nutritionix.com/v2/search/instant?query=${encodeURIComponent(query)}`;

    try {
        const response = await fetch(API_URL, {
            headers: {
                'x-app-id': appId,
                'x-app-key': apiKey,
            }
        });

        if (!response.ok) {
            console.error("Failed to fetch from Nutritionix API:", response.statusText);
            return [];
        }

        const data: NutritionixSearchResponse = await response.json();
        
        const brandedResults: FoodDataItem[] = (data.branded || []).map(food => {
            const item: FoodDataItem = {
                id: food.nix_item_id,
                name: food.food_name,
                brandName: food.brand_name,
                dataType: 'branded',
                servingQty: food.serving_qty,
                servingUnit: food.serving_unit,
                servingWeightGrams: food.serving_weight_grams,
                caloriesPerServing: food.nf_calories ? Math.round(food.nf_calories) : undefined,
            };
            // Normalize nutrients to per 100g if possible
            if (food.serving_weight_grams && food.serving_weight_grams > 0) {
                const ratio = 100 / food.serving_weight_grams;
                item.calories = Math.round((food.nf_calories || 0) * ratio);
                item.protein = parseFloat(((food.nf_protein || 0) * ratio).toFixed(1));
                item.carbs = parseFloat(((food.nf_total_carbohydrate || 0) * ratio).toFixed(1));
                item.fats = parseFloat(((food.nf_total_fat || 0) * ratio).toFixed(1));
            }
            return item;
        }).filter(item => typeof item.calories !== 'undefined'); // Only include items where we could calculate calories

        const commonFoodPromises = (data.common || []).map(food => getCommonFoodDetails(food.food_name));
        const detailedCommonResults = (await Promise.all(commonFoodPromises)).filter((food): food is FoodDataItem => food !== null);

        // Deduplicate results based on capitalized name
        const uniqueResults = new Map<string, FoodDataItem>();
        const allResults = [...brandedResults, ...detailedCommonResults];

        allResults.forEach(item => {
            const capitalizedName = item.name.toUpperCase();
            if (!uniqueResults.has(capitalizedName)) {
                uniqueResults.set(capitalizedName, item);
            }
        });

        return Array.from(uniqueResults.values());


    } catch (error) {
        console.error("Error searching for foods with Nutritionix:", error);
        return [];
    }
}


// Function to get detailed nutritional info for a common food
export async function getCommonFoodDetails(foodName: string): Promise<FoodDataItem | null> {
    const appId = process.env.NEXT_PUBLIC_NUTRITIONIX_APP_ID;
    const apiKey = process.env.NEXT_PUBLIC_NUTRITIONIX_API_KEY;

    if (!appId || !apiKey || appId === "YOUR_APP_ID_HERE" || apiKey === "YOUR_API_KEY_HERE") {
        console.error("Nutritionix API credentials are missing.");
        return null;
    }
    
    const API_URL = `https://trackapi.nutritionix.com/v2/natural/nutrients`;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-app-id': appId,
                'x-app-key': apiKey,
            },
            // Use the food name directly, let Nutritionix parse it.
            body: JSON.stringify({ query: foodName }),
        });

        if (!response.ok) {
            console.error(`Failed to fetch details for '${foodName}' from Nutritionix API:`, response.statusText);
            return null;
        }

        const data: NutritionixNaturalResponse = await response.json();
        
        if (!data.foods || data.foods.length === 0) {
            return null;
        }

        const foodDetails = data.foods[0];
        
        const servingWeight = foodDetails.serving_weight_grams;
        if (!servingWeight || servingWeight === 0) {
            return null; // Can't normalize to 100g if we don't have a weight
        }
        
        const ratio = 100 / servingWeight;

        return {
            id: foodDetails.food_name, 
            name: foodDetails.food_name,
            dataType: 'common',
            
            // Per 100g values
            calories: Math.round((foodDetails.nf_calories || 0) * ratio),
            protein: parseFloat(((foodDetails.nf_protein || 0) * ratio).toFixed(1)),
            carbs: parseFloat(((foodDetails.nf_total_carbohydrate || 0) * ratio).toFixed(1)),
            fats: parseFloat(((foodDetails.nf_total_fat || 0) * ratio).toFixed(1)),

            // Original serving info from API
            servingQty: foodDetails.serving_qty,
            servingUnit: foodDetails.serving_unit,
            servingWeightGrams: foodDetails.serving_weight_grams,
            caloriesPerServing: Math.round(foodDetails.nf_calories || 0),
        };

    } catch (error) {
        console.error("Error getting food details:", error);
        return null;
    }
}
