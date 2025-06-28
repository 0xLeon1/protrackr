
"use client";

import { useState, useMemo, useEffect } from "react";
import type { FoodLogEntry, MealType, FoodDBItem } from "@/types";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Trash2, Search, Loader2 } from "lucide-react";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
  const [searchResults, setSearchResults] = useState<FoodDBItem[]>([]);
  const [selectedFood, setSelectedFood] = useState<FoodDBItem | null>(null);
  const [quantity, setQuantity] = useState<number | string>(1);
  const [servingUnit, setServingUnit] = useState('default');
  
  const [allFoods, setAllFoods] = useState<FoodDBItem[]>([]);
  const [isFetchingFoods, setIsFetchingFoods] = useState(true);

  // Fetch all food items once on component mount
  useEffect(() => {
    const fetchAllFoods = async () => {
      if (!db) {
        setIsFetchingFoods(false);
        return;
      }
      setIsFetchingFoods(true);
      try {
        const foodCollection = collection(db, 'foods');
        const querySnapshot = await getDocs(foodCollection);
        const foods = querySnapshot.docs.map(doc => doc.data() as FoodDBItem);
        setAllFoods(foods);
      } catch (error) {
        console.error("Error fetching all foods:", error);
      } finally {
        setIsFetchingFoods(false);
      }
    };
    fetchAllFoods();
  }, []);

  // Perform client-side search when query or food list changes
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const lowerCaseQuery = searchQuery.toLowerCase();
    const queryTerms = lowerCaseQuery.split(' ').filter(t => t);

    const filteredFoods = allFoods.filter(food => {
      const foodName = food.name.toLowerCase();
      const commonNames = food.common_names.map(cn => cn.toLowerCase()).join(' ');
      const searchableText = `${foodName} ${commonNames}`;
      
      // Check if all words in query are present in searchable text
      return queryTerms.every(term => searchableText.includes(term));
    });
    
    setSearchResults(filteredFoods.slice(0, 30));
  }, [searchQuery, allFoods]);


  // When dialog closes, reset everything
  useEffect(() => {
    if (!isDialogOpen) {
      setActiveMealType(null);
      setSearchQuery('');
      setSearchResults([]);
      setSelectedFood(null);
      setQuantity(1);
      setServingUnit('default');
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

    // Calculation logic
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
                    {isFetchingFoods ? (
                        <div className="flex justify-center items-center h-full">
                            <Loader2 className="w-6 h-6 animate-spin text-primary"/>
                        </div>
                    ) : searchResults.length > 0 ? (
                        searchResults.map(food => (
                            <div key={food.food_id} className="p-3 rounded-md hover:bg-muted cursor-pointer" onClick={() => setSelectedFood(food)}>
                                <p className="font-medium">{capitalizeWords(food.name)}</p>
                                <p className="text-sm text-muted-foreground">{food.calories} kcal per {food.serving_size}</p>
                            </div>
                        ))
                    ) : searchQuery.length > 1 ? (
                        <div className="text-center text-muted-foreground pt-10">
                            <p>No results found for "{searchQuery}".</p>
                            <p className="text-xs">Try a different search term.</p>
                        </div>
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
                Add Food to {activeMealType}
            </DialogTitle>
            <DialogDescription>
              Search the database for a food item to log.
            </DialogDescription>
          </DialogHeader>
          {renderDialogContent()}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
