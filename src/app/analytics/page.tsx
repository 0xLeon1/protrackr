import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">Your performance overview.</p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            Detailed analytics and charts will be available here in a future update.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
          <BarChart3 className="w-16 h-16 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Check back later for more insights into your progress.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
