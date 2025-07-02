
"use client";

import { useState, useMemo } from 'react';
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { generateProgram, GenerateProgramInput, GenerateProgramOutput } from '@/ai/flows/generate-program-flow';
import type { Program } from '@/types';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRight, ArrowLeft, Wand2, Dumbbell, Check, RefreshCcw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Progress } from '../ui/progress';

interface ProgramGeneratorProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveProgram: (program: Program) => void;
}

const schema = z.object({
  experience: z.enum(['beginner', 'intermediate', 'advanced'], { required_error: "Please select your experience level." }),
  frequency: z.enum(['3', '4', '5'], { required_error: "Please select how often you can train." }),
  goal: z.enum(['muscle gain', 'fat loss', 'general fitness'], { required_error: "Please select your primary goal." }),
});
type FormData = z.infer<typeof schema>;

const STEPS = [
    { id: 1, field: 'experience', title: "What's your experience level?", options: [{value: 'beginner', label: 'Beginner'}, {value: 'intermediate', label: 'Intermediate'}, {value: 'advanced', label: 'Advanced'}] },
    { id: 2, field: 'frequency', title: "How many days a week can you train?", options: [{value: '3', label: '3 Days'}, {value: '4', label: '4 Days'}, {value: '5', label: '5 Days'}] },
    { id: 3, field: 'goal', title: "What's your primary goal?", options: [{value: 'muscle gain', label: 'Muscle Gain'}, {value: 'fat loss', label: 'Fat Loss'}, {value: 'general fitness', label: 'General Fitness'}] },
];

export default function ProgramGenerator({ isOpen, onClose, onSaveProgram }: ProgramGeneratorProps) {
    const { toast } = useToast();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [generatedProgram, setGeneratedProgram] = useState<GenerateProgramOutput | null>(null);

    const { control, trigger, getValues, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(schema),
        mode: 'onChange'
    });

    const currentStepInfo = STEPS[step - 1];

    const handleNext = async () => {
        const isValid = await trigger(currentStepInfo.field as keyof FormData);
        if (isValid && step < STEPS.length) {
            setStep(s => s + 1);
        } else if (isValid && step === STEPS.length) {
            handleGenerateProgram();
        }
    };

    const handleBack = () => {
        if (step > 1) {
            setStep(s => s - 1);
        }
    };
    
    const handleGenerateProgram = async () => {
        setIsLoading(true);
        setGeneratedProgram(null);
        try {
            const values = getValues();
            const result = await generateProgram(values);
            setGeneratedProgram(result);
            setStep(4); // Move to review step
        } catch (error) {
            console.error("Error generating program:", error);
            toast({
                title: 'Generation Failed',
                description: 'The AI could not generate a program. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    }

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
        }, 300);
    }
    
    const renderContent = () => {
        if (step <= STEPS.length) {
            const fieldName = currentStepInfo.field as keyof FormData;
            return (
                <div className="flex flex-col h-full">
                    <CardHeader>
                        <Progress value={(step / (STEPS.length + 1)) * 100} className="w-full mb-4"/>
                        <CardTitle className="text-2xl">{currentStepInfo.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 flex items-center justify-center">
                        <Controller
                            name={fieldName}
                            control={control}
                            render={({ field }) => (
                                <RadioGroup
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                    className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-lg"
                                >
                                    {currentStepInfo.options.map(option => (
                                        <Label key={option.value} htmlFor={option.value} className="relative flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground has-[:checked]:border-primary">
                                            <RadioGroupItem value={option.value} id={option.value} className="sr-only" />
                                            <span className="text-lg font-semibold">{option.label}</span>
                                        </Label>
                                    ))}
                                </RadioGroup>
                            )}
                        />
                        {errors[fieldName] && <p className="text-destructive text-sm mt-2">{errors[fieldName]?.message}</p>}
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button variant="outline" onClick={handleBack} disabled={step === 1}><ArrowLeft className="mr-2" /> Back</Button>
                        <Button onClick={handleNext}>
                            {step === STEPS.length ? 'Generate Program' : 'Next'}
                            {step < STEPS.length ? <ArrowRight className="ml-2" /> : <Wand2 className="ml-2" />}
                        </Button>
                    </CardFooter>
                </div>
            );
        }
        
        if (isLoading || !generatedProgram) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                    <h2 className="text-2xl font-bold">Building Your Plan...</h2>
                    <p className="text-muted-foreground">The AI coach is crafting your personalized program.</p>
                </div>
            );
        }
        
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
                    <Button variant="outline" onClick={handleGenerateProgram} disabled={isLoading}>
                       <RefreshCcw className="mr-2"/> Regenerate
                    </Button>
                    <Button onClick={handleSave} className="bg-green-500 hover:bg-green-600">
                        <Check className="mr-2"/> Save Program
                    </Button>
                </CardFooter>
            </div>
        );
    }
    
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0">
                {renderContent()}
            </DialogContent>
        </Dialog>
    )
}
