
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import type { UserProfile } from '@/types';
import { doc, getDoc } from 'firebase/firestore';
import { usePathname, useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isFirebaseConfigured: boolean;
  dataVersion: number;
  refreshData: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFirebaseConfigured, setIsFirebaseConfigured] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);
  
  const router = useRouter();
  const pathname = usePathname();

  const fetchProfile = async (uid: string) => {
    if (!db) return;
    const profileDocRef = doc(db, 'users', uid, 'data', 'profile');
    const profileDoc = await getDoc(profileDocRef);
    if (profileDoc.exists()) {
        setProfile(profileDoc.data() as UserProfile);
    } else {
        setProfile(null);
    }
  };

  const refreshData = () => {
    setDataVersion(v => v + 1);
  };

  useEffect(() => {
    const configured = !!auth;
    setIsFirebaseConfigured(configured);

    if (!configured) {
      setLoading(false);
      return;
    }
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);
  
  // Handles redirection and data fetching based on auth state
  useEffect(() => {
    if (loading) return; // Wait for auth listener to resolve

    if (user) {
        if (user.emailVerified) {
            fetchProfile(user.uid);
        } else {
            setProfile(null);
            // Redirect if not on an allowed page
            if (pathname !== '/verify-email' && pathname !== '/login' && pathname !== '/signup') {
                router.push('/verify-email');
            }
        }
    } else {
      setProfile(null);
    }
  }, [user, loading, pathname, router]);

  // Refresh profile data when dataVersion changes
  useEffect(() => {
    if (user && user.emailVerified) {
        fetchProfile(user.uid);
    }
  }, [dataVersion, user]);

  return (
    <AuthContext.Provider value={{ user, profile, loading, isFirebaseConfigured, dataVersion, refreshData }}>
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
