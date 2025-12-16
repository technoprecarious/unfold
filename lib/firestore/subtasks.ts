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
import { Subtask } from '../types/types';
import { generateId } from '../utils/idGenerator';
import { removeUndefined } from './utils';

const getSubtasksCollection = (uid: string) => {
  if (!db) throw new Error('Firebase not initialized');
  return collection(db, `users/${uid}/subtasks`);
};

export const getSubtasks = async (parentId?: string): Promise<Subtask[]> => {
  if (!isFirebaseInitialized() || !db) throw new Error('Firebase not initialized');
  const user = auth?.currentUser || null;
  if (!user) throw new Error('User not authenticated');
  
  const subtasksCollection = getSubtasksCollection(user.uid);
  let q = query(subtasksCollection);
  
  if (parentId) {
    q = query(subtasksCollection, where('parentId', '==', parentId));
  }
  
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
    updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt,
  })) as Subtask[];
};

export const getSubtask = async (subtaskId: string): Promise<Subtask | null> => {
  if (!isFirebaseInitialized() || !db) throw new Error('Firebase not initialized');
  const user = auth?.currentUser || null;
  if (!user) throw new Error('User not authenticated');
  
  const subtaskDoc = doc(db, `users/${user.uid}/subtasks/${subtaskId}`);
  const snapshot = await getDoc(subtaskDoc);
  
  if (!snapshot.exists()) return null;
  
  const data = snapshot.data();
  return {
    id: snapshot.id,
    ...data,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
  } as Subtask;
};

export const createSubtask = async (subtaskData: Omit<Subtask, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  if (!isFirebaseInitialized() || !db) throw new Error('Firebase not initialized');
  const user = auth?.currentUser || null;
  if (!user) throw new Error('User not authenticated');
  
  const subtaskId = generateId();
  const subtaskDoc = doc(db, `users/${user.uid}/subtasks/${subtaskId}`);
  const now = new Date().toISOString();
  
  const cleanedData = removeUndefined({
    ...subtaskData,
    createdAt: now,
    updatedAt: now,
  });
  
  await setDoc(subtaskDoc, cleanedData);
  
  return subtaskId;
};

export const updateSubtask = async (subtaskId: string, updates: Partial<Omit<Subtask, 'id' | 'createdAt'>>): Promise<void> => {
  if (!isFirebaseInitialized() || !db) throw new Error('Firebase not initialized');
  const user = auth?.currentUser || null;
  if (!user) throw new Error('User not authenticated');
  
  const subtaskDoc = doc(db, `users/${user.uid}/subtasks/${subtaskId}`);
  
  // Check if document exists
  const docSnapshot = await getDoc(subtaskDoc);
  const cleanedUpdates = removeUndefined({
    ...updates,
    updatedAt: new Date().toISOString(),
  });
  
  if (!docSnapshot.exists()) {
    // Document doesn't exist - create it with setDoc
    console.warn(`updateSubtask - Document does not exist, creating new document: ${subtaskId}`);
    const now = new Date().toISOString();
    await setDoc(subtaskDoc, {
      ...cleanedUpdates,
      createdAt: now,
    });
  } else {
    // Document exists - update it
    await updateDoc(subtaskDoc, cleanedUpdates);
  }
};

export const deleteSubtask = async (subtaskId: string): Promise<void> => {
  if (!isFirebaseInitialized() || !db) throw new Error('Firebase not initialized');
  const user = auth?.currentUser || null;
  if (!user) throw new Error('User not authenticated');
  
  const subtaskDoc = doc(db, `users/${user.uid}/subtasks/${subtaskId}`);
  console.log(`Firestore: Deleting subtask document at users/${user.uid}/subtasks/${subtaskId}`);
  await deleteDoc(subtaskDoc);
  console.log(`Firestore: Successfully deleted subtask document`);
};


