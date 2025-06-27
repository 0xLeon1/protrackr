
"use client";

import { useState, useMemo, useEffect } from "react";
import type { FoodLogEntry, MealType, FoodDataItem } from "@/types";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Trash2, Loader2, ArrowLeft, Pencil, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getCommonFoodDetails, searchFoods } from "@/lib/food";
import { GRAMS_PER_OUNCE } from "@/lib/constants";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";

function capitalizeWords(str: string): string {
    if (!str) return '';
    return str.toLowerCase()
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

const MEAL_TYPES: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Other'];
const RECENT_FOODS_KEY_PREFIX = 'protracker-recents-';
const MAX_RECENT_FOODS = 5;

interface MealDiaryProps {
  logs: FoodLogEntry[];
  onAddMeal: (meal: Omit<FoodLogEntry, 'id' | 'date'>) => void;
  onDeleteMeal: (mealId: string) => void;
  onUpdateMeal: (meal: FoodLogEntry) => void;
}

export default function MealDiary({ logs, onAddMeal, onDeleteMeal, onUpdateMeal }: MealDiaryProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeMealType, setActiveMealType] = useState<MealType | null>(null);

  // Dialog view state
  const [view, setView] = useState<'search' | 'manual'>('search');
  const [selectedFood, setSelectedFood] = useState<FoodDataItem | null>(null);
  const [editingLog, setEditingLog] = useState<FoodLogEntry | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FoodDataItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);

  // Serving size state
  const [amount, setAmount] = useState("1");
  const [unit, setUnit] = useState<string>("serving");
  
  // Recent foods state
  const [recentFoods, setRecentFoods] = useState<FoodDataItem[]>([]);

  // Custom food form state
  const [customFood, setCustomFood] = useState({ name: '', calories: '', protein: '', carbs: '', fats: '' });
  
  const { toast } = useToast();
  const { user } = useAuth();
  
  const getRecentFoods = (userId: string): FoodDataItem[] => {
      const key = `${RECENT_FOODS_KEY_PREFIX}${userId}`;
      const stored = localStorage.getItem(key);
      try {
        return stored ? JSON.parse(stored) : [];
      } catch (e) {
        return [];
      }
  };

  const addRecentFood = (userId: string, food: FoodDataItem) => {
      if (!food.name || typeof food.calories === 'undefined') return; // Don't save incomplete items
      const key = `${RECENT_FOODS_KEY_PREFIX}${userId}`;
      let recents = getRecentFoods(userId);
      
      // Remove existing instance of the same food to move it to the front
      recents = recents.filter(f => f.name.toLowerCase() !== food.name.toLowerCase());
      
      // Add new food to the front
      recents.unshift(food);
      
      // Trim the list to the max size
      if (recents.length > MAX_RECENT_FOODS) {
          recents = recents.slice(0, MAX_RECENT_FOODS);
      }
      
      localStorage.setItem(key, JSON.stringify(recents));
  };
  
  // Effect to load recent foods when dialog opens
  useEffect(() => {
    if (isDialogOpen && user) {
        const recents = getRecentFoods(user.uid);
        setRecentFoods(recents);
    }
  }, [isDialogOpen, user]);

  // Effect to handle searching
  useEffect(() => {
    if (view !== 'search' || !isDialogOpen || selectedFood) {
      return;
    }

    const handler = setTimeout(async () => {
      // Only start searching after 2 characters have been typed
      if (searchQuery.trim().length > 1) {
        setIsSearching(true);
        const results = await searchFoods(searchQuery);
        setSearchResults(results);
        setIsSearching(false);
      } else {
        setSearchResults([]);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(handler);
  }, [searchQuery, view, isDialogOpen, selectedFood]);
  
  // When a food is selected, intelligently set the default amount and unit.
  useEffect(() => {
    if (selectedFood) {
      if (selectedFood.servingUnit && selectedFood.servingWeightGrams) {
        setUnit("serving");
        setAmount(String(selectedFood.servingQty || 1));
      } else {
        setUnit("g");
        setAmount("100");
      }
    }
  }, [selectedFood]);


  const resetDialogState = () => {
    setSearchQuery("");
    setSearchResults([]);
    setIsSearching(false);
    setIsFetchingDetails(false);
    setSelectedFood(null);
    setEditingLog(null);
    setAmount("1");
    setUnit("serving");
    setView('search');
    setCustomFood({ name: '', calories: '', protein: '', carbs: '', fats: '' });
  };

  const calculatedMacros = useMemo(() => {
    if (!selectedFood || typeof selectedFood.calories === 'undefined') {
       return { calories: 0, protein: 0, carbs: 0, fats: 0 };
    }
    
    const numAmount = parseFloat(amount) || 0;
    let totalGrams = 0;

    if (unit === 'g') {
        totalGrams = numAmount;
    } else if (unit === 'oz') {
        totalGrams = numAmount * GRAMS_PER_OUNCE;
    } else if (unit === 'serving' && selectedFood.servingWeightGrams) {
        totalGrams = numAmount * selectedFood.servingWeightGrams;
    }

    const ratio = totalGrams > 0 ? totalGrams / 100 : 0;

    return {
      calories: Math.round((selectedFood.calories || 0) * ratio),
      protein: parseFloat(((selectedFood.protein || 0) * ratio).toFixed(1)),
      carbs: parseFloat(((selectedFood.carbs || 0) * ratio).toFixed(1)),
      fats: parseFloat(((selectedFood.fats || 0) * ratio).toFixed(1)),
    };
  }, [selectedFood, amount, unit]);

  const handleOpenDialog = (mealType: MealType) => {
    setActiveMealType(mealType);
    setIsDialogOpen(true);
  };
  
  const handleEditClick = (log: FoodLogEntry) => {
    setEditingLog(log);
    setActiveMealType(log.mealType);
    
    if (log.foodDetails) { // It's a food from the database
        setSelectedFood(log.foodDetails);
        setAmount(String(log.servingAmount));
        setUnit(log.servingUnit);
    } else { // It's a custom/manual entry
        setView('manual');
        setCustomFood({
            name: log.name,
            calories: String(log.calories),
            protein: String(log.protein),
            carbs: String(log.carbs),
            fats: String(log.fats),
        });
    }
    setIsDialogOpen(true);
  };

  const handleSelectFood = async (food: FoodDataItem) => {
    // Since common foods are now pre-fetched with details, this logic simplifies
    setSelectedFood(food);
  };

  const handleSaveMeal = () => {
    if (!activeMealType || !selectedFood || !user) return;
    const numAmount = parseFloat(amount) || 0;
    
    const mealData = {
      mealType: activeMealType,
      name: selectedFood.name,
      ...calculatedMacros,
      servingAmount: numAmount,
      servingUnit: unit,
      foodDetails: selectedFood,
    };

    if (editingLog) {
        onUpdateMeal({ ...editingLog, ...mealData });
    } else {
        addRecentFood(user.uid, selectedFood);
        onAddMeal(mealData);
    }
    setIsDialogOpen(false);
  };

  const handleCustomFoodChange = (field: keyof Omit<typeof customFood, 'name'>, value: string) => {
    setCustomFood(prev => ({ ...prev, [field]: value.replace(/[^0-9.]/g, '') }));
  };
  
  const handleSaveCustomMeal = () => {
      if (!activeMealType || !customFood.name || !customFood.calories || !user) return;
      
      const mealData = {
          mealType: activeMealType,
          name: customFood.name,
          calories: parseFloat(customFood.calories) || 0,
          protein: parseFloat(customFood.protein) || 0,
          carbs: parseFloat(customFood.carbs) || 0,
          fats: parseFloat(customFood.fats) || 0,
          servingAmount: 1,
          servingUnit: 'serving',
          foodDetails: null, // No details for custom food
      };
      
      if (editingLog) {
          onUpdateMeal({ ...editingLog, ...mealData });
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

  const renderDialogContent = () => {
    if (isFetchingDetails) {
        return (
            <div className="flex justify-center items-center h-60">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    if (selectedFood) {
      // DETAILS VIEW
      return (
        <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={() => setSelectedFood(null)} className="-ml-4">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Search
            </Button>
            <h3 className="font-semibold text-lg">{capitalizeWords(selectedFood.name)}</h3>
            {selectedFood.brandName && (
                <p className="text-sm text-muted-foreground -mt-3">{capitalizeWords(selectedFood.brandName)}</p>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input id="amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Select value={unit} onValueChange={(value: string) => setUnit(value)}>
                  <SelectTrigger id="unit">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedFood.servingUnit && selectedFood.servingWeightGrams && (
                       <SelectItem value="serving">
                          {capitalizeWords(selectedFood.servingUnit)} ({Math.round(selectedFood.servingWeightGrams)}g)
                       </SelectItem>
                    )}
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
              <Button onClick={handleSaveMeal} className="w-full">
                {editingLog ? 'Update Food' : `Add to ${activeMealType}`}
              </Button>
            </DialogFooter>
        </div>
      );
    }

    if (view === 'manual') {
      // MANUAL INPUT VIEW
      return (
         <div className="space-y-4">
            {!editingLog && (
                <Button variant="ghost" size="sm" onClick={() => setView('search')} className="-ml-4">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back to Search
                </Button>
            )}
            <div className="space-y-2">
              <Label htmlFor="custom-name">Food Name</Label>
              <Input id="custom-name" value={customFood.name} onChange={e => setCustomFood(prev => ({...prev, name: e.target.value}))} placeholder="e.g., Homemade Lasagna" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="custom-calories">Calories</Label>
                    <Input id="custom-calories" type="number" value={customFood.calories} onChange={e => handleCustomFoodChange('calories', e.target.value)} placeholder="kcal"/>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="custom-protein">Protein</Label>
                    <Input id="custom-protein" type="number" value={customFood.protein} onChange={e => handleCustomFoodChange('protein', e.target.value)} placeholder="grams"/>
                </div>
            </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="custom-carbs">Carbs</Label>
                    <Input id="custom-carbs" type="number" value={customFood.carbs} onChange={e => handleCustomFoodChange('carbs', e.target.value)} placeholder="grams"/>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="custom-fats">Fats</Label>
                    <Input id="custom-fats" type="number" value={customFood.fats} onChange={e => handleCustomFoodChange('fats', e.target.value)} placeholder="grams"/>
                </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSaveCustomMeal} className="w-full">
                {editingLog ? 'Update Custom Food' : 'Log Custom Food'}
              </Button>
            </DialogFooter>
         </div>
      );
    }
    
    // SEARCH VIEW (default)
    return (
      <div className="space-y-4">
        <div className="relative">
          <Input
            placeholder="Search for a food..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" />}
        </div>
        <ScrollArea className="h-60">
          {searchResults.length > 0 ? (
            <div className="space-y-2">
              {searchResults.map(food => {
                const subtitleParts = [];

                if (food.dataType === 'branded' && food.brandName) {
                    subtitleParts.push(capitalizeWords(food.brandName));
                }

                if (food.servingQty && food.servingUnit) {
                    let servingString = `${food.servingQty} ${capitalizeWords(food.servingUnit)}`;
                    if (food.servingWeightGrams) {
                        servingString += ` (${Math.round(food.servingWeightGrams)}g)`;
                    }
                    subtitleParts.push(servingString);
                }
                
                if (typeof food.caloriesPerServing !== 'undefined') {
                    subtitleParts.push(`${food.caloriesPerServing} kcal`);
                } else if (food.dataType === 'common' && typeof food.calories !== 'undefined') {
                    subtitleParts.push('Common Food');
                    subtitleParts.push(`${food.calories} kcal per 100g`);
                }
                
                const subtitle = subtitleParts.length > 0 ? subtitleParts.join(' - ') : (food.dataType === 'common' ? 'Common Food' : 'Branded Food');

                return (
                  <button key={`${food.id}-${food.name}`} onClick={() => handleSelectFood(food)} className="w-full text-left p-2 rounded-md hover:bg-muted text-sm">
                    <p>{capitalizeWords(food.name)}</p>
                    <p className="text-xs text-muted-foreground">
                      {subtitle}
                    </p>
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-4">
              {searchQuery.trim().length > 1 ? (isSearching ? 'Searching...' : 'No results found.') : 'Type at least 2 characters to search.'}
            </p>
          )}
        </ScrollArea>
        
        <Separator />
        
        <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">Recently Logged</h4>
            {recentFoods.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                    {recentFoods.map(food => (
                        <Button
                            key={`${food.id}-${food.name}`}
                            variant="outline"
                            size="sm"
                            className="h-auto py-1 px-2.5"
                            onClick={() => handleSelectFood(food)}
                        >
                            {capitalizeWords(food.name)}
                        </Button>
                    ))}
                </div>
            ) : (
                <p className="text-center text-xs text-muted-foreground py-2">
                    Your recently logged foods will appear here.
                </p>
            )}
        </div>

        <Separator />
        <Button variant="link" className="p-0 h-auto" onClick={() => setView('manual')}>
          Can't find it? Add a custom food
        </Button>
      </div>
    );
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
              <AccordionTrigger asChild className="px-4 hover:no-underline">
                 <div className="flex w-full items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-4">
                      <DialogTrigger asChild onClick={(e) => { e.stopPropagation(); handleOpenDialog(mealType); }}>
                        <Button variant="ghost" size="icon" className="text-accent hover:text-accent/90 rounded-full">
                          <PlusCircle className="w-6 h-6" />
                        </Button>
                      </DialogTrigger>
                      <div className="flex flex-col items-start text-left">
                        <span className="text-lg font-semibold">{mealType}</span>
                        <span className="text-xs text-muted-foreground">{macroSummary(mealType)}</span>
                      </div>
                    </div>
                    <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
                  </div>
              </AccordionTrigger>
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
              {selectedFood ? 'Adjust serving size and save.' : (view === 'search' ? 'Search for a food to log.' : 'Log a custom food.')}
            </DialogDescription>
          </DialogHeader>
          {renderDialogContent()}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
