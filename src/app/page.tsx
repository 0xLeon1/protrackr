"use client";

import { useState, useEffect, useMemo } from 'react';
import type { FoodLogEntry, MacroGoals } from '@/types';
import { startOfToday } from 'date-fns';
import DailyCheckin from '@/components/protracker/DailyCheckin';
import ConsistencyTracker from '@/components/protracker/ConsistencyTracker';
import MacroRings from '@/components/protracker/MacroRings';

const defaultGoals: MacroGoals = {
  calories: 2500,
  protein: 180,
  carbs: 250,
  fats: 70,
};

export default function HomePage() {
  const [allMealLogs, setAllMealLogs] = useState<FoodLogEntry[]>([]);
  const [goals, setGoals] = useState<MacroGoals>(defaultGoals);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);

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
  }, []);

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


  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <div className="space-y-6">
        <ConsistencyTracker />
        {isClient && <MacroRings currentIntake={currentIntake} goals={goals} />}
      </div>
      <DailyCheckin />
    </div>
  );
}
