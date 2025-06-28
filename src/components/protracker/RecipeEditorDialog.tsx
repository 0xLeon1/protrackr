
"use client";

import { useState, useEffect, useMemo } from 'react';
import type { Recipe, RecipeIngredient, FoodDBItem } from '@/types';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { foodDatabase } from '@/lib/food-data';
import { Search, PlusCircle, Trash2, FilePlus2 } from 'lucide-react';
import { Card } from '../ui/card';
import { Separator } from '../ui/separator';
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


interface RecipeEditorProps {
    recipeToEdit: Recipe | null;
    onSave: (recipe: Omit<Recipe, 'id'> | Recipe) => void;
    onClose: () => void;
}

export default function RecipeEditorDialog({ recipeToEdit, onSave, onClose }: RecipeEditorProps) {
    const [name, setName] = useState('');
    const [servings, setServings] = useState<number | string>(1);
    const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
    
    // Ingredient adding state
    const [view, setView] = useState<'list' | 'search' | 'confirm' | 'custom'>('list');
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
    const [searchResults, setSearchResults] = useState<FoodDBItem[]>([]);
    const [selectedFood, setSelectedFood] = useState<FoodDBItem | null>(null);
    const [quantity, setQuantity] = useState<number | string>(1);
    const [servingUnit, setServingUnit] = useState('default');
    const [customFoodData, setCustomFoodData] = useState({ name: '', calories: '', protein: '', carbs: '', fats: '' });
    
    const allFoods = foodDatabase;
    
    useEffect(() => {
        if (recipeToEdit) {
            setName(recipeToEdit.name);
            setServings(recipeToEdit.servings);
            setIngredients(recipeToEdit.ingredients);
        }
    }, [recipeToEdit]);

    useEffect(() => {
        const handler = setTimeout(() => setDebouncedQuery(searchQuery), 150);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    useEffect(() => {
        if (debouncedQuery.trim().length < 2) {
          setSearchResults([]);
          return;
        }
        const lowerCaseQuery = debouncedQuery.toLowerCase();
        const filtered = allFoods.filter(food => food.name.toLowerCase().includes(lowerCaseQuery) || food.common_names.some(cn => cn.toLowerCase().includes(lowerCaseQuery)));
        setSearchResults(filtered.slice(0, 50));
    }, [debouncedQuery, allFoods]);

    const resetIngredientState = () => {
        setSearchQuery('');
        setSelectedFood(null);
        setQuantity(1);
        setServingUnit('default');
        setCustomFoodData({ name: '', calories: '', protein: '', carbs: '', fats: '' });
        setView('list');
    };
    
    const handleSelectFood = (food: FoodDBItem) => {
        setSelectedFood(food);
        setView('confirm');
    };

    const handleConfirmIngredient = () => {
        if (!selectedFood || !quantity) return;
        const numQuantity = Number(quantity);
        if (isNaN(numQuantity) || numQuantity <= 0) return;

        let multiplier = numQuantity;
        if (servingUnit !== 'default' && selectedFood.unit_conversions[servingUnit]) {
            multiplier *= selectedFood.unit_conversions[servingUnit];
        }
        
        const newIngredient: RecipeIngredient = {
            id: `ing-${Date.now()}`,
            name: selectedFood.name,
            quantity: numQuantity,
            servingUnit,
            calories: selectedFood.calories * multiplier,
            protein: selectedFood.protein_g * multiplier,
            carbs: selectedFood.carbs_g * multiplier,
            fats: selectedFood.fat_g * multiplier,
            foodId: selectedFood.food_id,
            customBaseMacros: null,
        };
        
        setIngredients(prev => [...prev, newIngredient]);
        resetIngredientState();
    };

    const handleConfirmCustomIngredient = () => {
        if (!customFoodData.name.trim() || !customFoodData.calories) return;
        const numQuantity = Number(quantity);
        if(isNaN(numQuantity) || numQuantity <= 0) return;

        const baseMacros = {
            calories: Number(customFoodData.calories) || 0,
            protein: Number(customFoodData.protein) || 0,
            carbs: Number(customFoodData.carbs) || 0,
            fats: Number(customFoodData.fats) || 0,
        };

        const newIngredient: RecipeIngredient = {
            id: `ing-${Date.now()}`,
            name: customFoodData.name,
            quantity: numQuantity,
            servingUnit: 'serving',
            calories: baseMacros.calories * numQuantity,
            protein: baseMacros.protein * numQuantity,
            carbs: baseMacros.carbs * numQuantity,
            fats: baseMacros.fats * numQuantity,
            customBaseMacros: baseMacros,
        };
        
        setIngredients(prev => [...prev, newIngredient]);
        resetIngredientState();
    };

    const handleCustomFoodChange = (field: keyof typeof customFoodData, value: string) => {
        setCustomFoodData(prev => ({...prev, [field]: value}));
    };

    const handleRemoveIngredient = (id: string) => {
        setIngredients(prev => prev.filter(ing => ing.id !== id));
    };

    const handleSaveRecipe = () => {
        const numServings = Number(servings);
        if (!name.trim() || isNaN(numServings) || numServings <= 0 || ingredients.length === 0) {
            // Add some user feedback here, e.g., toast
            return;
        }

        const recipeData = {
            name,
            servings: numServings,
            ingredients,
        };

        if (recipeToEdit) {
            onSave({ ...recipeData, id: recipeToEdit.id });
        } else {
            onSave(recipeData);
        }
    };

    const totals = useMemo(() => {
        return ingredients.reduce((acc, ing) => {
            acc.calories += ing.calories;
            acc.protein += ing.protein;
            acc.carbs += ing.carbs;
            acc.fats += ing.fats;
            return acc;
        }, { calories: 0, protein: 0, carbs: 0, fats: 0 });
    }, [ingredients]);

    const perServing = useMemo(() => {
        const numServings = Number(servings) || 1;
        return {
            calories: totals.calories / numServings,
            protein: totals.protein / numServings,
            carbs: totals.carbs / numServings,
            fats: totals.fats / numServings,
        };
    }, [totals, servings]);


    const renderIngredientAdder = () => {
        switch (view) {
            case 'search':
                return (
                    <div className="p-1">
                         <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input placeholder="Search for a food..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} autoFocus />
                        </div>
                        <ScrollArea className="h-60 mt-2">
                             {searchResults.length > 0 ? (
                                searchResults.map(food => (
                                    <div key={food.food_id} className="p-3 rounded-md hover:bg-muted cursor-pointer" onClick={() => handleSelectFood(food)}>
                                        <p className="font-medium">{capitalizeWords(food.name)}</p>
                                        <p className="text-sm text-muted-foreground">{food.calories} kcal per {food.serving_size}</p>
                                    </div>
                                ))
                            ) : debouncedQuery.trim().length > 1 ? (
                                <div className="text-center text-muted-foreground pt-10 flex flex-col items-center">
                                    <p>No results found for "{searchQuery}".</p>
                                    <Button variant="link" className="mt-2" onClick={() => {
                                        setCustomFoodData(prev => ({ ...prev, name: capitalizeWords(searchQuery) }));
                                        setView('custom');
                                    }}>
                                        <FilePlus2 className="mr-2 h-4 w-4"/>
                                        Add as a custom food
                                    </Button>
                                </div>
                            ) : (
                                <div className="text-center text-muted-foreground pt-10"><p>Start typing to search the food database.</p></div>
                            )}
                        </ScrollArea>
                        <Button variant="outline" className="w-full mt-4" onClick={() => setView('list')}>Cancel</Button>
                    </div>
                );
            case 'confirm':
                if (!selectedFood) return null;
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
                };
                return (
                    <div className="space-y-4 p-1">
                        <Card className="p-4 bg-muted/50 text-sm">
                            <p className="font-bold">{capitalizeWords(selectedFood.name)}</p>
                            <p className="text-xs text-muted-foreground">
                                {`Per ${selectedFood.serving_size}: ${selectedFood.calories}kcal, ${selectedFood.protein_g}g P, ${selectedFood.carbs_g}g C, ${selectedFood.fat_g}g F`}
                            </p>
                        </Card>
                        <div className="grid grid-cols-5 gap-4">
                            <div className="space-y-1 col-span-2">
                                <Label htmlFor="quantity">Quantity</Label>
                                <Input id="quantity" type="number" value={quantity} onChange={e => setQuantity(e.target.value)} min="0.1" step="0.1"/>
                            </div>
                            <div className="space-y-1 col-span-3">
                                <Label htmlFor="serving-unit">Serving</Label>
                                <Select value={servingUnit} onValueChange={setServingUnit}>
                                    <SelectTrigger id="serving-unit"><SelectValue placeholder="Select a unit" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="default">{selectedFood.serving_size}</SelectItem>
                                        {Object.keys(selectedFood.unit_conversions).map(unit => (<SelectItem key={unit} value={unit}>{capitalizeWords(unit)}</SelectItem>))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <Separator />
                        <div className="text-center font-medium">
                            <p className="text-lg">{calculatedMacros.calories} kcal</p>
                            <p className="text-xs text-muted-foreground">{calculatedMacros.protein}g P, {calculatedMacros.carbs}g C, {calculatedMacros.fats}g F</p>
                        </div>
                        <div className="flex gap-2 pt-2">
                            <Button variant="outline" className="w-full" onClick={() => setView('search')}>Back</Button>
                            <Button className="w-full" onClick={handleConfirmIngredient}>Add Ingredient</Button>
                        </div>
                    </div>
                );
            case 'custom':
                 return (
                    <div className="space-y-4 p-1">
                        <div className="space-y-1">
                            <Label htmlFor="custom-name">Food Name</Label>
                            <Input id="custom-name" value={customFoodData.name} onChange={(e) => handleCustomFoodChange('name', e.target.value)} placeholder="e.g., Grandma's Lasagna" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1"><Label htmlFor="custom-calories">Calories</Label><Input id="custom-calories" type="number" value={customFoodData.calories} onChange={(e) => handleCustomFoodChange('calories', e.target.value)} placeholder="kcal" /></div>
                            <div className="space-y-1"><Label htmlFor="custom-protein">Protein (g)</Label><Input id="custom-protein" type="number" value={customFoodData.protein} onChange={(e) => handleCustomFoodChange('protein', e.target.value)} placeholder="grams" /></div>
                            <div className="space-y-1"><Label htmlFor="custom-carbs">Carbs (g)</Label><Input id="custom-carbs" type="number" value={customFoodData.carbs} onChange={(e) => handleCustomFoodChange('carbs', e.target.value)} placeholder="grams" /></div>
                            <div className="space-y-1"><Label htmlFor="custom-fats">Fats (g)</Label><Input id="custom-fats" type="number" value={customFoodData.fats} onChange={(e) => handleCustomFoodChange('fats', e.target.value)} placeholder="grams" /></div>
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="custom-quantity">Quantity</Label>
                            <Input id="custom-quantity" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} min="1" step="1"/>
                        </div>
                        <div className="flex gap-2 pt-2">
                            <Button variant="outline" className="w-full" onClick={() => setView('search')}>Back</Button>
                            <Button className="w-full" onClick={handleConfirmCustomIngredient} disabled={!customFoodData.name.trim() || !customFoodData.calories}>Add Ingredient</Button>
                        </div>
                    </div>
                );

            default: // 'list' view
                return (
                    <div className="p-1">
                        <Button className="w-full" onClick={() => setView('search')}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Ingredient
                        </Button>
                    </div>
                );
        }
    };

    return (
        <>
            <DialogHeader>
                <DialogTitle>{recipeToEdit ? 'Edit Recipe' : 'Create a New Recipe'}</DialogTitle>
                <DialogDescription>
                    Build your recipe by adding ingredients, then specify the total number of servings.
                </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 h-full overflow-hidden">
                {/* Left Side: Recipe Info & Ingredients List */}
                <div className="flex flex-col gap-4 h-full">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="recipe-name">Recipe Name</Label>
                            <Input id="recipe-name" placeholder="e.g. Protein Pancakes" value={name} onChange={(e) => setName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="recipe-servings">Servings</Label>
                            <Input id="recipe-servings" type="number" placeholder="e.g. 4" value={servings} onChange={(e) => setServings(e.target.value)} min="1" />
                        </div>
                    </div>
                    <Separator />
                    <Label>Ingredients</Label>
                    <ScrollArea className="flex-1 -mt-2">
                        <div className="space-y-2 pr-4">
                            {ingredients.length > 0 ? ingredients.map(ing => (
                                <Card key={ing.id} className="p-2 flex justify-between items-center text-sm">
                                    <div>
                                        <p className="font-medium">{capitalizeWords(ing.name)}</p>
                                        <p className="text-xs text-muted-foreground">{ing.quantity} {ing.servingUnit}</p>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleRemoveIngredient(ing.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </Card>
                            )) : (
                                <div className="text-center text-muted-foreground text-sm py-8 border-dashed border rounded-lg">
                                    <p>No ingredients yet.</p>
                                    <p>Add one to get started.</p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>
                
                {/* Right Side: Ingredient Adder & Macro Summary */}
                <div className="flex flex-col gap-4 bg-muted/50 p-4 rounded-lg h-full overflow-y-auto">
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-2">Add Ingredients</h3>
                        {renderIngredientAdder()}
                    </div>
                    <div className="space-y-3">
                        <Separator />
                        <div>
                            <h3 className="text-lg font-semibold">Total Macros</h3>
                            <div className="text-sm text-muted-foreground grid grid-cols-4 gap-2">
                                <span>{Math.round(totals.calories)} kcal</span>
                                <span>{Math.round(totals.protein)}g P</span>
                                <span>{Math.round(totals.carbs)}g C</span>
                                <span>{Math.round(totals.fats)}g F</span>
                            </div>
                        </div>
                         <div>
                            <h3 className="text-lg font-semibold">Macros Per Serving</h3>
                            <div className="text-sm text-muted-foreground grid grid-cols-4 gap-2">
                                <span>{Math.round(perServing.calories)} kcal</span>
                                <span>{Math.round(perServing.protein)}g P</span>
                                <span>{Math.round(perServing.carbs)}g C</span>
                                <span>{Math.round(perServing.fats)}g F</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <DialogFooter className="pt-4">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button onClick={handleSaveRecipe}>Save Recipe</Button>
            </DialogFooter>
        </>
    );
}

