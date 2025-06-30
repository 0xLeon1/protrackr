
"use client";

import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import type { MacroPlan, WeeklyMacroGoal } from '@/types';
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
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '../ui/progress';
import { Textarea } from '../ui/textarea';

interface NutritionPlanSetupProps {
    isOpen: boolean;
    onClose: () => void;
    onPlanSet: () => void;
}

const formSchema = z.object({
  initialWeight: z.coerce.number().min(50, { message: "Must be at least 50 lbs." }).max(1000),
  goalWeight: z.coerce.number().min(50, { message: "Must be at least 50 lbs." }).max(1000),
  experience: z.enum(["beginner", "intermediate", "advanced"], { required_error: "Please select your experience level."}),
  transformationTarget: z.enum(["8", "12", "16"], { required_error: "Please select a timeline."}),
});

type FormSchemaType = z.infer<typeof formSchema>;

const setupQuestions = [
    { field: "initialWeight", title: "What's your current weight?", placeholder: "e.g., 180" },
    { field: "goalWeight", title: "What's your goal weight?", placeholder: "e.g., 170" },
    { field: "experience", title: "How would you describe your training experience?", options: [{value: "beginner", label: "Beginner (0-2 years)"}, {value: "intermediate", label: "Intermediate (2-4 years)"}, {value: "advanced", label: "Advanced (5+ years)"}] },
    { field: "transformationTarget", title: "How long is your transformation timeline?", options: [{value: "8", label: "8 Weeks"}, {value: "12", label: "12 Weeks"}, {value: "16", label: "16 Weeks"}] },
    { field: "otherGoals", title: "What other goals do you have?", description: "This is optional, but helps to keep you motivated. (e.g., have more energy, feel more confident)" },
];

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
        initialWeight: profile?.initialWeight || undefined,
        goalWeight: profile?.goalWeight || undefined,
        experience: profile?.experience || undefined,
        transformationTarget: "12",
      },
    });

    const watchedField = useWatch({ control: form.control, name: setupQuestions[step-1]?.field as any });

    const calculatedPlan = useMemo<WeeklyMacroGoal[] | null>(() => {
        if (!formData || !profile) return null;
        
        const { initialWeight, goalWeight, transformationTarget } = formData;
        const totalWeeks = parseInt(transformationTarget, 10);
        const isCutting = goalWeight < initialWeight;

        // Use age and gender from profile for BMR calculation if available, otherwise use defaults.
        const age = profile.age || 25;
        const gender = profile.gender || 'male';

        let bmr;
        if (gender === 'male') {
            bmr = 88.362 + (13.397 * (initialWeight / 2.20462)) + (4.799 * 178) - (5.677 * age);
        } else {
            bmr = 447.593 + (9.247 * (initialWeight / 2.20462)) + (3.098 * 165) - (4.330 * age);
        }

        const maintenanceCals = bmr * 1.55; // Assuming moderate activity
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

        const currentQuestion = setupQuestions[step - 1];
        if (currentQuestion.field !== 'otherGoals') {
            const isValid = await form.trigger(currentQuestion.field as keyof FormSchemaType);
            if (!isValid) return;
        }
        
        if (step < setupQuestions.length) {
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

            const updatedProfileData = {
                ...profile,
                ...formData,
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
    
    const renderContent = () => {
        // Final Plan Review Step
        if (step > setupQuestions.length) {
             return (
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
                        <Button variant="outline" onClick={handleBack} disabled={isLoading}>Back</Button>
                        <Button onClick={handleConfirmPlan} disabled={isLoading} className="bg-green-500 hover:bg-green-600">
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                            Let's Go!
                        </Button>
                    </DialogFooter>
                </>
            );
        }
        
        // Welcome Step
        if (step === 0) {
            return (
                <div className="text-center py-12 px-6 flex flex-col items-center">
                     <DialogHeader>
                        <DialogTitle className="text-3xl font-bold">Let's Build Your Plan</DialogTitle>
                        <DialogDescription className="text-lg text-muted-foreground pt-2">
                           Taking this first step is the most important one. Let's create a plan tailored just for you.
                        </DialogDescription>
                    </DialogHeader>
                    <Button size="lg" className="mt-8" onClick={handleNext}>
                        Start Setup <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                </div>
            )
        }
        
        // Question Steps
        const currentQuestion = setupQuestions[step - 1];
        const fieldName = currentQuestion.field as keyof FormSchemaType;

        return (
             <>
                <DialogHeader>
                    <Progress value={(step / (setupQuestions.length + 1)) * 100} className="w-full mb-4"/>
                    <DialogTitle className="text-2xl">{currentQuestion.title}</DialogTitle>
                    {currentQuestion.description && <DialogDescription>{currentQuestion.description}</DialogDescription>}
                </DialogHeader>
                <div className="py-8 min-h-[150px] flex items-center justify-center">
                    <Form {...form}>
                    <form onSubmit={(e) => { e.preventDefault(); handleNext(); }} className="w-full max-w-sm">
                        {currentQuestion.field === 'otherGoals' ? (
                             <Textarea 
                                value={otherGoals}
                                onChange={(e) => setOtherGoals(e.target.value)}
                                placeholder="My goal is to..."
                                className="min-h-[100px]"
                             />
                        ) : currentQuestion.options ? (
                            <FormField control={form.control} name={fieldName} render={({ field }) => (
                                <FormItem>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="text-lg py-6">
                                                <SelectValue placeholder="Select an option..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {currentQuestion.options.map(opt => (
                                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        ) : (
                            <FormField control={form.control} name={fieldName} render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            className="text-center text-2xl font-bold h-16"
                                            placeholder={currentQuestion.placeholder}
                                            {...field}
                                            autoFocus
                                         />
                                    </FormControl>
                                    <FormMessage className="text-center pt-2" />
                                </FormItem>
                            )} />
                        )}
                        </form>
                    </Form>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleBack} disabled={isLoading}>Back</Button>
                    <Button onClick={handleNext} disabled={isLoading || (currentQuestion.field !== 'otherGoals' && !watchedField)}>Next</Button>
                </DialogFooter>
            </>
        )
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { onClose(); setStep(0); } }}>
            <DialogContent className="max-w-2xl min-h-[450px]">
               {renderContent()}
            </DialogContent>
        </Dialog>
    );
}
