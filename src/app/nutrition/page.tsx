"use client";

import { useState, useEffect, useMemo } from 'react';
import type { FoodLogEntry } from '@/types';
import { startOfToday, startOfDay } from 'date-fns';
import MacroTracker from "@/components/protracker/MacroTracker";
import MealDiary from "@/components/protracker/MealDiary";
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

const exampleMealData: FoodLogEntry[] = [
    { id: 'food-1', date: startOfToday().toISOString(), mealType: 'Breakfast', name: 'Scrambled Eggs & Toast', calories: 329, protein: 19, carbs: 33, fats: 12 },
    { id: 'food-2', date: startOfToday().toISOString(), mealType: 'Lunch', name: 'Chicken Wrap', calories: 341, protein: 16, carbs: 26, fats: 18 }
];

export default function NutritionPage() {
  const [allMealLogs, setAllMealLogs] = useState<FoodLogEntry[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const { toast } = useToast();

  const todaysLogs = useMemo(() => {
    const todayISO = startOfToday().toISOString();
    const todayDateString = todayISO.split('T')[0];
    return allMealLogs.filter(log => log.date.startsWith(todayDateString));
  }, [allMealLogs]);

  useEffect(() => {
    const storedLogs = localStorage.getItem('protracker-meal-logs');
    if (storedLogs) {
        try {
            setAllMealLogs(JSON.parse(storedLogs));
        } catch (e) {
            console.error("Failed to parse meal logs", e);
            setAllMealLogs(exampleMealData);
        }
    } else {
        setAllMealLogs(exampleMealData);
        localStorage.setItem('protracker-meal-logs', JSON.stringify(exampleMealData));
    }
    
    const finalizedDateStr = localStorage.getItem('protracker-nutrition-finalized-date');
    if (finalizedDateStr) {
        try {
            const lastFinalizedDate = startOfDay(new Date(JSON.parse(finalizedDateStr)));
            if (lastFinalizedDate.getTime() === startOfToday().getTime()) {
                setIsLocked(true);
            }
        } catch (e) {
            console.error("Failed to parse finalized date", e);
        }
    }
  }, []);

  const updateMealLogs = (newLogs: FoodLogEntry[]) => {
    setAllMealLogs(newLogs);
    localStorage.setItem('protracker-meal-logs', JSON.stringify(newLogs));
  }

  const handleAddMeal = (meal: Omit<FoodLogEntry, 'id' | 'date'>) => {
    if (isLocked) {
        toast({ title: "Nutrition Locked", description: "You have already finalized your nutrition for today.", variant: "destructive" });
        return;
    }
    const newLogEntry: FoodLogEntry = {
        ...meal,
        id: `food-${Date.now()}`,
        date: startOfToday().toISOString(),
    };
    updateMealLogs([...allMealLogs, newLogEntry]);
  };

  const handleDeleteMeal = (mealId: string) => {
     if (isLocked) {
        toast({ title: "Nutrition Locked", description: "You have already finalized your nutrition for today.", variant: "destructive" });
        return;
    }
    updateMealLogs(allMealLogs.filter(log => log.id !== mealId));
  };
  
  const handleFinalizeNutrition = () => {
    if (todaysLogs.length === 0) {
        const dummyEntry: Omit<FoodLogEntry, 'id' | 'date'> = {
            mealType: 'Other',
            name: 'Daily Nutrition Tracked',
            calories: 0,
            protein: 0,
            carbs: 0,
            fats: 0,
        };
        const newLogEntry: FoodLogEntry = {
            ...dummyEntry,
            id: `food-${Date.now()}`,
            date: startOfToday().toISOString(),
        };
        updateMealLogs([...allMealLogs, newLogEntry]);
    }

    localStorage.setItem('protracker-nutrition-finalized-date', JSON.stringify(new Date().toISOString()));
    setIsLocked(true);
    
    toast({
        title: "Nutrition Finalized!",
        description: "Your nutrition for today has been logged and locked."
    });
  };

  const currentIntake = useMemo(() => {
    return todaysLogs.reduce((acc, log) => ({
      calories: acc.calories + log.calories,
      protein: acc.protein + log.protein,
      carbs: acc.carbs + log.carbs,
      fats: acc.fats + log.fats,
    }), { calories: 0, protein: 0, carbs: 0, fats: 0 });
  }, [todaysLogs]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <MacroTracker currentIntake={currentIntake} />
        </div>
        <div className="lg:col-span-2">
          <MealDiary logs={todaysLogs} onAddMeal={handleAddMeal} onDeleteMeal={handleDeleteMeal} isLocked={isLocked}/>
        </div>
      </div>
      
      <div className="flex justify-center pt-8">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="lg" className="w-full max-w-sm text-lg" disabled={isLocked}>
              {isLocked ? "Nutrition Logged for Today" : "I am done eating!"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Finalize Your Nutrition?</AlertDialogTitle>
              <AlertDialogDescription>
                This will lock your meal diary for the rest of the day. You will not be able to make any changes. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleFinalizeNutrition} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Yes, I'm Done
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
