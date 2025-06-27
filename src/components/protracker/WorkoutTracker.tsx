"use client";

import { useState } from 'react';
import type { Exercise } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, PlusCircle, Flame } from 'lucide-react';

const initialExercises: Exercise[] = [
  { id: '1', name: 'Barbell Bench Press', sets: 4, reps: 8, rest: 90, weight: 185, notes: 'Felt strong today.' },
  { id: '2', name: 'Incline Dumbbell Press', sets: 3, reps: 10, rest: 60, weight: 65, notes: '' },
  { id: '3', name: 'Cable Flys', sets: 3, reps: 12, rest: 60, weight: 40, notes: 'Focus on the squeeze.' },
  { id: '4', name: 'Tricep Pushdowns', sets: 4, reps: 12, rest: 60, weight: 50, notes: '' },
];

export default function WorkoutTracker() {
  const [exercises, setExercises] = useState<Exercise[]>(initialExercises);

  const handleInputChange = (id: string, field: keyof Omit<Exercise, 'id' | 'name'>, value: string | number) => {
    setExercises(exercises.map(ex => ex.id === id ? { ...ex, [field]: value } : ex));
  };

  const addExercise = () => {
    const newId = `ex-${Date.now()}`;
    setExercises([...exercises, { id: newId, name: 'New Exercise', sets: 3, reps: 10, rest: 60, weight: 0, notes: '' }]);
  };

  const removeExercise = (id: string) => {
    setExercises(exercises.filter(ex => ex.id !== id));
  };

  return (
    <Card className="w-full h-full transition-all duration-300 hover:shadow-lg animate-fade-in">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-6 h-6 text-accent" />
            <CardTitle className="font-headline">Today's Workout: Push Day</CardTitle>
          </div>
          <Button onClick={addExercise} size="sm" variant="outline" className="shrink-0">
            <PlusCircle className="w-4 h-4 mr-2" />
            Add Exercise
          </Button>
        </div>
        <CardDescription>Log your sets, reps, and weights to track your progress.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Exercise</TableHead>
                <TableHead>Sets</TableHead>
                <TableHead>Reps</TableHead>
                <TableHead>Weight (lbs)</TableHead>
                <TableHead>Rest (sec)</TableHead>
                <TableHead className="min-w-[200px]">Notes</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exercises.map((exercise) => (
                <TableRow key={exercise.id} className="transition-colors hover:bg-muted/50">
                  <TableCell><Input type="text" value={exercise.name} onChange={(e) => setExercises(exercises.map(ex => ex.id === exercise.id ? {...ex, name: e.target.value} : ex))} className="font-medium" /></TableCell>
                  <TableCell><Input type="number" value={exercise.sets} onChange={(e) => handleInputChange(exercise.id, 'sets', parseInt(e.target.value))} className="w-16" /></TableCell>
                  <TableCell><Input type="number" value={exercise.reps} onChange={(e) => handleInputChange(exercise.id, 'reps', parseInt(e.target.value))} className="w-16" /></TableCell>
                  <TableCell><Input type="number" value={exercise.weight} onChange={(e) => handleInputChange(exercise.id, 'weight', parseInt(e.target.value))} className="w-20" /></TableCell>
                  <TableCell><Input type="number" value={exercise.rest} onChange={(e) => handleInputChange(exercise.id, 'rest', parseInt(e.target.value))} className="w-16" /></TableCell>
                  <TableCell><Input type="text" value={exercise.notes} onChange={(e) => handleInputChange(exercise.id, 'notes', e.target.value)} placeholder="Add a note..." /></TableCell>
                  <TableCell>
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
      </CardContent>
    </Card>
  );
}
