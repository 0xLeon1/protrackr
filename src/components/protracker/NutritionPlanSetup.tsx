
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import type { MacroPlan, WeeklyMacroGoal, UserProfile } from '@/types';
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
import { Loader2, ArrowRight, Check } from 'lucide-react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '../ui/progress';
import { Textarea } from '../ui/textarea';
import { cn } from '@/lib/utils';

interface NutritionPlanSetupProps {
    isOpen: boolean;
    onClose: () => void;
    onPlanSet: () => void;
}

const formSchema = z.object({
  initialWeight: z.coerce.number().min(50, { message: "Must be at least 50 lbs." }).max(1000),
  goalWeight: z.coerce.number().min(50, { message: "Must be at least 50 lbs." }).max(1000),
  transformationTarget: z.enum(["8", "12", "16"], { required_error: "Please select a timeline."}),
});

type FormSchemaType = z.infer<typeof formSchema>;

export default function NutritionPlanSetup({ isOpen, onClose, onPlanSet }: NutritionPlanSetupProps) {
    const { user, profile } = useAuth();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState(0);
    const [formData, setFormData] = useState<FormSchemaType | null>(null);
    const [otherGoals, setOtherGoals] = useState('');

    const form = useForm<FormSchemaType>({
      resolver: zodResolver(formSchema),
      mode: 'onChange',
      defaultValues: {
        initialWeight: undefined,
        goalWeight: undefined,
        transformationTarget: "12",
      },
    });

    useEffect(() => {
      if (isOpen && profile) {
        form.reset({
          initialWeight: profile.initialWeight || undefined,
          goalWeight: profile.goalWeight || undefined,
          transformationTarget: profile.transformationTarget || "12",
        });
        setOtherGoals(profile.otherGoals || '');
        setFormData(null); // Clear previous calculation
      }
      if (!isOpen) {
        setStep(0); // Reset step when dialog closes
      }
    }, [isOpen, profile, form]);


    const calculatedPlan = useMemo<WeeklyMacroGoal[] | null>(() => {
        if (!formData || !profile) return null;
        
        const { initialWeight, goalWeight, transformationTarget } = formData;
        const totalWeeks = parseInt(transformationTarget, 10);
        const isCutting = goalWeight < initialWeight;

        const age = profile.age || 25;
        const gender = profile.gender || 'male';

        let bmr;
        if (gender === 'male') {
            bmr = 88.362 + (13.397 * (initialWeight / 2.20462)) + (4.799 * 178) - (5.677 * age);
        } else {
            bmr = 447.593 + (9.247 * (initialWeight / 2.20462)) + (3.098 * 165) - (4.330 * age);
        }

        const maintenanceCals = bmr * 1.55; 
        const startingCalories = isCutting ? maintenanceCals - 500 : maintenanceCals + 300;
        
        const plan: WeeklyMacroGoal[] = [];

        for (let i = 0; i < totalWeeks; i++) {
            const week = i + 1;
            const calorieAdjustment = Math.floor(i / 4) * (isCutting ? -75 : 75);
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
    }, [formData, profile]);

    const handleNext = async () => {
        if (step === 0) {
            setStep(1);
            return;
        }

        let isValid = true;
        if (step === 1) isValid = await form.trigger('initialWeight');
        if (step === 2) isValid = await form.trigger('goalWeight');
        if (step === 3) isValid = await form.trigger('transformationTarget');
        if (!isValid) return;

        if (step < 4) {
            setStep(step + 1);
        } else {
            form.handleSubmit(onCalculate)();
        }
    };

    const handleBack = () => {
        if (step > 0) {
            setStep(step - 1);
        }
    };
    
    const onCalculate = (values: FormSchemaType) => {
        setFormData(values);
        setStep(step + 1);
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

            const updatedProfileData: UserProfile = {
                ...profile,
                initialWeight: formData.initialWeight,
                goalWeight: formData.goalWeight,
                transformationTarget: formData.transformationTarget,
                targetDate: targetDate.toISOString(),
                hasCompletedMacroSetup: true,
                otherGoals: otherGoals,
            };

            const macroPlan: MacroPlan = {
                startDate: now.toISOString(),
                plan: calculatedPlan,
            };

            const goalsDocRef = doc(db, 'users', user.uid, 'data', 'goals');
            await setDoc(goalsDocRef, macroPlan);

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
            setStep(0);
        }
    };
    
    const goalType = formData && formData.goalWeight < formData.initialWeight ? 'Fat Loss' : 'Muscle Gain';
    
    const renderStepContent = () => {
        if (step > 4) {
             return (
                <>
                    <DialogHeader>
                        <DialogTitle>Your Personalized Nutrition Plan</DialogTitle>
                        <DialogDescription>
                            Based on your info, here's a recommended plan for your {goalType} goal over {formData?.transformationTarget} weeks.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 relative my-4">
                        <ScrollArea className="absolute inset-0 pr-6">
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
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={handleBack} disabled={isLoading}>Back</Button>
                        <Button onClick={handleConfirmPlan} disabled={isLoading} className="bg-green-500 hover:bg-green-600">
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                            Let's Go!
                        </Button>
                    </DialogFooter>
                </>
            );
        }
        
        return (
            <>
                <DialogHeader>
                    <Progress value={(step / 4) * 100} className="w-full mb-4"/>
                    <div className={cn(step !== 1 && step !== 0 && 'hidden')}>
                        <DialogTitle className="text-2xl">What's your current weight?</DialogTitle>
                    </div>
                     <div className={cn(step !== 2 && 'hidden')}>
                        <DialogTitle className="text-2xl">What's your goal weight?</DialogTitle>
                    </div>
                     <div className={cn(step !== 3 && 'hidden')}>
                        <DialogTitle className="text-2xl">How long is your transformation timeline?</DialogTitle>
                    </div>
                     <div className={cn(step !== 4 && 'hidden')}>
                        <DialogTitle className="text-2xl">What other goals do you have?</DialogTitle>
                        <DialogDescription>This is optional, but helps to keep you motivated.</DialogDescription>
                    </div>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={(e) => { e.preventDefault(); handleNext(); }} className="flex-1 flex flex-col items-center justify-center py-8">
                         <div className={cn("w-full h-full flex flex-col items-center justify-center", step !== 0 && 'hidden')}>
                            <DialogTitle className="text-3xl font-bold">Let's Build Your Plan</DialogTitle>
                            <DialogDescription className="text-lg text-muted-foreground pt-2">
                            Taking this first step is the most important one. Let's create a plan tailored just for you.
                            </DialogDescription>
                        </div>

                        <div className={cn("w-full max-w-sm", step !== 1 && 'hidden')}>
                            <FormField control={form.control} name="initialWeight" render={({ field }) => (
                                <FormItem>
                                    <FormControl><Input type="number" className="text-center text-2xl font-bold h-16" placeholder="e.g., 180" {...field} autoFocus /></FormControl>
                                    <FormMessage className="text-center pt-2" />
                                </FormItem>
                            )} />
                        </div>
                        <div className={cn("w-full max-w-sm", step !== 2 && 'hidden')}>
                             <FormField control={form.control} name="goalWeight" render={({ field }) => (
                                <FormItem>
                                    <FormControl><Input type="number" className="text-center text-2xl font-bold h-16" placeholder="e.g., 170" {...field} autoFocus /></FormControl>
                                    <FormMessage className="text-center pt-2" />
                                </FormItem>
                            )} />
                        </div>
                        <div className={cn("w-full max-w-sm", step !== 3 && 'hidden')}>
                            <FormField control={form.control} name="transformationTarget" render={({ field }) => (
                                <FormItem>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger className="text-lg py-6"><SelectValue placeholder="Select an option..." /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="8">8 Weeks</SelectItem>
                                            <SelectItem value="12">12 Weeks</SelectItem>
                                            <SelectItem value="16">16 Weeks</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                        <div className={cn("w-full max-w-sm", step !== 4 && 'hidden')}>
                             <Textarea value={otherGoals} onChange={(e) => setOtherGoals(e.target.value)} placeholder="My goal is to have more energy and feel more confident..." className="min-h-[100px]" />
                        </div>
                    </form>
                </Form>
                
                <DialogFooter>
                    {step > 0 && <Button variant="outline" onClick={handleBack} disabled={isLoading}>Back</Button>}
                    <Button onClick={handleNext} disabled={isLoading} className={cn("w-full", step > 0 && "w-auto")}>
                        {step === 0 ? "Start Setup" : "Next"}
                        <ArrowRight className={cn("ml-2 h-5 w-5", step === 0 && "hidden")} />
                    </Button>
                </DialogFooter>
            </>
        )
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { onClose(); setStep(0); } }}>
            <DialogContent className="max-w-2xl h-[85vh] flex flex-col">
               {renderStepContent()}
            </DialogContent>
        </Dialog>
    );
}
