"use client";

import { useState, useEffect } from 'react';
import type { WorkoutLogEntry, FoodLogEntry, CheckinLogEntry } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';
import { CheckCircle2, Dumbbell, UtensilsCrossed } from 'lucide-react';
import { Progress } from '@/components/ui/progress';


const ConsistencyItem = ({ icon: Icon, title, value }: { icon: React.ElementType, title: string, value: number }) => (
    <div className="space-y-3">
        <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg">
                <Icon className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
                <div className="flex justify-between items-baseline">
                    <p className="font-medium">{title}</p>
                    <p className="text-sm font-bold text-primary">{value}<span className="text-xs text-muted-foreground font-medium"> / 7 days</span></p>
                </div>
            </div>
        </div>
        <Progress value={(value / 7) * 100} className="h-2" />
    </div>
);


export default function ConsistencyTracker() {
    const [checkinDays, setCheckinDays] = useState(0);
    const [workoutDays, setWorkoutDays] = useState(0);
    const [nutritionDays, setNutritionDays] = useState(0);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);

        const today = new Date();
        const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
        const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

        const getUniqueDaysInWeek = (logs: { date: string }[] | { completedAt: string }[], dateKey: 'date' | 'completedAt'): number => {
            if (!logs) return 0;
            try {
                const uniqueDays = new Set<string>();
                logs.forEach(log => {
                    const logDate = parseISO(log[dateKey]);
                    if (isWithinInterval(logDate, { start: weekStart, end: weekEnd })) {
                        uniqueDays.add(logDate.toISOString().split('T')[0]);
                    }
                });
                return uniqueDays.size;
            } catch (error) {
                console.error("Error processing logs for consistency tracker:", error);
                return 0;
            }
        };

        // Check-ins
        const storedCheckins = localStorage.getItem('protracker-checkins');
        const checkinLogs: CheckinLogEntry[] = storedCheckins ? JSON.parse(storedCheckins) : [];
        setCheckinDays(getUniqueDaysInWeek(checkinLogs, 'date'));

        // Workouts
        const storedWorkoutLogs = localStorage.getItem('protracker-logs');
        const workoutLogs: WorkoutLogEntry[] = storedWorkoutLogs ? JSON.parse(storedWorkoutLogs) : [];
        setWorkoutDays(getUniqueDaysInWeek(workoutLogs, 'completedAt'));
        
        // Nutrition
        const storedMealLogs = localStorage.getItem('protracker-meal-logs');
        const mealLogs: FoodLogEntry[] = storedMealLogs ? JSON.parse(storedMealLogs) : [];
        setNutritionDays(getUniqueDaysInWeek(mealLogs, 'date'));

    }, []);
    
    // Prevent hydration mismatch by rendering null on server
    if (!isClient) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Weekly Consistency</CardTitle>
                <CardDescription>Your tracked activities for this week.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <ConsistencyItem icon={CheckCircle2} title="Daily Check-ins" value={checkinDays} />
                <ConsistencyItem icon={Dumbbell} title="Workouts" value={workoutDays} />
                <ConsistencyItem icon={UtensilsCrossed} title="Nutrition" value={nutritionDays} />
            </CardContent>
        </Card>
    );
}
