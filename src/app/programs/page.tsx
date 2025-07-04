
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Program, Workout, CardioLogEntry } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import WorkoutTracker from "@/components/protracker/WorkoutTracker";
import CardioLogger from "@/components/protracker/CardioLogger";
import ProgramGenerator from "@/components/protracker/ProgramGenerator";
import { PlusCircle, Trash2, Play, MoreVertical, Loader2, Edit, Zap, Dumbbell, Sparkles, FilePlus } from 'lucide-react';
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
  DialogTrigger,
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

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);


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
    setIsCreateDialogOpen(false);
  };
  
  const handleSaveGeneratedProgram = async (program: Program) => {
    if (!user) return;
    
    const programRef = doc(db, 'users', user.uid, 'programs', program.id);
    await setDoc(programRef, program);
    
    setPrograms([...programs, program]);
    setIsGeneratorOpen(false);
    toast({
        title: "Program Saved!",
        description: `Your new program "${program.name}" is ready to go.`
    });
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
        await refreshData(); // Triggers re-fetch on other pages
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
    <div className="space-y-8">
      <div className="space-y-6">
        <div className="flex justify-between items-center gap-4">
            <h1 className="text-3xl font-bold">Training Programs</h1>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Program
            </Button>
        </div>

        {programs.length === 0 && !pageIsLoading ? (
          <Card className="text-center">
            <CardHeader>
                <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit">
                    <Sparkles className="w-10 h-10 text-primary" />
                </div>
                <CardTitle className="mt-4 text-2xl">Create Your First Workout Program</CardTitle>
                <CardDescription className="max-w-md mx-auto">
                    Let our AI coach build a personalized plan for you, or create one from scratch.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
                <Button size="lg" className="w-full max-w-xs" onClick={() => setIsGeneratorOpen(true)}>
                    <Sparkles className="mr-2 h-5 w-5"/>
                    Generate Program with AI
                </Button>
                <Button variant="ghost" onClick={() => setIsCreateDialogOpen(true)}>
                    <FilePlus className="mr-2 h-4 w-4"/>
                    Or, create my own manually
                </Button>
            </CardContent>
          </Card>
        ) : (
            <div className="space-y-6">
            {programs.map((program) => (
                <Card key={program.id} className="overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between p-4 bg-muted/50">
                        <CardTitle className="text-2xl flex items-center gap-3">
                            <Dumbbell className="h-6 w-6 text-primary" />
                            {program.name}
                        </CardTitle>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="shrink-0 ml-auto">
                                <MoreVertical className="h-5 w-5" />
                            </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
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
                    </CardHeader>

                    <CardContent className="p-4">
                    <div className="space-y-4">
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
                    </CardContent>
                </Card>
            ))}
            </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Zap className="h-5 w-5 text-primary" />
            <span>Log Cardio Session</span>
          </CardTitle>
          <CardDescription>Record a one-off cardio workout.</CardDescription>
        </CardHeader>
        <CardContent>
            <CardioLogger onLogCardio={handleLogCardio} />
        </CardContent>
      </Card>
      
      {/* Manual Program Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Create a New Program</DialogTitle>
                  <DialogDescription>
                      Give your new program a name to get started. You can add workouts and exercises next.
                  </DialogDescription>
              </DialogHeader>
              <Input 
                  value={newProgramName} 
                  onChange={(e) => setNewProgramName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddProgram()}
                  placeholder="e.g., Push Pull Legs"
                  autoFocus
              />
              <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddProgram}>Create</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
      
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
      
      {/* AI Program Generator Dialog */}
      <ProgramGenerator 
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
        onSaveProgram={handleSaveGeneratedProgram}
      />

    </div>
  );
}
