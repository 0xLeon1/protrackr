
"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/contexts/auth-context';
import { auth } from '@/lib/firebase';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from '@/components/ui/button';
import { Dumbbell, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from '@/hooks/use-toast';

export default function Header() {
  const { user, isFirebaseConfigured } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    if (!isFirebaseConfigured || !auth) {
        toast({
            title: "Configuration Error",
            description: "Firebase is not configured correctly.",
            variant: "destructive"
        });
        return;
    }
    await signOut(auth);
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between h-16 px-4 border-b bg-background/95 backdrop-blur-sm md:px-6">
      <Link href="/" className="flex items-center gap-3">
        <Dumbbell className="w-8 h-8 text-primary" />
        <h1 className="text-2xl font-bold text-foreground font-headline">
          ProTracker
        </h1>
      </Link>
      <div>
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="cursor-pointer">
                <AvatarImage src={user.photoURL || undefined} alt="@user" data-ai-hint="person" />
                <AvatarFallback>{user.email?.[0].toUpperCase() || 'U'}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex gap-2">
            <Button asChild variant="ghost">
              <Link href="/login">Log In</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Sign Up</Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
