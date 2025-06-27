
"use client";

import { useState, useEffect } from "react";
import type { MacroGoals } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings } from "lucide-react";

const defaultGoals: MacroGoals = {
  calories: 2500,
  protein: 180,
  carbs: 250,
  fats: 70,
};

// Create a version of the MacroGoals type that allows empty strings for form editing
type TempMacroGoals = {
  [K in keyof MacroGoals]: MacroGoals[K] | '';
};

export default function MacroTracker() {
  // Hardcoded current values for now. This would typically come from a meal log.
  const currentIntake = { calories: 1890, protein: 150, carbs: 200, fats: 50 };

  const [goals, setGoals] = useState<MacroGoals>(defaultGoals);
  const [tempGoals, setTempGoals] = useState<TempMacroGoals>(defaultGoals);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    const storedGoals = localStorage.getItem('protracker-macro-goals');
    if (storedGoals) {
      try {
        const parsedGoals = JSON.parse(storedGoals);
        setGoals(parsedGoals);
        setTempGoals(parsedGoals);
      } catch (e) {
        console.error("Failed to parse macro goals from localStorage", e);
      }
    }
  }, []);

  // When opening the dialog, reset tempGoals to the currently saved goals
  useEffect(() => {
    if (isDialogOpen) {
      setTempGoals(goals);
    }
  }, [isDialogOpen, goals]);

  // Automatically calculate calories when macros change
  useEffect(() => {
    const p = Number(tempGoals.protein) || 0;
    const c = Number(tempGoals.carbs) || 0;
    const f = Number(tempGoals.fats) || 0;
    const calculatedCalories = (p * 4) + (c * 4) + (f * 9);
    
    // Prevents updating state for the initial render if everything is default
    if (tempGoals.calories !== calculatedCalories) {
        setTempGoals(prev => ({ ...prev, calories: calculatedCalories }));
    }
  }, [tempGoals.protein, tempGoals.carbs, tempGoals.fats]);


  const handleGoalChange = (field: keyof Omit<MacroGoals, 'calories'>, value: string) => {
    if (value === "") {
      setTempGoals(prev => ({ ...prev, [field]: "" }));
      return;
    }
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      setTempGoals(prev => ({ ...prev, [field]: numValue }));
    }
  };
  
  const handleSaveGoals = () => {
    const finalizedGoals: MacroGoals = {
        calories: Number(tempGoals.calories) || 0,
        protein: Number(tempGoals.protein) || 0,
        carbs: Number(tempGoals.carbs) || 0,
        fats: Number(tempGoals.fats) || 0,
    };
    setGoals(finalizedGoals);
    localStorage.setItem('protracker-macro-goals', JSON.stringify(finalizedGoals));
    setIsDialogOpen(false);
  };
  
  const getProgressValue = (current: number, goal: number) => {
    if (goal === 0) return 0;
    return (current / goal) * 100;
  };

  return (
    <Card className="transition-all duration-300 hover:shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="font-headline">Macro Tracker</CardTitle>
                <CardDescription>Your daily nutrition summary.</CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <Settings className="h-5 w-5" />
                        <span className="sr-only">Set Goals</span>
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Set Your Macro Goals</DialogTitle>
                        <DialogDescription>
                            Define your daily targets. Calories are calculated automatically.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="protein-goal" className="text-right">Protein</Label>
                            <Input id="protein-goal" type="number" value={tempGoals.protein} onChange={(e) => handleGoalChange('protein', e.target.value)} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="carbs-goal" className="text-right">Carbs</Label>
                            <Input id="carbs-goal" type="number" value={tempGoals.carbs} onChange={(e) => handleGoalChange('carbs', e.target.value)} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="fats-goal" className="text-right">Fats</Label>
                            <Input id="fats-goal" type="number" value={tempGoals.fats} onChange={(e) => handleGoalChange('fats', e.target.value)} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="calories-goal" className="text-right">Calories</Label>
                            <Input id="calories-goal" type="number" value={tempGoals.calories} className="col-span-3 bg-muted" readOnly />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" onClick={handleSaveGoals}>Save Goals</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-baseline">
            <h3 className="text-3xl font-bold text-primary">{currentIntake.calories.toLocaleString()}</h3>
            <span className="font-medium text-muted-foreground">/ {goals.calories.toLocaleString()} kCal</span>
        </div>
        <div className="space-y-3 pt-2">
          <div>
            <div className="flex justify-between mb-1 text-sm">
              <span className="font-medium text-foreground">Protein</span>
              <span className="text-muted-foreground">{currentIntake.protein}g / {goals.protein}g</span>
            </div>
            <Progress value={getProgressValue(currentIntake.protein, goals.protein)} className="h-2 [&>div]:bg-sky-400" />
          </div>
          <div>
            <div className="flex justify-between mb-1 text-sm">
              <span className="font-medium text-foreground">Carbs</span>
              <span className="text-muted-foreground">{currentIntake.carbs}g / {goals.carbs}g</span>
            </div>
            <Progress value={getProgressValue(currentIntake.carbs, goals.carbs)} className="h-2 [&>div]:bg-orange-400" />
          </div>
          <div>
            <div className="flex justify-between mb-1 text-sm">
              <span className="font-medium text-foreground">Fats</span>
              <span className="text-muted-foreground">{currentIntake.fats}g / {goals.fats}g</span>
            </div>
            <Progress value={getProgressValue(currentIntake.fats, goals.fats)} className="h-2 [&>div]:bg-amber-400" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
