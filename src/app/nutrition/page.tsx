"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { FoodLogEntry } from '@/types';
import { startOfToday } from 'date-fns';
import MacroTracker from "@/components/protracker/MacroTracker";
import MealDiary from "@/components/protracker/MealDiary";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';

const exampleMealData: FoodLogEntry[] = [
    { id: 'food-1', date: startOfToday().toISOString(), mealType: 'Breakfast', name: 'Scrambled Eggs & Toast', calories: 329, protein: 19, carbs: 33, fats: 12 },
    { id: 'food-2', date: startOfToday().toISOString(), mealType: 'Lunch', name: 'Chicken Wrap', calories: 341, protein: 16, carbs: 26, fats: 18 }
];

export default function NutritionPage() {
  const [allMealLogs, setAllMealLogs] = useState<FoodLogEntry[]>([]);
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const todaysLogs = useMemo(() => {
    const todayISO = startOfToday().toISOString();
    const todayDateString = todayISO.split('T')[0];
    return allMealLogs.filter(log => log.date.startsWith(todayDateString));
  }, [allMealLogs]);

  useEffect(() => {
    if (user) {
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
    }
  }, [user]);

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
        <div className="lg:col-span-2">
          <MealDiary logs={todaysLogs} onAddMeal={handleAddMeal} onDeleteMeal={handleDeleteMeal} />
        </div>
      </div>
    </div>
  );
}
