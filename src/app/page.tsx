import DailyCheckin from '@/components/protracker/DailyCheckin';
import ConsistencyMeter from '@/components/protracker/ConsistencyMeter';

export default function HomePage() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <DailyCheckin />
      <ConsistencyMeter />
    </div>
  );
}
