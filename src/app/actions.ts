"use server";

import { generateWorkoutProgram } from "@/ai/flows/generate-workout-program";
import { z } from "zod";

const FormSchema = z.object({
  goals: z.string().min(3, "Goals must be at least 3 characters."),
  experienceLevel: z.enum(["beginner", "intermediate", "advanced"]),
  daysPerWeek: z.coerce.number().min(1).max(7),
  workoutLength: z.string().min(2, "Workout length is required."),
  equipmentAvailable: z.string().min(3, "Equipment availability is required."),
});

type FormState = {
  message: string;
  workoutProgram?: string;
  errors?: {
    goals?: string[];
    experienceLevel?: string[];
    daysPerWeek?: string[];
    workoutLength?: string[];
    equipmentAvailable?: string[];
  };
};

export async function generateProgramAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const validatedFields = FormSchema.safeParse({
    goals: formData.get("goals"),
    experienceLevel: formData.get("experienceLevel"),
    daysPerWeek: formData.get("daysPerWeek"),
    workoutLength: formData.get("workoutLength"),
    equipmentAvailable: formData.get("equipmentAvailable"),
  });
  
  if (!validatedFields.success) {
    return {
      message: "Failed to generate program. Please check the fields.",
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    const output = await generateWorkoutProgram(validatedFields.data);
    return {
      message: "Successfully generated workout program!",
      workoutProgram: output.workoutProgram,
    };
  } catch (e) {
    return {
      message: "An unexpected error occurred while generating the program.",
    };
  }
}
