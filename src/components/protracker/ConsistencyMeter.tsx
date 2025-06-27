"use client";

import { useState, useEffect } from 'react';
import type { WorkoutLogEntry } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { startOfWeek, endOfWeek, eachDayOfInterval, format, isWithinInterval, parseISO } from 'date-fns';

interface DailyVolume {
  day: string;
  volume: number;
}

export default function ConsistencyMeter() {
  const [dailyVolume, setDailyVolume] = useState<DailyVolume[]>([]);
  
  useEffect(() => {
    // 1. Initialize volume data for the current week
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

    let volumeDataForWeek: DailyVolume[] = daysInWeek.map(day => ({
      day: format(day, 'E'), // Mon, Tue, etc.
      volume: 0,
    }));

    // 2. Load logs from localStorage
    const storedLogs = localStorage.getItem('protracker-logs');
    if (storedLogs) {
      try {
        const parsedLogs: WorkoutLogEntry[] = JSON.parse(storedLogs);
        
        // 3. Filter logs for the current week and aggregate volume
        parsedLogs.forEach(log => {
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
      } catch (error) {
        console.error("Failed to parse logs for consistency meter", error);
      }
    }
    
    setDailyVolume(volumeDataForWeek);

  }, []);

  const chartConfig = {
    volume: {
      label: "Volume",
      color: "hsl(var(--primary))",
    },
  };

  return (
    <Card className="transition-all duration-300 hover:shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline">Daily Volume</CardTitle>
        <CardDescription>Your total lifted volume for the current week.</CardDescription>
      </CardHeader>
      <CardContent>
          <ChartContainer config={chartConfig} className="min-h-[180px] w-full">
            <BarChart 
                accessibilityLayer 
                data={dailyVolume} 
                margin={{ top: 20, right: 0, left: 0, bottom: 0 }}
            >
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => value.slice(0, 1)}
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
              <Bar dataKey="volume" fill="var(--color-volume)" radius={4} barSize={30} />
            </BarChart>
          </ChartContainer>
      </CardContent>
    </Card>
  );
}
