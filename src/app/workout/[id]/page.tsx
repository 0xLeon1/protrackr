
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Program, Workout, WorkoutLogEntry } from '@/types';
import ActiveWorkout from '@/components/protracker/ActiveWorkout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function ActiveWorkoutPage() {
  const params = useParams();
  const router = useRouter();
  const workoutId = params.id as string;
  const { toast } = useToast();
  
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [programName, setProgramName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [lastWorkout, setLastWorkout] = useState<Workout | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && workoutId) {
      // Load Programs
      const storedPrograms = localStorage.getItem('protracker-programs');
      if (storedPrograms) {
        try {
          const programs: Program[] = JSON.parse(storedPrograms);
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
              exercises: foundWorkout.exercises.map(ex => ({
                ...ex,
                performance: Array.from({ length: ex.sets as number }, (_, i) => ({
                  id: `set-${ex.id}-${i}`,
                  reps: ex.reps,
                  weight: ex.weight,
                  completed: false,
                })),
              })),
            };
            setWorkout(workoutWithPerformance);
            setProgramName(foundProgramName);

            // Load History to find the last completed session for this workout
            const storedLogs = localStorage.getItem('protracker-logs');
            if (storedLogs) {
                const logs: WorkoutLogEntry[] = JSON.parse(storedLogs);
                const relevantLogs = logs
                    .filter(log => log.workoutId === workoutId)
                    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
                
                if (relevantLogs.length > 0) {
                    setLastWorkout(relevantLogs[0].workoutSnapshot);
                }
            }
          }
        } catch (error) {
          console.error("Failed to parse data from localStorage", error);
        }
      }
    }
    setIsLoading(false);
  }, [workoutId]);
  
  const handleWorkoutChange = (updatedWorkout: Workout) => {
    setWorkout(updatedWorkout);
  };
  
  const handleFinishWorkout = () => {
    if (!workout) return;
    
    // Create a new log entry
    const newLog: WorkoutLogEntry = {
      logId: `log-${Date.now()}`,
      workoutId,
      programName,
      completedAt: new Date().toISOString(),
      workoutSnapshot: workout,
    };

    // Retrieve existing logs, add the new one, and save back to localStorage
    const storedLogs = localStorage.getItem('protracker-logs');
    const logs: WorkoutLogEntry[] = storedLogs ? JSON.parse(storedLogs) : [];
    logs.push(newLog);
    localStorage.setItem('protracker-logs', JSON.stringify(logs));

    toast({
        title: "Workout Complete!",
        description: `Your session for "${workout.name}" has been logged.`
    });
    router.push('/programs');
  };

  if (isLoading) {
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
