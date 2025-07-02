
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { FoodLogEntry, WorkoutLogEntry, CheckinLogEntry } from '@/types';
import { startOfToday, startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';
import DailyCheckin from '@/components/protracker/DailyCheckin';
import ConsistencyTracker from '@/components/protracker/ConsistencyTracker';
import MacroRings from '@/components/protracker/MacroRings';
import { useAuth } from '@/contexts/auth-context';
import { Loader2, Unlock } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import NutritionPlanSetup from '@/components/protracker/NutritionPlanSetup';

export default function HomePage() {
  const [allMealLogs, setAllMealLogs] = useState<FoodLogEntry[]>([]);
  const [consistencyData, setConsistencyData] = useState({ checkinDays: 0, workoutDays: 0, nutritionDays: 0 });
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  
  const { user, profile, loading, dataVersion, currentGoals, refreshData } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      const fetchData = async () => {
        // Fetch Meal Logs for Macro Rings & Consistency
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
  }, [user, dataVersion]);

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

  const welcomeMessage = useMemo(() => {
    if (!user) return "";
    if (!profile) return "Welcome!";

    const creationTime = user.metadata.creationTime ? new Date(user.metadata.creationTime).getTime() : 0;
    const lastSignInTime = user.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).getTime() : 0;
    
    if (lastSignInTime - creationTime < 60000) {
        return `Welcome, ${profile.name}!`;
    } else {
        return `Welcome back, ${profile.name}!`;
    }
  }, [user, profile]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // This case is handled by the redirect in AuthContext, but as a fallback
    return null;
  }
  
  const needsSetup = !profile || !profile.hasCompletedMacroSetup;

  return (
    <div className="space-y-6">
       {needsSetup ? (
        <div>
          <h1 className="text-3xl font-bold">{welcomeMessage}</h1>
          <p className="text-muted-foreground">To get started, let's create your personalized nutrition plan.</p>
        </div>
      ) : (
        <div>
          <h1 className="text-3xl font-bold">{welcomeMessage}</h1>
          <p className="text-muted-foreground">Here's your dashboard for today.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="space-y-6">
          <ConsistencyTracker 
            checkinDays={consistencyData.checkinDays}
            workoutDays={consistencyData.workoutDays}
            nutritionDays={consistencyData.nutritionDays}
          />
          {needsSetup ? (
            <div className="relative rounded-lg overflow-hidden border">
                {/* The content to be blurred */}
                <div className="blur-sm pointer-events-none">
                    <MacroRings 
                        currentIntake={{ calories: 0, protein: 0, carbs: 0, fats: 0 }}
                        goals={{ week: 1, calories: 2000, protein: 150, carbs: 200, fats: 67 }}
                    />
                </div>

                {/* The overlay with the button */}
                <div className="absolute inset-0 flex items-center justify-center bg-background/30">
                    <Button size="lg" className="w-auto" onClick={() => setIsSetupOpen(true)}>
                        <Unlock className="mr-2 h-5 w-5"/>
                        Build Your Meal Plan
                    </Button>
                </div>
            </div>
          ) : (
            currentGoals && <MacroRings currentIntake={currentIntake} goals={currentGoals} />
          )}
        </div>
        <DailyCheckin />
      </div>
      <NutritionPlanSetup 
          isOpen={isSetupOpen && needsSetup} 
          onClose={() => setIsSetupOpen(false)} 
          onPlanSet={() => {
              refreshData();
              setIsSetupOpen(false);
          }}
      />
    </div>
  );
}
