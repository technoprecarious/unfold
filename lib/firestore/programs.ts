import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';
import { db, auth, isFirebaseInitialized } from '../firebase/config';
import { Program } from '../types/types';
import { generateId } from '../utils/idGenerator';
import { removeUndefined } from './utils';

const getProgramsCollection = (uid: string) => {
  if (!db) throw new Error('Firebase not initialized');
  return collection(db, `users/${uid}/programs`);
};

export const getPrograms = async (): Promise<Program[]> => {
  if (!isFirebaseInitialized() || !db) throw new Error('Firebase not initialized');
  const user = auth?.currentUser || null;
  if (!user) throw new Error('User not authenticated');
  
  const programsCollection = getProgramsCollection(user.uid);
  const snapshot = await getDocs(programsCollection);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
    updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt,
  })) as Program[];
};

export const getProgram = async (programId: string): Promise<Program | null> => {
  if (!isFirebaseInitialized() || !db) throw new Error('Firebase not initialized');
  const user = auth?.currentUser || null;
  if (!user) throw new Error('User not authenticated');
  
  const programDoc = doc(db, `users/${user.uid}/programs/${programId}`);
  const snapshot = await getDoc(programDoc);
  
  if (!snapshot.exists()) return null;
  
  const data = snapshot.data();
  return {
    id: snapshot.id,
    ...data,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
  } as Program;
};

export const createProgram = async (programData: Omit<Program, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  if (!isFirebaseInitialized() || !db) throw new Error('Firebase not initialized');
  const user = auth?.currentUser || null;
  if (!user) throw new Error('User not authenticated');
  
  const programId = generateId();
  const programDoc = doc(db, `users/${user.uid}/programs/${programId}`);
  const now = new Date().toISOString();
  
  const cleanedData = removeUndefined({
    ...programData,
    createdAt: now,
    updatedAt: now,
  });
  
  await setDoc(programDoc, cleanedData);
  
  return programId;
};

export const updateProgram = async (programId: string, updates: Partial<Omit<Program, 'id' | 'createdAt'>>): Promise<void> => {
  if (!isFirebaseInitialized() || !db) throw new Error('Firebase not initialized');
  const user = auth?.currentUser || null;
  if (!user) throw new Error('User not authenticated');
  
  const programDoc = doc(db, `users/${user.uid}/programs/${programId}`);
  
  // Check if document exists
  const docSnapshot = await getDoc(programDoc);
  const cleanedUpdates = removeUndefined({
    ...updates,
    updatedAt: new Date().toISOString(),
  });
  
  if (!docSnapshot.exists()) {
    // Document doesn't exist - create it with setDoc
    console.warn(`updateProgram - Document does not exist, creating new document: ${programId}`);
    const now = new Date().toISOString();
    await setDoc(programDoc, {
      ...cleanedUpdates,
      createdAt: now,
    });
  } else {
    // Document exists - update it
    await updateDoc(programDoc, cleanedUpdates);
  }
};

export const deleteProgram = async (programId: string): Promise<void> => {
  if (!isFirebaseInitialized() || !db) throw new Error('Firebase not initialized');
  const user = auth?.currentUser || null;
  if (!user) throw new Error('User not authenticated');
  
  const programDoc = doc(db, `users/${user.uid}/programs/${programId}`);
  console.log(`Firestore: Deleting program document at users/${user.uid}/programs/${programId}`);
  await deleteDoc(programDoc);
  console.log(`Firestore: Successfully deleted program document`);
};


