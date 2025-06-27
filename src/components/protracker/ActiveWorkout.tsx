
"use client";

import type { Workout } from '@/types';
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { History } from 'lucide-react';

interface ActiveWorkoutProps {
  workout: Workout;
  onWorkoutChange: (updatedWorkout: Workout) => void;
  lastWorkout?: Workout | null;
}

export default function ActiveWorkout({ workout, onWorkoutChange, lastWorkout }: ActiveWorkoutProps) {

  const handleSetChange = (exerciseId: string, setId: string, field: 'reps' | 'weight', value: string) => {
    const updatedWorkout = {
      ...workout,
      exercises: workout.exercises.map(ex => {
        if (ex.id === exerciseId) {
          return {
            ...ex,
            performance: ex.performance?.map(set => {
              if (set.id === setId) {
                if (value === '') {
                  return { ...set, [field]: '' };
                }
                const num = Number(value);
                if (!isNaN(num) && num >= 0) {
                  return { ...set, [field]: num };
                }
              }
              return set;
            })
          };
        }
        return ex;
      })
    };
    onWorkoutChange(updatedWorkout);
  };
  
  const handleSetBlur = (exerciseId: string, setId: string, field: 'reps' | 'weight') => {
    const updatedWorkout = {
      ...workout,
      exercises: workout.exercises.map(ex => {
        if (ex.id === exerciseId) {
          return {
            ...ex,
            performance: ex.performance?.map(set => {
              if (set.id === setId && set[field] === '') {
                const minValue = field === 'reps' ? 1 : 0;
                return { ...set, [field]: minValue };
              }
              return set;
            })
          };
        }
        return ex;
      })
    };
    onWorkoutChange(updatedWorkout);
  };

  const handleSetCompletion = (exerciseId: string, setId: string, completed: boolean) => {
     const updatedWorkout = {
      ...workout,
      exercises: workout.exercises.map(ex => {
        if (ex.id === exerciseId) {
          return {
            ...ex,
            performance: ex.performance?.map(set => 
              set.id === setId ? { ...set, completed } : set
            )
          };
        }
        return ex;
      })
    };
    onWorkoutChange(updatedWorkout);
  };

  return (
    <div className="space-y-6">
      {workout.exercises.map((exercise) => {
        const lastExercise = lastWorkout?.exercises.find(ex => ex.id === exercise.id);

        return (
          <Card key={exercise.id}>
            <CardHeader>
              <CardTitle>{exercise.name}</CardTitle>
              <CardDescription>
                Target: {exercise.sets} sets of {exercise.reps} reps @ {exercise.weight} lbs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Set</TableHead>
                    <TableHead>Weight (lbs)</TableHead>
                    <TableHead>Reps</TableHead>
                    <TableHead className="text-right">Done</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exercise.performance?.map((set, index) => {
                    const lastSet = lastExercise?.performance?.[index];

                    return (
                      <TableRow key={set.id} data-state={set.completed ? 'selected' : 'unselected'}>
                        <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                        <TableCell>
                          <Input 
                            type="number" 
                            min="0"
                            value={set.weight} 
                            onChange={(e) => handleSetChange(exercise.id, set.id, 'weight', e.target.value)}
                            onBlur={() => handleSetBlur(exercise.id, set.id, 'weight')}
                            className="w-24"
                            placeholder="lbs"
                          />
                          {lastSet?.completed && (
                            <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
                              <History className="w-3 h-3"/>
                              Last: {lastSet.weight} lbs
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="number" 
                            min="1"
                            value={set.reps} 
                            onChange={(e) => handleSetChange(exercise.id, set.id, 'reps', e.target.value)}
                            onBlur={() => handleSetBlur(exercise.id, set.id, 'reps')}
                            className="w-24"
                            placeholder="Reps"
                          />
                           {lastSet?.completed && (
                            <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
                              <History className="w-3 h-3"/>
                              Last: {lastSet.reps} reps
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Checkbox 
                              checked={set.completed}
                              onCheckedChange={(checked) => handleSetCompletion(exercise.id, set.id, !!checked)}
                              className="w-5 h-5"
                            />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
