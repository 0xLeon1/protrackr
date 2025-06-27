
"use client";

import { useEffect, useState } from "react";
import type { WorkoutLogEntry } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, Tooltip, LabelList } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { format, startOfWeek, parseISO } from 'date-fns';
import { History, TrendingUp } from "lucide-react";

interface WeeklyVolume {
  week: string;
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
  const [weeklyVolume, setWeeklyVolume] = useState<WeeklyVolume[]>([]);

  useEffect(() => {
    const storedLogs = localStorage.getItem('protracker-logs');
    if (storedLogs) {
      try {
        const parsedLogs: WorkoutLogEntry[] = JSON.parse(storedLogs);
        const sortedLogs = parsedLogs.sort((a, b) => parseISO(b.completedAt).getTime() - parseISO(a.completedAt).getTime());
        setLogs(sortedLogs);
        calculateWeeklyVolume(sortedLogs);
      } catch (error) {
        console.error("Failed to parse logs from localStorage", error);
      }
    }
  }, []);

  const calculateWeeklyVolume = (allLogs: WorkoutLogEntry[]) => {
    if (allLogs.length === 0) return;
    
    const volumeByWeek: { [key: string]: { volume: number, date: Date } } = {};

    allLogs.forEach(log => {
      const date = parseISO(log.completedAt);
      const weekStartDate = startOfWeek(date, { weekStartsOn: 1 });
      const weekKey = format(weekStartDate, 'yyyy-MM-dd');

      if (!volumeByWeek[weekKey]) {
        volumeByWeek[weekKey] = { volume: 0, date: weekStartDate };
      }

      let workoutVolume = 0;
      log.workoutSnapshot.exercises.forEach(exercise => {
        exercise.performance?.forEach(set => {
          if (set.completed) {
            const reps = typeof set.reps === 'number' ? set.reps : 0;
            const weight = typeof set.weight === 'number' ? set.weight : 0;
            workoutVolume += reps * weight;
          }
        });
      });
      volumeByWeek[weekKey].volume += workoutVolume;
    });

    const sortedWeeks = Object.keys(volumeByWeek).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    const formattedVolumeData = sortedWeeks.map(weekKey => ({
        week: format(volumeByWeek[weekKey].date, 'MMM d'),
        volume: volumeByWeek[weekKey].volume
    })).slice(-8);

    setWeeklyVolume(formattedVolumeData);
  };
  
  const chartConfig = {
    volume: {
      label: "Volume (lbs)",
      color: "hsl(var(--accent))",
    },
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">Your performance overview.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Weekly Volume</CardTitle>
          <CardDescription>Total weight lifted per week (last 8 weeks).</CardDescription>
        </CardHeader>
        <CardContent className="pl-2">
          {weeklyVolume.length > 0 ? (
             <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
              <BarChart accessibilityLayer data={weeklyVolume} margin={{ top: 30, right: 10, left: 10, bottom: 5 }}>
                <XAxis
                  dataKey="week"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent 
                      formatter={(value) => `${Number(value).toLocaleString()} lbs`}
                      nameKey="volume"
                      />}
                  />
                <Bar dataKey="volume" fill="var(--color-volume)" radius={[8, 8, 0, 0]}>
                    <LabelList dataKey="volume" content={renderCustomizedLabel} />
                </Bar>
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center">
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
