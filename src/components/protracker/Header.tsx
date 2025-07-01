
"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/contexts/auth-context';
import { auth, db } from '@/lib/firebase';
import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import type { UserProfile } from '@/types';
import { doc, setDoc } from 'firebase/firestore';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from '@/components/ui/button';
import { Dumbbell, LogOut, User as UserIcon, Edit } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export default function Header() {
  const { user, profile, isFirebaseConfigured, refreshData } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [editableProfile, setEditableProfile] = useState<Partial<UserProfile> | null>(null);

  useEffect(() => {
    if (isProfileDialogOpen && profile) {
      setEditableProfile(profile);
    }
  }, [isProfileDialogOpen, profile]);

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

  const handleProfileChange = (field: keyof UserProfile, value: string | number) => {
    if (editableProfile) {
        setEditableProfile({ ...editableProfile, [field]: value });
    }
  };
  
  const handleSaveChanges = async () => {
    if (!user || !editableProfile) return;
    
    // Validate required fields
    if (!editableProfile.name || !editableProfile.age || editableProfile.age <= 0 || !editableProfile.initialWeight || editableProfile.initialWeight <= 0 || !editableProfile.goalWeight || editableProfile.goalWeight <= 0) {
      toast({
        title: "Invalid Profile Data",
        description: "Please ensure all fields are filled out correctly and have valid values.",
        variant: "destructive",
      });
      return;
    }

    try {
        const profileDocRef = doc(db, 'users', user.uid, 'data', 'profile');
        await setDoc(profileDocRef, editableProfile, { merge: true });
        
        await refreshData();
        toast({ title: "Profile Updated", description: "Your changes have been saved." });
        setIsProfileDialogOpen(false);
    } catch (error) {
        console.error("Error updating profile:", error);
        toast({ title: "Error", description: "Could not save your changes.", variant: "destructive" });
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
          <>
            <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Avatar className="cursor-pointer">
                    <AvatarImage src={user.photoURL || undefined} alt="@user" data-ai-hint="person" />
                    <AvatarFallback>{user.email?.[0].toUpperCase() || 'U'}</AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setIsProfileDialogOpen(true)}>
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Your Profile</DialogTitle>
                    <DialogDescription>Make changes to your profile. Click save when you're done.</DialogDescription>
                </DialogHeader>
                {editableProfile && (
                  <div className="pt-4 grid gap-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Name</Label>
                        <Input id="name" value={editableProfile.name || ''} onChange={(e) => handleProfileChange('name', e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="age" className="text-right">Age</Label>
                        <Input id="age" type="number" value={editableProfile.age || ''} onChange={(e) => handleProfileChange('age', Number(e.target.value))} className="col-span-3" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="gender" className="text-right">Gender</Label>
                        <Select value={editableProfile.gender} onValueChange={(value) => handleProfileChange('gender', value)}>
                            <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="female">Female</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="initialWeight" className="text-right">Start Weight</Label>
                        <Input id="initialWeight" type="number" value={editableProfile.initialWeight || ''} onChange={(e) => handleProfileChange('initialWeight', Number(e.target.value))} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="goalWeight" className="text-right">Goal Weight</Label>
                        <Input id="goalWeight" type="number" value={editableProfile.goalWeight || ''} onChange={(e) => handleProfileChange('goalWeight', Number(e.target.value))} className="col-span-3" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right text-muted-foreground">Target Date</Label>
                        <p className="col-span-3 text-sm font-medium text-muted-foreground">{editableProfile.targetDate ? format(parseISO(editableProfile.targetDate), 'MMM d, yyyy') : 'Not Set'}</p>
                    </div>
                    <div className="grid grid-cols-4 items-start gap-4">
                        <Label htmlFor="otherGoals" className="text-right pt-2">Your 'Why'</Label>
                        <Textarea 
                            id="otherGoals" 
                            value={editableProfile.otherGoals || ''} 
                            onChange={(e) => handleProfileChange('otherGoals', e.target.value)} 
                            className="col-span-3 min-h-[80px]" 
                            placeholder="e.g. To have more energy for my family..."
                        />
                    </div>
                  </div>
                )}
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsProfileDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveChanges}>Save Changes</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
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
