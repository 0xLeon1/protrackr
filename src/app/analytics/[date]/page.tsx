
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import type { FoodLogEntry, WorkoutLogEntry, BodyWeightLogEntry, SleepLogEntry, CheckinLogEntry } from '@/types';
import { format, parseISO } from 'date-fns';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Dumbbell, UtensilsCrossed, Scale, Bed, HeartPulse } from 'lucide-react';

interface DailyData {
  weight?: number;
  calories?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
  trained: boolean;
  sleep?: number;
  energy?: number;
}

export default function DailyAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading, dataVersion } = useAuth();

  const date = params.date as string; // YYYY-MM-DD
  const [data, setData] = useState<DailyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && date) {
      const fetchData = async () => {
        setIsLoading(true);
        try {
          const dayStart = new Date(date);
          // Adjust for timezone to make sure we query the correct UTC day
          dayStart.setMinutes(dayStart.getMinutes() + dayStart.getTimezoneOffset());
          dayStart.setHours(0, 0, 0, 0);

          const dayEnd = new Date(dayStart);
          dayEnd.setHours(23, 59, 59, 999);

          const isoStart = dayStart.toISOString();
          const isoEnd = dayEnd.toISOString();

          let dailyData: DailyData = { trained: false };

          // Fetch Body Weight
          const weightQuery = query(collection(db, 'users', user.uid, 'bodyweight-logs'), where('date', '>=', isoStart), where('date', '<=', isoEnd));
          const weightSnapshot = await getDocs(weightQuery);
          if (!weightSnapshot.empty) {
            const weightLog = weightSnapshot.docs[0].data() as BodyWeightLogEntry;
            dailyData.weight = weightLog.weight;
          }

          // Fetch Meal Logs for nutrition
          const mealQuery = query(collection(db, 'users', user.uid, 'meal-logs'), where('date', '>=', isoStart), where('date', '<=', isoEnd));
          const mealSnapshot = await getDocs(mealQuery);
          if (!mealSnapshot.empty) {
            const nutrition = mealSnapshot.docs.reduce((acc, doc) => {
              const log = doc.data() as FoodLogEntry;
              acc.calories += log.calories;
              acc.protein += log.protein;
              acc.carbs += log.carbs;
              acc.fats += log.fats;
              return acc;
            }, { calories: 0, protein: 0, carbs: 0, fats: 0 });
            dailyData.calories = Math.round(nutrition.calories);
            dailyData.protein = Math.round(nutrition.protein);
            dailyData.carbs = Math.round(nutrition.carbs);
            dailyData.fats = Math.round(nutrition.fats);
          }
          
          // Fetch workout logs to check if trained
          const workoutQuery = query(collection(db, 'users', user.uid, 'logs'), where('completedAt', '>=', isoStart), where('completedAt', '<=', isoEnd));
          const workoutSnapshot = await getDocs(workoutQuery);
          dailyData.trained = !workoutSnapshot.empty;
          
          // Fetch sleep logs
          const sleepQuery = query(collection(db, 'users', user.uid, 'sleep-logs'), where('date', '>=', isoStart), where('date', '<=', isoEnd));
          const sleepSnapshot = await getDocs(sleepQuery);
          if (!sleepSnapshot.empty) {
            const sleepLog = sleepSnapshot.docs[0].data() as SleepLogEntry;
            dailyData.sleep = sleepLog.hours;
          }
          
          // Fetch checkin data for energy level
          const checkinQuery = query(collection(db, 'users', user.uid, 'checkins'), where('date', '>=', isoStart), where('date', '<=', isoEnd));
          const checkinSnapshot = await getDocs(checkinQuery);
          if (!checkinSnapshot.empty) {
              const checkinLog = checkinSnapshot.docs[0].data() as CheckinLogEntry;
              dailyData.energy = checkinLog.energy;
          }
          
          setData(dailyData);

        } catch (error) {
          console.error("Error fetching daily data:", error);
        } finally {
          setIsLoading(false);
        }
      };

      fetchData();
    }
  }, [user, date, router, dataVersion]);

  if (isLoading || authLoading || !user) {
    return (
      <div className="flex justify-center items-center h-full min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const formattedDate = format(parseISO(date), 'MMMM d, yyyy');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.push('/analytics')}>
            <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
            <h1 className="text-3xl font-bold">Daily Summary</h1>
            <p className="text-muted-foreground">{formattedDate}</p>
        </div>
      </div>
      
      {data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Body Weight</CardTitle>
                    <Scale className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{data.weight ? `${data.weight} lbs` : 'Not Logged'}</div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Calories Consumed</CardTitle>
                    <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{data.calories ? `${data.calories.toLocaleString()} kcal` : 'Not Logged'}</div>
                    {data.calories ? (
                        <p className="text-xs text-muted-foreground">
                            P: {data.protein}g, C: {data.carbs}g, F: {data.fats}g
                        </p>
                    ) : (
                        <p className="text-xs text-muted-foreground">No meals logged.</p>
                    )}
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Training Status</CardTitle>
                    <Dumbbell className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className={`text-2xl font-bold ${data.trained ? 'text-green-500' : 'text-orange-500'}`}>
                        {data.trained ? 'Trained' : 'Rest Day'}
                    </div>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Sleep</CardTitle>
                    <Bed className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{data.sleep ? `${data.sleep} hours` : 'Not Logged'}</div>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Energy Level</CardTitle>
                    <HeartPulse className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{typeof data.energy !== 'undefined' ? `${data.energy} / 5` : 'Not Logged'}</div>
                </CardContent>
            </Card>

        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">No data found for this day.</p>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
