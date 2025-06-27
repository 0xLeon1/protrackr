"use client";

import type { Workout, SetPerformance } from '@/types';
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface ActiveWorkoutProps {
  workout: Workout;
  onWorkoutChange: (updatedWorkout: Workout) => void;
}

export default function ActiveWorkout({ workout, onWorkoutChange }: ActiveWorkoutProps) {

  const handleSetChange = (exerciseId: string, setId: string, field: keyof Omit<SetPerformance, 'id' | 'completed'>, value: string | number) => {
    const updatedWorkout = {
      ...workout,
      exercises: workout.exercises.map(ex => {
        if (ex.id === exerciseId) {
          return {
            ...ex,
            performance: ex.performance?.map(set => 
              set.id === setId ? { ...set, [field]: Number(value) } : set
            )
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
      {workout.exercises.map((exercise) => (
        <Card key={exercise.id}>
          <CardHeader>
            <CardTitle>{exercise.name}</CardTitle>
            <CardDescription>
              Target: {exercise.sets} sets of {exercise.reps} reps @ {exercise.weight}kg. Rest {exercise.rest}s.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Set</TableHead>
                  <TableHead>Weight (kg)</TableHead>
                  <TableHead>Reps</TableHead>
                  <TableHead className="text-right">Done</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exercise.performance?.map((set, index) => (
                  <TableRow key={set.id} data-state={set.completed ? 'selected' : 'unselected'}>
                    <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                    <TableCell>
                      <Input 
                        type="number" 
                        value={set.weight} 
                        onChange={(e) => handleSetChange(exercise.id, set.id, 'weight', e.target.value)}
                        className="w-24"
                        placeholder="kg"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number" 
                        value={set.reps} 
                        onChange={(e) => handleSetChange(exercise.id, set.id, 'reps', e.target.value)}
                        className="w-24"
                        placeholder="Reps"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                       <Checkbox 
                          checked={set.completed}
                          onCheckedChange={(checked) => handleSetCompletion(exercise.id, set.id, !!checked)}
                          className="w-5 h-5"
                        />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
