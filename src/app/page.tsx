
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { FoodLogEntry, WeeklyMacroGoal, WorkoutLogEntry, CheckinLogEntry } from '@/types';
import { startOfToday, startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';
import DailyCheckin from '@/components/protracker/DailyCheckin';
import ConsistencyTracker from '@/components/protracker/ConsistencyTracker';
import MacroRings from '@/components/protracker/MacroRings';
import { useAuth } from '@/contexts/auth-context';
import { Loader2, Zap } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import NutritionPlanSetup from '@/components/protracker/NutritionPlanSetup';

export default function HomePage() {
  const [allMealLogs, setAllMealLogs] = useState<FoodLogEntry[]>([]);
  const [consistencyData, setConsistencyData] = useState({ checkinDays: 0, workoutDays: 0, nutritionDays: 0 });
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  
  const { user, profile, loading, dataVersion, currentGoals, refreshData } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);
  
  useEffect(() => {
    if (user && profile?.hasCompletedMacroSetup) {
      const fetchData = async () => {
        // Fetch Meal Logs for Macro Rings
        const mealLogsCollection = collection(db, 'users', user.uid, 'meal-logs');
        const mealLogsSnapshot = await getDocs(mealLogsCollection);
        const mealLogs = mealLogsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as FoodLogEntry));
        setAllMealLogs(mealLogs);

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
  }, [user, profile?.hasCompletedMacroSetup, dataVersion]);

  const todaysLogs = useMemo(() => {
    if (!profile?.hasCompletedMacroSetup) return [];
    const todayISO = startOfToday().toISOString();
    const todayDateString = todayISO.split('T')[0];
    return allMealLogs.filter(log => log.date.startsWith(todayDateString));
  }, [allMealLogs, profile?.hasCompletedMacroSetup]);
  
  const currentIntake = useMemo(() => {
    return todaysLogs.reduce((acc, log) => ({
      calories: acc.calories + log.calories,
      protein: acc.protein + log.protein,
      carbs: acc.carbs + log.carbs,
      fats: acc.fats + log.fats,
    }), { calories: 0, protein: 0, carbs: 0, fats: 0 });
  }, [todaysLogs]);

  if (loading || !user || !profile) {
    return (
      <div className="flex justify-center items-center h-full min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile.hasCompletedMacroSetup) {
    return (
        <>
            <div className="flex justify-center items-center h-full min-h-[50vh]">
                <Card className="w-full max-w-lg text-center">
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold">Welcome, {profile.name}!</CardTitle>
                        <CardDescription className="text-base">Let's create your personalized nutrition plan to kickstart your transformation.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button size="lg" onClick={() => setIsSetupOpen(true)}>
                            <Zap className="mr-2 h-5 w-5"/>
                            Set Up My Plan
                        </Button>
                    </CardContent>
                </Card>
            </div>
            <NutritionPlanSetup 
                isOpen={isSetupOpen} 
                onClose={() => setIsSetupOpen(false)} 
                onPlanSet={() => {
                    refreshData();
                    setIsSetupOpen(false);
                }}
            />
        </>
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
        {currentGoals && <MacroRings currentIntake={currentIntake} goals={currentGoals} />}
      </div>
      <DailyCheckin />
    </div>
  );
}
