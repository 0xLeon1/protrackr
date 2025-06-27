export type Exercise = {
  id: string;
  name: string;
  sets: number;
  reps: number;
  rest: number;
  weight: number;
  notes: string;
};

export type Workout = {
  id: string;
  name: string;
  exercises: Exercise[];
};
