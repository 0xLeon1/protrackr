export type SetPerformance = {
  id: string;
  reps: number | '';
  weight: number | '';
  completed: boolean;
};

export type Exercise = {
  id: string;
  name: string;
  sets: number | '';
  reps: number | '';
  weight: number | '';
  notes: string;
  performance?: SetPerformance[];
};

export type Workout = {
  id:string;
  name: string;
  exercises: Exercise[];
};

export type Program = {
  id: string;
  name: string;
  workouts: Workout[];
};

export type WorkoutLogEntry = {
    logId: string;
    workoutId: string;
    programName: string;
    completedAt: string;
    workoutSnapshot: Workout;
};
