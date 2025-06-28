
"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle } from 'lucide-react';
import type { CardioLogEntry } from '@/types';

const cardioModalities = [
  "Running", "Cycling", "Swimming", "Walking", "Rowing", "Elliptical", "StairMaster", "HIIT", "Other"
];

interface CardioLoggerProps {
    onLogCardio: (log: Omit<CardioLogEntry, 'id' | 'date'>) => Promise<void>;
}

export default function CardioLogger({ onLogCardio }: CardioLoggerProps) {
    const [modality, setModality] = useState<string>("");
    const [duration, setDuration] = useState<string>("");
    const [calories, setCalories] = useState<string>("");
    const [isLogging, setIsLogging] = useState(false);

    const handleLog = async () => {
        const dur = parseInt(duration, 10);
        const cal = parseInt(calories, 10);

        if (!modality || isNaN(dur) || dur <= 0 || isNaN(cal) || cal < 0) {
            // Basic validation feedback needed, but toast is in parent
            return;
        }
        
        setIsLogging(true);
        await onLogCardio({
            modality,
            duration: dur,
            calories: cal,
        });
        
        // Reset form
        setModality("");
        setDuration("");
        setCalories("");
        setIsLogging(false);
    };
    
    const canLog = modality && duration && calories && !isLogging;

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="cardio-modality">Modality</Label>
                <Select value={modality} onValueChange={setModality}>
                    <SelectTrigger id="cardio-modality">
                        <SelectValue placeholder="Select a cardio type" />
                    </SelectTrigger>
                    <SelectContent>
                        {cardioModalities.map(item => (
                            <SelectItem key={item} value={item}>{item}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="cardio-duration">Duration (min)</Label>
                    <Input 
                        id="cardio-duration"
                        type="number" 
                        placeholder="e.g. 30" 
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="cardio-calories">Calories (kcal)</Label>
                    <Input 
                        id="cardio-calories"
                        type="number"
                        placeholder="e.g. 300" 
                        value={calories}
                        onChange={(e) => setCalories(e.target.value)}
                    />
                </div>
            </div>
            <Button onClick={handleLog} disabled={!canLog} className="w-full">
                {isLogging ? "Logging..." : "Log Cardio"}
                {!isLogging && <PlusCircle className="ml-2 h-4 w-4" />}
            </Button>
        </div>
    );
}
