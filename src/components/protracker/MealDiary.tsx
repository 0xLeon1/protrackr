
"use client";

import { useState, useMemo, useEffect } from "react";
import type { FoodLogEntry, MealType, FoodDataItem } from "@/types";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Trash2, Loader2, ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { searchFoods } from "@/lib/food";
import { GRAMS_PER_OUNCE } from "@/lib/constants";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

const MEAL_TYPES: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Other'];

interface MealDiaryProps {
  logs: FoodLogEntry[];
  onAddMeal: (meal: Omit<FoodLogEntry, 'id' | 'date'>) => void;
  onDeleteMeal: (mealId: string) => void;
}

export default function MealDiary({ logs, onAddMeal, onDeleteMeal }: MealDiaryProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeMealType, setActiveMealType] = useState<MealType | null>(null);

  // State for the new food search dialog
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FoodDataItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodDataItem | null>(null);
  const [amount, setAmount] = useState("100");
  const [unit, setUnit] = useState<"g" | "oz">("g");

  // Debounced search effect
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const handler = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchFoods(searchQuery);
      setSearchResults(results);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  const resetDialogState = () => {
    setSearchQuery("");
    setSearchResults([]);
    setIsSearching(false);
    setSelectedFood(null);
    setAmount("100");
    setUnit("g");
  };

  const calculatedMacros = useMemo(() => {
    if (!selectedFood) return { calories: 0, protein: 0, carbs: 0, fats: 0 };
    
    const numAmount = parseFloat(amount) || 0;
    const totalGrams = unit === 'g' ? numAmount : numAmount * GRAMS_PER_OUNCE;
    const ratio = totalGrams / 100;

    return {
      calories: Math.round(selectedFood.calories * ratio),
      protein: parseFloat((selectedFood.protein * ratio).toFixed(1)),
      carbs: parseFloat((selectedFood.carbs * ratio).toFixed(1)),
      fats: parseFloat((selectedFood.fats * ratio).toFixed(1)),
    };
  }, [selectedFood, amount, unit]);

  const handleOpenDialog = (mealType: MealType) => {
    setActiveMealType(mealType);
    setIsDialogOpen(true);
  };

  const handleSaveMeal = () => {
    if (!activeMealType || !selectedFood) return;

    const newMeal: Omit<FoodLogEntry, 'id' | 'date'> = {
      mealType: activeMealType,
      name: `${selectedFood.name}`,
      ...calculatedMacros,
    };

    onAddMeal(newMeal);
    setIsDialogOpen(false); // This will trigger the reset via onOpenChange
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
      <Dialog open={isDialogOpen} onOpenChange={(isOpen) => {
        setIsDialogOpen(isOpen);
        if (!isOpen) {
          setTimeout(resetDialogState, 200);
        }
      }}>
        <Accordion type="multiple" className="w-full" defaultValue={['Breakfast', 'Lunch']}>
          {MEAL_TYPES.map(mealType => (
            <AccordionItem value={mealType} key={mealType} className="border-b last:border-b-0">
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center gap-4">
                  <DialogTrigger asChild onClick={(e) => { e.stopPropagation(); handleOpenDialog(mealType); }}>
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
                        <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => onDeleteMeal(meal.id)}>
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Food to {activeMealType}</DialogTitle>
            <DialogDescription>Search for a food to log it.</DialogDescription>
          </DialogHeader>
          {!selectedFood ? (
            <div className="space-y-4">
              <div className="relative">
                <Input
                  placeholder="e.g., Grilled Chicken"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" />}
              </div>
              <ScrollArea className="h-60">
                {searchResults.length > 0 ? (
                  <div className="space-y-2">
                    {searchResults.map(food => (
                      <button key={food.id} onClick={() => setSelectedFood(food)} className="w-full text-left p-2 rounded-md hover:bg-muted text-sm">
                        <p>{food.name}</p>
                        <p className="text-xs text-muted-foreground">{food.calories} kcal per 100g</p>
                      </button>
                    ))}
                  </div>
                ) : (
                  !isSearching && searchQuery.length > 1 && (
                    <p className="text-center text-sm text-muted-foreground py-4">No results found.</p>
                  )
                )}
              </ScrollArea>
            </div>
          ) : (
            <div className="space-y-4">
              <Button variant="ghost" size="sm" onClick={() => setSelectedFood(null)} className="-ml-4">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Search
              </Button>
              <h3 className="font-semibold text-lg">{selectedFood.name}</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input id="amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit</Label>
                  <Select value={unit} onValueChange={(value: "g" | "oz") => setUnit(value)}>
                    <SelectTrigger id="unit">
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="g">Grams (g)</SelectItem>
                      <SelectItem value="oz">Ounces (oz)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Card className="p-4 bg-muted/50">
                <h4 className="font-medium mb-2 text-center">Calculated Macros</h4>
                <div className="flex justify-around text-center text-sm">
                    <div>
                        <p className="font-bold text-lg">{calculatedMacros.calories}</p>
                        <p className="text-xs text-muted-foreground">kCal</p>
                    </div>
                    <div>
                        <p className="font-bold text-lg">{calculatedMacros.protein}g</p>
                        <p className="text-xs text-muted-foreground">Protein</p>
                    </div>
                    <div>
                        <p className="font-bold text-lg">{calculatedMacros.carbs}g</p>
                        <p className="text-xs text-muted-foreground">Carbs</p>
                    </div>
                    <div>
                        <p className="font-bold text-lg">{calculatedMacros.fats}g</p>
                        <p className="text-xs text-muted-foreground">Fats</p>
                    </div>
                </div>
              </Card>

              <DialogFooter>
                <Button onClick={handleSaveMeal} className="w-full">Add to {activeMealType}</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
