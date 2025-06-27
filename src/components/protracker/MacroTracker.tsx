import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default function MacroTracker() {
  const calories = { current: 1890, goal: 2500 };
  const protein = { current: 150, goal: 180 };
  const carbs = { current: 200, goal: 250 };
  const fats = { current: 50, goal: 70 };

  return (
    <Card className="transition-all duration-300 hover:shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline">Macro Tracker</CardTitle>
        <CardDescription>Your daily nutrition summary.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-baseline">
            <h3 className="text-3xl font-bold text-primary">{calories.current.toLocaleString()}</h3>
            <span className="font-medium text-muted-foreground">/ {calories.goal.toLocaleString()} kCal</span>
        </div>
        <div className="space-y-3 pt-2">
          <div>
            <div className="flex justify-between mb-1 text-sm">
              <span className="font-medium text-foreground">Protein</span>
              <span className="text-muted-foreground">{protein.current}g / {protein.goal}g</span>
            </div>
            <Progress value={(protein.current / protein.goal) * 100} className="h-2 [&>div]:bg-sky-400" />
          </div>
          <div>
            <div className="flex justify-between mb-1 text-sm">
              <span className="font-medium text-foreground">Carbs</span>
              <span className="text-muted-foreground">{carbs.current}g / {carbs.goal}g</span>
            </div>
            <Progress value={(carbs.current / carbs.goal) * 100} className="h-2 [&>div]:bg-orange-400" />
          </div>
          <div>
            <div className="flex justify-between mb-1 text-sm">
              <span className="font-medium text-foreground">Fats</span>
              <span className="text-muted-foreground">{fats.current}g / {fats.goal}g</span>
            </div>
            <Progress value={(fats.current / fats.goal) * 100} className="h-2 [&>div]:bg-amber-400" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
