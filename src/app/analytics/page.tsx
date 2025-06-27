
"use client";

import { useEffect, useState, useMemo } from "react";
import type { WorkoutLogEntry, BodyWeightLogEntry, FoodLogEntry, CheckinLogEntry, SleepLogEntry } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, Tooltip, LabelList, YAxis, LineChart, Line, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { format, startOfWeek, parseISO, endOfWeek, eachDayOfInterval, isWithinInterval } from 'date-fns';
import { History, TrendingUp, Scale, Bed, Loader2, List } from "lucide-react";
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
  const [dailyVolume, setDailyVolume] = useState<DailyVolume[]>([]);
  const [bodyWeightLogs, setBodyWeightLogs] = useState<BodyWeightLogEntry[]>([]);
  const [sleepLogs, setSleepLogs] = useState<SleepLogEntry[]>([]);
  const [weeklySleep, setWeeklySleep] = useState<DailySleep[]>([]);
  const [currentWeight, setCurrentWeight] = useState('');
  const [checkinDays, setCheckinDays] = useState(0);
  const [workoutDays, setWorkoutDays] = useState(0);
  const [nutritionDays, setNutritionDays] = useState(0);
  const [weeklyAdherence, setWeeklyAdherence] = useState(0);
  const { user, loading } = useAuth();
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
        const nutritionCount = getUniqueDaysInWeek(mealLogs, 'date');
        setNutritionDays(nutritionCount);

        // Adherence
        const totalActivities = checkinsCount + workoutsCount + nutritionCount;
        const adherencePercentage = totalActivities > 0 ? Math.round((totalActivities / (3 * 7)) * 100) : 0;
        setWeeklyAdherence(adherencePercentage);
      };
      fetchData();
    }
  }, [user]);

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
    }
  };

  const hasLiftedThisWeek = dailyVolume.some(d => d.volume > 0);
  const hasSleptThisWeek = weeklySleep.some(d => d.hours > 0);

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
      
      <Card>
        <CardHeader>
          <CardTitle>Workout History</CardTitle>
          <CardDescription>Review your past training sessions.</CardDescription>
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
  );
}
