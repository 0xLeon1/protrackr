
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, Dumbbell, UtensilsCrossed } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface ConsistencyTrackerProps {
    checkinDays: number;
    workoutDays: number;
    nutritionDays: number;
}

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

export default function ConsistencyTracker({ checkinDays, workoutDays, nutritionDays }: ConsistencyTrackerProps) {
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
