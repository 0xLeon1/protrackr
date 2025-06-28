
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import type { UserProfile } from '@/types';
import { doc, getDoc } from 'firebase/firestore';

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
    // auth will be undefined if the config is missing.
    const configured = !!auth;
    setIsFirebaseConfigured(configured);

    if (configured) {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        setUser(user);
        if (user) {
            await fetchProfile(user.uid);
        } else {
            setProfile(null);
        }
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      // If not configured, we're done loading.
      setLoading(false);
    }
  }, []);
  
  // Refresh profile data when dataVersion changes
  useEffect(() => {
    if (user) {
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
