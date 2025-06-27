import Header from '@/components/protracker/Header';
import Dashboard from '@/components/protracker/Dashboard';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1 p-4 sm:p-6 md:p-8">
        <Dashboard />
      </main>
    </div>
  );
}
