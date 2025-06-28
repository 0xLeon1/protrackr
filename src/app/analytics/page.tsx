
"use client";

import { useEffect, useState, useMemo } from "react";
import type { WorkoutLogEntry, BodyWeightLogEntry, FoodLogEntry, CheckinLogEntry, SleepLogEntry, CardioLogEntry, UserProfile } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, Tooltip, LabelList, YAxis, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { format, startOfWeek, parseISO, endOfWeek, eachDayOfInterval, isWithinInterval } from 'date-fns';
import { History, TrendingUp, Scale, Bed, Loader2, List, UtensilsCrossed, Zap, User as UserIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, doc, setDoc } from "firebase/firestore";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";


interface DailyVolume {
  day: string;
  volume: number;
}
interface DailySleep {
  day: string;
  hours: number;
}
interface DailyCalories {
  day: string;
  calories: number;
}
interface DailyMacros {
  day: string;
  protein: number;
  carbs: number;
  fats: number;
}


const renderCustomizedLabel = (props: any) => {
  const { x, y, width, value } = props;

  if (value === 0 || !value) {
    return null;
  }
  
  const isFloat = value % 1 !== 0;
  const formattedValue = value > 1000 ? `${(value / 1000).toFixed(1)}k` : (isFloat ? value.toFixed(1) : value.toString());

  return (
    <text x={x + width / 2} y={y} dy={-4} className="fill-foreground" fontSize={12} textAnchor="middle">
      {formattedValue}
    </text>
  );
};


