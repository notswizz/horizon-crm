import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const clientAuth = getAuth(app);

export async function signIn(email: string, password: string) {
  return signInWithEmailAndPassword(clientAuth, email, password);
}

export async function signUp(email: string, password: string) {
  return createUserWithEmailAndPassword(clientAuth, email, password);
}

export async function signOut() {
  return firebaseSignOut(clientAuth);
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(clientAuth, callback);
}
