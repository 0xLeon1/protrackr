'use server';

/**
 * @fileOverview AI-powered workout program generator.
 *
 * - generateWorkoutProgram - A function that generates a workout program tailored to the user's goals and experience level.
 * - GenerateWorkoutProgramInput - The input type for the generateWorkoutProgram function.
 * - GenerateWorkoutProgramOutput - The return type for the generateWorkoutProgram function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateWorkoutProgramInputSchema = z.object({
  goals: z.string().describe('The user\u2019s fitness goals, e.g., lose weight, build muscle, increase endurance.'),
  experienceLevel: z.string().describe('The user\u2019s experience level, e.g., beginner, intermediate, advanced.'),
  daysPerWeek: z.number().describe('The number of days per week the user can workout.'),
  workoutLength: z.string().describe('How long the user wants to workout for in minutes.'),
  equipmentAvailable: z.string().describe('The equipment that is available to the user. E.g. Dumbbells, barbells, machines, bodyweight only.'),
});
export type GenerateWorkoutProgramInput = z.infer<typeof GenerateWorkoutProgramInputSchema>;

const GenerateWorkoutProgramOutputSchema = z.object({
  workoutProgram: z.string().describe('The generated workout program tailored to the user\u2019s goals and experience level.'),
});
export type GenerateWorkoutProgramOutput = z.infer<typeof GenerateWorkoutProgramOutputSchema>;

export async function generateWorkoutProgram(input: GenerateWorkoutProgramInput): Promise<GenerateWorkoutProgramOutput> {
  return generateWorkoutProgramFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateWorkoutProgramPrompt',
  input: {schema: GenerateWorkoutProgramInputSchema},
  output: {schema: GenerateWorkoutProgramOutputSchema},
  prompt: `You are an expert personal trainer specializing in creating workout programs.

You will use this information to generate a workout program tailored to the user's goals and experience level.

Goals: {{{goals}}}
Experience Level: {{{experienceLevel}}}
Days Per Week: {{{daysPerWeek}}}
Workout Length: {{{workoutLength}}}
Equipment Available: {{{equipmentAvailable}}}

Generate a workout program:
`,
});

const generateWorkoutProgramFlow = ai.defineFlow(
  {
    name: 'generateWorkoutProgramFlow',
    inputSchema: GenerateWorkoutProgramInputSchema,
    outputSchema: GenerateWorkoutProgramOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
