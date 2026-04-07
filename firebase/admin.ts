import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const apps = getApps();

if (!apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      `Firebase Admin credentials missing. Check your .env.local file.\n` +
        `projectId: ${projectId ? "✓" : "✗"}\n` +
        `clientEmail: ${clientEmail ? "✓" : "✗"}\n` +
        `privateKey: ${privateKey ? "✓" : "✗"}`
    );
  }

  initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

export const adminAuth = getAuth();
export const adminDb = getFirestore();
