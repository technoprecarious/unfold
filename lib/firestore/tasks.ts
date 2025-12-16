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
import { Task } from '../types/types';
import { generateId } from '../utils/idGenerator';
import { removeUndefined } from './utils';

const getTasksCollection = (uid: string) => {
  if (!db) throw new Error('Firebase not initialized');
  return collection(db, `users/${uid}/tasks`);
};

export const getTasks = async (parentId?: string): Promise<Task[]> => {
  if (!isFirebaseInitialized() || !db) throw new Error('Firebase not initialized');
  const user = auth?.currentUser || null;
  if (!user) throw new Error('User not authenticated');
  
  const tasksCollection = getTasksCollection(user.uid);
  let q = query(tasksCollection);
  
  if (parentId) {
    q = query(tasksCollection, where('parentId', '==', parentId));
  }
  
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
    updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt,
  })) as Task[];
};

export const getTask = async (taskId: string): Promise<Task | null> => {
  if (!isFirebaseInitialized() || !db) throw new Error('Firebase not initialized');
  const user = auth?.currentUser || null;
  if (!user) throw new Error('User not authenticated');
  
  const taskDoc = doc(db, `users/${user.uid}/tasks/${taskId}`);
  const snapshot = await getDoc(taskDoc);
  
  if (!snapshot.exists()) return null;
  
  const data = snapshot.data();
  return {
    id: snapshot.id,
    ...data,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
  } as Task;
};

export const createTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  if (!isFirebaseInitialized() || !db) throw new Error('Firebase not initialized');
  const user = auth?.currentUser || null;
  if (!user) throw new Error('User not authenticated');
  
  const taskId = generateId();
  const taskDoc = doc(db, `users/${user.uid}/tasks/${taskId}`);
  const now = new Date().toISOString();
  
  const cleanedData = removeUndefined({
    ...taskData,
    createdAt: now,
    updatedAt: now,
  });
  
  await setDoc(taskDoc, cleanedData);
  
  return taskId;
};

export const updateTask = async (taskId: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>): Promise<void> => {
  if (!isFirebaseInitialized() || !db) throw new Error('Firebase not initialized');
  const user = auth?.currentUser || null;
  if (!user) throw new Error('User not authenticated');
  
  console.log('🟠 updateTask - updates received:', JSON.stringify(updates, null, 2));
  console.log('🟠 updateTask - timeframe in updates:', updates.timeframe);
  
  const taskDoc = doc(db, `users/${user.uid}/tasks/${taskId}`);
  
  // Check if document exists
  const docSnapshot = await getDoc(taskDoc);
  const cleanedUpdates = removeUndefined({
    ...updates,
    updatedAt: new Date().toISOString(),
  });
  
  console.log('🟠 updateTask - cleanedUpdates:', JSON.stringify(cleanedUpdates, null, 2));
  console.log('🟠 updateTask - timeframe in cleanedUpdates:', cleanedUpdates.timeframe);
  
  if (!docSnapshot.exists()) {
    // Document doesn't exist - create it with setDoc
    console.warn(`🟡 updateTask - Document does not exist, creating new document: ${taskId}`);
    const now = new Date().toISOString();
    await setDoc(taskDoc, {
      ...cleanedUpdates,
      createdAt: now,
    });
    console.log('🟢 updateTask - Firestore setDoc completed (document created)');
  } else {
    // Document exists - update it
    await updateDoc(taskDoc, cleanedUpdates);
    console.log('🟢 updateTask - Firestore updateDoc completed');
  }
};

export const deleteTask = async (taskId: string): Promise<void> => {
  if (!isFirebaseInitialized() || !db) throw new Error('Firebase not initialized');
  const user = auth?.currentUser || null;
  if (!user) throw new Error('User not authenticated');
  
  const taskDoc = doc(db, `users/${user.uid}/tasks/${taskId}`);
  console.log(`Firestore: Deleting task document at users/${user.uid}/tasks/${taskId}`);
  await deleteDoc(taskDoc);
  console.log(`Firestore: Successfully deleted task document`);
};


