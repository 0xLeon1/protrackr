
"use client";

import { useEffect, useState } from "react";
import type { WorkoutLogEntry, BodyWeightLogEntry } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, Tooltip, LabelList, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { format, startOfWeek, parseISO, endOfWeek, eachDayOfInterval, isWithinInterval } from 'date-fns';
import { History, TrendingUp, Scale } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface DailyVolume {
  day: string;
  volume: number;
}

const renderCustomizedLabel = (props: any) => {
  const { x, y, width, value } = props;

  if (value === 0) {
    return null;
  }

  const formattedValue = value > 1000 ? `${(value / 1000).toFixed(1)}k` : value.toString();

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
  const [currentWeight, setCurrentWeight] = useState('');

  useEffect(() => {
    // Load Workout Logs
    const storedLogs = localStorage.getItem('protracker-logs');
    if (storedLogs) {
      try {
        const parsedLogs: WorkoutLogEntry[] = JSON.parse(storedLogs);
        const sortedLogs = parsedLogs.sort((a, b) => parseISO(b.completedAt).getTime() - parseISO(a.completedAt).getTime());
        setLogs(sortedLogs);
        calculateDailyVolume(sortedLogs);
      } catch (error) {
        console.error("Failed to parse logs from localStorage", error);
      }
    }
    
    // Load Body Weight Logs
    const storedBodyWeight = localStorage.getItem('protracker-bodyweight');
    if (storedBodyWeight) {
        try {
            const parsedBodyWeight: BodyWeightLogEntry[] = JSON.parse(storedBodyWeight);
            const sortedBodyWeight = parsedBodyWeight.sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
            setBodyWeightLogs(sortedBodyWeight);
        } catch (e) {
            console.error("Failed to parse body weight logs", e);
        }
    }
  }, []);

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

  const handleAddBodyWeight = () => {
    const weight = parseFloat(currentWeight);
    if (!isNaN(weight) && weight > 0) {
        const newEntry: BodyWeightLogEntry = {
            id: `bw-${Date.now()}`,
            weight: weight,
            date: new Date().toISOString(),
        };
        const updatedLogs = [newEntry, ...bodyWeightLogs];
        setBodyWeightLogs(updatedLogs);
        localStorage.setItem('protracker-bodyweight', JSON.stringify(updatedLogs));
        setCurrentWeight('');
    }
  };
  
  const chartConfig = {
    volume: {
      label: "Volume (lbs)",
      color: "hsl(var(--accent))",
    },
  };

  const hasLiftedThisWeek = dailyVolume.some(d => d.volume > 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">Your performance overview.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
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
                <CardTitle>Body Weight</CardTitle>
                <CardDescription>Log your weight to track changes.</CardDescription>
            </CardHeader>
            <CardContent>
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
                <Separator className="my-4" />
                <div className="space-y-3 max-h-[190px] overflow-y-auto pr-2">
                    {bodyWeightLogs.length > 0 ? (
                        bodyWeightLogs.map(log => (
                            <div key={log.id} className="flex justify-between items-center text-sm bg-muted/50 p-2 rounded-md">
                                <p><span className="font-semibold">{log.weight}</span> lbs</p>
                                <p className="text-muted-foreground">{format(parseISO(log.date), 'MMM d, yyyy')}</p>
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center pt-8 text-center">
                            <Scale className="w-12 h-12 text-muted-foreground mb-4" />
                            <p className="text-sm text-muted-foreground">No weight entries yet.</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
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
