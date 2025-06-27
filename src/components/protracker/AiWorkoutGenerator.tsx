"use client";

import { useFormState, useFormStatus } from "react-dom";
import { generateProgramAction } from "@/app/actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Wand2, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

const initialState = {
  message: "",
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
      Generate Program
    </Button>
  );
}

export default function AiWorkoutGenerator() {
  const [state, formAction] = useFormState(generateProgramAction, initialState);
  const { toast } = useToast();

  useEffect(() => {
    if (state.message && (state.errors || state.message.includes("error"))) {
      toast({
        title: "Generation Failed",
        description: state.message,
        variant: "destructive",
      });
    }
  }, [state, toast]);
  

  return (
    <Card className="transition-all duration-300 hover:shadow-lg animate-fade-in">
      <CardHeader>
        <div className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-primary" />
            <CardTitle className="font-headline">AI Program Generator</CardTitle>
        </div>
        <CardDescription>Let AI create a custom workout plan for you.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="goals">Fitness Goals</Label>
            <Input id="goals" name="goals" placeholder="e.g., Build muscle, lose fat" required/>
            {state.errors?.goals && <p className="text-sm font-medium text-destructive">{state.errors.goals[0]}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="experienceLevel">Experience Level</Label>
            <Select name="experienceLevel" defaultValue="beginner">
              <SelectTrigger>
                <SelectValue placeholder="Select your experience" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
            {state.errors?.experienceLevel && <p className="text-sm font-medium text-destructive">{state.errors.experienceLevel[0]}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="daysPerWeek">Days/Week</Label>
              <Input id="daysPerWeek" name="daysPerWeek" type="number" defaultValue="3" min="1" max="7" required/>
              {state.errors?.daysPerWeek && <p className="text-sm font-medium text-destructive">{state.errors.daysPerWeek[0]}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="workoutLength">Length (min)</Label>
              <Input id="workoutLength" name="workoutLength" type="text" placeholder="e.g., 60-90" defaultValue="60" required/>
               {state.errors?.workoutLength && <p className="text-sm font-medium text-destructive">{state.errors.workoutLength[0]}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="equipmentAvailable">Equipment Available</Label>
            <Textarea id="equipmentAvailable" name="equipmentAvailable" placeholder="e.g., Dumbbells, treadmill, bodyweight" required/>
            {state.errors?.equipmentAvailable && <p className="text-sm font-medium text-destructive">{state.errors.equipmentAvailable[0]}</p>}
          </div>
          
          <SubmitButton />
        </form>

        {state.workoutProgram && (
          <div className="p-4 mt-6 border rounded-lg bg-muted/50">
            <h4 className="mb-2 font-bold font-headline">Your Custom Program:</h4>
            <pre className="text-sm whitespace-pre-wrap font-body">{state.workoutProgram}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
