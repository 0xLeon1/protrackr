
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isFirebaseConfigured: boolean;
  dataVersion: number;
  refreshData: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFirebaseConfigured, setIsFirebaseConfigured] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);

  const refreshData = () => {
    setDataVersion(v => v + 1);
  };

  useEffect(() => {
    // auth will be undefined if the config is missing.
    const configured = !!auth;
    setIsFirebaseConfigured(configured);

    if (configured) {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setUser(user);
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      // If not configured, we're done loading.
      setLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isFirebaseConfigured, dataVersion, refreshData }}>
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
