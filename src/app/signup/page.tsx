
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { doc, setDoc } from 'firebase/firestore';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { UserProfile, MacroPlan, WeeklyMacroGoal } from '@/types';
import { add } from 'date-fns';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// New, comprehensive schema for multi-step form
const signupSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  age: z.coerce.number().min(13, { message: "You must be at least 13." }).max(120),
  gender: z.enum(['male', 'female'], { required_error: "Please select a gender." }),
  initialWeight: z.coerce.number().min(50, { message: "Must be at least 50 lbs." }).max(1000),
  goalWeight: z.coerce.number().min(50, { message: "Must be at least 50 lbs." }).max(1000),
  transformationTarget: z.enum(["8", "12", "16"], { required_error: "Please select a timeline."}),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

type FormValues = z.infer<typeof signupSchema>;

// Logic to calculate plan based on user inputs
const calculatePlan = (formData: FormValues): WeeklyMacroGoal[] => {
    const { initialWeight, goalWeight, transformationTarget } = formData;
    const totalWeeks = parseInt(transformationTarget, 10);
    const isCutting = goalWeight < initialWeight;
    const startingCalories = goalWeight * 15;
    
    const plan: WeeklyMacroGoal[] = [];

    for (let i = 0; i < totalWeeks; i++) {
        const week = i + 1;
        const periods = Math.floor((week - 1) / 2); // Adjustments happen every 2 weeks

        let weeklyCalories;
        if (isCutting) {
            const minCalories = goalWeight * 10;
            const currentCals = startingCalories - (periods * 200);
            weeklyCalories = Math.max(minCalories, currentCals);
        } else { // Bulking
            const maxCalories = goalWeight * 18;
            const currentCals = startingCalories + (periods * 200);
            weeklyCalories = Math.min(maxCalories, currentCals);
        }
        
        const proteinGrams = Math.round(goalWeight * 1);
        const proteinCals = proteinGrams * 4;
        const fatCals = weeklyCalories * 0.25;
        const fatGrams = Math.round(fatCals / 9);
        const carbCals = weeklyCalories - proteinCals - fatCals;
        const carbGrams = Math.round(carbCals / 4);

        plan.push({
            week,
            calories: Math.round(weeklyCalories),
            protein: proteinGrams,
            carbs: carbGrams,
            fats: fatGrams,
        });
    }
    return plan;
}

