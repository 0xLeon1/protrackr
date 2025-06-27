"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { FoodLogEntry, MacroGoals } from '@/types';
import { startOfToday } from 'date-fns';
import DailyCheckin from '@/components/protracker/DailyCheckin';
import ConsistencyTracker from '@/components/protracker/ConsistencyTracker';
import MacroRings from '@/components/protracker/MacroRings';
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';

const defaultGoals: MacroGoals = {
  calories: 2500,
  protein: 180,
  carbs: 250,
  fats: 70,
};

export default function HomePage() {
  const [allMealLogs, setAllMealLogs] = useState<FoodLogEntry[]>([]);
  const [goals, setGoals] = useState<MacroGoals>(defaultGoals);
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);
  
  useEffect(() => {
    if (user) {
      const storedLogs = localStorage.getItem('protracker-meal-logs');
      if (storedLogs) {
          try {
              setAllMealLogs(JSON.parse(storedLogs));
          } catch (e) {
              console.error("Failed to parse meal logs", e);
          }
      }

      const storedGoals = localStorage.getItem('protracker-macro-goals');
      if (storedGoals) {
        try {
          const parsedGoals = JSON.parse(storedGoals);
          setGoals(parsedGoals);
        } catch (e) {
          console.error("Failed to parse macro goals from localStorage", e);
        }
      }
    }
  }, [user]);

  const todaysLogs = useMemo(() => {
    const todayISO = startOfToday().toISOString();
    const todayDateString = todayISO.split('T')[0];
    return allMealLogs.filter(log => log.date.startsWith(todayDateString));
  }, [allMealLogs]);
  
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <div className="space-y-6">
        <ConsistencyTracker />
        <MacroRings currentIntake={currentIntake} goals={goals} />
      </div>
      <DailyCheckin />
    </div>
  );
}