export default function AnalyticsPage() {
  const [logs, setLogs] = useState<WorkoutLogEntry[]>([]);
  const [cardioLogs, setCardioLogs] = useState<CardioLogEntry[]>([]);
  const [dailyVolume, setDailyVolume] = useState<DailyVolume[]>([]);
  const [bodyWeightLogs, setBodyWeightLogs] = useState<BodyWeightLogEntry[]>([]);
  const [sleepLogs, setSleepLogs] = useState<SleepLogEntry[]>([]);
  const [weeklySleep, setWeeklySleep] = useState<DailySleep[]>([]);
  const [weeklyCalories, setWeeklyCalories] = useState<DailyCalories[]>([]);
  const [weeklyMacros, setWeeklyMacros] = useState<DailyMacros[]>([]);
  const [isMacroDetailOpen, setIsMacroDetailOpen] = useState(false);
  const [currentWeight, setCurrentWeight] = useState('');
  const [checkinDays, setCheckinDays] = useState(0);
  const [workoutDays, setWorkoutDays] = useState(0);
  const [nutritionDays, setNutritionDays] = useState(0);
  const [weeklyAdherence, setWeeklyAdherence] = useState(0);
  const { user, profile, loading, dataVersion } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      const fetchData = async () => {
        // --- Workout Logs ---
        const workoutLogsCollection = collection(db, 'users', user.uid, 'logs');
        const workoutLogsSnapshot = await getDocs(workoutLogsCollection);
        const workoutLogs: WorkoutLogEntry[] = workoutLogsSnapshot.docs.map(doc => ({ ...doc.data(), logId: doc.id } as WorkoutLogEntry));
        const sortedLogs = [...workoutLogs].sort((a, b) => parseISO(b.completedAt).getTime() - parseISO(a.completedAt).getTime());
        setLogs(sortedLogs);
        calculateDailyVolume(sortedLogs);
        
        // --- Cardio Logs ---
        const cardioLogsCollection = collection(db, 'users', user.uid, 'cardio-logs');
        const cardioLogsSnapshot = await getDocs(cardioLogsCollection);
        const userCardioLogs: CardioLogEntry[] = cardioLogsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as CardioLogEntry));
        const sortedCardioLogs = [...userCardioLogs].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
        setCardioLogs(sortedCardioLogs);
        
        // --- Body Weight Logs ---
        const bodyWeightCollection = collection(db, 'users', user.uid, 'bodyweight-logs');
        const bodyWeightSnapshot = await getDocs(bodyWeightCollection);
        const userBodyWeightLogs: BodyWeightLogEntry[] = bodyWeightSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as BodyWeightLogEntry));
        const sortedBodyWeight = [...userBodyWeightLogs].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
        setBodyWeightLogs(sortedBodyWeight);

        // --- Sleep Logs ---
        const sleepLogsCollection = collection(db, 'users', user.uid, 'sleep-logs');
        const sleepLogsSnapshot = await getDocs(sleepLogsCollection);
        const userSleepLogs: SleepLogEntry[] = sleepLogsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as SleepLogEntry));
        setSleepLogs(userSleepLogs);
        calculateWeeklySleep(userSleepLogs);

        // --- Weekly Adherence Data ---
        const today = new Date();
        const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
        const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

        const getUniqueDaysInWeek = (logs: any[], dateKey: 'date' | 'completedAt'): number => {
          if (!logs) return 0;
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
        const checkinLogs: CheckinLogEntry[] = checkinsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as CheckinLogEntry));
        const checkinsCount = getUniqueDaysInWeek(checkinLogs, 'date');
        setCheckinDays(checkinsCount);

        // Workouts
        const workoutsCount = getUniqueDaysInWeek(workoutLogs, 'completedAt');
        setWorkoutDays(workoutsCount);
        
        // Nutrition
        const mealLogsCollection = collection(db, 'users', user.uid, 'meal-logs');
        const mealLogsSnapshot = await getDocs(mealLogsCollection);
        const mealLogs: FoodLogEntry[] = mealLogsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as FoodLogEntry));
        
        const weeklyMealLogs = mealLogs.filter(log => {
            if (!log.date) return false;
            const logDate = parseISO(log.date);
            return isWithinInterval(logDate, { start: weekStart, end: weekEnd });
        });

        const nutritionCount = getUniqueDaysInWeek(mealLogs, 'date');
        setNutritionDays(nutritionCount);
        calculateWeeklyCalories(weeklyMealLogs);
        calculateWeeklyMacros(weeklyMealLogs);

        // Adherence
        const totalActivities = checkinsCount + workoutsCount + nutritionCount;
        const adherencePercentage = totalActivities > 0 ? Math.round((totalActivities / (3 * 7)) * 100) : 0;
        setWeeklyAdherence(adherencePercentage);
      };
      fetchData();
    }
  }, [user, dataVersion]);

  const bodyWeightChartData = useMemo(() => {
    if (bodyWeightLogs.length < 2) return [];
    return [...bodyWeightLogs]
        .reverse() // Sort logs from oldest to newest for the chart
        .map(log => ({
            fullDate: log.date.split('T')[0], // YYYY-MM-DD
            date: format(parseISO(log.date), 'MMM d'),
            weight: log.weight,
        }));
  }, [bodyWeightLogs]);

  const calculateDailyVolume = (allLogs: WorkoutLogEntry[]) => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

    let volumeDataForWeek: DailyVolume[] = daysInWeek.map(day => ({
      day: format(day, 'E'), // Mon, Tue, etc.
      volume: 0,
    }));
    
    allLogs.forEach(log => {
      const logDate = parseISO(log.completedAt);
      if (isWithinInterval(logDate, { start: weekStart, end: weekEnd })) {
        const dayOfWeek = format(logDate, 'E');
        const dayIndex = volumeDataForWeek.findIndex(d => d.day === dayOfWeek);

        if (dayIndex !== -1) {
          const workoutVolume = log.workoutSnapshot.exercises.reduce((totalVolume, exercise) => {
            const exerciseVolume = exercise.performance?.reduce((total, set) => {
              if (set.completed) {
                const reps = typeof set.reps === 'number' ? set.reps : 0;
                const weight = typeof set.weight === 'number' ? set.weight : 0;
                return total + (reps * weight);
              }
              return total;
            }, 0) || 0;
            return totalVolume + exerciseVolume;
          }, 0);
          volumeDataForWeek[dayIndex].volume += workoutVolume;
        }
      }
    });
    
    setDailyVolume(volumeDataForWeek);
  };
  
  const calculateWeeklyCalories = (weeklyLogs: FoodLogEntry[]) => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

    let calorieDataForWeek: DailyCalories[] = daysInWeek.map(day => ({
        day: format(day, 'E'),
        calories: 0,
    }));

    if (weeklyLogs.length > 0) {
        weeklyLogs.forEach(log => {
            if (log.date) {
                const logDate = parseISO(log.date);
                const dayOfWeek = format(logDate, 'E');
                const dayIndex = calorieDataForWeek.findIndex(d => d.day === dayOfWeek);

                if (dayIndex !== -1) {
                    calorieDataForWeek[dayIndex].calories += log.calories;
                }
            }
        });
    }
    setWeeklyCalories(calorieDataForWeek.map(d => ({ ...d, calories: Math.round(d.calories) })));
  };
  
  const calculateWeeklyMacros = (weeklyLogs: FoodLogEntry[]) => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

    let macroDataForWeek: DailyMacros[] = daysInWeek.map(day => ({
        day: format(day, 'E'),
        protein: 0,
        carbs: 0,
        fats: 0,
    }));

    if (weeklyLogs.length > 0) {
        weeklyLogs.forEach(log => {
            if (log.date) {
                const logDate = parseISO(log.date);
                const dayOfWeek = format(logDate, 'E');
                const dayIndex = macroDataForWeek.findIndex(d => d.day === dayOfWeek);

                if (dayIndex !== -1) {
                    macroDataForWeek[dayIndex].protein += log.protein;
                    macroDataForWeek[dayIndex].carbs += log.carbs;
                    macroDataForWeek[dayIndex].fats += log.fats;
                }
            }
        });
    }

    setWeeklyMacros(macroDataForWeek.map(d => ({ 
        ...d,
        protein: Math.round(d.protein),
        carbs: Math.round(d.carbs),
        fats: Math.round(d.fats),
    })));
  };

  const calculateWeeklySleep = (allLogs: SleepLogEntry[]) => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

    let sleepDataForWeek: DailySleep[] = daysInWeek.map(day => ({
        day: format(day, 'E'),
        hours: 0,
    }));

    allLogs.forEach(log => {
        if (log.date) {
            const logDate = parseISO(log.date);
            if (isWithinInterval(logDate, { start: weekStart, end: weekEnd })) {
                const dayOfWeek = format(logDate, 'E');
                const dayIndex = sleepDataForWeek.findIndex(d => d.day === dayOfWeek);

                if (dayIndex !== -1) {
                    sleepDataForWeek[dayIndex].hours = log.hours;
                }
            }
        }
    });
    setWeeklySleep(sleepDataForWeek);
  };

  const handleAddBodyWeight = async () => {
    if (!user) return;
    const weight = parseFloat(currentWeight);
    if (!isNaN(weight) && weight > 0) {
        const newEntryData = {
            weight: weight,
            date: new Date().toISOString(),
        };
        const bodyWeightCollection = collection(db, 'users', user.uid, 'bodyweight-logs');
        const newDocRef = await addDoc(bodyWeightCollection, newEntryData);
        
        const newEntry: BodyWeightLogEntry = {
            ...newEntryData,
            id: newDocRef.id,
        };
        
        setBodyWeightLogs(prev => [newEntry, ...prev].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()));
        setCurrentWeight('');
    }
  };

  const handleChartClick = (e: any) => {
    if (e && e.activePayload && e.activePayload.length > 0) {
        const date = e.activePayload[0].payload.fullDate;
        if (date) {
            router.push(`/analytics/${date}`);
        }
    }
  };
  
  const weeklyMacroCaloriesChartData = useMemo(() => {
    return weeklyMacros.map(dayData => {
        const proteinCals = Math.round(dayData.protein * 4);
        const carbsCals = Math.round(dayData.carbs * 4);
        const fatsCals = Math.round(dayData.fats * 9);
        return {
            day: dayData.day,
            protein: proteinCals,
            carbs: carbsCals,
            fats: fatsCals,
            total: proteinCals + carbsCals + fatsCals,
        };
    });
  }, [weeklyMacros]);
  
  const chartConfig = {
    volume: {
      label: "Volume (lbs)",
      color: "hsl(var(--accent))",
    },
    weight: {
        label: "Weight (lbs)",
        color: "hsl(var(--primary))",
    },
    sleep: {
        label: "Sleep (hours)",
        color: "hsl(var(--chart-3))",
    },
    calories: {
        label: "Calories (kcal)",
        color: "hsl(var(--chart-1))",
    },
    protein: {
        label: "Protein",
        color: "hsl(var(--chart-1))",
    },
    carbs: {
        label: "Carbs",
        color: "hsl(var(--chart-2))",
    },
    fats: {
        label: "Fats",
        color: "hsl(var(--chart-4))",
    }
  };

  const hasLiftedThisWeek = dailyVolume.some(d => d.volume > 0);
  const hasSleptThisWeek = weeklySleep.some(d => d.hours > 0);
  const hasConsumedThisWeek = weeklyCalories.some(d => d.calories > 0);

  if (loading || !user) {
    return (
      <div className="flex justify-center items-center h-full min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">Your performance overview.</p>
      </header>
      
      {profile && (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <UserIcon className="h-5 w-5 text-primary"/>
                    Your Profile
                </CardTitle>
                <CardDescription>This is the profile information you provided at sign up.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
                    <div className="space-y-1">
                        <p className="text-muted-foreground">Name</p>
                        <p className="font-medium">{profile.name}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-muted-foreground">Age</p>
                        <p className="font-medium">{profile.age}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-muted-foreground">Sex</p>
                        <p className="font-medium capitalize">{profile.sex}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-muted-foreground">Start Weight</p>
                        <p className="font-medium">{profile.initialWeight} lbs</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-muted-foreground">Goal Weight</p>
                        <p className="font-medium">{profile.goalWeight} lbs</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-muted-foreground">Experience</p>
                        <p className="font-medium capitalize">{profile.experience}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-muted-foreground">Target Date</p>
                        <p className="font-medium">{format(parseISO(profile.targetDate), 'MMM d, yyyy')}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
            <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-1">
                <p className="text-4xl font-bold text-accent">{checkinDays}</p>
                <p className="text-sm text-muted-foreground">Check-in Days</p>
            </CardContent>
        </Card>
        <Card>
            <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-1">
                <p className="text-4xl font-bold text-accent">{workoutDays}</p>
                <p className="text-sm text-muted-foreground">Workout Days</p>
            </CardContent>
        </Card>
        <Card>
            <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-1">
                <p className="text-4xl font-bold text-accent">{nutritionDays}</p>
                <p className="text-sm text-muted-foreground">Nutrition Days</p>
            </CardContent>
        </Card>
        <Card>
            <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-1">
                <p className="text-4xl font-bold text-accent">{weeklyAdherence}%</p>
                <p className="text-sm text-muted-foreground">Weekly Adherence</p>
            </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
            <CardHeader>
            <CardTitle>This Week's Volume</CardTitle>
            <CardDescription>Your total lifted volume for the current week.</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
            {hasLiftedThisWeek ? (
                <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
                <BarChart accessibilityLayer data={dailyVolume} margin={{ top: 30, right: 10, left: 10, bottom: 5 }}>
                    <XAxis
                    dataKey="day"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    />
                    <YAxis hide domain={[0, 'dataMax + 500']}/>
                    <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent 
                        formatter={(value) => `${Number(value).toLocaleString()} lbs`}
                        indicator="dot"
                        nameKey="volume"
                        />}
                    />
                    <Bar dataKey="volume" fill="var(--color-volume)" radius={[8, 8, 0, 0]}>
                        <LabelList dataKey="volume" content={renderCustomizedLabel} />
                    </Bar>
                </BarChart>
                </ChartContainer>
            ) : (
                <div className="flex flex-col items-center justify-center p-12 text-center h-[250px]">
                <TrendingUp className="w-16 h-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                    Complete a workout to see your volume chart.
                </p>
                </div>
            )}
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
            <CardTitle>This Week's Calories</CardTitle>
            <CardDescription>Your daily calorie intake. Click the chart for a macro breakdown.</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
            {hasConsumedThisWeek ? (
                <div className="cursor-pointer" onClick={() => setIsMacroDetailOpen(true)}>
                    <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
                    <BarChart accessibilityLayer data={weeklyCalories} margin={{ top: 30, right: 10, left: 10, bottom: 5 }}>
                        <XAxis
                            dataKey="day"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                        />
                        <YAxis hide domain={[0, 'dataMax + 500']}/>
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent 
                                formatter={(value) => `${Number(value).toLocaleString()} kcal`}
                                indicator="dot"
                                nameKey="calories"
                                />}
                        />
                        <Bar dataKey="calories" fill="var(--color-calories)" radius={[8, 8, 0, 0]}>
                            <LabelList dataKey="calories" content={renderCustomizedLabel} />
                        </Bar>
                    </BarChart>
                    </ChartContainer>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center p-12 text-center h-[250px]">
                <UtensilsCrossed className="w-16 h-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                    Log a meal to see your calorie chart.
                </p>
                </div>
            )}
            </CardContent>
        </Card>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div>
                        <CardTitle>Body Weight Trend</CardTitle>
                        <CardDescription>Log your weight to track changes. Click a point to see details.</CardDescription>
                    </div>
                     <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="icon" className="shrink-0">
                                <List className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Full Weight History</DialogTitle>
                                <DialogDescription>
                                    All your recorded body weight entries, sorted by most recent.
                                </DialogDescription>
                            </DialogHeader>
                            <ScrollArea className="h-72">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead className="text-right">Weight (lbs)</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {bodyWeightLogs.map(log => (
                                            <TableRow key={log.id}>
                                                <TableCell>{format(parseISO(log.date), 'MMM d, yyyy')}</TableCell>
                                                <TableCell className="text-right font-medium">{log.weight.toFixed(1)} lbs</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent>
                    <div className="h-[180px] -ml-2 pr-2">
                        {bodyWeightLogs.length > 1 ? (
                            <ChartContainer config={chartConfig} className="w-full h-full cursor-pointer">
                                <LineChart
                                    data={bodyWeightChartData}
                                    margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
                                    onClick={handleChartClick}
                                >
                                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="date"
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={8}
                                        fontSize={12}
                                    />
                                    <YAxis 
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={8}
                                        fontSize={12}
                                        domain={['dataMin - 5', 'dataMax + 5']}
                                    />
                                    <ChartTooltip
                                        cursor={false}
                                        content={<ChartTooltipContent 
                                            formatter={(value) => [`${value} lbs`, 'Weight']}
                                            indicator="dot"
                                            />}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="weight"
                                        stroke="var(--color-weight)"
                                        strokeWidth={2}
                                        dot={{
                                            fill: "var(--color-weight)",
                                            r: 3
                                        }}
                                        activeDot={{ r: 5 }}
                                    />
                                </LineChart>
                            </ChartContainer>
                        ) : (
                            <div className="flex flex-col items-center justify-center text-center h-full">
                                <Scale className="w-12 h-12 text-muted-foreground mb-4" />
                                <p className="text-sm text-muted-foreground">Log at least two entries to see your trendline.</p>
                            </div>
                        )}
                    </div>
                    <Separator className="my-4" />
                    <div className="flex gap-2">
                        <Input 
                            type="number"
                            placeholder="Enter weight in lbs"
                            value={currentWeight}
                            onChange={(e) => setCurrentWeight(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddBodyWeight()}
                        />
                        <Button onClick={handleAddBodyWeight}>Save</Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>This Week's Sleep</CardTitle>
                    <CardDescription>Your nightly sleep duration for the current week.</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                    {hasSleptThisWeek ? (
                        <ChartContainer config={chartConfig} className="h-[250px] w-full">
                        <BarChart accessibilityLayer data={weeklySleep} margin={{ top: 30, right: 10, left: 10, bottom: 5 }}>
                            <XAxis
                                dataKey="day"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                            />
                            <YAxis hide domain={[0, 12]}/>
                            <ChartTooltip
                                cursor={false}
                                content={<ChartTooltipContent 
                                    formatter={(value) => `${Number(value).toFixed(1)} hours`}
                                    indicator="dot"
                                    nameKey="hours"
                                    />}
                            />
                            <Bar dataKey="hours" fill="var(--color-sleep)" radius={[8, 8, 0, 0]}>
                                <LabelList dataKey="hours" content={renderCustomizedLabel} />
                            </Bar>
                        </BarChart>
                        </ChartContainer>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-12 text-center h-[250px]">
                            <Bed className="w-16 h-16 text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">
                                Log your sleep via the Daily Check-in to see your sleep chart.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                    <CardTitle>Cardio History</CardTitle>
                    <CardDescription>Review your past cardio sessions.</CardDescription>
                </div>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="icon" className="shrink-0">
                            <List className="h-4 w-4" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Full Cardio History</DialogTitle>
                            <DialogDescription>All your recorded cardio sessions, sorted by most recent.</DialogDescription>
                        </DialogHeader>
                        <ScrollArea className="h-72">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Modality</TableHead>
                                        <TableHead className="text-right">Duration</TableHead>
                                        <TableHead className="text-right">Calories</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {cardioLogs.map(log => (
                                        <TableRow key={log.id}>
                                            <TableCell>{format(parseISO(log.date), 'MMM d, yyyy')}</TableCell>
                                            <TableCell>{log.modality}</TableCell>
                                            <TableCell className="text-right">{log.duration} min</TableCell>
                                            <TableCell className="text-right">{log.calories} kcal</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </DialogContent>
                </Dialog>
            </CardHeader>
          <CardContent>
            {cardioLogs.length > 0 ? (
              <Accordion type="multiple" className="w-full space-y-2">
                {cardioLogs.map((log) => (
                  <AccordionItem value={log.id} key={log.id} className="border rounded-lg bg-card hover:bg-muted/50 transition-colors">
                    <AccordionTrigger className="px-4 text-base font-medium hover:no-underline">
                      <div className="flex flex-col items-start text-left">
                          <span className="font-semibold flex items-center gap-2"><Zap className="h-4 w-4 text-primary"/>{log.modality}</span>
                      </div>
                      <span className="text-sm text-muted-foreground mr-4 font-normal">{format(parseISO(log.date), 'MMM d, yyyy')}</span>
                    </AccordionTrigger>
                    <AccordionContent className="p-4 bg-background rounded-b-lg">
                      <div className="flex justify-around text-center">
                          <div>
                              <p className="text-muted-foreground text-sm">Duration</p>
                              <p className="font-semibold text-lg">{log.duration} min</p>
                          </div>
                          <div>
                              <p className="text-muted-foreground text-sm">Calories</p>
                              <p className="font-semibold text-lg">{log.calories} kcal</p>
                          </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <Zap className="w-16 h-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Your completed cardio sessions will appear here.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                    <CardTitle>Workout History</CardTitle>
                    <CardDescription>Review your past training sessions.</CardDescription>
                </div>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="icon" className="shrink-0">
                            <List className="h-4 w-4" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Full Workout History</DialogTitle>
                            <DialogDescription>All your completed workouts, sorted by most recent.</DialogDescription>
                        </DialogHeader>
                        <ScrollArea className="h-72">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Workout</TableHead>
                                        <TableHead>Program</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {logs.map(log => (
                                        <TableRow key={log.logId}>
                                            <TableCell>{format(parseISO(log.completedAt), 'MMM d, yyyy')}</TableCell>
                                            <TableCell className="font-medium">{log.workoutSnapshot.name}</TableCell>
                                            <TableCell>{log.programName}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </DialogContent>
                </Dialog>
            </CardHeader>
          <CardContent>
            {logs.length > 0 ? (
              <Accordion type="multiple" className="w-full space-y-2">
                {logs.map((log) => (
                  <AccordionItem value={log.logId} key={log.logId} className="border rounded-lg bg-card hover:bg-muted/50 transition-colors">
                    <AccordionTrigger className="px-4 text-base font-medium hover:no-underline">
                      <div className="flex flex-col items-start text-left">
                          <span className="font-semibold">{log.workoutSnapshot.name}</span>
                          <span className="text-sm text-muted-foreground">{log.programName}</span>
                      </div>
                      <span className="text-sm text-muted-foreground mr-4 font-normal">{format(parseISO(log.completedAt), 'MMM d, yyyy')}</span>
                    </AccordionTrigger>
                    <AccordionContent className="p-2 md:p-4 bg-background rounded-b-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-2/5">Exercise</TableHead>
                            <TableHead className="text-center">Set</TableHead>
                            <TableHead className="text-center">Reps</TableHead>
                            <TableHead className="text-center">Weight (lbs)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {log.workoutSnapshot.exercises.map((exercise) => {
                            const completedSets = exercise.performance?.filter(set => set.completed) || [];
                            if (completedSets.length === 0) return null;

                            return completedSets.map((set, setIndex) => (
                              <TableRow key={`${exercise.id}-${set.id}`}>
                                {setIndex === 0 ? (
                                  <TableCell rowSpan={completedSets.length} className="font-medium align-top pt-4">
                                    {exercise.name}
                                  </TableCell>
                                ) : null}
                                <TableCell className="text-center">{setIndex + 1}</TableCell>
                                <TableCell className="text-center">{set.reps}</TableCell>
                                <TableCell className="text-center">{set.weight}</TableCell>
                              </TableRow>
                            ))
                          })}
                        </TableBody>
                      </Table>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <History className="w-16 h-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Your completed workouts will appear here.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isMacroDetailOpen} onOpenChange={setIsMacroDetailOpen}>
        <DialogContent className="max-w-3xl">
            <DialogHeader>
                <DialogTitle>Weekly Macro Breakdown</DialogTitle>
                <DialogDescription>
                    Caloric contribution from protein, carbs, and fats each day this week.
                </DialogDescription>
            </DialogHeader>
            <div className="pt-4">
                <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
                    <BarChart accessibilityLayer data={weeklyMacroCaloriesChartData} margin={{ top: 30, right: 10, left: -10, bottom: 5 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="day"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                        />
                        <YAxis tickFormatter={(value) => `${Number(value).toLocaleString()}`} />
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent formatter={(value, name, item) => (
                                <div className="flex w-full justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-2.5 h-2.5 rounded-sm"
                                            style={{ backgroundColor: item.color }}
                                        />
                                        <span className="text-muted-foreground">{name}</span>
                                    </div>
                                    <span className="font-mono font-medium tabular-nums text-foreground">
                                        {Number(value).toLocaleString()} kcal
                                    </span>
                                </div>
                            )} />}
                        />
                        <Legend content={<ChartLegendContent />} />
                        <Bar dataKey="protein" stackId="a" fill="var(--color-protein)" name="Protein" />
                        <Bar dataKey="carbs" stackId="a" fill="var(--color-carbs)" name="Carbs" />
                        <Bar dataKey="fats" stackId="a" fill="var(--color-fats)" radius={[4, 4, 0, 0]} name="Fats">
                           <LabelList dataKey="total" content={renderCustomizedLabel} />
                        </Bar>
                    </BarChart>
                </ChartContainer>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
