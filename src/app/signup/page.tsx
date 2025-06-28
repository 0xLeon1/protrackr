
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { doc, setDoc } from 'firebase/firestore';
import { add } from 'date-fns';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string(),
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  age: z.coerce.number().min(13, { message: "You must be at least 13 years old." }).max(120),
  sex: z.enum(["male", "female", "other"]),
  initialWeight: z.coerce.number().min(50, { message: "Weight must be at least 50 lbs." }).max(1000),
  goalWeight: z.coerce.number().min(50, { message: "Weight must be at least 50 lbs." }).max(1000),
  experience: z.enum(["beginner", "intermediate", "advanced"]),
  transformationTarget: z.enum(["8", "12", "16"]),
}).refine(data => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});

type FormSchemaType = z.infer<typeof formSchema>;

export default function SignupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const router = useRouter();
  const { toast } = useToast();
  const { isFirebaseConfigured, refreshData } = useAuth();

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      name: "",
      age: undefined,
      sex: undefined,
      initialWeight: undefined,
      goalWeight: undefined,
      experience: undefined,
      transformationTarget: "12",
    },
  });

  const handleNextStep = async (fieldsToValidate: (keyof FormSchemaType)[]) => {
    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
        setStep(s => s + 1);
    }
  };

  const handlePreviousStep = () => {
    setStep(s => s - 1);
  };


  const handleSignup = async (values: z.infer<typeof formSchema>) => {
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

      // Create user profile document
      const targetDate = add(new Date(), { weeks: parseInt(values.transformationTarget) });
      
      const userProfile = {
        name: values.name,
        age: values.age,
        sex: values.sex,
        initialWeight: values.initialWeight, // lbs
        goalWeight: values.goalWeight, // lbs
        experience: values.experience,
        targetDate: targetDate.toISOString(),
      };
      
      const profileDocRef = doc(db, 'users', user.uid, 'data', 'profile');
      await setDoc(profileDocRef, userProfile);

      // Create an initial bodyweight log with the initial weight
      const bodyWeightLog = {
          weight: values.initialWeight,
          date: new Date().toISOString(),
      };
      const bodyWeightCollectionRef = doc(db, 'users', user.uid, 'bodyweight-logs', `initial_${Date.now()}`);
      await setDoc(bodyWeightCollectionRef, bodyWeightLog);

      toast({ title: "Account Created", description: "Welcome! You have been successfully signed up." });
      refreshData();
      router.push('/');
    } catch (error: any) {
      toast({
        title: "Signup Failed",
        description: error.message,
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };
  
  const progressValue = (step / 4) * 100;

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)] py-8">
        <Card className="w-full max-w-2xl">
            <CardHeader>
                <CardTitle>Create Your ProTracker Account</CardTitle>
                <CardDescription>Tell us a bit about yourself to get started.</CardDescription>
            </CardHeader>
            <CardContent>
                <Progress value={progressValue} className="mb-8" />
                <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSignup)} className="space-y-8">
                    
                    {step === 1 && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-medium">Personal Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField control={form.control} name="name" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl><Input placeholder="Your Name" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                                )} />
                                <FormField control={form.control} name="age" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Age</FormLabel>
                                    <FormControl><Input type="number" placeholder="25" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                                )} />
                                <FormField control={form.control} name="sex" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Sex</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="male">Male</SelectItem>
                                            <SelectItem value="female">Female</SelectItem>
                                            <SelectItem value="other">Prefer not to say</SelectItem>
                                        </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                            <div className="flex justify-end">
                                <Button type="button" onClick={() => handleNextStep(['name', 'age', 'sex'])}>Next</Button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-medium">Your Stats</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="initialWeight" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Current Weight (lbs)</FormLabel>
                                    <FormControl><Input type="number" placeholder="e.g. 180" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                                )} />
                                <FormField control={form.control} name="goalWeight" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Goal Weight (lbs)</FormLabel>
                                    <FormControl><Input type="number" placeholder="e.g. 170" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                                )} />
                            </div>
                            <div className="flex justify-between">
                                <Button type="button" variant="outline" onClick={handlePreviousStep}>Back</Button>
                                <Button type="button" onClick={() => handleNextStep(['initialWeight', 'goalWeight'])}>Next</Button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-medium">Your Goals</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="experience" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Workout Experience</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select level..." /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="beginner">Beginner (0-2 years)</SelectItem>
                                            <SelectItem value="intermediate">Intermediate (2-4 years)</SelectItem>
                                            <SelectItem value="advanced">Advanced (5+ years)</SelectItem>
                                        </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="transformationTarget" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Target Timeline</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select duration..." /></SelectTrigger></FormControl>
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
                            <div className="flex justify-between">
                                <Button type="button" variant="outline" onClick={handlePreviousStep}>Back</Button>
                                <Button type="button" onClick={() => handleNextStep(['experience', 'transformationTarget'])}>Next</Button>
                            </div>
                        </div>
                    )}
                    
                    {step === 4 && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-medium">Account Info</h3>
                            <div className="space-y-4">
                                <FormField control={form.control} name="email" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl><Input placeholder="m@example.com" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                                )} />
                                <FormField control={form.control} name="password" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Password</FormLabel>
                                    <FormControl><Input type="password" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                                )} />
                                <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Confirm Password</FormLabel>
                                    <FormControl><Input type="password" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                                )} />
                            </div>
                            <div className="flex justify-between">
                                <Button type="button" variant="outline" onClick={handlePreviousStep}>Back</Button>
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading ? 'Creating account...' : 'Create Account & Start Tracking'}
                                </Button>
                            </div>
                        </div>
                    )}
                </form>
                </Form>
            </CardContent>
            <CardFooter className="text-center text-sm">
                <p>Already have an account? <Link href="/login" className="text-primary hover:underline">Log in</Link></p>
            </CardFooter>
        </Card>
    </div>
  );
}
