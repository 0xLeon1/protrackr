
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
import { add } from 'date-fns';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string(),
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  age: z.coerce.number().min(13, { message: "You must be at least 13 years old." }).max(120),
  gender: z.enum(["male", "female"]),
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
      gender: undefined,
      initialWeight: undefined,
      goalWeight: undefined,
      experience: undefined,
      transformationTarget: "12",
    },
  });

  const handleNextStep = async (fieldsToValidate: keyof FormSchemaType | (keyof FormSchemaType)[]) => {
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
      
      await sendEmailVerification(user);

      const now = new Date();
      const targetDate = add(now, { weeks: parseInt(values.transformationTarget) });
      
      const userProfile = {
        name: values.name,
        age: values.age,
        gender: values.gender,
        initialWeight: values.initialWeight,
        goalWeight: values.goalWeight,
        experience: values.experience,
        targetDate: targetDate.toISOString(),
        signupDate: now.toISOString(),
        hasCompletedMacroSetup: false,
      };
      
      const profileDocRef = doc(db, 'users', user.uid, 'data', 'profile');
      await setDoc(profileDocRef, userProfile);

      const bodyWeightLog = {
          weight: values.initialWeight,
          date: now.toISOString(),
      };
      const bodyWeightCollectionRef = doc(db, 'users', user.uid, 'bodyweight-logs', `initial_${Date.now()}`);
      await setDoc(bodyWeightCollectionRef, bodyWeightLog);

      toast({ title: "Account Created!", description: "A verification link has been sent to your email. Please verify to continue." });
      router.push('/verify-email');
    } catch (error: any) {
      toast({
        title: "Signup Failed",
        description: error.message,
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };
  
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-150px)] py-12">
        <Card className="w-full max-w-md">
            <CardHeader className="text-center p-8">
                {step < 8 ? (
                    <>
                        <CardTitle className="text-3xl font-bold">Welcome to Your Transformation with ProTracker</CardTitle>
                        <CardDescription className="pt-2">Let's build your gameplan to getting the best results of your life.</CardDescription>
                    </>
                ) : (
                    <>
                        <CardTitle className="text-3xl font-bold">Create Your ProTracker Account</CardTitle>
                        <CardDescription className="pt-2">Almost there! Just a few more details to secure your account.</CardDescription>
                    </>
                )}
            </CardHeader>
            <CardContent className="px-8">
                <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSignup)} className="space-y-6">
                    
                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in duration-500">
                            <FormField control={form.control} name="name" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-lg font-semibold">First, what should we call you?</FormLabel>
                                    <FormControl><Input placeholder="Your Name" {...field} className="h-11 text-base" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleNextStep('name'); } }} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <div className="flex justify-end pt-2">
                                <Button type="button" onClick={() => handleNextStep('name')}>Next</Button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in duration-500">
                            <FormField control={form.control} name="age" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-lg font-semibold">How old are you?</FormLabel>
                                    <FormControl><Input type="number" placeholder="25" {...field} className="h-11 text-base" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleNextStep('age'); } }} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <div className="flex justify-between pt-2">
                                <Button type="button" variant="outline" onClick={handlePreviousStep}>Back</Button>
                                <Button type="button" onClick={() => handleNextStep('age')}>Next</Button>
                            </div>
                        </div>
                    )}
                    
                    {step === 3 && (
                        <div className="space-y-6 animate-in fade-in duration-500">
                            <FormField control={form.control} name="gender" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-lg font-semibold">What is your gender?</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger className="h-11 text-base"><SelectValue placeholder="Select..." /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="male">Male</SelectItem>
                                        <SelectItem value="female">Female</SelectItem>
                                    </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                             <div className="flex justify-between pt-2">
                                <Button type="button" variant="outline" onClick={handlePreviousStep}>Back</Button>
                                <Button type="button" onClick={() => handleNextStep('gender')}>Next</Button>
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-6 animate-in fade-in duration-500">
                            <FormField control={form.control} name="initialWeight" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-lg font-semibold">What is your current weight? (lbs)</FormLabel>
                                    <FormControl><Input type="number" placeholder="e.g. 180" {...field} className="h-11 text-base" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleNextStep('initialWeight'); } }} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <div className="flex justify-between pt-2">
                                <Button type="button" variant="outline" onClick={handlePreviousStep}>Back</Button>
                                <Button type="button" onClick={() => handleNextStep('initialWeight')}>Next</Button>
                            </div>
                        </div>
                    )}
                    
                    {step === 5 && (
                        <div className="space-y-6 animate-in fade-in duration-500">
                            <FormField control={form.control} name="goalWeight" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-lg font-semibold">What is your goal weight? (lbs)</FormLabel>
                                    <FormControl><Input type="number" placeholder="e.g. 170" {...field} className="h-11 text-base" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleNextStep('goalWeight'); } }} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <div className="flex justify-between pt-2">
                                <Button type="button" variant="outline" onClick={handlePreviousStep}>Back</Button>
                                <Button type="button" onClick={() => handleNextStep('goalWeight')}>Next</Button>
                            </div>
                        </div>
                    )}

                    {step === 6 && (
                        <div className="space-y-6 animate-in fade-in duration-500">
                             <FormField control={form.control} name="experience" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-lg font-semibold">What's your training experience?</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger className="h-11 text-base"><SelectValue placeholder="Select level..." /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="beginner">Beginner (0-2 years)</SelectItem>
                                        <SelectItem value="intermediate">Intermediate (2-4 years)</SelectItem>
                                        <SelectItem value="advanced">Advanced (5+ years)</SelectItem>
                                    </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                             <div className="flex justify-between pt-2">
                                <Button type="button" variant="outline" onClick={handlePreviousStep}>Back</Button>
                                <Button type="button" onClick={() => handleNextStep('experience')}>Next</Button>
                            </div>
                        </div>
                    )}

                    {step === 7 && (
                        <div className="space-y-6 animate-in fade-in duration-500">
                             <FormField control={form.control} name="transformationTarget" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-lg font-semibold">Choose your target timeline.</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger className="h-11 text-base"><SelectValue placeholder="Select duration..." /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="8">8 Weeks</SelectItem>
                                        <SelectItem value="12">12 Weeks</SelectItem>
                                        <SelectItem value="16">16 Weeks</SelectItem>
                                    </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                             <div className="flex justify-between pt-2">
                                <Button type="button" variant="outline" onClick={handlePreviousStep}>Back</Button>
                                <Button type="button" onClick={() => handleNextStep('transformationTarget')}>Next</Button>
                            </div>
                        </div>
                    )}
                    
                    {step === 8 && (
                        <div className="space-y-6 animate-in fade-in duration-500">
                             <FormField control={form.control} name="email" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-lg font-semibold">What's your email address?</FormLabel>
                                    <FormControl><Input type="email" placeholder="m@example.com" {...field} className="h-11 text-base" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleNextStep('email'); } }} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <div className="flex justify-between pt-2">
                                <Button type="button" variant="outline" onClick={handlePreviousStep}>Back</Button>
                                <Button type="button" onClick={() => handleNextStep('email')}>Next</Button>
                            </div>
                        </div>
                    )}
                    
                    {step === 9 && (
                        <div className="space-y-6 animate-in fade-in duration-500">
                            <h3 className="text-lg font-semibold text-center">Last step, create your password.</h3>
                            <FormField control={form.control} name="password" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Password</FormLabel>
                                <FormControl><Input type="password" {...field} className="h-11 text-base" autoFocus /></FormControl>
                                <FormMessage />
                            </FormItem>
                            )} />
                            <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Confirm Password</FormLabel>
                                <FormControl><Input type="password" {...field} className="h-11 text-base" /></FormControl>
                                <FormMessage />
                            </FormItem>
                            )} />
                            <div className="flex justify-between pt-4">
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
            <CardFooter className="justify-center text-sm pb-8">
                <p>Already have an account? <Link href="/login" className="text-primary hover:underline">Log in</Link></p>
            </CardFooter>
        </Card>
    </div>
  );
}
