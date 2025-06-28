
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
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  age: z.coerce.number().min(13, { message: "You must be at least 13 years old." }).max(120),
  sex: z.enum(["male", "female", "other"]),
  height: z.coerce.number().min(36, { message: "Height must be at least 36 inches." }).max(96),
  initialWeight: z.coerce.number().min(50, { message: "Weight must be at least 50 lbs." }).max(1000),
  goalWeight: z.coerce.number().min(50, { message: "Weight must be at least 50 lbs." }).max(1000),
  experience: z.enum(["beginner", "intermediate", "advanced"]),
  transformationTarget: z.enum(["8", "12", "16"]),
});

export default function SignupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { isFirebaseConfigured, refreshData } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
      age: undefined,
      sex: undefined,
      height: undefined,
      initialWeight: undefined,
      goalWeight: undefined,
      experience: undefined,
      transformationTarget: "12",
    },
  });

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
        height: values.height, // inches
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

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)] py-8">
        <Card className="w-full max-w-2xl">
        <CardHeader>
            <CardTitle>Create Your ProTracker Account</CardTitle>
            <CardDescription>Tell us a bit about yourself to get started.</CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSignup)} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Account Info</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  </div>
                </div>

                <Separator />
                
                <div className="space-y-4">
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
                </div>

                <Separator />

                <div className="space-y-4">
                   <h3 className="text-lg font-medium">Your Stats & Goals</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField control={form.control} name="height" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Height (inches)</FormLabel>
                        <FormControl><Input type="number" placeholder="e.g. 68" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
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
                </div>

                <Separator />
                
                <div className="space-y-4">
                   <h3 className="text-lg font-medium">Experience Level</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="experience" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Workout Experience</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select level..." /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="beginner">Beginner (0-1 years)</SelectItem>
                                <SelectItem value="intermediate">Intermediate (1-3 years)</SelectItem>
                                <SelectItem value="advanced">Advanced (3+ years)</SelectItem>
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
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Creating account...' : 'Create Account & Start Tracking'}
                </Button>
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
