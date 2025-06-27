"use client"
import { useState } from 'react';
import type { BodyWeightLogEntry } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

export default function DailyCheckin() {
  const [morningWeight, setMorningWeight] = useState('');
  const { toast } = useToast();

  const handleSaveWeight = () => {
    const weight = parseFloat(morningWeight);
    if (!isNaN(weight) && weight > 0) {
      const newEntry: BodyWeightLogEntry = {
        id: `bw-${Date.now()}`,
        weight: weight,
        date: new Date().toISOString(),
      };
      
      const storedBodyWeight = localStorage.getItem('protracker-bodyweight');
      const bodyWeightLogs: BodyWeightLogEntry[] = storedBodyWeight ? JSON.parse(storedBodyWeight) : [];
      
      const updatedLogs = [newEntry, ...bodyWeightLogs];
      localStorage.setItem('protracker-bodyweight', JSON.stringify(updatedLogs));
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
          <Input id="sleep" type="number" placeholder="e.g., 8" />
        </div>
        <Button className="w-full bg-accent hover:bg-accent/90">Submit Check-in</Button>
      </CardContent>
    </Card>
  );
}
