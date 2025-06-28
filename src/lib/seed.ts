
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
        // Use the food_id from your data as the document ID in Firestore
        const docRef = doc(foodCollectionRef, food.food_id);
        batch.set(docRef, food);
    });

    try {
        await batch.commit();
        return { success: true, message: `Successfully seeded ${foodDatabase.length} food items.` };
    } catch (error: any) {
        console.error("Error seeding database:", error);
        return { success: false, message: `Error seeding database: ${error.message}` };
    }
}
