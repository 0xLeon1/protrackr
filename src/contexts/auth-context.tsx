
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import type { UserProfile, MacroPlan, WeeklyMacroGoal } from '@/types';
import { doc, getDoc } from 'firebase/firestore';
import { usePathname, useRouter } from 'next/navigation';
import { differenceInWeeks, parseISO } from 'date-fns';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isFirebaseConfigured: boolean;
  refreshData: () => Promise<void>;
  macroPlan: MacroPlan | null;
  currentGoals: WeeklyMacroGoal | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [macroPlan, setMacroPlan] = useState<MacroPlan | null>(null);
  const [currentGoals, setCurrentGoals] = useState<WeeklyMacroGoal | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFirebaseConfigured, setIsFirebaseConfigured] = useState(false);
  
  const router = useRouter();
  const pathname = usePathname();

  const fetchUserData = useCallback(async (uid: string) => {
    if (!db) return;
    
    try {
        const profileDocRef = doc(db, 'users', uid, 'data', 'profile');
        const goalsDocRef = doc(db, 'users', uid, 'data', 'goals');

        const [profileDoc, goalsDoc] = await Promise.all([
            getDoc(profileDocRef),
            getDoc(goalsDocRef)
        ]);
        
        const userProfile = profileDoc.exists() ? profileDoc.data() as UserProfile : null;
        setProfile(userProfile);

        const userMacroPlan = goalsDoc.exists() ? goalsDoc.data() as MacroPlan : null;
        setMacroPlan(userMacroPlan);
        
        if (userMacroPlan?.plan?.length) {
            const weeksSinceStart = differenceInWeeks(new Date(), parseISO(userMacroPlan.startDate));
            const currentWeekIndex = Math.max(0, Math.min(weeksSinceStart, userMacroPlan.plan.length - 1));
            setCurrentGoals(userMacroPlan.plan[currentWeekIndex]);
        } else {
            setCurrentGoals(null);
        }
    } catch (error) {
        console.error("Error fetching user data:", error);
        setProfile(null);
        setMacroPlan(null);
        setCurrentGoals(null);
    }
  }, []);

  const refreshData = useCallback(async () => {
    if (user) {
        setLoading(true);
        await fetchUserData(user.uid);
        setLoading(false);
    }
  }, [user, fetchUserData]);

  useEffect(() => {
    const configured = !!auth;
    setIsFirebaseConfigured(configured);
    if (!configured) {
        setLoading(false);
        return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        setLoading(true);
        if (firebaseUser) {
            setUser(firebaseUser);
            await fetchUserData(firebaseUser.uid);
        } else {
            setUser(null);
            setProfile(null);
            setMacroPlan(null);
            setCurrentGoals(null);
        }
        setLoading(false);
    });

    return () => unsubscribe();
  }, [fetchUserData]);

  useEffect(() => {
    if (loading) return;

    const isAuthPage = pathname === '/login' || pathname === '/signup' || pathname === '/verify-email';

    if (!user && !isAuthPage) {
        router.push('/login');
    } else if (user && !user.emailVerified && pathname !== '/verify-email') {
        router.push('/verify-email');
    } else if (user && user.emailVerified && isAuthPage) {
        router.push('/');
    }
  }, [user, loading, pathname, router]);

  return (
    <AuthContext.Provider value={{ user, profile, loading, isFirebaseConfigured, refreshData, macroPlan, currentGoals }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
