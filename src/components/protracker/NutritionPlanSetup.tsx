
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import type { MacroPlan, WeeklyMacroGoal, UserProfile } from '@/types';
import { add, format, differenceInDays } from 'date-fns';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowRight, Check, TrendingUp, Target, Calendar } from 'lucide-react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '../ui/progress';
import { Textarea } from '../ui/textarea';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardDescription } from '../ui/card';

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
        }
        if (!isOpen) {
            // Reset state when dialog closes
            setTimeout(() => {
                setStep(0);
                setFormData(null);
                form.reset({ initialWeight: undefined, goalWeight: undefined, transformationTarget: "12" });
            }, 300);
        }
    }, [isOpen, profile, form]);

    const calculatedPlan = useMemo<WeeklyMacroGoal[] | null>(() => {
        if (!formData || !profile) return null;
    
        const { goalWeight, transformationTarget, initialWeight } = formData;
        const totalWeeks = parseInt(transformationTarget, 10);
        const isCutting = goalWeight < initialWeight;
    
        const plan: WeeklyMacroGoal[] = [];
        const startCals = goalWeight * 15;
    
        // Define helper to generate the final plan entry
        const createWeekEntry = (week: number, calories: number) => {
            const proteinGrams = Math.round(goalWeight * 1);
            const proteinCals = proteinGrams * 4;
            const fatCals = calories * 0.25;
            const fatGrams = Math.round(fatCals / 9);
            const carbCals = calories - proteinCals - fatCals;
            const carbGrams = Math.round(carbCals / 4);
            return {
                week,
                calories: Math.round(calories),
                protein: proteinGrams,
                carbs: carbGrams,
                fats: fatGrams,
            };
        };
    
        if (isCutting) {
            const endCals = goalWeight * 10;
            const totalCalorieDrop = startCals - endCals;
            const numPeriods = totalWeeks / 2;
            const periodsWithDrop = numPeriods > 1 ? numPeriods - 1 : 1;
    
            if (totalWeeks === 16) {
                // Slower, back-loaded drop for 16 weeks
                for (let i = 0; i < totalWeeks; i++) {
                    const periodIndex = Math.floor(i / 2);
                    const dropFraction = (periodIndex / periodsWithDrop) ** 2; // Quadratic drop
                    const weeklyCalories = startCals - (totalCalorieDrop * dropFraction);
                    plan.push(createWeekEntry(i + 1, weeklyCalories));
                }
            } else {
                // Linear drop for 8 and 12 weeks
                const dropPerPeriod = totalCalorieDrop / periodsWithDrop;
                for (let i = 0; i < totalWeeks; i++) {
                    const periodIndex = Math.floor(i / 2);
                    const weeklyCalories = startCals - (periodIndex * dropPerPeriod);
                    plan.push(createWeekEntry(i + 1, weeklyCalories));
                }
            }
        } else { // Bulking logic
            const maxCalories = goalWeight * 18;
            const totalCalorieGain = maxCalories - startCals;
            const numPeriods = totalWeeks / 2;
            const periodsWithGain = numPeriods > 1 ? numPeriods - 1 : 1;
            const gainPerPeriod = totalCalorieGain / periodsWithGain;
    
            for (let i = 0; i < totalWeeks; i++) {
                const periodIndex = Math.floor(i / 2);
                const weeklyCalories = startCals + (periodIndex * gainPerPeriod);
                plan.push(createWeekEntry(i + 1, weeklyCalories));
            }
        }
        
        return plan;
    }, [formData, profile]);

    const handleNext = async () => {
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
        setStep(5);
    };

    const savePlanData = async () => {
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

            const updatedProfileData: Partial<UserProfile> = {
                initialWeight: formData.initialWeight,
                goalWeight: formData.goalWeight,
                transformationTarget: formData.transformationTarget,
                targetDate: targetDate.toISOString(),
                hasCompletedMacroSetup: true,
                otherGoals: otherGoals,
            };

            const macroPlanData: MacroPlan = {
                startDate: now.toISOString(),
                plan: calculatedPlan,
            };

            const goalsDocRef = doc(db, 'users', user.uid, 'data', 'goals');
            await setDoc(goalsDocRef, macroPlanData);

            const profileDocRef = doc(db, 'users', user.uid, 'data', 'profile');
            await updateDoc(profileDocRef, updatedProfileData);
            
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

    const averageWeeklyChange = useMemo(() => {
        if (!formData) return 0;
        const { initialWeight, goalWeight, transformationTarget } = formData;
        const totalChange = goalWeight - initialWeight;
        const weeks = parseInt(transformationTarget, 10);
        if (weeks === 0) return 0;
        return totalChange / weeks;
    }, [formData]);
    
    const goalType = formData && formData.goalWeight < formData.initialWeight ? 'Fat Loss' : 'Muscle Gain';
    
    const renderStepContent = () => {
        switch (step) {
            case 0:
                return (
                    <>
                        <DialogHeader>
                            <DialogTitle className="text-3xl font-bold">Let's Build Your Plan</DialogTitle>
                            <DialogDescription className="text-lg text-muted-foreground pt-2">Taking this first step is the most important one.</DialogDescription>
                        </DialogHeader>
                        <div className="flex-1" />
                        <DialogFooter>
                            <Button onClick={handleNext} className="w-full">Start Setup <ArrowRight className="ml-2 h-5 w-5" /></Button>
                        </DialogFooter>
                    </>
                );
            case 1:
            case 2:
            case 3:
            case 4:
                return (
                    <>
                        <DialogHeader>
                            <Progress value={(step / 6) * 100} className="w-full mb-4"/>
                            <div className={cn(step !== 1 && 'hidden')}><DialogTitle className="text-2xl">What's your current weight?</DialogTitle></div>
                            <div className={cn(step !== 2 && 'hidden')}><DialogTitle className="text-2xl">What's your goal weight?</DialogTitle></div>
                            <div className={cn(step !== 3 && 'hidden')}><DialogTitle className="text-2xl">What's your transformation timeline?</DialogTitle></div>
                            <div className={cn(step !== 4 && 'hidden')}><DialogTitle className="text-2xl">What's your 'Why'?</DialogTitle><DialogDescription>This is optional, but helps to keep you motivated.</DialogDescription></div>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={(e) => { e.preventDefault(); handleNext(); }} className="flex flex-col items-center justify-center flex-1">
                                <div className={cn("w-full max-w-sm", step === 1 ? 'block' : 'hidden')}><FormField control={form.control} name="initialWeight" render={({ field }) => (<FormItem><FormControl><Input type="number" className="text-center text-2xl font-bold h-16" placeholder="e.g., 180" {...field} autoFocus /></FormControl><FormMessage className="text-center pt-2" /></FormItem>)} /></div>
                                <div className={cn("w-full max-w-sm", step === 2 ? 'block' : 'hidden')}><FormField control={form.control} name="goalWeight" render={({ field }) => (<FormItem><FormControl><Input type="number" className="text-center text-2xl font-bold h-16" placeholder="e.g., 170" {...field} autoFocus /></FormControl><FormMessage className="text-center pt-2" /></FormItem>)} /></div>
                                <div className={cn("w-full max-w-sm", step === 3 ? 'block' : 'hidden')}><FormField control={form.control} name="transformationTarget" render={({ field }) => (<FormItem><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="text-lg py-6"><SelectValue placeholder="Select an option..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="8">8 Weeks</SelectItem><SelectItem value="12">12 Weeks</SelectItem><SelectItem value="16">16 Weeks</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} /></div>
                                <div className={cn("w-full max-w-sm", step === 4 ? 'block' : 'hidden')}><Textarea value={otherGoals} onChange={(e) => setOtherGoals(e.target.value)} placeholder="My goal is to have more energy and feel more confident..." className="min-h-[100px]" /></div>
                            </form>
                        </Form>
                        <DialogFooter>
                            <Button variant="outline" onClick={handleBack} disabled={isLoading}>Back</Button>
                            <Button onClick={handleNext} disabled={isLoading}>
                                {step === 4 ? "Calculate Plan" : "Next"}
                                {step < 4 && <ArrowRight className="ml-2 h-5 w-5" />}
                            </Button>
                        </DialogFooter>
                    </>
                );
            case 5:
                const targetDate = formData ? format(add(new Date(), { weeks: parseInt(formData.transformationTarget) }), 'MMMM d, yyyy') : '';
                return (
                    <>
                        <DialogHeader>
                             <Progress value={(step / 6) * 100} className="w-full mb-4"/>
                            <DialogTitle>Your Transformation At a Glance</DialogTitle>
                            <DialogDescription>
                                Here's a summary of your goal. Your personalized plan is designed for safe and sustainable progress.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                            <div className="grid grid-cols-3 gap-4 text-center w-full max-w-md">
                                 <Card><CardHeader className="p-3 pb-0"><CardDescription className="flex items-center justify-center gap-2"><TrendingUp className="h-4 w-4" /> Start Weight</CardDescription></CardHeader><CardContent className="p-3"><p className="text-3xl font-bold">{formData?.initialWeight}<span className="text-base font-medium text-muted-foreground"> lbs</span></p></CardContent></Card>
                                 <Card><CardHeader className="p-3 pb-0"><CardDescription className="flex items-center justify-center gap-2"><Target className="h-4 w-4" /> Goal Weight</CardDescription></CardHeader><CardContent className="p-3"><p className="text-3xl font-bold">{formData?.goalWeight}<span className="text-base font-medium text-muted-foreground"> lbs</span></p></CardContent></Card>
                                 <Card><CardHeader className="p-3 pb-0"><CardDescription className="flex items-center justify-center gap-2"><Calendar className="h-4 w-4" /> End Date</CardDescription></CardHeader><CardContent className="p-3"><p className="text-lg font-bold">{targetDate}</p></CardContent></Card>
                            </div>
                            <div className="text-center">
                                <p className="text-lg">Your journey will involve an average change of</p>
                                <p className="text-2xl font-bold text-primary">{Math.abs(averageWeeklyChange).toFixed(1)} lbs per week</p>
                            </div>
                             <div className={cn("flex items-center gap-2 p-3 rounded-lg max-w-md text-sm text-center", Math.abs(averageWeeklyChange) > 2.5 ? "bg-amber-500/10 text-amber-700 dark:text-amber-400" : "bg-green-500/10 text-green-700 dark:text-green-400")}>
                                <Check className={cn("h-5 w-5 shrink-0", Math.abs(averageWeeklyChange) > 2.5 && "hidden")} />
                               <p>{Math.abs(averageWeeklyChange) > 2.5 
                                    ? "This is an aggressive goal. Healthy weight loss is typically 1-2 lbs per week. Your plan will be adjusted for a safer rate."
                                    : `This is a healthy rate of ${goalType}, which is under our recommended maximum of 2.5 lbs per week.`
                               }</p>
                            </div>
                        </div>
                         <DialogFooter>
                            <Button variant="outline" onClick={handleBack} disabled={isLoading}>Back</Button>
                            <Button onClick={() => setStep(6)} disabled={isLoading}>View My Plan <ArrowRight className="ml-2 h-5 w-5" /></Button>
                        </DialogFooter>
                    </>
                );
            case 6:
                return (
                    <>
                        <DialogHeader className="shrink-0">
                            <Progress value={100} className="w-full mb-4"/>
                            <DialogTitle>Your Personalized Nutrition Plan</DialogTitle>
                            <DialogDescription>
                                Based on your info, here's a recommended plan for your {goalType} goal over {formData?.transformationTarget} weeks.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex-1 overflow-auto my-4 pr-4">
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
                        </div>
                        <DialogFooter className="shrink-0">
                            <Button variant="outline" onClick={handleBack} disabled={isLoading}>Back</Button>
                            <Button onClick={savePlanData} disabled={isLoading} className="bg-green-500 hover:bg-green-600">
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                                Let's Go!
                            </Button>
                        </DialogFooter>
                    </>
                );
            default:
                return null;
        }
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { onClose(); } }}>
            <DialogContent className={cn("max-w-2xl flex flex-col", step === 6 ? "h-[85vh]" : (step === 5 ? "min-h-[550px]" : "min-h-[400px]"))}>
               {renderStepContent()}
            </DialogContent>
        </Dialog>
    );
}

    

    