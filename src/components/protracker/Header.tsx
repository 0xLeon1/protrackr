
"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { useAuth } from '@/contexts/auth-context';
import { auth, db } from '@/lib/firebase';
import { collection, getDocs, writeBatch, doc, deleteDoc } from 'firebase/firestore';
import React, { useState } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from '@/components/ui/button';
import { Dumbbell, LogOut, Trash2, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';

export default function Header() {
  const { user, isFirebaseConfigured, refreshData } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [password, setPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

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
  
  const handleResetData = async () => {
    if (!user || !user.email || !password || !db) {
        toast({ title: "Error", description: "Password is required.", variant: "destructive" });
        return;
    }
    setIsResetting(true);
    try {
        // 1. Re-authenticate user
        const credential = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(user, credential);
        
        // 2. Delete all user data from Firestore
        toast({ title: "Deleting data...", description: "This may take a moment."});

        const collectionsToDelete = ['programs', 'logs', 'meal-logs', 'bodyweight-logs', 'checkins', 'sleep-logs'];
        
        for (const coll of collectionsToDelete) {
            const collRef = collection(db, 'users', user.uid, coll);
            const snapshot = await getDocs(collRef);
            if (!snapshot.empty) {
                const batch = writeBatch(db);
                snapshot.docs.forEach(doc => {
                    batch.delete(doc.ref);
                });
                await batch.commit();
            }
        }

        // Delete the goals document separately
        const goalsDocRef = doc(db, 'users', user.uid, 'data', 'goals');
        await deleteDoc(goalsDocRef).catch(() => {}); // Fails silently if doc doesn't exist
        
        toast({ title: "Success!", description: "All your account data has been reset." });
        
        refreshData();
        
        setIsResetDialogOpen(false);
        setPassword('');

    } catch (error: any) {
        let errorMessage = "Failed to reset data. Please check your password and try again.";
        if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            errorMessage = "Incorrect password. Please try again.";
        }
        toast({
            title: "Error",
            description: errorMessage,
            variant: "destructive"
        });
    } finally {
        setIsResetting(false);
    }
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
              <DropdownMenuSeparator />
              <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Reset Data</span>
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action is irreversible. It will permanently delete all your programs, logs, and tracking data. To confirm, please enter your password.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="space-y-2 py-2">
                    <Label htmlFor="password-confirm" className="sr-only">Password</Label>
                    <Input
                      id="password-confirm"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      onKeyDown={(e) => {
                          if (e.key === 'Enter' && password) {
                              e.preventDefault();
                              handleResetData();
                          }
                      }}
                    />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setPassword('')}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleResetData} disabled={isResetting || !password} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      {isResetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Confirm & Reset
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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
