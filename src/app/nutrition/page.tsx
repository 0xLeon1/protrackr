
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { FoodLogEntry, MacroGoals } from '@/types';
import { startOfToday } from 'date-fns';
import MacroTracker from "@/components/protracker/MacroTracker";
import MealDiary from "@/components/protracker/MealDiary";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, addDoc, deleteDoc } from 'firebase/firestore';

const defaultGoals: MacroGoals = {
  calories: 2500,
  protein: 180,
  carbs: 250,
  fats: 70,
};

export default function NutritionPage() {
  const [allMealLogs, setAllMealLogs] = useState<FoodLogEntry[]>([]);
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
        const fetchMealLogs = async () => {
            const mealLogsCollection = collection(db, 'users', user.uid, 'meal-logs');
            const mealLogsSnapshot = await getDocs(mealLogsCollection);
            const logs = mealLogsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as FoodLogEntry));
            setAllMealLogs(logs);
        };
        fetchMealLogs();
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
  };

  const handleDeleteMeal = async (mealId: string) => {
    if (!user) return;
    await deleteDoc(doc(db, 'users', user.uid, 'meal-logs', mealId));
    setAllMealLogs(prev => prev.filter(log => log.id !== mealId));
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
