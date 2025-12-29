import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';

// Constants
const PLACEHOLDER_API_KEY_1 = 'your-api-key-here';
const PLACEHOLDER_API_KEY_2 = 'your-api-key';
const PLACEHOLDER_AUTH_DOMAIN_1 = 'your-project.firebaseapp.com';
const PLACEHOLDER_AUTH_DOMAIN_2 = 'your-auth-domain';
const PLACEHOLDER_PROJECT_ID = 'your-project-id';
const FIRESTORE_EMULATOR_PORT = 8080;
const AUTH_EMULATOR_PORT = 9099;
const AUTH_EMULATOR_HOST = 'localhost';
const FIRESTORE_EMULATOR_HOST = 'localhost';

/**
 * Validates Firebase configuration to ensure it's not using placeholder values
 */
const isFirebaseConfigValid = (
  apiKey: string | undefined,
  authDomain: string | undefined,
  projectId: string | undefined
): boolean => {
  return !!(
    apiKey && 
    apiKey !== PLACEHOLDER_API_KEY_1 && 
    apiKey !== PLACEHOLDER_API_KEY_2 &&
    authDomain && 
    authDomain !== PLACEHOLDER_AUTH_DOMAIN_1 &&
    authDomain !== PLACEHOLDER_AUTH_DOMAIN_2 &&
    projectId && 
    projectId !== PLACEHOLDER_PROJECT_ID
  );
};

/**
 * Gets Firebase configuration from environment variables
 */
const getFirebaseConfig = () => {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  
  const isValid = isFirebaseConfigValid(apiKey, authDomain, projectId);
  
  if (!isValid && typeof window !== 'undefined') {
    console.warn('Firebase config appears to be using placeholder values. Please update your .env.local file with your Firebase credentials.');
  }
  
  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
};

const firebaseConfig = getFirebaseConfig();

// Initialize Firebase
let appInstance: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;

// Only initialize on client side
if (typeof window !== 'undefined') {
  try {
    // Check if config is valid before initializing
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    
    const isValid = isFirebaseConfigValid(apiKey, authDomain, projectId);
    
    if (!isValid) {
      console.warn('Firebase config not properly set. Skipping Firebase initialization.');
      // Don't initialize Firebase if config is invalid
    } else {
    // Check if Firebase is already initialized
    if (!getApps().length) {
      appInstance = initializeApp(firebaseConfig);
    } else {
      appInstance = getApps()[0];
    }
    
    // Initialize Firestore
    dbInstance = getFirestore(appInstance);
    
    // Initialize Auth
    authInstance = getAuth(appInstance);
    
    // Connect to emulators in development if needed
    // Note: Only connect once, check if already connected
    if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
      try {
        if (dbInstance && authInstance) {
          connectFirestoreEmulator(dbInstance, FIRESTORE_EMULATOR_HOST, FIRESTORE_EMULATOR_PORT);
          connectAuthEmulator(authInstance, `http://${AUTH_EMULATOR_HOST}:${AUTH_EMULATOR_PORT}`);
        }
      } catch (error) {
        // Emulators already connected, ignore error
        console.log('Firebase emulators already connected or not available');
      }
    }
    }
  } catch (error) {
    console.error('Firebase initialization error:', error);
    // Keep instances as null on error
    appInstance = null;
    dbInstance = null;
    authInstance = null;
  }
}

// Helper function to check if Firebase is initialized
export const isFirebaseInitialized = (): boolean => {
  return authInstance !== null && dbInstance !== null && appInstance !== null;
};

export const db = dbInstance;
export const auth = authInstance;
export default appInstance;

