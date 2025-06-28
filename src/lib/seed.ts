
'use server';

import { db } from './firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { foodDatabase } from './food-data';

export async function seedFoodDatabase() {
    if (!db) {
        throw new Error("Firebase is not initialized.");
    }
    
    const foodCollectionRef = collection(db, 'foods');
    const batch = writeBatch(db);

    foodDatabase.forEach((food) => {
        // Generate search terms
        const nameTerms = food.name.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(' ');
        const commonNameTerms = food.common_names.flatMap(name => name.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(' '));
        const search_terms = [...new Set([...nameTerms, ...commonNameTerms])].filter(term => term.length > 0);
        
        const foodWithSearchTerms = { ...food, search_terms };

        // Use the food_id from your data as the document ID in Firestore
        const docRef = doc(foodCollectionRef, food.food_id);
        batch.set(docRef, foodWithSearchTerms);
    });

    try {
        await batch.commit();
        return { success: true, message: `Successfully seeded ${foodDatabase.length} food items with search terms.` };
    } catch (error: any) {
        console.error("Error seeding database:", error);
        return { success: false, message: `Error seeding database: ${error.message}` };
    }
}
