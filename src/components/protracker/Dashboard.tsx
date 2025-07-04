"use client";

import ConsistencyMeter from "@/components/protracker/ConsistencyMeter";
import DailyCheckin from "@/components/protracker/DailyCheckin";
import WorkoutTracker from "@/components/protracker/WorkoutTracker";

export default function Dashboard() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 xl:grid-cols-4">
      <div className="flex flex-col gap-6 xl:col-span-3">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          <ConsistencyMeter />
          <DailyCheckin />
        </div>
        <WorkoutTracker />
      </div>
      <div className="flex flex-col gap-6 lg:col-span-3 xl:col-span-1">
      </div>
    </div>
  );
}
