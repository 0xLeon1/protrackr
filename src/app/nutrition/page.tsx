
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { FoodLogEntry, MacroGoals, Recipe } from '@/types';
import { startOfToday } from 'date-fns';
import MacroTracker from "@/components/protracker/MacroTracker";
import MealDiary from "@/components/protracker/MealDiary";
import RecipeBook from "@/components/protracker/RecipeBook";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, addDoc, deleteDoc, updateDoc, setDoc } from 'firebase/firestore';


export default function NutritionPage() {
  const [allMealLogs, setAllMealLogs] = useState<FoodLogEntry[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const { toast } = useToast();
  const { user, loading, dataVersion } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
        const fetchData = async () => {
            // Fetch Meal Logs
            const mealLogsCollection = collection(db, 'users', user.uid, 'meal-logs');
            const mealLogsSnapshot = await getDocs(mealLogsCollection);
            const logs = mealLogsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as FoodLogEntry));
            setAllMealLogs(logs);

            // Fetch Recipes
            const recipesCollection = collection(db, 'users', user.uid, 'recipes');
            const recipesSnapshot = await getDocs(recipesCollection);
            const userRecipes = recipesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Recipe));
            setRecipes(userRecipes);
        };
        fetchData();
    }
  }, [user, dataVersion]);

  const todaysLogs = useMemo(() => {
    const todayISO = startOfToday().toISOString();
    const todayDateString = todayISO.split('T')[0];
    return allMealLogs.filter(log => log.date.startsWith(todayDateString));
  }, [allMealLogs]);

  const handleAddMeal = async (meal: Omit<FoodLogEntry, 'id' | 'date'>) => {
    if (!user) return;
    
    const newLogEntryData = {
        ...meal,
        date: startOfToday().toISOString(),
    };
    
    const mealLogsCollection = collection(db, 'users', user.uid, 'meal-logs');
    const newDocRef = await addDoc(mealLogsCollection, newLogEntryData);
    
    const newLogEntry: FoodLogEntry = {
        ...newLogEntryData,
        id: newDocRef.id,
    };
    
    setAllMealLogs(prev => [...prev, newLogEntry]);
    toast({ title: "Food Logged", description: `Added "${meal.name}" to your diary.` });
  };

  const handleUpdateMeal = async (meal: FoodLogEntry) => {
    if (!user) return;
    const { id, ...mealData } = meal;
    const mealDocRef = doc(db, 'users', user.uid, 'meal-logs', id);
    await updateDoc(mealDocRef, mealData);
    setAllMealLogs(prev => prev.map(log => log.id === id ? meal : log));
    toast({ title: "Meal Updated", description: `Your entry for "${meal.name}" has been updated.` });
  };

  const handleDeleteMeal = async (mealId: string) => {
    if (!user) return;
    await deleteDoc(doc(db, 'users', user.uid, 'meal-logs', mealId));
    setAllMealLogs(prev => prev.filter(log => log.id !== mealId));
  };
  
  const handleSaveRecipe = async (recipe: Omit<Recipe, 'id'>) => {
    if (!user) return;
    const newRecipeData: Omit<Recipe, 'id'> = {
      name: recipe.name,
      servings: recipe.servings,
      ingredients: recipe.ingredients,
    };
    const newRecipeRef = doc(collection(db, 'users', user.uid, 'recipes'));
    await setDoc(newRecipeRef, newRecipeData);
    setRecipes([...recipes, { ...newRecipeData, id: newRecipeRef.id }]);
    toast({ title: "Recipe Saved", description: `"${recipe.name}" has been added to your recipes.` });
  };

  const handleUpdateRecipe = async (recipe: Recipe) => {
    if (!user) return;
    const { id, ...recipeData } = recipe;
    const recipeRef = doc(db, 'users', user.uid, 'recipes', id);
    await updateDoc(recipeRef, recipeData);
    setRecipes(recipes.map(r => r.id === id ? recipe : r));
    toast({ title: "Recipe Updated", description: `"${recipe.name}" has been updated.` });
  };
  
  const handleDeleteRecipe = async (recipeId: string) => {
    if (!user) return;
    await deleteDoc(doc(db, 'users', user.uid, 'recipes', recipeId));
    setRecipes(recipes.filter(r => r.id !== recipeId));
  };

  const currentIntake = useMemo(() => {
    return todaysLogs.reduce((acc, log) => ({
      calories: acc.calories + log.calories,
      protein: acc.protein + log.protein,
      carbs: acc.carbs + log.carbs,
      fats: acc.fats + log.fats,
    }), { calories: 0, protein: 0, carbs: 0, fats: 0 });
  }, [todaysLogs]);

  if (loading || !user) {
    return (
      <div className="flex justify-center items-center h-full min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <MacroTracker currentIntake={currentIntake} />
        </div>
        <div className="lg:col-span-2 space-y-6">
          <MealDiary 
            logs={todaysLogs} 
            onAddMeal={handleAddMeal} 
            onDeleteMeal={handleDeleteMeal}
            onUpdateMeal={handleUpdateMeal}
          />
          <RecipeBook 
            recipes={recipes}
            onAddMeal={handleAddMeal}
            onSaveRecipe={handleSaveRecipe}
            onUpdateRecipe={handleUpdateRecipe}
            onDeleteRecipe={handleDeleteRecipe}
          />
        </div>
      </div>
    </div>
  );
}
