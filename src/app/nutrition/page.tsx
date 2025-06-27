"use client";

import { useState, useEffect, useMemo } from 'react';
import type { FoodLogEntry } from '@/types';
import { startOfToday, startOfDay } from 'date-fns';
import MacroTracker from "@/components/protracker/MacroTracker";
import MealDiary from "@/components/protracker/MealDiary";
import { useToast } from "@/hooks/use-toast";

const exampleMealData: FoodLogEntry[] = [
    { id: 'food-1', date: startOfToday().toISOString(), mealType: 'Breakfast', name: 'Scrambled Eggs & Toast', calories: 329, protein: 19, carbs: 33, fats: 12 },
    { id: 'food-2', date: startOfToday().toISOString(), mealType: 'Lunch', name: 'Chicken Wrap', calories: 341, protein: 16, carbs: 26, fats: 18 }
];

export default function NutritionPage() {
  const [allMealLogs, setAllMealLogs] = useState<FoodLogEntry[]>([]);
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
  }, []);

  const updateMealLogs = (newLogs: FoodLogEntry[]) => {
    setAllMealLogs(newLogs);
    localStorage.setItem('protracker-meal-logs', JSON.stringify(newLogs));
  }

  const handleAddMeal = (meal: Omit<FoodLogEntry, 'id' | 'date'>) => {
    const newLogEntry: FoodLogEntry = {
        ...meal,
        id: `food-${Date.now()}`,
        date: startOfToday().toISOString(),
    };
    updateMealLogs([...allMealLogs, newLogEntry]);
  };

  const handleDeleteMeal = (mealId: string) => {
    updateMealLogs(allMealLogs.filter(log => log.id !== mealId));
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
          <MealDiary logs={todaysLogs} onAddMeal={handleAddMeal} onDeleteMeal={handleDeleteMeal} />
        </div>
      </div>
    </div>
  );
}
