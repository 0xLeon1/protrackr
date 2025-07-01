
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, User, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import type { UserProfile, MacroPlan, WeeklyMacroGoal } from '@/types';
import { doc, getDoc, writeBatch, collection, getDocs, deleteDoc, setDoc } from 'firebase/firestore';
import { usePathname, useRouter } from 'next/navigation';
import { differenceInWeeks, parseISO } from 'date-fns';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isFirebaseConfigured: boolean;
  refreshData: () => Promise<void>;
  resetUserData: (password: string) => Promise<void>;
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
        await fetchUserData(user.uid);
    }
  }, [user, fetchUserData]);
  
  const resetUserData = async (password: string) => {
    if (!user || !user.email) {
      throw new Error("User not authenticated.");
    }
    
    const currentUserName = profile?.name || 'User';

    // 1. Reauthenticate user
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);

    if (db) {
        // 2. Delete all user subcollections
        const collectionsToDelete = ['programs', 'logs', 'meal-logs', 'bodyweight-logs', 'checkins', 'sleep-logs', 'custom-foods', 'recipes', 'cardio-logs'];
        for (const coll of collectionsToDelete) {
          const collRef = collection(db, 'users', user.uid, coll);
          const snapshot = await getDocs(collRef);
          if (!snapshot.empty) {
            const batch = writeBatch(db);
            snapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
          }
        }
        
        // 3. Delete all user data documents
        const dataDocsToDelete = ['goals', 'profile', 'recent-foods'];
         for (const docId of dataDocsToDelete) {
          const docRef = doc(db, 'users', user.uid, 'data', docId);
          await deleteDoc(docRef).catch((e) => console.log(`Could not delete ${docId}`, e));
        }

        // 4. Create a new minimal profile in the database
        const minimalProfile: UserProfile = {
          name: currentUserName,
          signupDate: user.metadata.creationTime || new Date().toISOString(),
          hasCompletedMacroSetup: false,
          age: 0,
          gender: 'male',
          initialWeight: 0,
          goalWeight: 0,
          transformationTarget: '',
          targetDate: '',
          otherGoals: '',
        };
        const profileDocRef = doc(db, 'users', user.uid, 'data', 'profile');
        await setDoc(profileDocRef, minimalProfile);

        // 5. Manually update the context state to reflect the reset, fixing the race condition.
        setProfile(minimalProfile);
        setMacroPlan(null);
        setCurrentGoals(null);
    }
  };

  // Effect to subscribe to auth state changes and perform initial data load
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

  // Effect to handle routing based on auth state
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
    <AuthContext.Provider value={{ user, profile, loading, isFirebaseConfigured, refreshData, resetUserData, macroPlan, currentGoals }}>
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
