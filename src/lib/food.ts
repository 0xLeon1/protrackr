
import type { FoodDataItem, Serving } from "@/types";

// --- FatSecret API Implementation ---

const FATSECRET_CREDENTIALS_ERROR = "FatSecret API is not configured. Please add your credentials to the .env file.";

interface FatSecretToken {
  access_token: string;
  expires_in: number;
  retrieved_at: number; // timestamp in seconds
}

let token: FatSecretToken | null = null;

function areCredentialsMissing(): boolean {
    const clientId = process.env.NEXT_PUBLIC_FATSECRET_CLIENT_ID;
    const clientSecret = process.env.NEXT_PUBLIC_FATSECRET_CLIENT_SECRET;
    return !clientId || !clientSecret || clientId === "YOUR_CLIENT_ID_HERE" || clientSecret === "YOUR_SECRET_KEY_HERE";
}


async function getFatSecretAccessToken(): Promise<string> {
    if (areCredentialsMissing()) {
        throw new Error(FATSECRET_CREDENTIALS_ERROR);
    }
    const clientId = process.env.NEXT_PUBLIC_FATSECRET_CLIENT_ID;
    const clientSecret = process.env.NEXT_PUBLIC_FATSECRET_CLIENT_SECRET;

    // Check if we have a valid, non-expired token
    if (token && (token.retrieved_at + token.expires_in) > (Date.now() / 1000 + 60)) {
        return token.access_token;
    }

    // If not, fetch a new one
    const response = await fetch('https://oauth.platform.fatsecret.com/connect/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            'grant_type': 'client_credentials',
            'scope': 'basic',
            'client_id': clientId!,
            'client_secret': clientSecret!,
        }),
    });

    if (!response.ok) {
        console.error("FatSecret auth error:", await response.text());
        throw new Error('Could not authenticate with FatSecret API. Check your credentials.');
    }

    const tokenData = await response.json();
    token = { ...tokenData, retrieved_at: Date.now() / 1000 };
    return token!.access_token;
}

// Search for foods
export async function searchFoods(query: string): Promise<FoodDataItem[]> {
    if (!query.trim()) return [];
    if (areCredentialsMissing()) {
      throw new Error(FATSECRET_CREDENTIALS_ERROR);
    }

    try {
        const accessToken = await getFatSecretAccessToken();
        const searchUrl = `https://platform.fatsecret.com/rest/server.api?method=foods.search&search_expression=${encodeURIComponent(query)}&format=json`;

        const response = await fetch(searchUrl, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!response.ok) {
            // Don't throw for search errors, just return empty
            console.error("FatSecret search error:", await response.text());
            return [];
        }

        const data = await response.json();

        if (data.error) {
            console.error("FatSecret API error:", data.error.message);
            return [];
        }

        const foods = data.foods?.food;
        if (!foods) {
            return [];
        }
        
        const foodsArray = Array.isArray(foods) ? foods : [foods];

        const results: FoodDataItem[] = foodsArray.map((food: any): FoodDataItem | null => {
            return {
                id: food.food_id,
                name: food.food_name,
                brandName: food.brand_name,
                dataType: food.food_type === 'Branded' ? 'branded' : 'common',
                description: food.food_description,
            };
        }).filter((item): item is FoodDataItem => item !== null);

        return results;

    } catch (error) {
        if (error instanceof Error && error.message.includes("FatSecret")) {
            throw error; // Re-throw errors related to credentials etc.
        }
        console.error("Error searching FatSecret:", error);
        return [];
    }
}

interface FatSecretServing {
    calories: string;
    carbohydrate: string;
    fat: string;
    protein: string;
    serving_description: string;
    serving_id: string;
    serving_url: string;
    measurement_description: string;
    metric_serving_amount?: string;
    metric_serving_unit?: string;
    number_of_units: string;
}

// Get detailed info for a single food
export async function getFoodDetails(foodId: string): Promise<FoodDataItem | null> {
    if (areCredentialsMissing()) {
      throw new Error(FATSECRET_CREDENTIALS_ERROR);
    }
    
    try {
        const accessToken = await getFatSecretAccessToken();
        const detailsUrl = `https://platform.fatsecret.com/rest/server.api?method=food.get.v2&food_id=${foodId}&format=json`;

        const response = await fetch(detailsUrl, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch details for food ID ${foodId}.`);
        }

        const data = await response.json();
        const food = data.food;
        
        if (!food) {
            throw new Error(`No food data returned for ID ${foodId}.`);
        }
        
        const servingsList: FatSecretServing[] = Array.isArray(food.servings?.serving) ? food.servings.serving : food.servings?.serving ? [food.servings.serving] : [];

        const mappedServings: Serving[] = servingsList.map(s => ({
            id: s.serving_id,
            name: s.serving_description,
            calories: parseFloat(s.calories),
            protein: parseFloat(s.protein),
            carbs: parseFloat(s.carbohydrate),
            fats: parseFloat(s.fat),
            weightGrams: s.metric_serving_amount ? parseFloat(s.metric_serving_amount) : undefined,
        }));
        
        return {
            id: food.food_id,
            name: food.food_name,
            brandName: food.brand_name,
            dataType: food.food_type === 'Branded' ? 'branded' : 'common',
            servings: mappedServings,
        };

    } catch (error) {
         if (error instanceof Error) {
            throw error; // Re-throw known errors
        }
        console.error(`Error getting FatSecret details for foodId ${foodId}:`, error);
        throw new Error(`An unexpected error occurred while fetching food details.`);
    }
}
