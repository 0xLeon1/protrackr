import MacroTracker from "@/components/protracker/MacroTracker";
import MealLogger from "@/components/protracker/MealLogger";

export default function NutritionPage() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-1">
        <MacroTracker />
      </div>
      <div className="lg:col-span-1">
        <MealLogger />
      </div>
    </div>
  );
}
