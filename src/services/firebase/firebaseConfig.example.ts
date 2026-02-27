/**
 * Firebase configuration template.
 *
 * SETUP INSTRUCTIONS:
 * 1. Go to https://console.firebase.google.com
 * 2. Create a project named "wavelength"
 * 3. Go to Project Settings → Your Apps → Add App → Web (</>)
 * 4. Register the app, copy the firebaseConfig object
 * 5. Copy this file to firebaseConfig.ts  (gitignored — never commit real keys)
 * 6. Replace every placeholder value with your real values
 *
 * firebaseConfig.ts is in .gitignore — safe to put real keys there.
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT_ID.appspot.com',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_APP_ID',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
