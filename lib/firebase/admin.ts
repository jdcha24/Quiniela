// lib/firebase/admin.ts
// Firebase Admin SDK — server-side only, never import in client components
// Uses lazy initialization to avoid errors during Next.js build phase

import type { App } from "firebase-admin/app";
import type { NextRequest } from "next/server";

let adminApp: App | undefined;
let _db: FirebaseFirestore.Firestore | undefined;
let _adminAuth: import("firebase-admin/auth").Auth | undefined;

function getAdminApp(): App {
  if (adminApp) return adminApp;

  // Avoid initialization during Next.js build — credentials aren't available then
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const projectId = process.env.FIREBASE_PROJECT_ID ?? "quiniela-2d83c";

  if (!privateKey || !clientEmail) {
    throw new Error(
      "Firebase Admin credentials missing. Set FIREBASE_PRIVATE_KEY and FIREBASE_CLIENT_EMAIL in .env.local"
    );
  }

  const { initializeApp, getApps, cert } = require("firebase-admin/app");

  if (getApps().length > 0) {
    adminApp = getApps()[0];
    return adminApp!;
  }

  adminApp = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });

  return adminApp!;
}

/**
 * Lazily get Firestore Admin instance.
 */
export function getDb(): FirebaseFirestore.Firestore {
  if (_db) return _db;
  const { getFirestore } = require("firebase-admin/firestore");
  _db = getFirestore(getAdminApp());
  return _db!;
}

/**
 * Lazily get Firebase Auth Admin instance.
 */
export function getAdminAuth(): import("firebase-admin/auth").Auth {
  if (_adminAuth) return _adminAuth;
  const { getAuth } = require("firebase-admin/auth");
  _adminAuth = getAuth(getAdminApp());
  return _adminAuth!;
}

// Convenience proxy — same API as before but lazy
export const db = new Proxy({} as FirebaseFirestore.Firestore, {
  get(_target, prop) {
    return (getDb() as never)[prop as keyof FirebaseFirestore.Firestore];
  },
});

export const adminAuth = new Proxy(
  {} as import("firebase-admin/auth").Auth,
  {
    get(_target, prop) {
      return (getAdminAuth() as never)[prop as keyof import("firebase-admin/auth").Auth];
    },
  }
);

/**
 * Verify the Firebase ID token from the Authorization header.
 */
export async function verifyAuthToken(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing or invalid Authorization header");
  }
  const token = authHeader.slice(7);
  return getAdminAuth().verifyIdToken(token);
}

/**
 * Verify the user is an admin by checking their Firestore role.
 */
export async function verifyAdminSession(req: NextRequest) {
  const decodedToken = await verifyAuthToken(req);
  const userDoc = await getDb().collection("users").doc(decodedToken.uid).get();

  if (!userDoc.exists || userDoc.data()?.role !== "admin") {
    throw new Error("Forbidden: admin access required");
  }

  return decodedToken;
}
