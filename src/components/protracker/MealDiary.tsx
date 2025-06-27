
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
import { getCommonFoodDetails, searchFoods } from "@/lib/food";
import { GRAMS_PER_OUNCE } from "@/lib/constants";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

const MEAL_TYPES: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Other'];

interface MealDiaryProps {
  logs: FoodLogEntry[];
  onAddMeal: (meal: Omit<FoodLogEntry, 'id' | 'date'>) => void;
  onDeleteMeal: (mealId: string) => void;
}

export default function MealDiary({ logs, onAddMeal, onDeleteMeal }: MealDiaryProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeMealType, setActiveMealType] = useState<MealType | null>(null);

  // Dialog view state
  const [view, setView] = useState<'search' | 'manual'>('search');
  const [selectedFood, setSelectedFood] = useState<FoodDataItem | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FoodDataItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);

  // Serving size state
  const [amount, setAmount] = useState("100");
  const [unit, setUnit] = useState<"g" | "oz">("g");

  // Custom food form state
  const [customFood, setCustomFood] = useState({ name: '', calories: '', protein: '', carbs: '', fats: '' });
  
  const { toast } = useToast();

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


  const resetDialogState = () => {
    setSearchQuery("");
    setSearchResults([]);
    setIsSearching(false);
    setIsFetchingDetails(false);
    setSelectedFood(null);
    setAmount("100");
    setUnit("g");
    setView('search');
    setCustomFood({ name: '', calories: '', protein: '', carbs: '', fats: '' });
  };

  const calculatedMacros = useMemo(() => {
    if (!selectedFood || typeof selectedFood.calories === 'undefined') {
       return { calories: 0, protein: 0, carbs: 0, fats: 0 };
    }
    
    const numAmount = parseFloat(amount) || 0;
    const totalGrams = unit === 'g' ? numAmount : numAmount * GRAMS_PER_OUNCE;
    const ratio = totalGrams / 100;

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
  
  const handleSelectFood = async (food: FoodDataItem) => {
    if (food.dataType === 'branded') {
      setSelectedFood(food);
    } else {
      // It's a common food, we need to fetch its details
      setIsFetchingDetails(true);
      const detailedFood = await getCommonFoodDetails(food.name);
      setIsFetchingDetails(false);
      
      if (detailedFood) {
        setSelectedFood(detailedFood);
      } else {
        toast({
            title: "Could not get details",
            description: "Sorry, we couldn't fetch the nutritional details for that item. Please try adding it manually.",
            variant: "destructive"
        });
        // Switch to manual entry view with the food name pre-filled
        setView('manual');
        setCustomFood(prev => ({...prev, name: food.name}));
      }
    }
  };

  const handleSaveSearchedMeal = () => {
    if (!activeMealType || !selectedFood) return;

    const newMeal: Omit<FoodLogEntry, 'id' | 'date'> = {
      mealType: activeMealType,
      name: `${selectedFood.name}`,
      ...calculatedMacros,
    };

    onAddMeal(newMeal);
    setIsDialogOpen(false);
  };

  const handleCustomFoodChange = (field: keyof Omit<typeof customFood, 'name'>, value: string) => {
    setCustomFood(prev => ({ ...prev, [field]: value.replace(/[^0-9.]/g, '') }));
  };
  
  const handleSaveCustomMeal = () => {
      if (!activeMealType || !customFood.name || !customFood.calories) return;
      
      const newMeal: Omit<FoodLogEntry, 'id' | 'date'> = {
          mealType: activeMealType,
          name: customFood.name,
          calories: parseFloat(customFood.calories) || 0,
          protein: parseFloat(customFood.protein) || 0,
          carbs: parseFloat(customFood.carbs) || 0,
          fats: parseFloat(customFood.fats) || 0,
      };

      onAddMeal(newMeal);
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
              <Button onClick={handleSaveSearchedMeal} className="w-full">Add to {activeMealType}</Button>
            </DialogFooter>
        </div>
      );
    }

    if (view === 'manual') {
      // MANUAL INPUT VIEW
      return (
         <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={() => setView('search')} className="-ml-4">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Search
            </Button>
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
              <Button onClick={handleSaveCustomMeal} className="w-full">Log Custom Food</Button>
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
              {searchResults.map(food => (
                <button key={`${food.id}-${food.name}`} onClick={() => handleSelectFood(food)} className="w-full text-left p-2 rounded-md hover:bg-muted text-sm">
                  <p>{food.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {food.dataType === 'branded' ? `${Math.round(food.calories || 0)} kcal per 100g` : 'Common Food'}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-4">
              {searchQuery.trim().length > 1 ? (isSearching ? 'Searching...' : 'No results found.') : 'Type at least 2 characters to search.'}
            </p>
          )}
        </ScrollArea>
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
              <AccordionTrigger className="px-4 hover:no-underline">
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
