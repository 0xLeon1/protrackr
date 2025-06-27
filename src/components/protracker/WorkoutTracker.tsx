"use client";

import type { Exercise, Workout } from '@/types';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, PlusCircle, Flame } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface WorkoutEditorProps {
  workout: Workout;
  onWorkoutChange: (updatedWorkout: Workout) => void;
}

export default function WorkoutTracker({ workout, onWorkoutChange }: WorkoutEditorProps) {

  const handleExerciseChange = (id: string, field: keyof Exercise, value: string | number) => {
    const updatedExercises = workout.exercises.map(ex => {
      if (ex.id === id) {
        // Ensure numeric fields are stored as numbers
        const isNumericField = field === 'sets' || field === 'reps' || field === 'weight' || field === 'rest';
        return { ...ex, [field]: isNumericField ? Number(value) : value };
      }
      return ex;
    });
    onWorkoutChange({ ...workout, exercises: updatedExercises });
  };

  const addExercise = () => {
    const newId = `ex-${Date.now()}`;
    const newExercise: Exercise = { id: newId, name: 'New Exercise', sets: 3, reps: 10, rest: 60, weight: 0, notes: '' };
    onWorkoutChange({ ...workout, exercises: [...workout.exercises, newExercise] });
  };

  const removeExercise = (id: string) => {
    onWorkoutChange({ ...workout, exercises: workout.exercises.filter(ex => ex.id !== id) });
  };

  return (
    <Card className="w-full h-full border-none shadow-none bg-transparent">
      <CardHeader className="pt-4 px-2">
        <div className="flex items-center justify-end">
          <Button onClick={addExercise} size="sm" variant="outline" className="shrink-0">
            <PlusCircle className="w-4 h-4 mr-2" />
            Add Exercise
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-0 sm:px-2 pt-2">
        {workout.exercises.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">Exercise</TableHead>
                  <TableHead>Sets</TableHead>
                  <TableHead>Reps</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Rest</TableHead>
                  <TableHead className="min-w-[150px]">Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workout.exercises.map((exercise) => (
                  <TableRow key={exercise.id} className="transition-colors hover:bg-muted/50">
                    <TableCell><Input type="text" value={exercise.name} onChange={(e) => handleExerciseChange(exercise.id, 'name', e.target.value)} className="font-medium" /></TableCell>
                    <TableCell><Input type="number" value={exercise.sets} onChange={(e) => handleExerciseChange(exercise.id, 'sets', e.target.value)} className="w-16" /></TableCell>
                    <TableCell><Input type="number" value={exercise.reps} onChange={(e) => handleExerciseChange(exercise.id, 'reps', e.target.value)} className="w-16" /></TableCell>
                    <TableCell><Input type="number" value={exercise.weight} onChange={(e) => handleExerciseChange(exercise.id, 'weight', e.target.value)} className="w-20" /></TableCell>
                    <TableCell><Input type="number" value={exercise.rest} onChange={(e) => handleExerciseChange(exercise.id, 'rest', e.target.value)} className="w-16" /></TableCell>
                    <TableCell><Input type="text" value={exercise.notes} onChange={(e) => handleExerciseChange(exercise.id, 'notes', e.target.value)} placeholder="Add a note..." /></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => removeExercise(exercise.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                        <span className="sr-only">Remove Exercise</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-sm text-center text-muted-foreground py-4">
              <p>This workout has no exercises yet.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
