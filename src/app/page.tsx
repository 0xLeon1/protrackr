import DailyCheckin from '@/components/protracker/DailyCheckin';
import ConsistencyTracker from '@/components/protracker/ConsistencyTracker';

export default function HomePage() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <div className="space-y-6">
        <ConsistencyTracker />
      </div>
      <DailyCheckin />
    </div>
  );
}
