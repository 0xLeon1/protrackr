
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isFirebaseConfigured: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFirebaseConfigured, setIsFirebaseConfigured] = useState(false);

  useEffect(() => {
    // This logic now correctly runs only on the client, after modules are loaded.
    const configured = !!auth && !!db;
    setIsFirebaseConfigured(configured);

    if (configured) {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setUser(user);
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      // Handles server-side rendering or cases where Firebase fails to initialize.
      setLoading(false);
      // We still log a warning in case the keys are truly missing.
      if (typeof window !== 'undefined') {
        console.warn("Firebase configuration is missing or incomplete. Please check your environment variables. The app will not connect to Firebase.");
      }
    }
  }, []); // The empty dependency array ensures this runs once on client mount.

  return (
    <AuthContext.Provider value={{ user, loading, isFirebaseConfigured }}>
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
