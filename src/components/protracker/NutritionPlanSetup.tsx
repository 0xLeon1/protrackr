
"use client";

import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import type { MacroPlan, UserProfile, WeeklyMacroGoal } from '@/types';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';

interface NutritionPlanSetupProps {
    isOpen: boolean;
    onClose: () => void;
    onPlanSet: () => void;
}

export default function NutritionPlanSetup({ isOpen, onClose, onPlanSet }: NutritionPlanSetupProps) {
    const { user, profile } = useAuth();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const calculatedPlan = useMemo<WeeklyMacroGoal[]>(() => {
        if (!profile) return [];
        
        const { initialWeight, goalWeight, transformationTarget } = profile;
        const totalWeeks = parseInt(transformationTarget, 10);
        const isCutting = goalWeight < initialWeight;

        // Simplified TDEE & Deficit/Surplus Calculation
        const maintenanceCals = initialWeight * 15;
        const startingCalories = isCutting ? maintenanceCals - 500 : maintenanceCals + 300;
        
        const plan: WeeklyMacroGoal[] = [];

        for (let i = 0; i < totalWeeks; i++) {
            const week = i + 1;
            // Adjust calories every 4 weeks
            const calorieAdjustment = Math.floor(i / 4) * (isCutting ? -100 : 100);
            const weeklyCalories = Math.round((startingCalories + calorieAdjustment) / 10) * 10;
            
            // Calculate Macros
            const proteinGrams = Math.round(goalWeight * 1);
            const proteinCals = proteinGrams * 4;
            
            const fatCals = weeklyCalories * 0.25;
            const fatGrams = Math.round(fatCals / 9);

            const carbCals = weeklyCalories - proteinCals - fatCals;
            const carbGrams = Math.round(carbCals / 4);

            plan.push({
                week,
                calories: weeklyCalories,
                protein: proteinGrams,
                carbs: carbGrams,
                fats: fatGrams,
            });
        }
        return plan;
    }, [profile]);
    
    const handleConfirmPlan = async () => {
        if (!user || !profile || calculatedPlan.length === 0) {
            toast({
                title: "Error",
                description: "Could not generate a plan. Please check your profile data.",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        try {
            const macroPlan: MacroPlan = {
                startDate: new Date().toISOString(),
                plan: calculatedPlan,
            };

            // Save the plan
            const goalsDocRef = doc(db, 'users', user.uid, 'data', 'goals');
            await setDoc(goalsDocRef, macroPlan);

            // Update user profile to mark setup as complete
            const profileDocRef = doc(db, 'users', user.uid, 'data', 'profile');
            await updateDoc(profileDocRef, { hasCompletedMacroSetup: true });
            
            toast({
                title: "Nutrition Plan Set!",
                description: "You're all set to start tracking.",
            });
            onPlanSet();

        } catch (error) {
            console.error("Error saving nutrition plan:", error);
            toast({
                title: "Save Failed",
                description: "There was an error saving your plan. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };
    
    const goalType = profile && profile.goalWeight < profile.initialWeight ? 'Fat Loss' : 'Muscle Gain';

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Your Personalized Nutrition Plan</DialogTitle>
                    <DialogDescription>
                        Based on your profile, here's a recommended plan for your {goalType} goal over {profile?.transformationTarget} weeks.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="h-72 my-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[80px]">Week</TableHead>
                                <TableHead className="text-right">Calories</TableHead>
                                <TableHead className="text-right">Protein (g)</TableHead>
                                <TableHead className="text-right">Carbs (g)</TableHead>
                                <TableHead className="text-right">Fats (g)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {calculatedPlan.map(week => (
                                <TableRow key={week.week}>
                                    <TableCell className="font-medium">{week.week}</TableCell>
                                    <TableCell className="text-right">{week.calories.toLocaleString()}</TableCell>
                                    <TableCell className="text-right">{week.protein}</TableCell>
                                    <TableCell className="text-right">{week.carbs}</TableCell>
                                    <TableCell className="text-right">{week.fats}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
                    <Button onClick={handleConfirmPlan} disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Accept & Start Tracking
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
