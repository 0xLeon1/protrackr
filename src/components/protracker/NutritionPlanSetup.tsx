
"use client";

import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import type { MacroPlan, UserProfile, WeeklyMacroGoal } from '@/types';
import { add } from 'date-fns';
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
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface NutritionPlanSetupProps {
    isOpen: boolean;
    onClose: () => void;
    onPlanSet: () => void;
}

const formSchema = z.object({
  age: z.coerce.number().min(13, { message: "You must be at least 13 years old." }).max(120),
  gender: z.enum(["male", "female"]),
  initialWeight: z.coerce.number().min(50, { message: "Weight must be at least 50 lbs." }).max(1000),
  goalWeight: z.coerce.number().min(50, { message: "Weight must be at least 50 lbs." }).max(1000),
  experience: z.enum(["beginner", "intermediate", "advanced"]),
  transformationTarget: z.enum(["8", "12", "16"]),
});

type FormSchemaType = z.infer<typeof formSchema>;

export default function NutritionPlanSetup({ isOpen, onClose, onPlanSet }: NutritionPlanSetupProps) {
    const { user, profile } = useAuth();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState<FormSchemaType | null>(null);

    const form = useForm<FormSchemaType>({
      resolver: zodResolver(formSchema),
      defaultValues: {
        age: profile?.age || undefined,
        gender: profile?.gender || undefined,
        initialWeight: profile?.initialWeight || undefined,
        goalWeight: profile?.goalWeight || undefined,
        experience: profile?.experience || undefined,
        transformationTarget: "12",
      },
    });

    const calculatedPlan = useMemo<WeeklyMacroGoal[] | null>(() => {
        if (!formData) return null;
        
        const { initialWeight, goalWeight, transformationTarget } = formData;
        const totalWeeks = parseInt(transformationTarget, 10);
        const isCutting = goalWeight < initialWeight;

        const maintenanceCals = initialWeight * 15;
        const startingCalories = isCutting ? maintenanceCals - 500 : maintenanceCals + 300;
        
        const plan: WeeklyMacroGoal[] = [];

        for (let i = 0; i < totalWeeks; i++) {
            const week = i + 1;
            const calorieAdjustment = Math.floor(i / 4) * (isCutting ? -100 : 100);
            const weeklyCalories = Math.round((startingCalories + calorieAdjustment) / 10) * 10;
            
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
    }, [formData]);

    const handleFormSubmit = (values: FormSchemaType) => {
        setFormData(values);
        setStep(2);
    };
    
    const handleConfirmPlan = async () => {
        if (!user || !profile || !calculatedPlan || !formData) {
            toast({
                title: "Error",
                description: "Could not generate a plan. Please check your profile data.",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        try {
            const now = new Date();
            const targetDate = add(now, { weeks: parseInt(formData.transformationTarget) });

            const updatedProfileData = {
                ...profile,
                ...formData,
                targetDate: targetDate.toISOString(),
                hasCompletedMacroSetup: true,
            };

            const macroPlan: MacroPlan = {
                startDate: now.toISOString(),
                plan: calculatedPlan,
            };

            // Save the plan
            const goalsDocRef = doc(db, 'users', user.uid, 'data', 'goals');
            await setDoc(goalsDocRef, macroPlan);

            // Update user profile with collected data and mark setup as complete
            const profileDocRef = doc(db, 'users', user.uid, 'data', 'profile');
            await setDoc(profileDocRef, updatedProfileData);
            
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
            setStep(1);
        }
    };
    
    const goalType = formData && formData.goalWeight < formData.initialWeight ? 'Fat Loss' : 'Muscle Gain';
    
    const renderStepOne = () => (
        <>
            <DialogHeader>
                <DialogTitle>Let's Build Your Plan</DialogTitle>
                <DialogDescription>
                    Answer a few questions to create your personalized nutrition plan.
                </DialogDescription>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="initialWeight" render={({ field }) => (
                            <FormItem><FormLabel>Current Weight (lbs)</FormLabel><FormControl><Input type="number" placeholder="e.g. 180" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                         <FormField control={form.control} name="goalWeight" render={({ field }) => (
                            <FormItem><FormLabel>Goal Weight (lbs)</FormLabel><FormControl><Input type="number" placeholder="e.g. 170" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="age" render={({ field }) => (
                            <FormItem><FormLabel>Age</FormLabel><FormControl><Input type="number" placeholder="e.g. 25" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="gender" render={({ field }) => (
                            <FormItem><FormLabel>Gender</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                        )} />
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                         <FormField control={form.control} name="experience" render={({ field }) => (
                            <FormItem><FormLabel>Training Experience</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="beginner">Beginner (0-2 years)</SelectItem><SelectItem value="intermediate">Intermediate (2-4 years)</SelectItem><SelectItem value="advanced">Advanced (5+ years)</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                         )} />
                         <FormField control={form.control} name="transformationTarget" render={({ field }) => (
                            <FormItem><FormLabel>Timeline</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="8">8 Weeks</SelectItem><SelectItem value="12">12 Weeks</SelectItem><SelectItem value="16">16 Weeks</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                         )} />
                    </div>
                    <DialogFooter className="pt-4">
                      <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                      <Button type="submit">Calculate My Plan</Button>
                    </DialogFooter>
                </form>
            </Form>
        </>
    );

    const renderStepTwo = () => (
        <>
            <DialogHeader>
                <DialogTitle>Your Personalized Nutrition Plan</DialogTitle>
                <DialogDescription>
                    Based on your info, here's a recommended plan for your {goalType} goal over {formData?.transformationTarget} weeks.
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
                        {calculatedPlan?.map(week => (
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
                <Button variant="outline" onClick={() => setStep(1)} disabled={isLoading}>Back</Button>
                <Button onClick={handleConfirmPlan} disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Accept & Start Tracking
                </Button>
            </DialogFooter>
        </>
    );

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { onClose(); setStep(1); } }}>
            <DialogContent className="max-w-2xl">
               {step === 1 ? renderStepOne() : renderStepTwo()}
            </DialogContent>
        </Dialog>
    );
}
