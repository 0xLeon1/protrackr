
"use client";

import { useState, useMemo, useEffect } from "react";
import type { FoodLogEntry, MealType } from "@/types";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Trash2, Pencil } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

function capitalizeWords(str: string): string {
    if (!str) return '';
    return str.toLowerCase()
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

const MEAL_TYPES: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Other'];

interface MealDiaryProps {
  logs: FoodLogEntry[];
  onAddMeal: (meal: Omit<FoodLogEntry, 'id' | 'date'>) => void;
  onDeleteMeal: (mealId: string) => void;
  onUpdateMeal: (meal: FoodLogEntry) => void;
}

const initialFoodState = { name: '', calories: '', protein: '', carbs: '', fats: '' };

export default function MealDiary({ logs, onAddMeal, onDeleteMeal, onUpdateMeal }: MealDiaryProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeMealType, setActiveMealType] = useState<MealType | null>(null);
  const [editingLog, setEditingLog] = useState<FoodLogEntry | null>(null);
  const [manualFood, setManualFood] = useState(initialFoodState);

  // When dialog closes, reset everything
  useEffect(() => {
    if (!isDialogOpen) {
      setActiveMealType(null);
      setEditingLog(null);
      setManualFood(initialFoodState);
    }
  }, [isDialogOpen]);
  
  const handleOpenDialog = (mealType: MealType) => {
    setActiveMealType(mealType);
    setIsDialogOpen(true);
  };
  
  const handleEditClick = (log: FoodLogEntry) => {
    setEditingLog(log);
    setActiveMealType(log.mealType);
    setManualFood({
        name: log.name,
        calories: String(log.calories),
        protein: String(log.protein),
        carbs: String(log.carbs),
        fats: String(log.fats),
    });
    setIsDialogOpen(true);
  };

  const handleManualFoodChange = (field: keyof typeof manualFood, value: string) => {
    if (field === 'name') {
        setManualFood(prev => ({ ...prev, name: value }));
    } else {
        setManualFood(prev => ({ ...prev, [field]: value.replace(/[^0-9.]/g, '') }));
    }
  };
  
  const handleSaveMeal = () => {
    if (!activeMealType || !manualFood.name || !manualFood.calories) return;
      
    const mealData = {
        mealType: activeMealType,
        name: manualFood.name,
        calories: parseFloat(manualFood.calories) || 0,
        protein: parseFloat(manualFood.protein) || 0,
        carbs: parseFloat(manualFood.carbs) || 0,
        fats: parseFloat(manualFood.fats) || 0,
    };
      
    if (editingLog) {
        onUpdateMeal({ id: editingLog.id, date: editingLog.date, ...mealData });
    } else {
        onAddMeal(mealData);
    }
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

    return `${Math.round(totals.calories)} kcal, ${Math.round(totals.protein)}g P, ${Math.round(totals.carbs)}g C, ${Math.round(totals.fats)}g F`;
  };

  const renderDialogContent = () => (
     <div className="space-y-4">
        <div className="space-y-2">
            <Label htmlFor="manual-name">Food Name</Label>
            <Input id="manual-name" value={manualFood.name} onChange={e => handleManualFoodChange('name', e.target.value)} placeholder="e.g., Chicken and Rice" />
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="manual-calories">Calories</Label>
                <Input id="manual-calories" type="number" value={manualFood.calories} onChange={e => handleManualFoodChange('calories', e.target.value)} placeholder="kcal"/>
            </div>
            <div className="space-y-2">
                <Label htmlFor="manual-protein">Protein</Label>
                <Input id="manual-protein" type="number" value={manualFood.protein} onChange={e => handleManualFoodChange('protein', e.target.value)} placeholder="grams"/>
            </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="manual-carbs">Carbs</Label>
                <Input id="manual-carbs" type="number" value={manualFood.carbs} onChange={e => handleManualFoodChange('carbs', e.target.value)} placeholder="grams"/>
            </div>
            <div className="space-y-2">
                <Label htmlFor="manual-fats">Fats</Label>
                <Input id="manual-fats" type="number" value={manualFood.fats} onChange={e => handleManualFoodChange('fats', e.target.value)} placeholder="grams"/>
            </div>
        </div>
        <DialogFooter>
            <Button onClick={handleSaveMeal} className="w-full">
            {editingLog ? 'Update Food' : `Add to ${activeMealType}`}
            </Button>
        </DialogFooter>
     </div>
  );

  return (
    <Card>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <Accordion type="multiple" className="w-full" defaultValue={['Breakfast', 'Lunch']}>
          {MEAL_TYPES.map(mealType => (
            <AccordionItem value={mealType} key={mealType} className="border-b last:border-b-0">
               <div className="flex w-full items-center p-4">
                  <AccordionTrigger className="flex-1 p-0 hover:no-underline text-left">
                      <div className="flex flex-col">
                        <span className="text-lg font-semibold">{mealType}</span>
                        <span className="text-xs text-muted-foreground">{macroSummary(mealType)}</span>
                      </div>
                  </AccordionTrigger>
                  <DialogTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-accent hover:text-accent/90 rounded-full shrink-0 ml-4" 
                      onClick={() => handleOpenDialog(mealType)}
                    >
                      <PlusCircle className="w-6 h-6" />
                    </Button>
                  </DialogTrigger>
                </div>
              <AccordionContent className="p-0">
                <Separator />
                <div className="p-4 space-y-2">
                  {(mealsByType[mealType] || []).length > 0 ? (
                    (mealsByType[mealType] || []).map(meal => (
                      <div key={meal.id} className="flex justify-between items-center text-sm p-2 rounded-md bg-muted/50">
                        <div>
                          <p className="font-medium">{capitalizeWords(meal.name)}</p>
                          <p className="text-muted-foreground text-xs">
                            {meal.calories} kcal &bull; P: {meal.protein}g, C: {meal.carbs}g, F: {meal.fats}g
                          </p>
                        </div>
                        <div className="flex items-center">
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary h-8 w-8" onClick={() => handleEditClick(meal)}>
                                <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => onDeleteMeal(meal.id)}>
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
                {editingLog ? `Edit Food in ${editingLog.mealType}` : `Add Food to ${activeMealType}`}
            </DialogTitle>
            <DialogDescription>
              {editingLog ? 'Update the nutritional information for this item.' : 'Log a new food by entering its details below.'}
            </DialogDescription>
          </DialogHeader>
          {renderDialogContent()}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
