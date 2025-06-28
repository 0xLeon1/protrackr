
"use client";

import { useState, useMemo } from "react";
import type { Recipe, MealType, FoodLogEntry } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PlusCircle, Trash2, Edit, FilePlus, ChevronRight } from 'lucide-react';
import { Separator } from "@/components/ui/separator";
import RecipeEditorDialog from "./RecipeEditorDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select"

const MEAL_TYPES: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Other'];

interface RecipeBookProps {
  recipes: Recipe[];
  onAddMeal: (meal: Omit<FoodLogEntry, 'id' | 'date'>) => void;
  onSaveRecipe: (recipe: Omit<Recipe, 'id'>) => void;
  onUpdateRecipe: (recipe: Recipe) => void;
  onDeleteRecipe: (recipeId: string) => void;
}

export default function RecipeBook({ recipes, onAddMeal, onSaveRecipe, onUpdateRecipe, onDeleteRecipe }: RecipeBookProps) {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  
  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);
  const [recipeToLog, setRecipeToLog] = useState<Recipe | null>(null);
  const [logToMealType, setLogToMealType] = useState<MealType>('Breakfast');


  const handleCreateNew = () => {
    setEditingRecipe(null);
    setIsEditorOpen(true);
  };

  const handleEditRecipe = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setIsEditorOpen(true);
  };
  
  const handleSave = (recipe: Omit<Recipe, 'id'> | Recipe) => {
    if ('id' in recipe) {
        onUpdateRecipe(recipe);
    } else {
        onSaveRecipe(recipe);
    }
    setIsEditorOpen(false);
  };

  const handleOpenLogDialog = (recipe: Recipe) => {
    setRecipeToLog(recipe);
    setIsLogDialogOpen(true);
  };

  const handleConfirmLogRecipe = () => {
    if (!recipeToLog) return;
    
    const totalMacros = recipeToLog.ingredients.reduce((acc, ing) => {
      acc.calories += ing.calories;
      acc.protein += ing.protein;
      acc.carbs += ing.carbs;
      acc.fats += ing.fats;
      return acc;
    }, { calories: 0, protein: 0, carbs: 0, fats: 0 });

    const servings = recipeToLog.servings || 1;

    const mealLog = {
      mealType: logToMealType,
      name: `${recipeToLog.name} (1 serving)`,
      calories: totalMacros.calories / servings,
      protein: totalMacros.protein / servings,
      carbs: totalMacros.carbs / servings,
      fats: totalMacros.fats / servings,
      quantity: 1,
      servingUnit: "serving",
    }

    onAddMeal(mealLog);
    setIsLogDialogOpen(false);
    setRecipeToLog(null);
  };

  const perServingMacros = (recipe: Recipe) => {
    const total = recipe.ingredients.reduce((acc, ing) => {
      acc.calories += ing.calories;
      acc.protein += ing.protein;
      acc.carbs += ing.carbs;
      acc.fats += ing.fats;
      return acc;
    }, { calories: 0, protein: 0, carbs: 0, fats: 0 });

    const servings = recipe.servings > 0 ? recipe.servings : 1;
    return {
      calories: Math.round(total.calories / servings),
      protein: Math.round(total.protein / servings),
      carbs: Math.round(total.carbs / servings),
      fats: Math.round(total.fats / servings),
    };
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>My Recipes</CardTitle>
                <CardDescription>Create and manage your custom recipes.</CardDescription>
            </div>
            <Button onClick={handleCreateNew}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Recipe
            </Button>
        </CardHeader>
        <CardContent>
          {recipes.length > 0 ? (
            <Accordion type="multiple" className="w-full space-y-2">
              {recipes.map((recipe) => {
                const servingMacros = perServingMacros(recipe);
                return (
                    <AccordionItem value={recipe.id} key={recipe.id} className="border rounded-lg bg-card hover:bg-muted/50 transition-colors">
                        <AccordionTrigger className="px-4 text-base font-medium hover:no-underline w-full">
                            <div className="flex-1 text-left">
                                <p className="font-semibold">{recipe.name}</p>
                                <p className="text-sm text-muted-foreground">
                                    {`1 serving: ${servingMacros.calories} kcal, ${servingMacros.protein}g P, ${servingMacros.carbs}g C, ${servingMacros.fats}g F`}
                                </p>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-4 border-t bg-background rounded-b-lg">
                            <div className="space-y-4">
                                <div>
                                    <h4 className="font-semibold">Ingredients ({recipe.ingredients.length})</h4>
                                    <p className="text-xs text-muted-foreground">{recipe.servings} serving(s) total</p>
                                </div>
                                <ul className="space-y-2 text-sm">
                                    {recipe.ingredients.map(ing => (
                                        <li key={ing.id} className="flex justify-between items-center bg-muted/30 p-2 rounded-md">
                                            <span>{ing.quantity} {ing.servingUnit} {ing.name}</span>
                                            <span className="text-muted-foreground text-xs">{Math.round(ing.calories)} kcal</span>
                                        </li>
                                    ))}
                                </ul>
                                <Separator />
                                <div className="flex justify-end gap-2">
                                    <Button variant="outline" size="sm" onClick={() => handleOpenLogDialog(recipe)}>Log Serving</Button>
                                    <Button variant="secondary" size="sm" onClick={() => handleEditRecipe(recipe)}><Edit className="h-4 w-4 mr-2" />Edit</Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" size="sm"><Trash2 className="h-4 w-4 mr-2" />Delete</Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Delete "{recipe.name}"?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                This action cannot be undone. This will permanently delete this recipe.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => onDeleteRecipe(recipe.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                );
            })}
            </Accordion>
          ) : (
             <div className="flex flex-col items-center justify-center p-12 text-center border-dashed border rounded-lg">
               <FilePlus className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                You haven't created any recipes yet.
              </p>
              <p className="text-xs text-muted-foreground">Click "Create Recipe" to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Recipe Editor Dialog */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-3xl h-[90vh]">
            <RecipeEditorDialog 
                recipeToEdit={editingRecipe}
                onSave={handleSave}
                onClose={() => setIsEditorOpen(false)}
            />
        </DialogContent>
      </Dialog>
      
      {/* Log Recipe Dialog */}
      <Dialog open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Log Recipe</DialogTitle>
            <DialogDescription>
              Add 1 serving of "{recipeToLog?.name}" to which meal?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={logToMealType} onValueChange={(v) => setLogToMealType(v as MealType)}>
                <SelectTrigger>
                    <SelectValue placeholder="Select a meal" />
                </SelectTrigger>
                <SelectContent>
                    {MEAL_TYPES.map(mealType => (
                        <SelectItem key={mealType} value={mealType}>{mealType}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>
          <Button onClick={handleConfirmLogRecipe} className="w-full">
            Log to {logToMealType}
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
