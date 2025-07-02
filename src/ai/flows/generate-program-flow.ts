
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

const WeeklyProgressionSchema = z.object({
  week: z.number().int().min(1).max(12),
  sets: z.number().int().min(1).max(10),
  reps: z.string(),
  weight: z.number().min(0),
});

const ExerciseSchema = z.object({
  name: z.string().describe("The name of the exercise, e.g., 'Bench Press' or 'Squat'."),
  sets: z.number().int().min(1).max(10).describe("The number of sets for this exercise."),
  reps: z.string().describe("The target repetition range, e.g., '8-12' or '10'."),
  weight: z.number().min(0).describe("A conservative starting weight in lbs. For bodyweight exercises, this should be 0."),
  notes: z.string().optional().describe("Optional notes for the exercise, like 'Focus on form' or 'Rest 60 seconds'."),
  progression: z.array(WeeklyProgressionSchema).optional().describe("An optional 12-week progression for main barbell lifts. This should not be populated for accessory lifts."),
});

const WorkoutSchema = z.object({
  name: z.string().describe("The name for this workout day, e.g., 'Push Day', 'Leg Day', or 'Full Body A'."),
  exercises: z.array(ExerciseSchema).describe("An array of exercises for this workout day."),
});

const GenerateProgramOutputSchema = z.object({
  name: z.string().describe("A creative and motivational name for the entire workout program."),
  workouts: z.array(WorkoutSchema).describe("An array of workout objects, one for each training day of the week. This represents the foundational week of the program."),
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
  prompt: `You are an expert personal trainer and fitness coach. Your task is to generate a gym-focused, 12-week workout program. The main meta-goal for all programs is to lower body fat percentage as much as possible, tailored to the user's primary goal.

**User Profile:**
- **Experience Level:** {{{experience}}}
- **Training Frequency:** {{{frequency}}} days per week
- **Primary Goal:** {{{goal}}}

**Definitions & Core Principles:**

*   **Experience Levels & Estimated 1-Rep Max (1RM):**
    *   **Beginner (Less than 1 year of training):** Use these estimated 1RMs for calculations: Bench Press: 135 lbs, Squat: 185 lbs.
    *   **Intermediate (1-3 years of training):** Use these estimated 1RMs for calculations: Bench Press: 205 lbs, Squat: 275 lbs.
    *   **Advanced (3+ years of training):** Use these estimated 1RMs for calculations: Bench Press: 275 lbs, Squat: 365 lbs.
    *   **Do NOT ask the user for their 1RM.** Use these internal estimates for all percentage-based calculations.

*   **Exercise Selection for Beginners:**
    *   Strictly prioritize exercises using **machines or dumbbells**.
    *   The only exception is the **Barbell Bench Press**, which is permitted. Avoid other barbell compound lifts like squats or deadlifts for beginners.

**Workout Split Logic (Follow this strictly):**
*   **3 days/week:** Three distinct **upper body focused** workout days. No dedicated leg day. (e.g., Push, Pull, Arms/Shoulders).
*   **4 days/week:**
    *   **Beginner/Intermediate:** **Upper/Lower split** (2 Upper, 2 Lower).
    *   **Advanced:** **"Bro Split"** (e.g., Day 1: Chest, Day 2: Back, Day 3: Legs, Day 4: Shoulders/Arms).
*   **5 days/week:**
    *   **Beginner/Intermediate:** **Upper/Lower split with a dedicated Arm Day** (e.g., Upper, Lower, Rest, Upper, Lower, Arms, Rest).
    *   **Advanced:** **"Bro Split"** (e.g., Day 1: Chest, Day 2: Back, Day 3: Shoulders, Day 4: Legs, Day 5: Arms).
*   **6 days/week:** **Push, Pull, Legs (PPL)** split, repeated twice.

**Output Generation Rules:**

1.  **Generate a FOUNDATIONAL week of workouts.** The 'workouts' array in your output should represent Week 1 of the plan.
2.  **For MAIN Barbell Lifts (Bench Press, Squat, etc.):**
    *   You MUST populate the 'progression' field for these exercises.
    *   Calculate the weights for the entire 12-week cycle based on the specified percentages of the user's estimated 1RM.
    *   The top-level 'sets', 'reps', and 'weight' fields for these exercises should reflect the values for Week 1.
    *   **12-Week Percentage Progression:**
        *   W1: 2x10 @ 70%
        *   W2: 2x10 @ 77%
        *   W3: 5x5 @ 80%
        *   W4: 5x4 @ 85%
        *   W5: 5x3 @ 87.5%
        *   W6: 5x1 @ 90%
        *   W7: 5 Rep Max (Use 85% of estimated 1RM for this weight)
        *   W8: 3 Rep Max (Use 90% of estimated 1RM for this weight)
        *   W9: 3x1 @ weight from W8
        *   W10: 1 Rep Max (Use 95% of estimated 1RM for this weight)
        *   W11: 2x10 @ 70% (Deload)
        *   W12: 2x10 @ 77% (Deload)
3.  **For ALL OTHER Accessory Lifts (Dumbbell Curls, Leg Press, etc.):**
    *   Do **NOT** populate the 'progression' field. Leave it empty or null.
    *   Populate the top-level 'sets', 'reps', and 'weight' fields with reasonable starting values. The user will progress on these by beating their logbook.
4.  **Create a creative and motivational name for the entire program.**
5.  **Round all calculated weights to the nearest 5 lbs.**`,
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
