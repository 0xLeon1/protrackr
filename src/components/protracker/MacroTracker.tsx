
"use client";

import { useState } from "react";
import type { WeeklyMacroGoal } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Settings, Forward, Check, BookOpen, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { parseISO, endOfWeek, differenceInDays } from 'date-fns';
import NutritionPlanSetup from "./NutritionPlanSetup";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { auth, db } from "@/lib/firebase";
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { Input } from "../ui/input";
import { Label } from "../ui/label";


interface MacroTrackerProps {
    currentIntake: {
        calories: number;
        protein: number;
        carbs: number;
        fats: number;
    }
}

export default function MacroTracker({ currentIntake }: MacroTrackerProps) {
  const { user, profile, macroPlan, currentGoals, refreshData } = useAuth();
  const { toast } = useToast();

  const [isPlanSetupOpen, setIsPlanSetupOpen] = useState(false);
  const [isFullPlanOpen, setIsFullPlanOpen] = useState(false);
  
  const [resetStep, setResetStep] = useState<'closed' | 'warning' | 'password'>('closed');
  const [password, setPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);


  const handleOpenResetDialog = () => {
    setResetStep('warning');
    setPassword('');
    setIsResetting(false);
  };

  const handleResetConfirm = async () => {
    if (!user || !user.email || !password || !auth || !db) {
        toast({ title: "Error", description: "Password is required.", variant: "destructive" });
        return;
    }
    
    setIsResetting(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);

      // 1. Delete the existing macro plan
      const goalsDocRef = doc(db, 'users', user.uid, 'data', 'goals');
      await deleteDoc(goalsDocRef);
      
      // 2. Update profile to indicate setup is needed
      const profileDocRef = doc(db, 'users', user.uid, 'data', 'profile');
      await updateDoc(profileDocRef, { hasCompletedMacroSetup: false });
      
      toast({ title: "Plan Reset", description: "You can now set up a new nutrition plan."});

      // 3. Refresh global state
      await refreshData();
      
      // 4. Close the confirmation dialog
      setResetStep('closed');

    } catch (error: any) {
        toast({
            title: "Authentication Failed",
            description: "Incorrect password. Please try again.",
            variant: "destructive"
        });
    } finally {
        setIsResetting(false);
    }
  };


  if (!profile || !macroPlan || !currentGoals) {
    return null; // Or a loading/skeleton state
  }

  const getProgressValue = (current: number, goal: number) => {
    if (goal === 0) return 0;
    return (current / goal) * 100;
  };
  
  const startDate = parseISO(macroPlan.startDate);
  const totalWeeks = macroPlan.plan.length;
  const totalDaysInPlan = totalWeeks * 7;
  const daysElapsed = differenceInDays(new Date(), startDate);
  const isComplete = daysElapsed >= totalDaysInPlan;

  // Calculate overall progress based on days elapsed
  const cappedDaysElapsed = Math.min(daysElapsed, totalDaysInPlan);
  const progressValue = ((cappedDaysElapsed + 1) / totalDaysInPlan) * 100;
  const overallProgress = Math.min(100, progressValue);
  
  const currentWeekNumber = isComplete ? totalWeeks : Math.min(totalWeeks, Math.floor(daysElapsed / 7) + 1);
  
  const endOfCurrentWeek = endOfWeek(new Date(), { weekStartsOn: 1 });
  const daysUntilNextUpdate = differenceInDays(endOfCurrentWeek, new Date());
  
  const countdownText = daysUntilNextUpdate > 1
    ? `${daysUntilNextUpdate} days until next update`
    : daysUntilNextUpdate === 1
    ? '1 day until next update'
    : 'Macros update tomorrow';

  return (
    <Card className="transition-all duration-300 hover:shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="font-headline">Macro Tracker</CardTitle>
                <CardDescription>Your daily nutrition summary.</CardDescription>
            </div>
            <div className="flex items-center gap-1">
                <Dialog open={isFullPlanOpen} onOpenChange={setIsFullPlanOpen}>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <BookOpen className="h-5 w-5" />
                            <span className="sr-only">View Full Plan</span>
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-xl h-[70vh] flex flex-col">
                        <DialogHeader>
                            <DialogTitle>Your Full Transformation Plan</DialogTitle>
                            <DialogDescription>
                                Here is your week-by-week macro breakdown.
                            </DialogDescription>
                        </DialogHeader>
                        <ScrollArea className="flex-1 my-4 pr-6">
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
                                    {macroPlan?.plan.map(week => (
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
                    </DialogContent>
                </Dialog>
                <Button variant="ghost" size="icon" onClick={handleOpenResetDialog}>
                    <Settings className="h-5 w-5" />
                    <span className="sr-only">Adjust Plan</span>
                </Button>
            </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between items-baseline mb-1">
            <span className="text-sm font-medium">Transformation Progress</span>
            <span className="text-sm font-bold">Week {currentWeekNumber} / {totalWeeks}</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
          {isComplete ? (
            <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
                <Check className="h-3 w-3 text-green-500" />
                Transformation complete!
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
                <Forward className="h-3 w-3" />
                {countdownText}
            </p>
          )}
        </div>

        <div className="flex justify-between items-baseline pt-2">
            <h3 className="text-3xl font-bold text-primary">{Math.round(currentIntake.calories).toLocaleString()}</h3>
            <span className="font-medium text-muted-foreground">/ {currentGoals.calories.toLocaleString()} kCal</span>
        </div>
        <div className="space-y-3 pt-2">
          <div>
            <div className="flex justify-between mb-1 text-sm">
              <span className="font-medium text-foreground">Protein</span>
              <span className="text-muted-foreground">{Math.round(currentIntake.protein)}g / {currentGoals.protein}g</span>
            </div>
            <Progress value={getProgressValue(currentIntake.protein, currentGoals.protein)} className="h-2 [&>div]:bg-sky-400" />
          </div>
          <div>
            <div className="flex justify-between mb-1 text-sm">
              <span className="font-medium text-foreground">Carbs</span>
              <span className="text-muted-foreground">{Math.round(currentIntake.carbs)}g / {currentGoals.carbs}g</span>
            </div>
            <Progress value={getProgressValue(currentIntake.carbs, currentGoals.carbs)} className="h-2 [&>div]:bg-orange-400" />
          </div>
          <div>
            <div className="flex justify-between mb-1 text-sm">
              <span className="font-medium text-foreground">Fats</span>
              <span className="text-muted-foreground">{Math.round(currentIntake.fats)}g / {currentGoals.fats}g</span>
            </div>
            <Progress value={getProgressValue(currentIntake.fats, currentGoals.fats)} className="h-2 [&>div]:bg-amber-400" />
          </div>
        </div>
      </CardContent>
      <NutritionPlanSetup
        isOpen={isPlanSetupOpen}
        onClose={() => setIsPlanSetupOpen(false)}
        onPlanSet={async () => {
            await refreshData();
            setIsPlanSetupOpen(false);
        }}
      />
      
      <Dialog open={resetStep !== 'closed'} onOpenChange={(open) => !open && setResetStep('closed')}>
        <DialogContent>
          {resetStep === 'warning' && (
            <>
              <DialogHeader>
                <DialogTitle>Are you sure you want to change your plan?</DialogTitle>
                <DialogDescription>
                  Building a great physique takes time and consistency. Changing your plan should only be done if necessary.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setResetStep('closed')}>Cancel</Button>
                <Button onClick={() => setResetStep('password')}>Yes, I understand</Button>
              </DialogFooter>
            </>
          )}

          {resetStep === 'password' && (
            <>
              <DialogHeader>
                <DialogTitle>Confirm Password to Reset Plan</DialogTitle>
                <DialogDescription>
                  For your security, please enter your password to proceed. This will allow you to create a new nutrition plan.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 py-2">
                <Label htmlFor="password-confirm" className="sr-only">Password</Label>
                <Input
                  id="password-confirm"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && password && handleResetConfirm()}
                />
              </div>
              <DialogFooter>
                 <Button variant="outline" onClick={() => setResetStep('warning')} disabled={isResetting}>Back</Button>
                <Button onClick={handleResetConfirm} disabled={isResetting || !password}>
                  {isResetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirm
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

    </Card>
  );
}
