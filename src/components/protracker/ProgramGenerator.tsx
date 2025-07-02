
"use client";

import { useState, useMemo } from 'react';
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { generateProgram, GenerateProgramOutput } from '@/ai/flows/generate-program-flow';
import type { Program } from '@/types';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRight, ArrowLeft, Wand2, Dumbbell, Check, RefreshCcw, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Progress } from '../ui/progress';
import { Input } from '../ui/input';
import { Form, FormField } from '../ui/form';

interface ProgramGeneratorProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveProgram: (program: Program) => void;
}

const schema = z.object({
  experience: z.enum(['beginner', 'intermediate', 'advanced'], { required_error: "Please select your experience level." }),
  frequency: z.enum(['3', '4', '5', '6'], { required_error: "Please select how often you can train." }),
  goal: z.enum(['Build Muscle', 'Lose Body Fat', 'Get Toned & Defined'], { required_error: "Please select your primary goal." }),
  benchPress1RM: z.coerce.number().positive("1RM must be a positive number.").optional(),
  squat1RM: z.coerce.number().positive("1RM must be a positive number.").optional(),
  deadlift1RM: z.coerce.number().positive("1RM must be a positive number.").optional(),
}).superRefine((data, ctx) => {
    if (data.experience === 'intermediate' || data.experience === 'advanced') {
        if (!data.benchPress1RM) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Bench press max is required.",
                path: ['benchPress1RM'],
            });
        }
        if (!data.squat1RM) {
             ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Squat max is required.",
                path: ['squat1RM'],
            });
        }
    }
    if (data.experience === 'advanced') {
        if (!data.deadlift1RM) {
             ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Deadlift max is required.",
                path: ['deadlift1RM'],
            });
        }
    }
});


type FormData = z.infer<typeof schema>;

const STEPS = [
    { id: 1, field: 'experience', title: "What's your experience level?", options: [{value: 'beginner', label: 'Beginner (<1yr)'}, {value: 'intermediate', label: 'Intermediate (1-3yrs)'}, {value: 'advanced', label: 'Advanced (3+yrs)'}] },
    { id: 2, field: 'frequency', title: "How many days a week can you train?", options: [{value: '3', label: '3 Days'}, {value: '4', label: '4 Days'}, {value: '5', label: '5 Days'}, {value: '6', label: '6 Days'}] },
    { id: 3, field: 'goal', title: "What's your primary goal?", options: [{value: 'Build Muscle', label: 'Build Muscle'}, {value: 'Lose Body Fat', label: 'Lose Body Fat'}, {value: 'Get Toned & Defined', label: 'Get Toned & Defined'}] },
];

