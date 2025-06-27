
"use client"
import { useState } from 'react';
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

export default function DailyCheckin() {
  const [morningWeight, setMorningWeight] = useState('');
  const [sleepHours, setSleepHours] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();

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
    if (!user) return;
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const startOfToday = new Date(todayStr);
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000 - 1);

    const checkinsCollection = collection(db, 'users', user.uid, 'checkins');
    const q = query(checkinsCollection, where('date', '>=', startOfToday.toISOString()), where('date', '<=', endOfToday.toISOString()));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      toast({
          title: "Already Checked In!",
          description: "You have already submitted your check-in for today.",
          variant: "default"
      });
      return;
    }

    const newCheckinEntry: Omit<CheckinLogEntry, 'id'> = {
      date: today.toISOString(),
    };
    await addDoc(checkinsCollection, newCheckinEntry);
    
    let sleepMessage = "";
    const hours = parseFloat(sleepHours);
    if (!isNaN(hours) && hours > 0) {
        const newSleepEntry: Omit<SleepLogEntry, 'id'> = {
            hours: hours,
            date: today.toISOString(),
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
  };

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
          <RadioGroup defaultValue="yes" className="flex gap-4">
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
          <RadioGroup defaultValue="yes" className="flex gap-4">
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
            <Slider id="energy" defaultValue={[3]} min={1} max={5} step={1} />
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
        <Button className="w-full bg-accent hover:bg-accent/90" onClick={handleSubmitCheckin}>Submit Check-in</Button>
      </CardContent>
    </Card>
  );
}
