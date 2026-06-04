// lib/hooks/useAuth.ts
"use client";

import { useEffect, useState, useCallback } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  User,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, googleProvider } from "@/lib/firebase/client";
import { UserDocument } from "@/types/firestore";
import { useRouter } from "next/navigation";

interface AuthState {
  user: User | null;
  userDoc: UserDocument | null;
  loading: boolean;
  isAdmin: boolean;
  onboardingComplete: boolean;
}

export function useAuth(): AuthState & {
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
} {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    userDoc: null,
    loading: true,
    isAdmin: false,
    onboardingComplete: false,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        document.cookie = "__session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure";
        setState({ user: null, userDoc: null, loading: false, isAdmin: false, onboardingComplete: false });
        return;
      }

      try {
        const token = await user.getIdToken();
        document.cookie = `__session=${token}; path=/; max-age=31536000; SameSite=Lax; Secure`;
      } catch {
        document.cookie = `__session=true; path=/; max-age=31536000; SameSite=Lax; Secure`;
      }

      // Fetch user document from Firestore
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const userDoc = docSnap.data() as UserDocument;
        setState({
          user,
          userDoc,
          loading: false,
          isAdmin: userDoc.role === "admin",
          onboardingComplete: userDoc.onboardingComplete,
        });
      } else {
        // New user — create skeleton document, redirect to onboarding
        await setDoc(docRef, {
          uid: user.uid,
          email: user.email ?? "",
          nickname: "",
          avatarSeed: "",
          avatarStyle: "bottts",
          role: "user",
          onboardingComplete: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          activeTournamentIds: [],
        });

        setState({
          user,
          userDoc: null,
          loading: false,
          isAdmin: false,
          onboardingComplete: false,
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Google sign-in error:", err);
    }
  }, []);

  const signOut = useCallback(async () => {
    document.cookie = "__session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure";
    await firebaseSignOut(auth);
    router.push("/");
  }, [router]);

  return { ...state, signInWithGoogle, signOut };
}