export default function ProgramGenerator({ isOpen, onClose, onSaveProgram }: ProgramGeneratorProps) {
    const { toast } = useToast();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [generatedProgram, setGeneratedProgram] = useState<GenerateProgramOutput | null>(null);

    const form = useForm<FormData>({
        resolver: zodResolver(schema),
        mode: 'onChange',
    });

    const { control, trigger, getValues, handleSubmit, formState: { errors } } = form;

    const currentStepInfo = STEPS[step - 1];
    
    const handleFinalSubmit = async (values: FormData) => {
        setIsLoading(true);
        setGeneratedProgram(null);
        try {
            const result = await generateProgram(values);
            if (!result || !result.name || !result.workouts) {
              throw new Error("Received invalid program structure from AI.");
            }
            setGeneratedProgram(result);
            setStep(5); // Move to review step
        } catch (error) {
            console.error("Error generating program:", error);
            toast({
                title: 'Generation Failed',
                description: 'The AI could not generate a program. Please try again.',
                variant: 'destructive',
            });
            // Go back to the appropriate step if generation fails
            const experience = getValues('experience');
             if (experience === 'beginner') {
                setStep(3);
            } else {
                setStep(4);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleNext = async () => {
        const isValid = await trigger(currentStepInfo.field as keyof FormData);
        if (!isValid) return;

        if (step < STEPS.length) {
            setStep(s => s + 1);
        } else {
            const experience = getValues('experience');
            if (experience === 'beginner') {
                handleSubmit(handleFinalSubmit)();
            } else {
                setStep(4); // Move to 1RM input step
            }
        }
    };

    const handleBack = () => {
        if (isLoading) return;
        if (step > 1) {
            setStep(s => s - 1);
        }
    };
    
    const handleSave = () => {
        if (!generatedProgram) return;

        // Add client-side IDs to the program object before saving
        const programWithIds: Program = {
            id: `prog-${Date.now()}`,
            name: generatedProgram.name,
            workouts: generatedProgram.workouts.map((w, wIdx) => ({
                id: `work-${Date.now()}-${wIdx}`,
                name: w.name,
                exercises: w.exercises.map((e, eIdx) => ({
                    id: `ex-${Date.now()}-${wIdx}-${eIdx}`,
                    name: e.name,
                    sets: e.sets,
                    reps: e.reps,
                    weight: e.weight,
                    notes: e.notes || '',
                    progression: e.progression || [],
                }))
            }))
        };
        onSaveProgram(programWithIds);
    };

    const handleClose = () => {
        onClose();
        // Delay reset to allow dialog to animate out
        setTimeout(() => {
            setStep(1);
            setGeneratedProgram(null);
            setIsLoading(false);
        }, 300);
    }

    const experience = getValues('experience');
    
    const renderContent = () => {
        // Priority 1: Loading state
        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                    <h2 className="text-2xl font-bold">Building Your Plan...</h2>
                    <p className="text-muted-foreground">The AI coach is crafting your personalized program.</p>
                </div>
            );
        }
        
        // Final review step
        if (step === 5 && generatedProgram) {
            return (
                <div className="flex flex-col h-full">
                    <CardHeader>
                        <Progress value={100} className="w-full mb-4"/>
                        <CardTitle className="text-2xl">{generatedProgram.name}</CardTitle>
                        <CardDescription>Review your new program. You can edit it later from the Programs page.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto pr-2">
                        <Accordion type="multiple" className="w-full" defaultValue={['work-0']}>
                            {generatedProgram.workouts.map((workout, idx) => (
                                <AccordionItem value={`work-${idx}`} key={idx}>
                                    <AccordionTrigger className="text-lg font-semibold"><Dumbbell className="mr-3 text-primary"/> {workout.name}</AccordionTrigger>
                                    <AccordionContent>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Exercise</TableHead>
                                                    <TableHead className="text-center">Sets</TableHead>
                                                    <TableHead className="text-center">Reps</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {workout.exercises.map((ex, exIdx) => (
                                                    <TableRow key={exIdx}>
                                                        <TableCell className="font-medium">{ex.name}</TableCell>
                                                        <TableCell className="text-center">{ex.sets}</TableCell>
                                                        <TableCell className="text-center">{ex.reps}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </CardContent>
                     <CardFooter className="flex justify-between">
                        <Button type="button" variant="outline" onClick={() => handleSubmit(handleFinalSubmit)()} disabled={isLoading}>
                           <RefreshCcw className="mr-2"/> Regenerate
                        </Button>
                        <Button type="button" onClick={handleSave} className="bg-green-500 hover:bg-green-600">
                            <Check className="mr-2"/> Save Program
                        </Button>
                    </CardFooter>
                </div>
            );
        }

        // 1RM Input Step
        if (step === 4) {
            return (
                 <div className="flex flex-col h-full">
                    <CardHeader>
                        <Progress value={(step / (STEPS.length + 1)) * 100} className="w-full mb-4"/>
                        <CardTitle className="text-2xl">Enter Your Max Lifts</CardTitle>
                        <CardDescription>
                            Provide your estimated 1-Rep Max (1RM) for the heaviest single rep you can lift. This will be used to calculate your weights.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col items-center justify-center">
                        <div className="w-full max-w-sm space-y-4">
                            <FormField
                                name="benchPress1RM"
                                control={control}
                                render={({ field }) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="benchPress1RM">Bench Press 1RM (lbs)</Label>
                                        <Input id="benchPress1RM" type="number" placeholder="e.g. 225" {...field} />
                                        {errors.benchPress1RM && <p className="text-destructive text-sm">{errors.benchPress1RM.message}</p>}
                                    </div>
                                )}
                            />
                             <FormField
                                name="squat1RM"
                                control={control}
                                render={({ field }) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="squat1RM">Squat 1RM (lbs)</Label>
                                        <Input id="squat1RM" type="number" placeholder="e.g. 315" {...field} />
                                        {errors.squat1RM && <p className="text-destructive text-sm">{errors.squat1RM.message}</p>}
                                    </div>
                                )}
                            />
                            {experience === 'advanced' && (
                                <FormField
                                    name="deadlift1RM"
                                    control={control}
                                    render={({ field }) => (
                                        <div className="space-y-2">
                                            <Label htmlFor="deadlift1RM">Deadlift 1RM (lbs)</Label>
                                            <Input id="deadlift1RM" type="number" placeholder="e.g. 405" {...field} />
                                            {errors.deadlift1RM && <p className="text-destructive text-sm">{errors.deadlift1RM.message}</p>}
                                        </div>
                                    )}
                                />
                            )}
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button type="button" variant="outline" onClick={handleBack}><ArrowLeft className="mr-2" /> Back</Button>
                        <Button type="submit">Generate Program <Wand2 className="ml-2" /></Button>
                    </CardFooter>
                 </div>
            )
        }
        
        // Initial Form steps
        if (step <= STEPS.length) {
            const fieldName = currentStepInfo.field as keyof FormData;
            return (
                <div className="flex flex-col h-full">
                    <CardHeader>
                        <Progress value={(step / (STEPS.length + 1)) * 100} className="w-full mb-4"/>
                        <CardTitle className="text-2xl">{currentStepInfo.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col items-center justify-center">
                        <Controller
                            name={fieldName}
                            control={control}
                            render={({ field }) => (
                                <RadioGroup
                                    onValueChange={field.onChange}
                                    value={field.value}
                                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full"
                                >
                                    {currentStepInfo.options.map(option => (
                                        <Label key={option.value} htmlFor={option.value} className={cn("relative flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer",
                                        "[&:has([data-state=checked])]:border-primary"
                                        )}>
                                            <RadioGroupItem value={option.value} id={option.value} className="sr-only" />
                                            <span className="text-lg font-semibold text-center">{option.label}</span>
                                        </Label>
                                    ))}
                                </RadioGroup>
                            )}
                        />
                        {errors[fieldName] && <p className="text-destructive text-sm mt-4 text-center">{errors[fieldName]?.message}</p>}
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button type="button" variant="outline" onClick={handleBack} disabled={step === 1}><ArrowLeft className="mr-2" /> Back</Button>
                        <Button type="button" onClick={handleNext}>
                            {getValues('experience') === 'beginner' && step === 3 ? 'Generate Program' : 'Next'}
                            <ArrowRight className="ml-2" />
                        </Button>
                    </CardFooter>
                </div>
            );
        }

        return null; // Fallback
    }
    
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0">
                <Form {...form}>
                    <form onSubmit={handleSubmit(handleFinalSubmit)} className="flex flex-col h-full">
                        {renderContent()}
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

    