export default function SignupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(0);
  const router = useRouter();
  const { toast } = useToast();
  const { isFirebaseConfigured } = useAuth();

  const form = useForm<FormValues>({
    resolver: zodResolver(signupSchema),
    mode: 'onChange',
  });
  
  const totalSteps = 7;

  const handleNext = async () => {
    let fieldsToValidate: (keyof FormValues)[] = [];
    switch(step) {
        case 1: fieldsToValidate = ['name']; break;
        case 2: fieldsToValidate = ['age']; break;
        case 3: fieldsToValidate = ['gender']; break;
        case 4: fieldsToValidate = ['initialWeight']; break;
        case 5: fieldsToValidate = ['goalWeight']; break;
        case 6: fieldsToValidate = ['transformationTarget']; break;
    }

    const isValid = await form.trigger(fieldsToValidate);
    if (!isValid) return;

    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleSignup = async (values: FormValues) => {
    setIsLoading(true);

    if (!isFirebaseConfigured || !auth || !db) {
        toast({
            title: "Configuration Error",
            description: "Firebase is not configured. Have you set up your .env file?",
            variant: "destructive"
        });
        setIsLoading(false);
        return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;
      
      await sendEmailVerification(user);

      const now = new Date();
      const targetDate = add(now, { weeks: parseInt(values.transformationTarget, 10) });
      const userProfile: UserProfile = {
        name: values.name,
        age: values.age,
        gender: values.gender,
        initialWeight: values.initialWeight,
        goalWeight: values.goalWeight,
        transformationTarget: values.transformationTarget,
        targetDate: targetDate.toISOString(),
        signupDate: now.toISOString(),
        hasCompletedMacroSetup: false, // User must confirm plan after login
        otherGoals: '', 
      };
      
      const profileDocRef = doc(db, 'users', user.uid, 'data', 'profile');
      await setDoc(profileDocRef, userProfile);

      const calculatedPlan = calculatePlan(values);
      const macroPlan: MacroPlan = {
        startDate: now.toISOString(),
        plan: calculatedPlan,
      };
      const goalsDocRef = doc(db, 'users', user.uid, 'data', 'goals');
      await setDoc(goalsDocRef, macroPlan);

      toast({ title: "Account Created!", description: "A verification link has been sent to your email. Please verify to continue." });
      router.push('/verify-email');

    } catch (error: any) {
      toast({
        title: "Signup Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-150px)] py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          {step > 0 && <Progress value={(step / totalSteps) * 100} className="w-full mb-4" />}
          
          <div className={cn(step !== 0 && 'hidden')}>
            <CardTitle className="text-center text-3xl font-bold">Start Your Transformation</CardTitle>
            <CardDescription className="text-center text-lg pt-2">Let's create a plan tailored just for you.</CardDescription>
          </div>
          <div className={cn(step !== 1 && 'hidden')}><CardTitle>What's your name?</CardTitle></div>
          <div className={cn(step !== 2 && 'hidden')}><CardTitle>How old are you?</CardTitle></div>
          <div className={cn(step !== 3 && 'hidden')}><CardTitle>What's your gender?</CardTitle></div>
          <div className={cn(step !== 4 && 'hidden')}><CardTitle>What's your current weight?</CardTitle></div>
          <div className={cn(step !== 5 && 'hidden')}><CardTitle>What's your goal weight?</CardTitle></div>
          <div className={cn(step !== 6 && 'hidden')}><CardTitle>What's your transformation timeline?</CardTitle></div>
          <div className={cn(step !== 7 && 'hidden')}><CardTitle>Create Your Account</CardTitle><CardDescription>Final step! Create your login to save your plan.</CardDescription></div>

        </CardHeader>
        <CardContent className="min-h-[150px] flex flex-col justify-center">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSignup)} className="space-y-4">
              <div className={cn(step !== 0 && 'hidden')} />
              
              <div className={cn("w-full", step === 1 ? 'block' : 'hidden')}>
                <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormControl><Input placeholder="Your Name" {...field} autoFocus /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <div className={cn("w-full", step === 2 ? 'block' : 'hidden')}>
                <FormField control={form.control} name="age" render={({ field }) => (<FormItem><FormControl><Input type="number" placeholder="e.g. 25" {...field} autoFocus /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <div className={cn("w-full", step === 3 ? 'block' : 'hidden')}>
                <FormField control={form.control} name="gender" render={({ field }) => (<FormItem><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4"><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="male" id="male" /></FormControl><FormLabel htmlFor="male" className="text-base font-normal">Male</FormLabel></FormItem><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="female" id="female" /></FormControl><FormLabel htmlFor="female" className="text-base font-normal">Female</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)} />
              </div>
              <div className={cn("w-full", step === 4 ? 'block' : 'hidden')}>
                <FormField control={form.control} name="initialWeight" render={({ field }) => (<FormItem><FormControl><Input type="number" placeholder="e.g. 180 lbs" {...field} autoFocus /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <div className={cn("w-full", step === 5 ? 'block' : 'hidden')}>
                <FormField control={form.control} name="goalWeight" render={({ field }) => (<FormItem><FormControl><Input type="number" placeholder="e.g. 170 lbs" {...field} autoFocus /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <div className={cn("w-full", step === 6 ? 'block' : 'hidden')}>
                <FormField control={form.control} name="transformationTarget" render={({ field }) => (<FormItem><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a timeline..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="8">8 Weeks</SelectItem><SelectItem value="12">12 Weeks</SelectItem><SelectItem value="16">16 Weeks</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
              </div>
              
              <div className={cn("space-y-4", step === 7 ? 'block' : 'hidden')}>
                <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="m@example.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="password" render={({ field }) => (<FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>

              {step > 0 && step < totalSteps && (
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={handleBack}>Back</Button>
                  <Button type="button" onClick={handleNext}>Next</Button>
                </div>
              )}

              {step === totalSteps && (
                 <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={handleBack}>Back</Button>
                  <Button type="submit" disabled={isLoading}>{isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Create Account</Button>
                </div>
              )}
            </form>
          </Form>
        </CardContent>
        
        {step === 0 && (
          <CardFooter className="flex-col gap-4">
            <Button onClick={handleNext} size="lg" className="w-full">Start Setup <ArrowRight className="ml-2 h-5 w-5" /></Button>
            <p className="text-sm text-muted-foreground">Already have an account? <Link href="/login" className="text-primary hover:underline">Log in</Link></p>
          </CardFooter>
        )}

        {step > 0 && step <= totalSteps && (
            <CardFooter className="justify-center text-sm pt-4">
                <p>Already have an account? <Link href="/login" className="text-primary hover:underline">Log in</Link></p>
            </CardFooter>
        )}
      </Card>
    </div>
  );
}
