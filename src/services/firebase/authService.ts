import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';

// ─── Sign Up ──────────────────────────────────────────────────────────────────

export async function signUp(
  displayName: string,
  email: string,
  password: string,
): Promise<User> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const user = credential.user;

  // Set display name on the Auth profile
  await updateProfile(user, { displayName });

  // Write user doc to Firestore /users/{uid}
  await setDoc(doc(db, 'users', user.uid), {
    displayName,
    email,
    createdAt: serverTimestamp(),
    preferences: {
      defaultRadius: 100,
      discoveryMode: 'all',
    },
  });

  return user;
}

// ─── Sign In ──────────────────────────────────────────────────────────────────

export async function signIn(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

// ─── Sign Out ─────────────────────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

// ─── Auth state listener ──────────────────────────────────────────────────────

export function subscribeToAuthState(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

// ─── Friendly error messages ──────────────────────────────────────────────────

export function friendlyAuthError(code: string): string {
  const map: Record<string, string> = {
    'auth/invalid-email': 'That email address is not valid.',
    'auth/user-not-found': 'No account found with that email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/email-already-in-use': 'An account with that email already exists.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/too-many-requests': 'Too many attempts. Try again in a few minutes.',
    'auth/network-request-failed': 'Network error. Check your connection.',
  };
  return map[code] ?? 'Something went wrong. Please try again.';
}
