
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
  dataVersion: number;
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
  const [dataVersion, setDataVersion] = useState(0);
  
  const router = useRouter();
  const pathname = usePathname();

  const fetchUserData = async (uid: string) => {
    if (!db) return;
    
    // Fetch Profile
    const profileDocRef = doc(db, 'users', uid, 'data', 'profile');
    const profileDoc = await getDoc(profileDocRef);
    const userProfile = profileDoc.exists() ? profileDoc.data() as UserProfile : null;
    setProfile(userProfile);

    // Fetch Macro Plan
    const goalsDocRef = doc(db, 'users', uid, 'data', 'goals');
    const goalsDoc = await getDoc(goalsDocRef);
    const userMacroPlan = goalsDoc.exists() ? goalsDoc.data() as MacroPlan : null;
    setMacroPlan(userMacroPlan);
    
    // Determine current goals from the plan
    if (userMacroPlan && userMacroPlan.plan && userMacroPlan.plan.length > 0) {
        const weeksSinceStart = differenceInWeeks(new Date(), parseISO(userMacroPlan.startDate));
        const currentWeekIndex = Math.max(0, Math.min(weeksSinceStart, userMacroPlan.plan.length - 1));
        setCurrentGoals(userMacroPlan.plan[currentWeekIndex]);
    } else {
        setCurrentGoals(null);
    }
  };

  const refreshData = async () => {
    if (user) {
        setLoading(true);
        await fetchUserData(user.uid);
        setLoading(false);
    }
    setDataVersion(v => v + 1);
  };

  useEffect(() => {
    const configured = !!auth;
    setIsFirebaseConfigured(configured);

    if (!configured) {
      setLoading(false);
      return;
    }
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      setUser(user);
      if (user) {
        await fetchUserData(user.uid);
      } else {
        setProfile(null);
        setMacroPlan(null);
        setCurrentGoals(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);
  
  // Handles redirection based on auth state
  useEffect(() => {
    if (loading) return; // Wait for auth listener to resolve

    const isAuthPage = pathname === '/login' || pathname === '/signup' || pathname === '/verify-email';

    if (!user && !isAuthPage) {
        router.push('/login');
    } else if (user && !user.emailVerified && !isAuthPage) {
        router.push('/verify-email');
    } else if (user && user.emailVerified && isAuthPage) {
        router.push('/');
    }
  }, [user, loading, pathname, router]);

  // This effect is now a fallback, direct refreshData calls are preferred
  useEffect(() => {
    if (user) {
        fetchUserData(user.uid);
    }
  }, [dataVersion, user]);

  return (
    <AuthContext.Provider value={{ user, profile, loading, isFirebaseConfigured, dataVersion, refreshData, macroPlan, currentGoals }}>
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
