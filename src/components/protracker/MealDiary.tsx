"use client";

import { useState, useMemo } from "react";
import type { FoodLogEntry, MealType } from "@/types";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const MEAL_TYPES: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Other'];

interface MealDiaryProps {
  logs: FoodLogEntry[];
  onAddMeal: (meal: Omit<FoodLogEntry, 'id' | 'date'>) => void;
  onDeleteMeal: (mealId: string) => void;
  isLocked: boolean;
}

interface TempFoodLog {
  name: string;
  protein: string | number;
  carbs: string | number;
  fats: string | number;
}

export default function MealDiary({ logs, onAddMeal, onDeleteMeal, isLocked }: MealDiaryProps) {

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeMealType, setActiveMealType] = useState<MealType | null>(null);
  const [tempFood, setTempFood] = useState<TempFoodLog>({ name: '', protein: '', carbs: '', fats: '' });
  
  const calculatedCalories = useMemo(() => {
      const p = Number(tempFood.protein) || 0;
      const c = Number(tempFood.carbs) || 0;
      const f = Number(tempFood.fats) || 0;
      return (p * 4) + (c * 4) + (f * 9);
  }, [tempFood]);


  const handleOpenDialog = (mealType: MealType) => {
    setActiveMealType(mealType);
    setIsDialogOpen(true);
  };
  
  const handleTempFoodChange = (field: keyof TempFoodLog, value: string) => {
    setTempFood(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveMeal = () => {
    if (!activeMealType || !tempFood.name) return;

    const newMeal: Omit<FoodLogEntry, 'id' | 'date'> = {
      mealType: activeMealType,
      name: tempFood.name,
      protein: Number(tempFood.protein) || 0,
      carbs: Number(tempFood.carbs) || 0,
      fats: Number(tempFood.fats) || 0,
      calories: calculatedCalories,
    };

    onAddMeal(newMeal);
    setTempFood({ name: '', protein: '', carbs: '', fats: '' });
    setIsDialogOpen(false);
  };

  const mealsByType = useMemo(() => {
    return logs.reduce((acc, log) => {
      if (!acc[log.mealType]) {
        acc[log.mealType] = [];
      }
      acc[log.mealType].push(log);
      return acc;
    }, {} as Record<MealType, FoodLogEntry[]>);
  }, [logs]);

  const macroSummary = (mealType: MealType) => {
    const meals = mealsByType[mealType] || [];
    if (meals.length === 0) return "No entries yet";

    const totals = meals.reduce((acc, meal) => ({
      calories: acc.calories + meal.calories,
      protein: acc.protein + meal.protein,
      carbs: acc.carbs + meal.carbs,
      fats: acc.fats + meal.fats,
    }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

    return `${Math.round(totals.calories)} kcal, ${Math.round(totals.protein)}g protein, ${Math.round(totals.carbs)}g carbs, ${Math.round(totals.fats)}g fat`;
  };

  return (
    <Card>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <Accordion type="multiple" className="w-full" defaultValue={['Breakfast', 'Lunch']}>
                {MEAL_TYPES.map(mealType => (
                <AccordionItem value={mealType} key={mealType} className="border-b last:border-b-0">
                    <AccordionTrigger className="px-4 hover:no-underline">
                    <div className="flex items-center gap-4">
                        <DialogTrigger asChild onClick={(e) => {e.stopPropagation(); handleOpenDialog(mealType);}} disabled={isLocked}>
                            <Button variant="ghost" size="icon" className="text-green-500 hover:text-green-600 rounded-full">
                                <PlusCircle className="w-6 h-6" />
                            </Button>
                        </DialogTrigger>
                        <div className="flex flex-col items-start text-left">
                        <span className="text-lg font-semibold">{mealType}</span>
                        <span className="text-xs text-muted-foreground">{macroSummary(mealType)}</span>
                        </div>
                    </div>
                    </AccordionTrigger>
                    <AccordionContent className="p-0">
                        <Separator />
                        <div className="p-4 space-y-2">
                            {(mealsByType[mealType] || []).length > 0 ? (
                                (mealsByType[mealType] || []).map(meal => (
                                    <div key={meal.id} className="flex justify-between items-center text-sm p-2 rounded-md bg-muted/50">
                                        <div>
                                            <p className="font-medium">{meal.name}</p>
                                            <p className="text-muted-foreground text-xs">
                                                {meal.calories} kcal &bull; P: {meal.protein}g, C: {meal.carbs}g, F: {meal.fats}g
                                            </p>
                                        </div>
                                        <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => onDeleteMeal(meal.id)} disabled={isLocked}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-center text-muted-foreground py-2">No food logged for {mealType}.</p>
                            )}
                        </div>
                    </AccordionContent>
                </AccordionItem>
                ))}
            </Accordion>
            <DialogContent>
                <DialogHeader>
                <DialogTitle>Add Food to {activeMealType}</DialogTitle>
                <DialogDescription>Enter the details for your meal.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="meal-name">Food</Label>
                        <Input id="meal-name" value={tempFood.name} onChange={e => handleTempFoodChange('name', e.target.value)} placeholder="e.g., Grilled Chicken Salad"/>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="protein">Protein (g)</Label>
                            <Input id="protein" type="number" value={tempFood.protein} onChange={e => handleTempFoodChange('protein', e.target.value)} placeholder="30" />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="carbs">Carbs (g)</Label>
                            <Input id="carbs" type="number" value={tempFood.carbs} onChange={e => handleTempFoodChange('carbs', e.target.value)} placeholder="15" />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="fats">Fats (g)</Label>
                            <Input id="fats" type="number" value={tempFood.fats} onChange={e => handleTempFoodChange('fats', e.target.value)} placeholder="10" />
                        </div>
                    </div>
                    <div className="text-center text-muted-foreground font-medium">
                        Calculated Calories: <span className="text-primary">{calculatedCalories.toFixed(0)}</span>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleSaveMeal}>Save Meal</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </Card>
  );
}
