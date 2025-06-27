
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Program, Workout } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import WorkoutTracker from "@/components/protracker/WorkoutTracker";
import { PlusCircle, Trash2, Play, MoreVertical, Loader2, Edit } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

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
  const [programs, setPrograms] = useState<Program[]>([]);
  const [pageIsLoading, setPageIsLoading] = useState(true);
  const [newProgramName, setNewProgramName] = useState('');
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [itemToRename, setItemToRename] = useState<{ type: 'program' | 'workout'; id: string; programId?: string; name: string; } | null>(null);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      const fetchPrograms = async () => {
        setPageIsLoading(true);
        try {
          const programsCollection = collection(db, 'users', user.uid, 'programs');
          const querySnapshot = await getDocs(programsCollection);

          if (querySnapshot.empty) {
            // Seed initial data for a new user
            const seedingPromises = initialPrograms.map(program => {
                const programRef = doc(db, 'users', user.uid, 'programs', program.id);
                return setDoc(programRef, program);
            });
            await Promise.all(seedingPromises);
            setPrograms(initialPrograms);

          } else {
            const userPrograms = querySnapshot.docs.map(doc => ({ ...doc.data() } as Program));
            setPrograms(userPrograms);
          }
        } catch (error) {
            console.error("Error fetching programs:", error);
            toast({
              title: "Error Loading Programs",
              description: "There was a problem fetching your data from the server.",
              variant: "destructive",
            });
            setPrograms([]);
        } finally {
            setPageIsLoading(false);
        }
      };
      fetchPrograms();
    } else if (!authLoading) {
      setPageIsLoading(false);
    }
  }, [user, authLoading, toast]);

  const handleAddProgram = async () => {
    if (newProgramName.trim() === '' || !user) return;
    const newProgram: Program = {
      id: `prog-${Date.now()}`,
      name: newProgramName,
      workouts: []
    };
    
    const programRef = doc(db, 'users', user.uid, 'programs', newProgram.id);
    await setDoc(programRef, newProgram);
    
    setPrograms([...programs, newProgram]);
    setNewProgramName('');
  };

  const handleDeleteProgram = async (programId: string) => {
    if (!user) return;
    await deleteDoc(doc(db, 'users', user.uid, 'programs', programId));
    setPrograms(programs.filter(p => p.id !== programId));
  };

  const handleProgramNameChange = async (programId: string, name: string) => {
    if (!user) return;
    const programRef = doc(db, 'users', user.uid, 'programs', programId);
    await updateDoc(programRef, { name });
    const newPrograms = programs.map(p => p.id === programId ? {...p, name} : p);
    setPrograms(newPrograms);
  };
  
  const handleAddWorkout = async (programId: string) => {
    if (!user) return;
    const program = programs.find(p => p.id === programId);
    if (!program) return;
    
    const newWorkout: Workout = {
      id: `work-${Date.now()}`,
      name: 'New Workout',
      exercises: []
    };
    
    const updatedWorkouts = [...program.workouts, newWorkout];
    const programRef = doc(db, 'users', user.uid, 'programs', programId);
    await updateDoc(programRef, { workouts: updatedWorkouts });

    const newPrograms = programs.map(p => p.id === programId ? { ...p, workouts: updatedWorkouts } : p);
    setPrograms(newPrograms);
  };
  
  const handleDeleteWorkout = async (programId: string, workoutId: string) => {
    if (!user) return;
    const program = programs.find(p => p.id === programId);
    if (!program) return;
    
    const updatedWorkouts = program.workouts.filter(w => w.id !== workoutId);
    const programRef = doc(db, 'users', user.uid, 'programs', programId);
    await updateDoc(programRef, { workouts: updatedWorkouts });

    const newPrograms = programs.map(p => p.id === programId ? { ...p, workouts: updatedWorkouts } : p);
    setPrograms(newPrograms);
  };

  const handleWorkoutNameChange = async (programId: string, workoutId: string, name:string) => {
    if (!user) return;
    const program = programs.find(p => p.id === programId);
    if (!program) return;
    
    const updatedWorkouts = program.workouts.map(w => w.id === workoutId ? { ...w, name } : w);
    const programRef = doc(db, 'users', user.uid, 'programs', programId);
    await updateDoc(programRef, { workouts: updatedWorkouts });

    const newPrograms = programs.map(p => p.id === programId ? { ...p, workouts: updatedWorkouts } : p);
    setPrograms(newPrograms);
  };

  const handleWorkoutChange = async (programId: string, updatedWorkout: Workout) => {
    if (!user) return;
    const program = programs.find(p => p.id === programId);
    if (!program) return;
    
    const updatedWorkouts = program.workouts.map(w => w.id === updatedWorkout.id ? updatedWorkout : w);
    const programRef = doc(db, 'users', user.uid, 'programs', programId);
    await updateDoc(programRef, { workouts: updatedWorkouts });

    const newPrograms = programs.map(p => p.id === programId ? { ...p, workouts: updatedWorkouts } : p);
    setPrograms(newPrograms);
  };

  const handleStartWorkout = (workoutId: string) => {
    router.push(`/workout/${workoutId}`);
  };

  const handleOpenRenameDialog = (item: { type: 'program' | 'workout'; id: string; programId?: string; name: string; }) => {
    setItemToRename(item);
    setNewName(item.name);
  };

  const handleSaveRename = async () => {
    if (!itemToRename || !newName.trim()) return;

    if (itemToRename.type === 'program') {
      await handleProgramNameChange(itemToRename.id, newName);
    } else if (itemToRename.type === 'workout' && itemToRename.programId) {
      await handleWorkoutNameChange(itemToRename.programId, itemToRename.id, newName);
    }
    setItemToRename(null);
    setNewName('');
  };


  if (authLoading || pageIsLoading) {
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
        {programs.length === 0 && !pageIsLoading && (
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
                <AccordionTrigger className="flex items-center p-4 hover:no-underline text-lg font-semibold w-full">
                  {program.name}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="shrink-0 ml-auto" onClick={(e) => e.stopPropagation()}>
                        <MoreVertical className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent onClick={(e) => e.stopPropagation()} align="end">
                        <DropdownMenuItem onSelect={() => handleOpenRenameDialog({ type: 'program', id: program.id, name: program.name })}>
                            <Edit className="mr-2 h-4 w-4" />
                            <span>Rename</span>
                        </DropdownMenuItem>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Delete Program</span>
                            </DropdownMenuItem>
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
                    </DropdownMenuContent>
                  </DropdownMenu>
                </AccordionTrigger>
                <AccordionContent className="p-4 border-t">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="font-semibold">Workouts</h3>
                        <Button onClick={() => handleAddWorkout(program.id)} variant="outline" size="sm">
                          <PlusCircle className="mr-2 h-4 w-4" /> Add Workout
                        </Button>
                    </div>
                   
                    {program.workouts.length > 0 ? (
                      <Accordion type="multiple" className="space-y-2">
                         {program.workouts.map(workout => (
                           <AccordionItem value={workout.id} key={workout.id} className="border rounded-lg bg-muted/30">
                             <div className="flex items-center p-2">
                                <AccordionTrigger className="flex-1 p-2 hover:no-underline font-medium">
                                    {workout.name}
                                </AccordionTrigger>
                                <div className="flex items-center gap-2 ml-2">
                                   <Button 
                                      size="sm"
                                      onClick={() => handleStartWorkout(workout.id)}
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
                                      <DropdownMenuItem onSelect={() => handleOpenRenameDialog({ type: 'workout', id: workout.id, programId: program.id, name: workout.name })}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        <span>Rename</span>
                                      </DropdownMenuItem>
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
                             </div>
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
      
      {/* Rename Dialog */}
      <Dialog open={!!itemToRename} onOpenChange={(isOpen) => !isOpen && setItemToRename(null)}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Rename {itemToRename?.type}</DialogTitle>
                  <DialogDescription>
                      Enter a new name for "{itemToRename?.name}".
                  </DialogDescription>
              </DialogHeader>
              <Input 
                  value={newName} 
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveRename()}
                  placeholder="New name"
              />
              <DialogFooter>
                  <Button variant="outline" onClick={() => setItemToRename(null)}>Cancel</Button>
                  <Button onClick={handleSaveRename}>Save Changes</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </div>
  );
}

    