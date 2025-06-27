
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Program, Workout } from '@/types';
import ActiveWorkout from '@/components/protracker/ActiveWorkout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ActiveWorkoutPage() {
  const params = useParams();
  const router = useRouter();
  const workoutId = params.id as string;
  
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [programName, setProgramName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && workoutId) {
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
                performance: Array.from({ length: ex.sets }, (_, i) => ({
                  id: `set-${ex.id}-${i}`,
                  reps: ex.reps,
                  weight: ex.weight,
                  completed: false,
                })),
              })),
            };
            setWorkout(workoutWithPerformance);
            setProgramName(foundProgramName);
          }
        } catch (error) {
          console.error("Failed to parse programs from localStorage", error);
        }
      }
    }
    setIsLoading(false);
  }, [workoutId]);
  
  const handleWorkoutChange = (updatedWorkout: Workout) => {
    setWorkout(updatedWorkout);
  };
  
  const handleFinishWorkout = () => {
    // In a real app, you would save the completed workout data
    alert("Workout finished! (Data not saved in this prototype)");
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
        <Button onClick={handleFinishWorkout} className="mt-2">Finish Workout</Button>
      </div>

      <ActiveWorkout workout={workout} onWorkoutChange={handleWorkoutChange} />
    </div>
  );
}
