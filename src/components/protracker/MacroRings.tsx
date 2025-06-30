
"use client";

import type { WeeklyMacroGoal } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';

interface MacroRingsProps {
    currentIntake: {
        protein: number;
        carbs: number;
        fats: number;
    };
    goals: WeeklyMacroGoal;
}

const Ring = ({ name, value, goal, color }: { name: string; value: number; goal: number; color: string }) => {
    const remaining = Math.max(0, goal - value);
    const percentage = goal > 0 ? Math.min(100, (value / goal) * 100) : 0;
    
    const data = [{ name, value: percentage }];

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative h-28 w-28">
                <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                        innerRadius="70%"
                        outerRadius="100%"
                        barSize={10}
                        data={data}
                        startAngle={90}
                        endAngle={-270}
                    >
                        <PolarAngleAxis
                            type="number"
                            domain={[0, 100]}
                            angleAxisId={0}
                            tick={false}
                        />
                        <RadialBar
                            background={{ fill: 'hsl(var(--muted))' }}
                            dataKey="value"
                            cornerRadius={10}
                            fill={color}
                        />
                    </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-bold tracking-tighter">{Math.round(remaining)}g</span>
                    <span className="text-xs text-muted-foreground">left</span>
                </div>
            </div>
            <p className="font-medium text-sm">{name}</p>
        </div>
    );
}

export default function MacroRings({ currentIntake, goals }: MacroRingsProps) {
    if (!goals) return null;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Macros Remaining</CardTitle>
                <CardDescription>Your remaining macros for today.</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-around items-center pt-2">
                <Ring name="Protein" value={currentIntake.protein} goal={goals.protein} color="hsl(var(--chart-1))" />
                <Ring name="Carbs" value={currentIntake.carbs} goal={goals.carbs} color="hsl(var(--chart-2))" />
                <Ring name="Fats" value={currentIntake.fats} goal={goals.fats} color="hsl(var(--chart-4))" />
            </CardContent>
        </Card>
    );
}
