import DailyCheckin from '@/components/protracker/DailyCheckin';

export default function HomePage() {
  return (
    <div className="grid grid-cols-1 gap-6">
      <DailyCheckin />
    </div>
  );
}
