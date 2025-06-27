'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Dumbbell, UtensilsCrossed, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/programs', label: 'Programs', icon: Dumbbell },
  { href: '/nutrition', label: 'Nutrition', icon: UtensilsCrossed },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t bg-background/95 backdrop-blur-sm">
      <div className="grid h-16 grid-cols-4 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = item.href === '/' ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 text-muted-foreground transition-colors hover:text-primary',
                isActive && 'text-primary'
              )}
            >
              <item.icon className="h-6 w-6" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
