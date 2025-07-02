
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Program, Workout, WorkoutLogEntry } from '@/types';
import ActiveWorkout from '@/components/protracker/ActiveWorkout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, query, where } from 'firebase/firestore';

export default function ActiveWorkoutPage() {
  const params = useParams();
  const router = useRouter();
  const workoutId = params.id as string;
  const { toast } = useToast();
  const { user, loading: authLoading, refreshData } = useAuth();
  
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [programName, setProgramName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [lastWorkout, setLastWorkout] = useState<Workout | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && workoutId) {
      const fetchWorkoutData = async () => {
        setIsLoading(true);
        try {
            // Load Programs to find the workout
            const programsCollection = collection(db, 'users', user.uid, 'programs');
            const programsSnapshot = await getDocs(programsCollection);
            const programs: Program[] = programsSnapshot.docs.map(doc => doc.data() as Program);
            
            let foundWorkout: Workout | null = null;
            let foundProgramName: string = '';

            for (const program of programs) {
              const matchingWorkout = program.workouts.find(w => w.id === workoutId);
              if (matchingWorkout) {
                foundWorkout = matchingWorkout;
                foundProgramName = program.name;
                break;
              }
            }
            
            if (foundWorkout) {
              const workoutWithPerformance = {
                ...foundWorkout,
                exercises: foundWorkout.exercises.map(ex => {
                  
                  // Default to the base exercise values
                  let weekSets = ex.sets as number;
                  let weekReps = ex.reps;
                  let weekWeight = ex.weight;

                  // TODO: Implement week tracking. For now, assume it's always Week 1.
                  if (ex.progression && ex.progression.length > 0) {
                    const week1Progression = ex.progression.find(p => p.week === 1);
                    if (week1Progression) {
                        weekSets = week1Progression.sets;
                        weekReps = week1Progression.reps;
                        weekWeight = week1Progression.weight;
                    }
                  }
                  
                  const repValue = weekReps ? parseInt(String(weekReps).split('-')[0], 10) : '';

                  return {
                    ...ex,
                    sets: weekSets,
                    reps: weekReps,
                    weight: weekWeight,
                    performance: Array.from({ length: weekSets }, (_, i) => ({
                      id: `set-${ex.id}-${i}`,
                      reps: isNaN(repValue) ? '' : repValue,
                      weight: weekWeight || '',
                      completed: false,
                    })),
                  };
                }),
              };

              setWorkout(workoutWithPerformance);
              setProgramName(foundProgramName);

              // Load History to find the last completed session for this workout
              const logsCollection = collection(db, 'users', user.uid, 'logs');
              const q = query(
                logsCollection, 
                where("workoutId", "==", workoutId)
              );
              const logSnapshot = await getDocs(q);

              if (!logSnapshot.empty) {
                const allLogsForThisWorkout = logSnapshot.docs.map(doc => doc.data() as WorkoutLogEntry);
                allLogsForThisWorkout.sort((a,b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
                const lastLog = allLogsForThisWorkout[0];
                setLastWorkout(lastLog.workoutSnapshot);
              }
            }
        } catch(error) {
            console.error("Error fetching workout data: ", error);
            toast({
                title: "Error",
                description: "Could not load workout data.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
      };
      
      fetchWorkoutData();
    }
  }, [workoutId, user, toast]);
  
  const handleWorkoutChange = (updatedWorkout: Workout) => {
    setWorkout(updatedWorkout);
  };
  
  const handleFinishWorkout = async () => {
    if (!workout || !user) return;
    
    // Create a new log entry
    const newLog: Omit<WorkoutLogEntry, 'logId'> = {
      workoutId,
      programName,
      completedAt: new Date().toISOString(),
      workoutSnapshot: workout,
    };

    await addDoc(collection(db, 'users', user.uid, 'logs'), newLog);

    await refreshData(); // To update analytics page, etc.

    toast({
        title: "Workout Complete!",
        description: `Your session for "${workout.name}" has been logged.`
    });
    router.push('/programs');
  };

  if (isLoading || authLoading || !user) {
    return (
      <div className="flex justify-center items-center h-full min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="sr-only">Loading workout...</span>
      </div>
    );
  }

  if (!workout) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Workout Not Found</CardTitle>
          <CardDescription>
            The workout you are looking for does not exist or could not be loaded.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => router.push('/programs')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Programs
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-start">
        <div>
            <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-2 -ml-4">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <h1 className="text-3xl font-bold">{workout.name}</h1>
            <p className="text-muted-foreground">{programName}</p>
        </div>
        <Button onClick={handleFinishWorkout} className="mt-2 bg-green-500 hover:bg-green-600 text-white">Finish Workout</Button>
      </div>

      <ActiveWorkout workout={workout} onWorkoutChange={handleWorkoutChange} lastWorkout={lastWorkout} />
    </div>
  );
}
