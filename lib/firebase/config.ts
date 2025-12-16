import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';

// Validate Firebase config
const getFirebaseConfig = () => {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  
  // Check if config is properly set (not placeholder values)
  const isConfigValid = 
    apiKey && 
    apiKey !== 'your-api-key-here' && 
    apiKey !== 'your-api-key' &&
    authDomain && 
    authDomain !== 'your-project.firebaseapp.com' &&
    authDomain !== 'your-auth-domain' &&
    projectId && 
    projectId !== 'your-project-id';
  
  if (!isConfigValid && typeof window !== 'undefined') {
    console.warn('Firebase config appears to be using placeholder values. Please update your .env.local file with your Firebase credentials.');
  }
  
  return {
    apiKey: apiKey,
    authDomain: authDomain,
    projectId: projectId,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
};

const firebaseConfig = getFirebaseConfig();

// Initialize Firebase
let appInstance: FirebaseApp = {} as FirebaseApp;
let dbInstance: Firestore = {} as Firestore;
let authInstance: Auth = {} as Auth;

// Only initialize on client side
if (typeof window !== 'undefined') {
  try {
    // Check if config is valid before initializing
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const isConfigValid = apiKey && 
      apiKey !== 'your-api-key-here' && 
      apiKey !== 'your-api-key';
    
    if (!isConfigValid) {
      console.warn('Firebase config not properly set. Using placeholder values.');
    }
    
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
        connectFirestoreEmulator(dbInstance, 'localhost', 8080);
        connectAuthEmulator(authInstance, 'http://localhost:9099');
      } catch (error) {
        // Emulators already connected, ignore error
        console.log('Firebase emulators already connected or not available');
      }
    }
  } catch (error) {
    console.error('Firebase initialization error:', error);
    // Variables already initialized with dummy values above
  }
}

export const db = dbInstance;
export const auth = authInstance;
export default appInstance;

