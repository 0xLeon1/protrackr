"use client";

import type { Exercise, Workout } from '@/types';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, PlusCircle } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface WorkoutEditorProps {
  workout: Workout;
  onWorkoutChange: (updatedWorkout: Workout) => void;
}

export default function WorkoutTracker({ workout, onWorkoutChange }: WorkoutEditorProps) {

  const handleExerciseChange = (id: string, field: keyof Omit<Exercise, 'id' | 'performance'>, value: string) => {
    const updatedExercises = workout.exercises.map(ex => {
      if (ex.id === id) {
        if (field === 'name' || field === 'notes') {
          return { ...ex, [field]: value };
        }
        
        // For numeric fields
        if (value === '') {
          return { ...ex, [field]: '' };
        }

        const num = Number(value);
        if (!isNaN(num) && num >= 0) {
          return { ...ex, [field]: num };
        }
      }
      return ex;
    });
    onWorkoutChange({ ...workout, exercises: updatedExercises });
  };
  
  const handleExerciseBlur = (id: string, field: 'sets' | 'reps' | 'weight') => {
    const updatedExercises = workout.exercises.map(ex => {
        if (ex.id === id && ex[field] === '') {
            const minValue = (field === 'sets' || field === 'reps') ? 1 : 0;
            return { ...ex, [field]: minValue };
        }
        return ex;
    });
    onWorkoutChange({ ...workout, exercises: updatedExercises });
  };

  const addExercise = () => {
    const newId = `ex-${Date.now()}`;
    const newExercise: Exercise = { id: newId, name: 'New Exercise', sets: 3, reps: 10, weight: 0, notes: '' };
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
                  <TableHead className="min-w-[150px]">Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workout.exercises.map((exercise) => (
                  <TableRow key={exercise.id} className="transition-colors hover:bg-muted/50">
                    <TableCell><Input type="text" value={exercise.name} onChange={(e) => handleExerciseChange(exercise.id, 'name', e.target.value)} className="font-medium" /></TableCell>
                    <TableCell><Input type="number" min="1" value={exercise.sets} onChange={(e) => handleExerciseChange(exercise.id, 'sets', e.target.value)} onBlur={() => handleExerciseBlur(exercise.id, 'sets')} className="w-16" /></TableCell>
                    <TableCell><Input type="number" min="1" value={exercise.reps} onChange={(e) => handleExerciseChange(exercise.id, 'reps', e.target.value)} onBlur={() => handleExerciseBlur(exercise.id, 'reps')} className="w-16" /></TableCell>
                    <TableCell><Input type="number" min="0" value={exercise.weight} onChange={(e) => handleExerciseChange(exercise.id, 'weight', e.target.value)} onBlur={() => handleExerciseBlur(exercise.id, 'weight')} className="w-20" /></TableCell>
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
