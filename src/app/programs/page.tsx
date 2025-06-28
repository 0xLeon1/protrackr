
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Program, Workout, CardioLogEntry } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import WorkoutTracker from "@/components/protracker/WorkoutTracker";
import CardioLogger from "@/components/protracker/CardioLogger";
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
  DropdownMenuSeparator
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
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc, addDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [pageIsLoading, setPageIsLoading] = useState(true);
  const [newProgramName, setNewProgramName] = useState('');
  const router = useRouter();
  const { user, loading: authLoading, dataVersion, refreshData } = useAuth();
  const { toast } = useToast();

  const [programToRename, setProgramToRename] = useState<Program | null>(null);
  const [newProgramRename, setNewProgramRename] = useState('');
  
  const [editingWorkout, setEditingWorkout] = useState<{ programId: string; workout: Workout } | null>(null);
  const [currentEditedWorkout, setCurrentEditedWorkout] = useState<Workout | null>(null);


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
          const userPrograms = querySnapshot.docs.map(doc => ({ ...doc.data() } as Program));
          setPrograms(userPrograms);
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
  }, [user, authLoading, toast, dataVersion]);

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
  
  const handleAddWorkout = async (programId: string) => {
    if (!user) return;
    const program = programs.find(p => p.id === programId);
    if (!program) return;
    
    const newWorkout: Workout = {
      id: `work-${Date.now()}`,
      name: 'New Day',
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
  
  const handleLogCardio = async (log: Omit<CardioLogEntry, 'id' | 'date'>) => {
    if (!user) {
        toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
        return;
    }

    try {
        const newLogData = {
            ...log,
            date: new Date().toISOString(),
        };
        const cardioLogsCollection = collection(db, 'users', user.uid, 'cardio-logs');
        await addDoc(cardioLogsCollection, newLogData);

        toast({
            title: "Cardio Logged!",
            description: `${log.modality} for ${log.duration} minutes has been saved.`
        });
        refreshData(); // Triggers re-fetch on other pages
    } catch (error) {
        console.error("Error logging cardio:", error);
        toast({ title: "Logging Failed", description: "Could not save your cardio session.", variant: "destructive" });
    }
  };

  const handleStartWorkout = (workoutId: string) => {
    router.push(`/workout/${workoutId}`);
  };
  
  const openEditWorkoutDialog = (programId: string, workout: Workout) => {
    setEditingWorkout({ programId, workout });
    setCurrentEditedWorkout(JSON.parse(JSON.stringify(workout))); // Deep copy for editing
  };
  
  const handleSaveWorkout = async () => {
    if (!editingWorkout || !currentEditedWorkout || !user) return;
    const { programId } = editingWorkout;

    const program = programs.find(p => p.id === programId);
    if (!program) return;
    
    const updatedWorkouts = program.workouts.map(w => w.id === currentEditedWorkout.id ? currentEditedWorkout : w);
    
    const programRef = doc(db, 'users', user.uid, 'programs', programId);
    await updateDoc(programRef, { workouts: updatedWorkouts });

    const newPrograms = programs.map(p => p.id === programId ? { ...p, workouts: updatedWorkouts } : p);
    setPrograms(newPrograms);

    setEditingWorkout(null);
    setCurrentEditedWorkout(null);
  };

  const handleRenameProgram = async () => {
    if (!programToRename || !newProgramRename.trim() || !user) return;
    
    const programRef = doc(db, 'users', user.uid, 'programs', programToRename.id);
    await updateDoc(programRef, { name: newProgramRename });
    
    const newPrograms = programs.map(p => p.id === programToRename.id ? { ...p, name: newProgramRename } : p);
    setPrograms(newPrograms);
    
    setProgramToRename(null);
    setNewProgramRename('');
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
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <h2 className="text-2xl font-bold">Your Programs</h2>
            <div className="flex gap-2 w-full sm:w-auto">
              <Input 
                placeholder="Create a new program..." 
                value={newProgramName}
                onChange={(e) => setNewProgramName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddProgram()}
              />
              <Button onClick={handleAddProgram} className="shrink-0">
                <PlusCircle className="mr-2 h-4 w-4" /> Add
              </Button>
            </div>
        </div>

        {programs.length === 0 && !pageIsLoading && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-center text-muted-foreground">You haven't created any programs yet. Use the form above to get started.</p>
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
                        <DropdownMenuItem onSelect={() => handleAddWorkout(program.id)}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            <span>Add Day</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => { setProgramToRename(program); setNewProgramRename(program.name); }}>
                            <Edit className="mr-2 h-4 w-4" />
                            <span>Rename</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
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
                    <h3 className="font-semibold">Workouts</h3>
                   
                    {program.workouts.length > 0 ? (
                      <div className="space-y-3">
                        {program.workouts.map(workout => (
                            <div key={workout.id} className="border p-4 rounded-lg bg-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div className="flex-1">
                                    <h4 className="font-semibold">{workout.name}</h4>
                                    <p className="text-sm text-muted-foreground mt-2 space-x-2">
                                    {workout.exercises.map(ex => (
                                        <span key={ex.id} className="inline-block after:content-['•'] after:ml-2 last:after:content-[]">{ex.name}</span>
                                    ))}
                                    {workout.exercises.length === 0 && <span>No exercises yet.</span>}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
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
                                        <Button variant="ghost" size="icon" className="shrink-0">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onSelect={() => openEditWorkoutDialog(program.id, workout)}>
                                                <Edit className="mr-2 h-4 w-4" />
                                                <span>Edit</span>
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
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-center text-muted-foreground py-4 border rounded-lg border-dashed">
                        <p>This program has no workouts yet.</p>
                        <p>Use the menu to add a day to get started.</p>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Card>
          ))}
        </Accordion>
      </div>

      <CardioLogger onLogCardio={handleLogCardio} />
      
      {/* Program Rename Dialog */}
      <Dialog open={!!programToRename} onOpenChange={(isOpen) => !isOpen && setProgramToRename(null)}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Rename Program</DialogTitle>
                  <DialogDescription>
                      Enter a new name for "{programToRename?.name}".
                  </DialogDescription>
              </DialogHeader>
              <Input 
                  value={newProgramRename} 
                  onChange={(e) => setNewProgramRename(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRenameProgram()}
                  placeholder="New name"
              />
              <DialogFooter>
                  <Button variant="outline" onClick={() => setProgramToRename(null)}>Cancel</Button>
                  <Button onClick={handleRenameProgram}>Save Changes</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
      
      {/* Edit Workout Dialog */}
      <Dialog open={!!editingWorkout} onOpenChange={(isOpen) => !isOpen && setEditingWorkout(null)}>
          <DialogContent className="max-w-4xl min-h-[75vh] flex flex-col">
              <DialogHeader>
                  <DialogTitle>Edit Workout</DialogTitle>
              </DialogHeader>
              {currentEditedWorkout && (
                <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
                    <div className="space-y-2">
                        <Label htmlFor="workout-name">Workout Name</Label>
                        <Input
                            id="workout-name"
                            value={currentEditedWorkout.name}
                            onChange={(e) =>
                                setCurrentEditedWorkout((prev) =>
                                    prev ? { ...prev, name: e.target.value } : null
                                )
                            }
                        />
                    </div>
                    <div className="flex-1">
                        <WorkoutTracker
                            workout={currentEditedWorkout}
                            onWorkoutChange={setCurrentEditedWorkout}
                        />
                    </div>
                </div>
              )}
              <DialogFooter className="mt-auto pt-4 border-t">
                  <Button variant="outline" onClick={() => setEditingWorkout(null)}>Cancel</Button>
                  <Button onClick={handleSaveWorkout}>Save Workout</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </div>
  );
}

    

    
