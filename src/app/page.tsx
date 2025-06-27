
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { FoodLogEntry, MacroGoals, WorkoutLogEntry, CheckinLogEntry } from '@/types';
import { startOfToday, startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';
import DailyCheckin from '@/components/protracker/DailyCheckin';
import ConsistencyTracker from '@/components/protracker/ConsistencyTracker';
import MacroRings from '@/components/protracker/MacroRings';
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';


const defaultGoals: MacroGoals = {
  calories: 2500,
  protein: 180,
  carbs: 250,
  fats: 70,
};

export default function HomePage() {
  const [allMealLogs, setAllMealLogs] = useState<FoodLogEntry[]>([]);
  const [goals, setGoals] = useState<MacroGoals>(defaultGoals);
  const [consistencyData, setConsistencyData] = useState({ checkinDays: 0, workoutDays: 0, nutritionDays: 0 });
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
        // Fetch Meal Logs for Macro Rings
        const mealLogsCollection = collection(db, 'users', user.uid, 'meal-logs');
        const mealLogsSnapshot = await getDocs(mealLogsCollection);
        const mealLogs = mealLogsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as FoodLogEntry));
        setAllMealLogs(mealLogs);

        // Fetch Macro Goals for Macro Rings
        const goalsDocRef = doc(db, 'users', user.uid, 'data', 'goals');
        const goalsDoc = await getDoc(goalsDocRef);
        if (goalsDoc.exists()) {
          setGoals(goalsDoc.data() as MacroGoals);
        } else {
          setGoals(defaultGoals);
        }

        // --- Fetch Data for Consistency Tracker ---
        const today = new Date();
        const weekStart = startOfWeek(today, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

        const getUniqueDaysInWeek = (logs: any[], dateKey: 'date' | 'completedAt'): number => {
          const uniqueDays = new Set<string>();
          logs.forEach(log => {
            const dateValue = log[dateKey];
            if (dateValue && typeof dateValue === 'string') {
              const logDate = parseISO(dateValue);
              if (isWithinInterval(logDate, { start: weekStart, end: weekEnd })) {
                uniqueDays.add(logDate.toISOString().split('T')[0]);
              }
            }
          });
          return uniqueDays.size;
        };

        // Check-ins
        const checkinsCollection = collection(db, 'users', user.uid, 'checkins');
        const checkinsSnapshot = await getDocs(checkinsCollection);
        const checkinLogs: CheckinLogEntry[] = checkinsSnapshot.docs.map(d => d.data() as CheckinLogEntry);
        const checkinDays = getUniqueDaysInWeek(checkinLogs, 'date');

        // Workouts
        const workoutLogsCollection = collection(db, 'users', user.uid, 'logs');
        const workoutLogsSnapshot = await getDocs(workoutLogsCollection);
        const workoutLogs: WorkoutLogEntry[] = workoutLogsSnapshot.docs.map(d => d.data() as WorkoutLogEntry);
        const workoutDays = getUniqueDaysInWeek(workoutLogs, 'completedAt');
        
        // Nutrition (using already fetched meal logs)
        const nutritionDays = getUniqueDaysInWeek(mealLogs, 'date');
        
        setConsistencyData({ checkinDays, workoutDays, nutritionDays });
      };
      
      fetchData();
    }
  }, [user, dataVersion]);

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
        <ConsistencyTracker 
          checkinDays={consistencyData.checkinDays}
          workoutDays={consistencyData.workoutDays}
          nutritionDays={consistencyData.nutritionDays}
        />
        <MacroRings currentIntake={currentIntake} goals={goals} />
      </div>
      <DailyCheckin />
    </div>
  );
}
