
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Program, Workout } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import WorkoutTracker from "@/components/protracker/WorkoutTracker";
import { PlusCircle, Trash2, Play, MoreVertical, Loader2 } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const initialPrograms: Program[] = [
  {
    id: 'prog1',
    name: 'My 5-Day Split',
    workouts: [
      {
        id: 'work1',
        name: 'Day 1: Push (Chest, Shoulders, Triceps)',
        exercises: [
          { id: 'ex1', name: 'Barbell Bench Press', sets: 4, reps: 8, weight: 185, notes: 'Felt strong today.' },
          { id: 'ex2', name: 'Incline Dumbbell Press', sets: 3, reps: 10, weight: 65, notes: '' },
          { id: 'ex3', name: 'Overhead Press', sets: 4, reps: 8, weight: 105, notes: '' },
          { id: 'ex4', name: 'Tricep Pushdowns', sets: 4, reps: 12, weight: 50, notes: '' },
        ]
      },
      {
        id: 'work2',
        name: 'Day 2: Pull (Back, Biceps)',
        exercises: [
          { id: 'ex5', name: 'Pull-ups', sets: 4, reps: 8, weight: 0, notes: 'Bodyweight' },
          { id: 'ex6', name: 'Bent Over Rows', sets: 4, reps: 8, weight: 135, notes: '' },
          { id: 'ex7', name: 'Bicep Curls', sets: 3, reps: 12, weight: 30, notes: '' },
        ]
      }
    ]
  },
  {
    id: 'prog2',
    name: 'Starting Strength',
    workouts: [
      {
        id: 'work3',
        name: 'Workout A',
        exercises: [
            { id: 'ex8', name: 'Squat', sets: 3, reps: 5, weight: 225, notes: '' },
            { id: 'ex9', name: 'Bench Press', sets: 3, reps: 5, weight: 185, notes: '' },
            { id: 'ex10', name: 'Deadlift', sets: 1, reps: 5, weight: 315, notes: '' },
        ]
      },
       {
        id: 'work4',
        name: 'Workout B',
        exercises: [
            { id: 'ex11', name: 'Squat', sets: 3, reps: 5, weight: 225, notes: '' },
            { id: 'ex12', name: 'Overhead Press', sets: 3, reps: 5, weight: 105, notes: '' },
            { id: 'ex13', name: 'Power Clean', sets: 5, reps: 3, weight: 135, notes: '' },
        ]
      }
    ]
  }
];

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<Program[] | null>(null);
  const [newProgramName, setNewProgramName] = useState('');
  const router = useRouter();

  useEffect(() => {
    const storedPrograms = localStorage.getItem('protracker-programs');
    if (storedPrograms) {
        try {
            setPrograms(JSON.parse(storedPrograms));
        } catch (error) {
            console.error("Failed to parse programs from localStorage", error);
            setPrograms(initialPrograms);
        }
    } else {
        setPrograms(initialPrograms);
    }
  }, []);

  const updatePrograms = (updatedPrograms: Program[]) => {
    setPrograms(updatedPrograms);
    localStorage.setItem('protracker-programs', JSON.stringify(updatedPrograms));
  };

  const handleAddProgram = () => {
    if (newProgramName.trim() === '' || !programs) return;
    const newProgram: Program = {
      id: `prog-${Date.now()}`,
      name: newProgramName,
      workouts: []
    };
    updatePrograms([...programs, newProgram]);
    setNewProgramName('');
  };

  const handleDeleteProgram = (programId: string) => {
    if (!programs) return;
    updatePrograms(programs.filter(p => p.id !== programId));
  };

  const handleProgramNameChange = (programId: string, name: string) => {
    if (!programs) return;
    const newPrograms = programs.map(p => p.id === programId ? {...p, name} : p);
    updatePrograms(newPrograms);
  };
  
  const handleAddWorkout = (programId: string) => {
    if (!programs) return;
    const newWorkout: Workout = {
      id: `work-${Date.now()}`,
      name: 'New Workout',
      exercises: []
    };
    const newPrograms = programs.map(p => {
      if (p.id === programId) {
        return { ...p, workouts: [...p.workouts, newWorkout] };
      }
      return p;
    });
    updatePrograms(newPrograms);
  };
  
  const handleDeleteWorkout = (programId: string, workoutId: string) => {
    if (!programs) return;
     const newPrograms = programs.map(p => {
      if (p.id === programId) {
        return { ...p, workouts: p.workouts.filter(w => w.id !== workoutId) };
      }
      return p;
    });
    updatePrograms(newPrograms);
  };

  const handleWorkoutNameChange = (programId: string, workoutId: string, name:string) => {
    if (!programs) return;
    const newPrograms = programs.map(p => {
        if(p.id === programId) {
            const newWorkouts = p.workouts.map(w => w.id === workoutId ? {...w, name} : w);
            return {...p, workouts: newWorkouts};
        }
        return p;
    })
    updatePrograms(newPrograms);
  };

  const handleWorkoutChange = (programId: string, updatedWorkout: Workout) => {
    if (!programs) return;
    const newPrograms = programs.map(p => {
      if (p.id === programId) {
        return { 
          ...p, 
          workouts: p.workouts.map(w => w.id === updatedWorkout.id ? updatedWorkout : w)
        };
      }
      return p;
    });
    updatePrograms(newPrograms);
  };

  const handleStartWorkout = (workoutId: string) => {
    router.push(`/workout/${workoutId}`);
  };

  if (!programs) {
    return (
      <div className="flex justify-center items-center h-full min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="sr-only">Loading programs...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Your Programs</h2>
        {programs.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-center text-muted-foreground">You haven't created any programs yet.</p>
            </CardContent>
          </Card>
        )}
        <Accordion type="multiple" className="w-full space-y-4">
          {programs.map((program) => (
            <Card key={program.id} className="overflow-hidden">
              <AccordionItem value={program.id} className="border-none">
                <AccordionTrigger className="px-4 hover:no-underline text-lg font-semibold bg-card">
                    <Input 
                      value={program.name} 
                      onChange={(e) => handleProgramNameChange(program.id, e.target.value)} 
                      className="text-lg font-semibold border-none focus-visible:ring-1 bg-transparent"
                      onClick={(e) => e.stopPropagation()}
                    />
                </AccordionTrigger>
                <AccordionContent className="p-4 border-t">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="font-semibold">Workouts</h3>
                        <div className="flex items-center gap-2">
                          <Button onClick={() => handleAddWorkout(program.id)} variant="outline" size="sm">
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Workout
                          </Button>
                           <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="icon" className="text-destructive border-destructive/50 hover:bg-destructive/10 hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the "{program.name}" program and all of its workouts.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteProgram(program.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>
                   
                    {program.workouts.length > 0 ? (
                      <Accordion type="multiple" className="space-y-2">
                         {program.workouts.map(workout => (
                           <AccordionItem value={workout.id} key={workout.id} className="border rounded-lg bg-muted/30">
                             <AccordionTrigger className="px-4 text-base font-medium hover:no-underline">
                                <Input 
                                  value={workout.name} 
                                  onChange={(e) => handleWorkoutNameChange(program.id, workout.id, e.target.value)} 
                                  className="border-none focus-visible:ring-1 bg-transparent"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <div className="flex items-center gap-2 mr-2">
                                   <Button 
                                      size="sm"
                                      onClick={(e) => { e.stopPropagation(); handleStartWorkout(workout.id) }}
                                      className="bg-green-500 hover:bg-green-600 text-white"
                                  >
                                      <Play className="mr-2 h-4 w-4" />
                                      Start
                                  </Button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="shrink-0" onClick={(e) => e.stopPropagation()}>
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent onClick={(e) => e.stopPropagation()} align="end">
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <DropdownMenuItem
                                            onSelect={(e) => e.preventDefault()}
                                            className="text-destructive focus:text-destructive"
                                          >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            <span>Delete Workout</span>
                                          </DropdownMenuItem>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              This action cannot be undone. This will permanently delete the "{workout.name}" workout.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                              onClick={() => handleDeleteWorkout(program.id, workout.id)}
                                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            >
                                              Delete
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                             </AccordionTrigger>
                             <AccordionContent className="bg-background rounded-b-lg">
                               <WorkoutTracker 
                                  workout={workout} 
                                  onWorkoutChange={(updatedWorkout) => handleWorkoutChange(program.id, updatedWorkout)} 
                                />
                             </AccordionContent>
                           </AccordionItem>
                         ))}
                      </Accordion>
                    ) : (
                      <div className="text-sm text-center text-muted-foreground py-4 border rounded-lg border-dashed">
                        <p>This program has no workouts yet.</p>
                        <p>Click "Add Workout" to get started.</p>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Card>
          ))}
        </Accordion>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create a New Program</CardTitle>
          <CardDescription>
            Build a new workout program from scratch.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input 
              placeholder="e.g., My Awesome Program" 
              value={newProgramName}
              onChange={(e) => setNewProgramName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddProgram()}
            />
            <Button onClick={handleAddProgram}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Program
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
