
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
  benchPress1RM: z.number().optional().describe("User's estimated 1-Rep Max for Bench Press in lbs."),
  squat1RM: z.number().optional().describe("User's estimated 1-Rep Max for Squat in lbs."),
  deadlift1RM: z.number().optional().describe("User's estimated 1-Rep Max for Deadlift in lbs."),
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
  weight: z.number().min(0).describe("A conservative starting weight in lbs. For bodyweight exercises or exercises where the user sets the weight, this should be 0."),
  notes: z.string().optional().describe("Optional notes for the exercise, like 'Focus on form' or 'Rest 60 seconds'."),
  progression: z.array(WeeklyProgressionSchema).optional().describe("An optional 12-week progression for main barbell lifts. This should not be populated for accessory lifts or for lifts that do not follow a percentage-based plan."),
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
{{#if benchPress1RM}}- Bench Press 1RM: {{{benchPress1RM}}} lbs{{/if}}
{{#if squat1RM}}- Squat 1RM: {{{squat1RM}}} lbs{{/if}}
{{#if deadlift1RM}}- Deadlift 1RM: {{{deadlift1RM}}} lbs{{/if}}

**Definitions & Core Principles:**
*   **Experience Levels & Rules:**
    *   **Beginner (Less than 1 year of training):** Focus on mastering form. The program MUST consist of machine and dumbbell exercises. The ONLY barbell exercise permitted is the Barbell Bench Press. ABSOLUTELY NO Barbell Squats or Barbell Deadlifts.
    *   **Intermediate (1-3 years of training):** Ready for structured progression. The program can include Barbell Bench Press and Barbell Squats. ABSOLUTELY NO Barbell Deadlifts.
    *   **Advanced (3+ years of training):** Can handle high volume and intensity. The program can include all major barbell lifts.

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

1.  **Rounding (Critical Rule): All calculated weight values in the final output MUST be rounded to the nearest 5 lbs. For example, 137.5 becomes 140, 132 becomes 130, and 133 becomes 135.**

2.  **Weight Fields (Very Important):**
    *   For lifts that get a 'progression' plan (see rule #3), the top-level 'weight' field MUST be the calculated weight for WEEK 1.
    *   For ALL OTHER exercises (all accessory lifts, non-progressing barbell lifts), the top-level 'weight' field MUST be 0. This is to let the user fill it in themselves.

3.  **Progression Field (Follow very carefully):**
    *   The 'progression' array should ONLY be populated for specific barbell lifts based on the user's experience level. For all other exercises, it MUST be empty or null.
    *   **If experience is 'beginner':** Do NOT populate the 'progression' field for ANY exercise. All exercises are progressed by the user "beating the logbook."
    *   **If experience is 'intermediate':**
        *   Populate the 'progression' field for the **Barbell Bench Press ONLY**, using the user's provided 'benchPress1RM' for the calculations. The top-level 'sets', 'reps', and 'weight' for this exercise MUST match the values from Week 1 of the progression.
        *   The Barbell Squat should be included in the workout but will NOT get a progression plan. Leave its 'progression' field empty, set its top-level 'weight' to 0, and give it a higher rep range (e.g., '8-10' or '8-12').
    *   **If experience is 'advanced':**
        *   Populate the 'progression' field for the **Barbell Bench Press, Barbell Squat, and Barbell Deadlift**, using their respective user-provided 1RMs for the calculations. The top-level 'sets', 'reps', and 'weight' for these exercises MUST match the values from Week 1 of the progression.

4.  **12-Week Percentage Progression (Use for all 'progression' calculations):**
    *   **Parsing Rule:** For formats like \`AxB\` (e.g., \`2x10\`), \`A\` is the value for the \`sets\` field and \`B\` is the value for the \`reps\` field (as a string). For Rep Max weeks (e.g., \`5 Rep Max\`), \`sets\` is \`1\` and \`reps\` is \`"5"\`.
    *   W1: 2x10 @ 70%
    *   W2: 2x10 @ 77%
    *   W3: 5x5 @ 80%
    *   W4: 5x4 @ 85%
    *   W5: 5x3 @ 87.5%
    *   W6: 5x1 @ 90%
    *   W7: 5 Rep Max (Calculate weight as 85% of 1RM)
    *   W8: 3 Rep Max (Calculate weight as 90% of 1RM)
    *   W9: 3x1 @ weight from W8
    *   W10: 1 Rep Max (Calculate weight as 95% of 1RM)
    *   W11: 2x10 @ 70% (Deload)
    *   W12: 2x10 @ 77% (Deload)

5.  **Create a creative and motivational name for the entire program.**`,
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
