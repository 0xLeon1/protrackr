'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import type { UserProfile } from '@/types';
import { db } from '@/lib/firebase';
import { doc, setDoc, deleteDoc, updateDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { format, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, AlertTriangle } from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';

export default function SettingsPage() {
  const { user, profile, loading, refreshData } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [editableProfile, setEditableProfile] = useState<Partial<UserProfile> | null>(null);
  const [isResettingPlan, setIsResettingPlan] = useState(false);
  const [isResettingWorkouts, setIsResettingWorkouts] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);
  
  useEffect(() => {
    if (profile) {
      setEditableProfile(profile);
    }
  }, [profile]);

  const handleProfileChange = (field: keyof UserProfile, value: string | number) => {
    if (editableProfile) {
        setEditableProfile({ ...editableProfile, [field]: value });
    }
  };

  const handleSaveChanges = async () => {
    if (!user || !editableProfile) return;
    
    if (!editableProfile.name || !editableProfile.age || editableProfile.age <= 0) {
      toast({
        title: "Invalid Profile Data",
        description: "Please ensure your name and age have valid values.",
        variant: "destructive",
      });
      return;
    }

    try {
        const profileDocRef = doc(db, 'users', user.uid, 'data', 'profile');
        const dataToSave: Partial<UserProfile> = {
            name: editableProfile.name,
            age: editableProfile.age,
            gender: editableProfile.gender,
            otherGoals: editableProfile.otherGoals,
        };
        await setDoc(profileDocRef, dataToSave, { merge: true });
        
        await refreshData();
        toast({ title: "Profile Updated", description: "Your changes have been saved." });
    } catch (error) {
        console.error("Error updating profile:", error);
        toast({ title: "Error", description: "Could not save your changes.", variant: "destructive" });
    }
  };
  
  const handleResetPlan = async () => {
    if (!user || !profile || !hasActivePlan) return;
    setIsResettingPlan(true);

    try {
        const goalsDocRef = doc(db, 'users', user.uid, 'data', 'goals');
        await deleteDoc(goalsDocRef);
        
        const profileDocRef = doc(db, 'users', user.uid, 'data', 'profile');
        await updateDoc(profileDocRef, { hasCompletedMacroSetup: false });
        
        await refreshData();
        
        toast({
            title: "Nutrition Plan Reset",
            description: "Your plan has been cleared. You can now set up a new one.",
        });

    } catch (error) {
        console.error("Error resetting nutrition plan: ", error);
        toast({
            title: "Error",
            description: "Could not reset your nutrition plan. Please try again.",
            variant: "destructive"
        });
    } finally {
        setIsResettingPlan(false);
    }
  }
  
  const handleResetWorkoutData = async () => {
    if (!user || !db) return;
    setIsResettingWorkouts(true);

    const collectionsToDelete = ['logs', 'cardio-logs', 'sleep-logs', 'checkins', 'bodyweight-logs'];

    try {
        const batch = writeBatch(db);
        
        for (const collectionName of collectionsToDelete) {
            const collectionRef = collection(db, 'users', user.uid, collectionName);
            const snapshot = await getDocs(collectionRef);
            if (!snapshot.empty) {
                snapshot.forEach(docToDelete => {
                    batch.delete(docToDelete.ref);
                });
            }
        }
        
        await batch.commit();

        await refreshData();
        toast({
            title: "Activity Data Reset",
            description: "All of your past workout, cardio, and other activity logs have been deleted.",
        });
    } catch (error) {
        console.error("Error resetting workout data: ", error);
        toast({
            title: "Error",
            description: "Could not reset your activity data. Please try again.",
            variant: "destructive"
        });
    } finally {
        setIsResettingWorkouts(false);
    }
  }


  if (loading || !user || !editableProfile) {
    return (
      <div className="flex justify-center items-center h-full min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasActivePlan = profile?.hasCompletedMacroSetup;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences.</p>
      </header>
      
      <Card>
        <CardHeader>
          <CardTitle>Edit Your Profile</CardTitle>
          <CardDescription>
            {hasActivePlan 
              ? "Your core plan details are locked. To change them, you must reset your plan."
              : "Make changes to your profile. Click save when you're done."
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid gap-6 max-w-lg">
                <div className="grid grid-cols-3 items-center gap-4">
                    <Label htmlFor="name" className="text-right">Name</Label>
                    <Input id="name" value={editableProfile.name || ''} onChange={(e) => handleProfileChange('name', e.target.value)} className="col-span-2" />
                </div>
                <div className="grid grid-cols-3 items-center gap-4">
                    <Label htmlFor="age" className="text-right">Age</Label>
                    <Input id="age" type="number" value={editableProfile.age || ''} onChange={(e) => handleProfileChange('age', Number(e.target.value))} className="col-span-2" />
                </div>
                 <div className="grid grid-cols-3 items-center gap-4">
                    <Label htmlFor="gender" className="text-right">Gender</Label>
                    <Select value={editableProfile.gender || ''} onValueChange={(value) => handleProfileChange('gender', value)}>
                        <SelectTrigger className="col-span-2"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-3 items-center gap-4">
                    <Label htmlFor="initialWeight" className="text-right">Start Weight</Label>
                    <Input id="initialWeight" type="number" value={editableProfile.initialWeight || ''} disabled={hasActivePlan} readOnly={hasActivePlan} className="col-span-2" />
                </div>
                <div className="grid grid-cols-3 items-center gap-4">
                    <Label htmlFor="goalWeight" className="text-right">Goal Weight</Label>
                    <Input id="goalWeight" type="number" value={editableProfile.goalWeight || ''} disabled={hasActivePlan} readOnly={hasActivePlan} className="col-span-2" />
                </div>
                 <div className="grid grid-cols-3 items-center gap-4">
                    <Label className="text-right">Target Date</Label>
                    <Input value={editableProfile.targetDate ? format(parseISO(editableProfile.targetDate), 'MMM d, yyyy') : 'Not Set'} disabled readOnly className="col-span-2 text-muted-foreground" />
                </div>
                <div className="grid grid-cols-3 items-start gap-4">
                    <Label htmlFor="otherGoals" className="text-right pt-2">Your 'Why'</Label>
                    <Textarea 
                        id="otherGoals" 
                        value={editableProfile.otherGoals || ''} 
                        onChange={(e) => handleProfileChange('otherGoals', e.target.value)} 
                        className="col-span-2 min-h-[80px]" 
                        placeholder="e.g. To have more energy for my family..."
                    />
                </div>
                <Button onClick={handleSaveChanges}>Save Changes</Button>
            </div>
        </CardContent>
      </Card>
      
      <Card className="border-destructive">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="text-destructive"/>
                    Danger Zone
                </CardTitle>
                <CardDescription>
                    These actions are permanent and will clear your historical data.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <h3 className="font-semibold">Nutrition Plan</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                        This will clear your current nutrition targets and macro plan, allowing you to set up a new one.
                    </p>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" disabled={isResettingPlan || !hasActivePlan}>
                                {isResettingPlan ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                Reset My Nutrition Plan
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently delete your current nutrition plan. You will need to
                                    go through the setup process again to create a new one. This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleResetPlan} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    Yes, Reset My Plan
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    {!hasActivePlan && (
                        <p className="text-sm text-destructive mt-2">No active nutrition plan to reset.</p>
                    )}
                </div>
                
                <Separator/>

                <div>
                    <h3 className="font-semibold">Activity & Progress Data</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                        This will permanently delete all of your historical logs.
                    </p>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" disabled={isResettingWorkouts}>
                                {isResettingWorkouts ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                Reset All Activity Data
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently delete all of your past activity data, including workouts, cardio, sleep logs, daily check-ins, and body weight history. This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleResetWorkoutData} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    Yes, Reset All Data
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </CardContent>
        </Card>

    </div>
  );
}
