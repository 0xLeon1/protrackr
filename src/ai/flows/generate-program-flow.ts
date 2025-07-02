
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
  frequency: z.enum(['3', '4', '5', '6']),
  goal: z.enum(['Build Muscle', 'Lose Body Fat', 'Get Toned & Defined']),
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
  model: 'googleai/gemini-1.5-flash',
  prompt: `You are an expert personal trainer and fitness coach specializing in creating gym-focused workout programs. Your primary task is to generate a structured and effective workout program based on the user's profile and goals. The main meta-goal for all programs is to lower body fat percentage as much as possible, tailored to the user's primary goal.

**User Profile:**
-   **Experience Level:** {{{experience}}}
-   **Training Frequency:** {{{frequency}}} days per week
-   **Primary Goal:** {{{goal}}}

**Definitions & Core Principles:**

*   **Experience Levels:**
    *   **Beginner:** Less than 1 year of consistent training.
    *   **Intermediate:** 1-3 years of consistent training.
    *   **Advanced:** 3+ years of consistent training.

*   **Primary Goals:**
    *   **Build Muscle:** The focus is on increasing lean mass and improving shape, which boosts metabolism. Use hypertrophy-focused rep ranges (e.g., 8-12).
    *   **Lose Body Fat:** The focus is on maximizing calorie expenditure and preserving muscle. Use slightly higher rep ranges (e.g., 10-15) and shorter rest periods where appropriate.
    *   **Get Toned & Defined:** A balanced body recomposition goal. Combine hypertrophy and endurance principles, using varied rep ranges.

*   **Exercise Selection for Beginners:**
    *   Strictly prioritize exercises using **machines or dumbbells**.
    *   The only exception is the **Barbell Bench Press**, which is permitted. Avoid other barbell compound lifts like squats or deadlifts for beginners.

**Workout Split Logic (Follow this strictly):**

*   **If Frequency is 3 days/week:**
    *   Create three distinct **upper body focused** workout days. Do not include a dedicated leg day. The days could be structured as Push, Pull, and Arms/Shoulders.

*   **If Frequency is 4 days/week:**
    *   **For Beginners & Intermediates:** Create an **Upper/Lower split** (2 Upper Body days, 2 Lower Body days).
    *   **For Advanced:** Create a 4-day **"Bro Split"** (e.g., Day 1: Chest, Day 2: Back, Day 3: Legs, Day 4: Shoulders/Arms).

*   **If Frequency is 5 days/week:**
    *   **For Beginners & Intermediates:** Create an **Upper/Lower split with a dedicated Arm Day** (e.g., Upper, Lower, Rest, Upper, Lower, Arms, Rest).
    *   **For Advanced:** Create a 5-day **"Bro Split"** (e.g., Day 1: Chest, Day 2: Back, Day 3: Shoulders, Day 4: Legs, Day 5: Arms).

*   **If Frequency is 6 days/week:**
    *   **For all experience levels:** Create a **Push, Pull, Legs (PPL)** split, repeated twice per week (e.g., Push A, Pull A, Legs A, Push B, Pull B, Legs B).

**Output Instructions:**
1.  Generate a JSON object that strictly adheres to the provided output schema.
2.  Create a creative and motivational name for the entire program.
3.  Name each workout day appropriately based on the split logic (e.g., "Upper Body A", "Chest & Triceps", "Push Day").
4.  For each exercise, provide a reasonable number of sets (typically 3-4) and a target repetition range as a string (e.g., "8-12", "10-15", "5").
5.  Set a conservative, non-zero placeholder weight in lbs for each weighted exercise. For bodyweight exercises, set this to 0.`,
  config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
       {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
    ]
  }
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
