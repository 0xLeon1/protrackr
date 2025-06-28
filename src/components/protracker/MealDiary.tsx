
"use client";

import { useState, useMemo, useEffect } from "react";
import type { FoodLogEntry, MealType, FoodDBItem } from "@/types";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Trash2, Search, FilePlus2 } from "lucide-react";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { foodDatabase } from '@/lib/food-data';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select"


function capitalizeWords(str: string): string {
    if (!str) return '';
    return str.toLowerCase()
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

const MEAL_TYPES: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Other'];
const RECENT_FOODS_KEY = 'protracker-recent-foods';

interface MealDiaryProps {
  logs: FoodLogEntry[];
  onAddMeal: (meal: Omit<FoodLogEntry, 'id' | 'date'>) => void;
  onDeleteMeal: (mealId: string) => void;
}

export default function MealDiary({ logs, onAddMeal, onDeleteMeal }: MealDiaryProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeMealType, setActiveMealType] = useState<MealType | null>(null);

  // State for search functionality
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const [searchResults, setSearchResults] = useState<FoodDBItem[]>([]);
  const [selectedFood, setSelectedFood] = useState<FoodDBItem | null>(null);
  const [quantity, setQuantity] = useState<number | string>(1);
  const [servingUnit, setServingUnit] = useState('default');
  const [recentFoods, setRecentFoods] = useState<FoodDBItem[]>([]);
  
  // State for adding custom food
  const [isAddingCustomFood, setIsAddingCustomFood] = useState(false);
  const [customFoodData, setCustomFoodData] = useState({
      name: '',
      calories: '',
      protein: '',
      carbs: '',
      fats: '',
  });

  const allFoods = foodDatabase;
  
  useEffect(() => {
    try {
      const storedRecents = localStorage.getItem(RECENT_FOODS_KEY);
      if (storedRecents) {
        setRecentFoods(JSON.parse(storedRecents));
      }
    } catch (error) {
      console.error("Failed to parse recent foods from localStorage", error);
      setRecentFoods([]);
    }
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 150);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);


  useEffect(() => {
    if (debouncedQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const lowerCaseQuery = debouncedQuery.toLowerCase();
    const filtered = allFoods.filter(food => 
        food.name.toLowerCase().includes(lowerCaseQuery) ||
        food.common_names.some(cn => cn.toLowerCase().includes(lowerCaseQuery))
    );
    setSearchResults(filtered.slice(0, 50));
  }, [debouncedQuery, allFoods]);


  useEffect(() => {
    if (!isDialogOpen) {
      setActiveMealType(null);
      setSearchQuery('');
      setSearchResults([]);
      setSelectedFood(null);
      setQuantity(1);
      setServingUnit('default');
      setIsAddingCustomFood(false);
      setCustomFoodData({ name: '', calories: '', protein: '', carbs: '', fats: '' });
    }
  }, [isDialogOpen]);
  
  const handleOpenDialog = (mealType: MealType) => {
    setActiveMealType(mealType);
    setIsDialogOpen(true);
  };
  
  const handleSaveMeal = () => {
    if (!activeMealType || !selectedFood || !quantity) return;
      
    const numQuantity = Number(quantity);
    if (isNaN(numQuantity) || numQuantity <= 0) return;

    const updatedRecents = [
        selectedFood,
        ...recentFoods.filter(food => food.food_id !== selectedFood.food_id)
    ].slice(0, 5);

    setRecentFoods(updatedRecents);
    localStorage.setItem(RECENT_FOODS_KEY, JSON.stringify(updatedRecents));

    let multiplier = numQuantity;
    if (servingUnit !== 'default' && selectedFood.unit_conversions[servingUnit]) {
        multiplier *= selectedFood.unit_conversions[servingUnit];
    }
    
    const mealData = {
        mealType: activeMealType,
        name: selectedFood.name,
        calories: selectedFood.calories * multiplier,
        protein: selectedFood.protein_g * multiplier,
        carbs: selectedFood.carbs_g * multiplier,
        fats: selectedFood.fat_g * multiplier,
    };
      
    onAddMeal(mealData);
    setIsDialogOpen(false);
  };

  const handleSaveCustomMeal = () => {
    if (!activeMealType || !customFoodData.name.trim() || !customFoodData.calories) return;

    const mealData = {
      mealType: activeMealType,
      name: customFoodData.name,
      calories: Number(customFoodData.calories) || 0,
      protein: Number(customFoodData.protein) || 0,
      carbs: Number(customFoodData.carbs) || 0,
      fats: Number(customFoodData.fats) || 0,
    };

    onAddMeal(mealData);
    setIsDialogOpen(false);
  };
  
  const handleCustomFoodChange = (field: keyof typeof customFoodData, value: string) => {
    setCustomFoodData(prev => ({...prev, [field]: value}));
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

  const renderDialogContent = () => {
      if (isAddingCustomFood) {
        // --- Custom Food Form View ---
        return (
            <div className="space-y-4 pt-4">
                <div className="space-y-2">
                    <Label htmlFor="custom-name">Food Name</Label>
                    <Input id="custom-name" value={customFoodData.name} onChange={(e) => handleCustomFoodChange('name', e.target.value)} placeholder="e.g., Grandma's Lasagna" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="custom-calories">Calories</Label>
                        <Input id="custom-calories" type="number" value={customFoodData.calories} onChange={(e) => handleCustomFoodChange('calories', e.target.value)} placeholder="kcal" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="custom-protein">Protein (g)</Label>
                        <Input id="custom-protein" type="number" value={customFoodData.protein} onChange={(e) => handleCustomFoodChange('protein', e.target.value)} placeholder="grams" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="custom-carbs">Carbs (g)</Label>
                        <Input id="custom-carbs" type="number" value={customFoodData.carbs} onChange={(e) => handleCustomFoodChange('carbs', e.target.value)} placeholder="grams" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="custom-fats">Fats (g)</Label>
                        <Input id="custom-fats" type="number" value={customFoodData.fats} onChange={(e) => handleCustomFoodChange('fats', e.target.value)} placeholder="grams" />
                    </div>
                </div>
                <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:pt-4">
                    <Button variant="outline" onClick={() => setIsAddingCustomFood(false)}>Back to Search</Button>
                    <Button onClick={handleSaveCustomMeal} disabled={!customFoodData.name.trim() || !customFoodData.calories} className="w-full sm:w-auto">
                        Add to {activeMealType}
                    </Button>
                </DialogFooter>
            </div>
        )
    }

      if (selectedFood) {
          // --- Confirmation View ---
          const numQuantity = Number(quantity) || 0;
          let multiplier = numQuantity;
          if (servingUnit !== 'default' && selectedFood.unit_conversions[servingUnit]) {
              multiplier *= selectedFood.unit_conversions[servingUnit];
          }

          const calculatedMacros = {
              calories: Math.round(selectedFood.calories * multiplier),
              protein: Math.round(selectedFood.protein_g * multiplier * 10) / 10,
              carbs: Math.round(selectedFood.carbs_g * multiplier * 10) / 10,
              fats: Math.round(selectedFood.fat_g * multiplier * 10) / 10,
          }

          return (
              <div className="space-y-4 pt-4">
                  <Card className="p-4 bg-muted/50">
                      <CardTitle className="text-lg">{capitalizeWords(selectedFood.name)}</CardTitle>
                      <CardDescription>
                          {`Per ${selectedFood.serving_size}: ${selectedFood.calories}kcal, ${selectedFood.protein_g}g P, ${selectedFood.carbs_g}g C, ${selectedFood.fat_g}g F`}
                      </CardDescription>
                  </Card>
                  
                  <div className="grid grid-cols-5 gap-4">
                      <div className="space-y-2 col-span-2">
                          <Label htmlFor="quantity">Quantity</Label>
                          <Input id="quantity" type="number" value={quantity} onChange={e => setQuantity(e.target.value)} min="0.1" step="0.1"/>
                      </div>
                      <div className="space-y-2 col-span-3">
                          <Label htmlFor="serving-unit">Serving</Label>
                          <Select value={servingUnit} onValueChange={setServingUnit}>
                            <SelectTrigger id="serving-unit">
                                <SelectValue placeholder="Select a unit" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="default">{selectedFood.serving_size}</SelectItem>
                                {Object.keys(selectedFood.unit_conversions).map(unit => (
                                    <SelectItem key={unit} value={unit}>{capitalizeWords(unit)}</SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                      </div>
                  </div>
                  
                  <Separator />

                  <div className="text-center font-medium">
                      <p className="text-xl">{calculatedMacros.calories} kcal</p>
                      <p className="text-sm text-muted-foreground">
                          {calculatedMacros.protein}g P, {calculatedMacros.carbs}g C, {calculatedMacros.fats}g F
                      </p>
                  </div>
                  
                  <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:pt-4">
                        <Button variant="outline" onClick={() => setSelectedFood(null)}>Back to Search</Button>
                        <Button onClick={handleSaveMeal} className="w-full sm:w-auto">
                            Add to {activeMealType}
                        </Button>
                  </DialogFooter>
              </div>
          )

      } else {
          // --- Search View ---
          return (
             <div className="space-y-4 pt-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input 
                        placeholder="Search for a food..."
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                    />
                </div>
                <div className="h-60 overflow-y-auto pr-2 -mr-2 space-y-2">
                    {searchResults.length > 0 ? (
                        searchResults.map(food => (
                            <div key={food.food_id} className="p-3 rounded-md hover:bg-muted cursor-pointer" onClick={() => setSelectedFood(food)}>
                                <p className="font-medium">{capitalizeWords(food.name)}</p>
                                <p className="text-sm text-muted-foreground">{food.calories} kcal per {food.serving_size}</p>
                            </div>
                        ))
                    ) : debouncedQuery.trim().length > 1 ? (
                        <div className="text-center text-muted-foreground pt-10 flex flex-col items-center">
                            <p>No results found for "{searchQuery}".</p>
                            <Button variant="link" className="mt-2" onClick={() => {
                                setCustomFoodData(prev => ({ ...prev, name: capitalizeWords(searchQuery) }));
                                setIsAddingCustomFood(true);
                            }}>
                                <FilePlus2 className="mr-2 h-4 w-4"/>
                                Add as a custom food
                            </Button>
                        </div>
                    ) : recentFoods.length > 0 ? (
                        <>
                            <p className="text-xs font-semibold text-muted-foreground tracking-wider uppercase px-1 pb-1">RECENT FOODS</p>
                            {recentFoods.map(food => (
                                <div key={food.food_id} className="p-3 rounded-md hover:bg-muted cursor-pointer" onClick={() => setSelectedFood(food)}>
                                    <p className="font-medium">{capitalizeWords(food.name)}</p>
                                    <p className="text-sm text-muted-foreground">{food.calories} kcal per {food.serving_size}</p>
                                </div>
                            ))}
                        </>
                    ) : (
                         <div className="text-center text-muted-foreground pt-10">
                            <p>Start typing to search the food database.</p>
                         </div>
                    )}
                </div>
             </div>
          );
      }
  };

  return (
    <Card>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <Accordion type="multiple" className="w-full" defaultValue={['Breakfast', 'Lunch']}>
          {MEAL_TYPES.map(mealType => (
            <AccordionItem value={mealType} key={mealType} className="border-b last:border-b-0">
               <AccordionTrigger className="flex w-full items-center p-4 hover:no-underline text-left">
                  <div className="flex-1">
                    <span className="text-lg font-semibold">{mealType}</span>
                    <p className="text-xs text-muted-foreground">{macroSummary(mealType)}</p>
                  </div>
              </AccordionTrigger>
              <AccordionContent className="p-0">
                <Separator />
                <div className="p-4 space-y-2">
                  {(mealsByType[mealType] || []).length > 0 && (
                    <div className="space-y-2 mb-4">
                      {(mealsByType[mealType] || []).map(meal => (
                        <div key={meal.id} className="flex justify-between items-center text-sm p-2 rounded-md bg-muted/50">
                          <div>
                            <p className="font-medium">{capitalizeWords(meal.name)}</p>
                            <p className="text-muted-foreground text-xs">
                              {meal.calories} kcal &bull; P: {Math.round(meal.protein)}g, C: {Math.round(meal.carbs)}g, F: {Math.round(meal.fats)}g
                            </p>
                          </div>
                          <div className="flex items-center">
                              <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => onDeleteMeal(meal.id)}>
                                  <Trash2 className="w-4 h-4" />
                              </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => handleOpenDialog(mealType)}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Food to {mealType}
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
                {isAddingCustomFood ? `Add Custom Food to ${activeMealType}` : `Add Food to ${activeMealType}`}
            </DialogTitle>
            <DialogDescription>
              {isAddingCustomFood ? "Enter the details for your custom food." : "Search the database or select a recent item."}
            </DialogDescription>
          </DialogHeader>
          {renderDialogContent()}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
