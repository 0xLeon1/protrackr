
"use client"
import { useState, useEffect } from 'react';
import type { BodyWeightLogEntry, CheckinLogEntry, SleepLogEntry } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
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
import { CheckCircle2, Loader2 } from 'lucide-react';

export default function DailyCheckin() {
  const [morningWeight, setMorningWeight] = useState('');
  const [sleepHours, setSleepHours] = useState('');
  const [energyLevel, setEnergyLevel] = useState(3);
  const [trained, setTrained] = useState('yes');
  const [hitMacros, setHitMacros] = useState('yes');
  const { toast } = useToast();
  const { user, dataVersion } = useAuth();
  
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsCheckingStatus(false);
      return;
    }

    const checkStatus = async () => {
      setIsCheckingStatus(true);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const checkinsCollection = collection(db, 'users', user.uid, 'checkins');
      const q = query(checkinsCollection, where('date', '>=', today.toISOString()), where('date', '<', tomorrow.toISOString()));
      
      try {
        const querySnapshot = await getDocs(q);
        setHasCheckedInToday(!querySnapshot.empty);
      } catch (error) {
        console.error("Error checking check-in status:", error);
        setHasCheckedInToday(false);
      } finally {
        setIsCheckingStatus(false);
      }
    };

    checkStatus();
  }, [user, dataVersion]);

  const handleSaveWeight = async () => {
    if (!user) return;
    const weight = parseFloat(morningWeight);
    if (!isNaN(weight) && weight > 0) {
      const newEntry: Omit<BodyWeightLogEntry, 'id'> = {
        weight: weight,
        date: new Date().toISOString(),
      };
      
      const bodyWeightCollection = collection(db, 'users', user.uid, 'bodyweight-logs');
      await addDoc(bodyWeightCollection, newEntry);
      
      setMorningWeight('');
      toast({
        title: "Weight logged!",
        description: `Your weight of ${weight} lbs has been saved.`,
      });
    } else {
        toast({
            title: "Invalid Weight",
            description: `Please enter a valid weight.`,
            variant: "destructive"
        });
    }
  };
  
  const handleSubmitCheckin = async () => {
    if (!user || hasCheckedInToday) return;

    const newCheckinEntry: Omit<CheckinLogEntry, 'id'> = {
      date: new Date().toISOString(),
      energy: energyLevel,
      trained: trained === 'yes',
      hitMacros: hitMacros === 'yes',
    };
    
    const checkinsCollection = collection(db, 'users', user.uid, 'checkins');
    await addDoc(checkinsCollection, newCheckinEntry);
    
    let sleepMessage = "";
    const hours = parseFloat(sleepHours);
    if (!isNaN(hours) && hours > 0) {
        const newSleepEntry: Omit<SleepLogEntry, 'id'> = {
            hours: hours,
            date: new Date().toISOString(),
        };
        const sleepLogsCollection = collection(db, 'users', user.uid, 'sleep-logs');
        await addDoc(sleepLogsCollection, newSleepEntry);
        sleepMessage = ` Sleep of ${hours} hours also logged.`;
    }

    toast({
      title: "Check-in Submitted!",
      description: `Your daily check-in has been recorded.${sleepMessage}`,
    });
    setSleepHours('');
    setHasCheckedInToday(true);
  };

  if (isCheckingStatus) {
    return (
      <Card>
        <CardHeader>
            <CardTitle className="font-headline">Daily Check-in</CardTitle>
            <CardDescription>How are you feeling today?</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-60">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (hasCheckedInToday) {
    return (
        <Card className="bg-muted/50">
            <CardHeader>
                <CardTitle className="font-headline">Daily Check-in</CardTitle>
                <CardDescription>You're all set for today.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center text-center space-y-4 py-16">
                <CheckCircle2 className="w-16 h-16 text-green-500" />
                <p className="text-lg font-semibold">You've already checked in today!</p>
                <p className="text-muted-foreground">Great job staying consistent. See you tomorrow!</p>
            </CardContent>
        </Card>
    );
  }

  return (
    <Card className="transition-all duration-300 hover:shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline">Daily Check-in</CardTitle>
        <CardDescription>How are you feeling today?</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <Label htmlFor="morning-weight">Morning Weight (lbs)</Label>
          <div className="flex gap-2">
            <Input
              id="morning-weight"
              type="number"
              placeholder="e.g., 180.5"
              value={morningWeight}
              onChange={(e) => setMorningWeight(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveWeight()}
            />
            <Button onClick={handleSaveWeight} variant="outline">Save</Button>
          </div>
        </div>

        <Separator />
        
        <div className="space-y-4">
          <Label>Did you train today?</Label>
          <RadioGroup value={trained} onValueChange={setTrained} className="flex gap-4">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="train-yes" />
              <Label htmlFor="train-yes">Yes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="train-no" />
              <Label htmlFor="train-no">No</Label>
            </div>
          </RadioGroup>
        </div>
        <div className="space-y-4">
          <Label>Did you hit your macros?</Label>
           <RadioGroup value={hitMacros} onValueChange={setHitMacros} className="flex gap-4">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="macros-yes" />
              <Label htmlFor="macros-yes">Yes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="macros-no" />
              <Label htmlFor="macros-no">No</Label>
            </div>
          </RadioGroup>
        </div>
        <div className="space-y-4">
            <Label htmlFor="energy">Energy</Label>
            <Slider id="energy" value={[energyLevel]} onValueChange={(value) => setEnergyLevel(value[0])} min={1} max={5} step={1} />
            <div className="flex justify-between text-xs text-muted-foreground px-1">
              <span>1</span>
              <span>2</span>
              <span>3</span>
              <span>4</span>
              <span>5</span>
            </div>
        </div>
        <div className="space-y-4">
          <Label htmlFor="sleep">Hours of Sleep</Label>
          <Input id="sleep" type="number" placeholder="e.g., 8" value={sleepHours} onChange={(e) => setSleepHours(e.target.value)} />
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button className="w-full bg-accent hover:bg-accent/90">Submit Check-in</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Check-in</AlertDialogTitle>
              <AlertDialogDescription>
                You can only submit your check-in once per day. Are you sure you want to proceed?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleSubmitCheckin} className="bg-accent hover:bg-accent/90">
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </CardContent>
    </Card>
  );
}
