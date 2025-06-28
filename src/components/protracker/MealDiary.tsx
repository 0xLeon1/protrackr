
"use client";

import { useState, useMemo, useEffect } from "react";
import type { FoodLogEntry, MealType, FoodDBItem, CustomFoodItem } from "@/types";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Trash2, Search, FilePlus2, Pencil } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from 'firebase/firestore';


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
  customFoods: CustomFoodItem[];
  onAddMeal: (meal: Omit<FoodLogEntry, 'id' | 'date'>) => void;
  onDeleteMeal: (mealId: string) => void;
  onUpdateMeal: (meal: FoodLogEntry) => void;
  onSaveCustomFood: (food: Omit<CustomFoodItem, 'id'>) => Promise<CustomFoodItem>;
}

export default function MealDiary({ logs, customFoods, onAddMeal, onDeleteMeal, onUpdateMeal, onSaveCustomFood }: MealDiaryProps) {
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeMealType, setActiveMealType] = useState<MealType | null>(null);
  const [editingMeal, setEditingMeal] = useState<FoodLogEntry | null>(null);

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

  const { toast } = useToast();

  const searchableCustomFoods = useMemo(() => {
    return customFoods.map(cf => ({
        food_id: cf.id,
        name: cf.name,
        category: 'Custom',
        serving_size: '1 serving',
        calories: cf.calories,
        protein_g: cf.protein,
        carbs_g: cf.carbs,
        fat_g: cf.fats,
        fiber_g: 0,
        common_names: [],
        unit_conversions: {},
        isCustom: true,
    }));
  }, [customFoods]);

  const allFoods = useMemo(() => [...foodDatabase, ...searchableCustomFoods], [searchableCustomFoods]);
  
  useEffect(() => {
    if (!user) return;
    
    const fetchRecentFoods = async () => {
        const recentsDocRef = doc(db, 'users', user.uid, 'data', 'recent-foods');
        const docSnap = await getDoc(recentsDocRef);
        if (docSnap.exists() && docSnap.data().recents) {
            setRecentFoods(docSnap.data().recents);
        } else {
            setRecentFoods([]);
        }
    };
    fetchRecentFoods();

  }, [user]);

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
        (food.common_names && food.common_names.some(cn => cn.toLowerCase().includes(lowerCaseQuery)))
    );
    setSearchResults(filtered.slice(0, 50));
  }, [debouncedQuery, allFoods]);


  useEffect(() => {
    if (!isDialogOpen) {
      // Reset all state when dialog closes
      setActiveMealType(null);
      setSearchQuery('');
      setSearchResults([]);
      setSelectedFood(null);
      setQuantity(1);
      setServingUnit('default');
      setIsAddingCustomFood(false);
      setCustomFoodData({ name: '', calories: '', protein: '', carbs: '', fats: '' });
      setEditingMeal(null);
    }
  }, [isDialogOpen]);
  

  const handleOpenDialog = (mealType: MealType) => {
    setActiveMealType(mealType);
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (meal: FoodLogEntry) => {
    setEditingMeal(meal);
    setActiveMealType(meal.mealType);
    setQuantity(meal.quantity);
    
    if (meal.foodId) { // DB Food or Saved Custom Food
        const foodDbItem = allFoods.find(f => f.food_id === meal.foodId);
        if (foodDbItem) {
            setSelectedFood(foodDbItem);
            setServingUnit(meal.servingUnit);
            setIsAddingCustomFood(false);
        } else {
            // Food not found, treat as one-off
             setIsAddingCustomFood(true);
             if (meal.customBaseMacros) {
                setCustomFoodData({
                    name: meal.name,
                    calories: String(meal.customBaseMacros.calories),
                    protein: String(meal.customBaseMacros.protein),
                    carbs: String(meal.customBaseMacros.carbs),
                    fats: String(meal.customBaseMacros.fats),
                });
             }
        }
    } else if (meal.customBaseMacros) { // One-off custom food
        setCustomFoodData({
            name: meal.name,
            calories: String(meal.customBaseMacros.calories),
            protein: String(meal.customBaseMacros.protein),
            carbs: String(meal.customBaseMacros.carbs),
            fats: String(meal.customBaseMacros.fats),
        });
        setIsAddingCustomFood(true);
    }
    setIsDialogOpen(true);
  };
  
  const handleSaveMeal = async () => {
    if (!activeMealType || !selectedFood || !quantity || !user) return;
      
    const numQuantity = Number(quantity);
    if (isNaN(numQuantity) || numQuantity <= 0) return;

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
        foodId: selectedFood.food_id,
        quantity: numQuantity,
        servingUnit: servingUnit,
        customBaseMacros: null,
    };
      
    if (editingMeal) {
        onUpdateMeal({ ...mealData, id: editingMeal.id, date: editingMeal.date });
    } else {
        const updatedRecents = [
            selectedFood,
            ...recentFoods.filter(food => food.food_id !== selectedFood.food_id)
        ].slice(0, 5);
        setRecentFoods(updatedRecents);
        
        // Save recents to Firestore
        const recentsDocRef = doc(db, 'users', user.uid, 'data', 'recent-foods');
        await setDoc(recentsDocRef, { recents: updatedRecents });

        onAddMeal(mealData);
    }
    setIsDialogOpen(false);
  };

  const handleSaveCustomMeal = async () => {
    if (!activeMealType || !customFoodData.name.trim() || !customFoodData.calories) return;
    
    const numQuantity = Number(quantity);
    if(isNaN(numQuantity) || numQuantity <= 0) return;

    const baseMacros = {
        calories: Number(customFoodData.calories) || 0,
        protein: Number(customFoodData.protein) || 0,
        carbs: Number(customFoodData.carbs) || 0,
        fats: Number(customFoodData.fats) || 0,
    };

    if (editingMeal) {
        // We are just updating an existing log entry
        const mealData = {
          mealType: activeMealType,
          name: customFoodData.name,
          calories: baseMacros.calories * numQuantity,
          protein: baseMacros.protein * numQuantity,
          carbs: baseMacros.carbs * numQuantity,
          fats: baseMacros.fats * numQuantity,
          foodId: editingMeal.foodId,
          quantity: numQuantity,
          servingUnit: editingMeal.servingUnit,
          customBaseMacros: editingMeal.foodId ? null : baseMacros,
        };
        onUpdateMeal({ ...mealData, id: editingMeal.id, date: editingMeal.date });
    } else {
        // Creating a NEW log entry AND a new custom food definition
        try {
            const newCustomFood = await onSaveCustomFood({
                name: customFoodData.name,
                calories: baseMacros.calories,
                protein: baseMacros.protein,
                carbs: baseMacros.carbs,
                fats: baseMacros.fats,
            });

            const mealData = {
              mealType: activeMealType,
              name: newCustomFood.name,
              calories: newCustomFood.calories * numQuantity,
              protein: newCustomFood.protein * numQuantity,
              carbs: newCustomFood.carbs * numQuantity,
              fats: newCustomFood.fats * numQuantity,
              foodId: newCustomFood.id,
              quantity: numQuantity,
              servingUnit: 'serving',
              customBaseMacros: null,
            };
            onAddMeal(mealData);

        } catch (error) {
            console.error("Failed to save or log custom food:", error);
            toast({ title: "Error", description: "Could not save custom food.", variant: "destructive" });
        }
    }
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
        // --- Custom Food Form View (for adding or editing) ---
        return (
            <div className="space-y-4 pt-4">
                <p className="text-sm text-muted-foreground">
                    {editingMeal ? 'Edit the details for your custom food.' : 'Enter the macros for a single serving of your custom food.'}
                </p>
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
                <div className="space-y-2">
                    <Label htmlFor="custom-quantity">Quantity</Label>
                    <Input id="custom-quantity" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} min="1" step="1"/>
                </div>
                <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:pt-4">
                    <Button variant="outline" onClick={() => {
                        if (editingMeal) {
                            setIsDialogOpen(false); // If editing, just cancel.
                        } else {
                            setIsAddingCustomFood(false); // If adding, go back to search.
                        }
                    }}>
                      {editingMeal ? 'Cancel' : 'Back to Search'}
                    </Button>
                    <Button onClick={handleSaveCustomMeal} disabled={!customFoodData.name.trim() || !customFoodData.calories} className="w-full sm:w-auto">
                        {editingMeal ? 'Update Entry' : `Add to ${activeMealType}`}
                    </Button>
                </DialogFooter>
            </div>
        )
    }

      if (selectedFood) {
          // --- Confirmation View (for adding or editing DB food) ---
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
                          {`Per ${selectedFood.serving_size}: ${Math.round(selectedFood.calories)}kcal, ${selectedFood.protein_g}g P, ${selectedFood.carbs_g}g C, ${selectedFood.fat_g}g F`}
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
                        <Button variant="outline" onClick={() => editingMeal ? setIsDialogOpen(false) : setSelectedFood(null)}>
                            {editingMeal ? 'Cancel' : 'Back to Search'}
                        </Button>
                        <Button onClick={handleSaveMeal} className="w-full sm:w-auto">
                           {editingMeal ? 'Update Entry' : `Add to ${activeMealType}`}
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
                                <p className="text-sm text-muted-foreground">{Math.round(food.calories)} kcal per {food.serving_size}</p>
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
                                    <p className="text-sm text-muted-foreground">{Math.round(food.calories)} kcal per {food.serving_size}</p>
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
                              {Math.round(meal.calories)} kcal &bull; P: {Math.round(meal.protein)}g, C: {Math.round(meal.carbs)}g, F: {Math.round(meal.fats)}g
                            </p>
                          </div>
                          <div className="flex items-center">
                              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground h-8 w-8" onClick={() => handleOpenEditDialog(meal)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
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
              {editingMeal ? 'Edit Entry' : `Add Food to ${activeMealType}`}
            </DialogTitle>
            <DialogDescription>
              {editingMeal 
                ? `Update the details for "${editingMeal.name}".`
                : (isAddingCustomFood ? "Enter the details for your custom food." : "Search the database or select a recent item.")
              }
            </DialogDescription>
          </DialogHeader>
          {renderDialogContent()}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
