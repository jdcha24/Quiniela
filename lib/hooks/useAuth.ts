// lib/hooks/useAuth.ts
"use client";

import { useState, useCallback } from "react";
import { User } from "firebase/auth";
import { UserDocument } from "@/types/firestore";
import { mockUser } from "@/lib/mockData";

interface AuthState {
  user: User | null;
  userDoc: UserDocument | null;
  loading: boolean;
  isAdmin: boolean;
  onboardingComplete: boolean;
}

const dummyUser = {
  uid: mockUser.uid,
  email: mockUser.email,
  displayName: mockUser.nickname,
  getIdToken: async () => "mock-token",
} as any as User;

export function useAuth(): AuthState & {
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
} {
  const [state] = useState<AuthState>({
    user: dummyUser,
    userDoc: mockUser,
    loading: false,
    isAdmin: true, // Set to true to allow simulating both admin and player views
    onboardingComplete: true,
  });

  const signInWithGoogle = useCallback(async () => {
    // No-op in frontend-only simulation mode
  }, []);

  const signOut = useCallback(async () => {
    // No-op in frontend-only simulation mode
  }, []);

  return { ...state, signInWithGoogle, signOut };
}

