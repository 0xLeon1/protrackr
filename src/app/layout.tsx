import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import Header from '@/components/protracker/Header';
import BottomNav from '@/components/protracker/BottomNav';

export const metadata: Metadata = {
  title: 'ProTracker',
  description: 'Your all-in-one fitness and nutrition tracking app.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"></link>
      </head>
      <body className="font-body antialiased">
        <div className="relative flex flex-col min-h-screen bg-background">
          <Header />
          <main className="flex-1 p-4 sm:p-6 md:p-8 pb-20">
            {children}
          </main>
          <BottomNav />
        </div>
        <Toaster />
      </body>
    </html>
  );
}
