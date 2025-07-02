
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import type { UserProfile } from '@/types';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { format, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const { user, profile, loading, refreshData } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [editableProfile, setEditableProfile] = useState<Partial<UserProfile> | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);
  
  useEffect(() => {
    if (profile) {
      setEditableProfile(profile);
    }
  }, [profile]);

  const handleProfileChange = (field: keyof UserProfile, value: string | number) => {
    if (editableProfile) {
        setEditableProfile({ ...editableProfile, [field]: value });
    }
  };

  const handleSaveChanges = async () => {
    if (!user || !editableProfile) return;
    
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
    } catch (error) {
        console.error("Error updating profile:", error);
        toast({ title: "Error", description: "Could not save your changes.", variant: "destructive" });
    }
  };

  if (loading || !user || !editableProfile) {
    return (
      <div className="flex justify-center items-center h-full min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences.</p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Edit Your Profile</CardTitle>
          <CardDescription>
            Make changes to your profile. Click save when you're done.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 max-h-[60vh] overflow-y-auto">
            <div className="grid gap-6 max-w-lg">
                <div className="grid grid-cols-3 items-center gap-4">
                    <Label htmlFor="name" className="text-right">Name</Label>
                    <Input id="name" value={editableProfile.name || ''} onChange={(e) => handleProfileChange('name', e.target.value)} className="col-span-2" />
                </div>
                <div className="grid grid-cols-3 items-center gap-4">
                    <Label htmlFor="age" className="text-right">Age</Label>
                    <Input id="age" type="number" value={editableProfile.age || ''} onChange={(e) => handleProfileChange('age', Number(e.target.value))} className="col-span-2" />
                </div>
                 <div className="grid grid-cols-3 items-center gap-4">
                    <Label htmlFor="gender" className="text-right">Gender</Label>
                    <Select value={editableProfile.gender || ''} onValueChange={(value) => handleProfileChange('gender', value)}>
                        <SelectTrigger className="col-span-2"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-3 items-center gap-4">
                    <Label htmlFor="initialWeight" className="text-right">Start Weight</Label>
                    <Input id="initialWeight" type="number" value={editableProfile.initialWeight || ''} onChange={(e) => handleProfileChange('initialWeight', Number(e.target.value))} className="col-span-2" />
                </div>
                <div className="grid grid-cols-3 items-center gap-4">
                    <Label htmlFor="goalWeight" className="text-right">Goal Weight</Label>
                    <Input id="goalWeight" type="number" value={editableProfile.goalWeight || ''} onChange={(e) => handleProfileChange('goalWeight', Number(e.target.value))} className="col-span-2" />
                </div>
                 <div className="grid grid-cols-3 items-center gap-4">
                    <Label className="text-right text-muted-foreground">Target Date</Label>
                    <p className="col-span-2 text-sm font-medium text-muted-foreground">{editableProfile.targetDate ? format(parseISO(editableProfile.targetDate), 'MMM d, yyyy') : 'Not Set'}</p>
                </div>
                <div className="grid grid-cols-3 items-start gap-4">
                    <Label htmlFor="otherGoals" className="text-right pt-2">Your 'Why'</Label>
                    <Textarea 
                        id="otherGoals" 
                        value={editableProfile.otherGoals || ''} 
                        onChange={(e) => handleProfileChange('otherGoals', e.target.value)} 
                        className="col-span-2 min-h-[80px]" 
                        placeholder="e.g. To have more energy for my family..."
                    />
                </div>
            </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
            <Button onClick={handleSaveChanges}>Save Changes</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
