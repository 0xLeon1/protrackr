
'use server';
/**
 * @fileOverview A workout program generation AI flow.
 *
 * - generateProgram - A function that handles the workout program generation process.
 * - GenerateProgramInput - The input type for the generateProgram function.
 * - GenerateProgramOutput - The return type for the generateProgram function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const GenerateProgramInputSchema = z.object({
  experience: z.enum(['beginner', 'intermediate', 'advanced']),
  frequency: z.enum(['3', '4', '5']),
  goal: z.enum(['muscle gain', 'fat loss', 'general fitness']),
});
export type GenerateProgramInput = z.infer<typeof GenerateProgramInputSchema>;

const ExerciseSchema = z.object({
  name: z.string().describe("The name of the exercise, e.g., 'Bench Press' or 'Squat'."),
  sets: z.number().int().min(1).max(10).describe("The number of sets for this exercise."),
  reps: z.string().describe("The target repetition range, e.g., '8-12' or '10'."),
  weight: z.number().min(0).describe("A conservative starting weight in lbs. For bodyweight exercises, this should be 0."),
  notes: z.string().optional().describe("Optional notes for the exercise, like 'Focus on form' or 'Rest 60 seconds'."),
});

const WorkoutSchema = z.object({
  name: z.string().describe("The name for this workout day, e.g., 'Push Day', 'Leg Day', or 'Full Body A'."),
  exercises: z.array(ExerciseSchema).describe("An array of exercises for this workout day."),
});

const GenerateProgramOutputSchema = z.object({
  name: z.string().describe("A creative and motivational name for the entire workout program."),
  workouts: z.array(WorkoutSchema).describe("An array of workout objects, one for each training day of the week."),
});
export type GenerateProgramOutput = z.infer<typeof GenerateProgramOutputSchema>;

export async function generateProgram(input: GenerateProgramInput): Promise<GenerateProgramOutput> {
  return generateProgramFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateProgramPrompt',
  input: {schema: GenerateProgramInputSchema},
  output: {schema: GenerateProgramOutputSchema},
  prompt: `You are an expert personal trainer and fitness coach. Your task is to generate a structured workout program based on the user's details.

The user's details are:
- Experience Level: {{{experience}}}
- Training Frequency: {{{frequency}}} days per week
- Primary Goal: {{{goal}}}

Instructions:
1.  Create a workout program that matches the user's frequency. A 3-day frequency should result in an array with 3 workout objects, a 4-day frequency should result in 4, and so on.
2.  Name the program and each workout day appropriately. For example, for a 3-day muscle gain plan, you might name the program "Foundational Strength" and the workouts "Push Day", "Pull Day", "Leg Day".
3.  Select exercises that are suitable for the user's experience level. Beginners should have more machine and compound exercises, while advanced users can have more complex free-weight and isolation movements.
4.  For each exercise, provide a reasonable number of sets (typically 3-4) and a target repetition range (e.g., "8-12", "10-15", "5").
5.  Set an initial placeholder weight for each exercise. For bodyweight exercises, set this to 0. For weighted exercises, set it to a very conservative starting weight in lbs (e.g., Barbell Bench Press: 45, Dumbbell Curl: 10).
6.  The output must be a JSON object that strictly adheres to the provided schema. Do not include any extra text or explanations outside of the JSON structure.`,
});

const generateProgramFlow = ai.defineFlow(
  {
    name: 'generateProgramFlow',
    inputSchema: GenerateProgramInputSchema,
    outputSchema: GenerateProgramOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
