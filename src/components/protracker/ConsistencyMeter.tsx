import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, XCircle, TrendingUp } from "lucide-react";

export default function ConsistencyMeter() {
  const week = [
    { day: 'M', complete: true },
    { day: 'T', complete: true },
    { day: 'W', complete: false },
    { day: 'T', complete: true },
    { day: 'F', complete: false },
    { day: 'S', complete: true },
    { day: 'S', complete: true },
  ];

  const completedDays = week.filter(d => d.complete).length;

  return (
    <Card className="transition-all duration-300 hover:shadow-lg animate-fade-in">
      <CardHeader>
        <CardTitle className="font-headline">Consistency</CardTitle>
        <CardDescription>Your weekly progress at a glance.</CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <div className="flex justify-center items-center gap-4 mb-6">
            <TrendingUp className="w-10 h-10 text-primary" />
            <div>
                <p className="text-4xl font-bold">{completedDays} / 7 Days</p>
                <p className="text-sm font-medium text-muted-foreground">Current Streak</p>
            </div>
        </div>
        <div className="flex justify-around items-center p-3 rounded-lg bg-muted/50">
          {week.map((item, index) => (
            <div key={index} className="flex flex-col items-center gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground">{item.day}</span>
              {item.complete ? (
                <CheckCircle2 className="w-7 h-7 text-green-500" />
              ) : (
                <XCircle className="w-7 h-7 text-red-500 opacity-50" />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
