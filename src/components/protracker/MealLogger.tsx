import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UtensilsCrossed } from "lucide-react";

export default function MealLogger() {
  return (
    <Card className="transition-all duration-300 hover:shadow-lg animate-fade-in">
      <CardHeader>
        <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-primary" />
            <CardTitle className="font-headline">Log a Meal</CardTitle>
        </div>
        <CardDescription>Add a meal to your daily log.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="meal-name">Meal</Label>
            <Input id="meal-name" placeholder="e.g., Chicken and Rice" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="protein">Protein (g)</Label>
              <Input id="protein" type="number" placeholder="40" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="carbs">Carbs (g)</Label>
              <Input id="carbs" type="number" placeholder="50" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fats">Fats (g)</Label>
              <Input id="fats" type="number" placeholder="15" />
            </div>
          </div>
          <Button type="submit" className="w-full">Log Meal</Button>
        </form>
      </CardContent>
    </Card>
  );
}
