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
import { Project } from '../types/types';
import { generateId } from '../utils/idGenerator';
import { removeUndefined } from './utils';

const getProjectsCollection = (uid: string) => {
  if (!db) throw new Error('Firebase not initialized');
  return collection(db, `users/${uid}/projects`);
};

export const getProjects = async (parentId?: string): Promise<Project[]> => {
  if (!isFirebaseInitialized() || !db) throw new Error('Firebase not initialized');
  const user = auth?.currentUser || null;
  if (!user) throw new Error('User not authenticated');
  
  const projectsCollection = getProjectsCollection(user.uid);
  let q = query(projectsCollection);
  
  if (parentId) {
    q = query(projectsCollection, where('parentId', '==', parentId));
  }
  
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
    updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt,
  })) as Project[];
};

export const getProject = async (projectId: string): Promise<Project | null> => {
  if (!isFirebaseInitialized() || !db) throw new Error('Firebase not initialized');
  const user = auth?.currentUser || null;
  if (!user) throw new Error('User not authenticated');
  
  const projectDoc = doc(db, `users/${user.uid}/projects/${projectId}`);
  const snapshot = await getDoc(projectDoc);
  
  if (!snapshot.exists()) return null;
  
  const data = snapshot.data();
  return {
    id: snapshot.id,
    ...data,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
  } as Project;
};

export const createProject = async (projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  if (!isFirebaseInitialized() || !db) throw new Error('Firebase not initialized');
  const user = auth?.currentUser || null;
  if (!user) throw new Error('User not authenticated');
  
  const projectId = generateId();
  const projectDoc = doc(db, `users/${user.uid}/projects/${projectId}`);
  const now = new Date().toISOString();
  
  const cleanedData = removeUndefined({
    ...projectData,
    createdAt: now,
    updatedAt: now,
  });
  
  await setDoc(projectDoc, cleanedData);
  
  return projectId;
};

export const updateProject = async (projectId: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>): Promise<void> => {
  if (!isFirebaseInitialized() || !db) throw new Error('Firebase not initialized');
  const user = auth?.currentUser || null;
  if (!user) throw new Error('User not authenticated');
  
  const projectDoc = doc(db, `users/${user.uid}/projects/${projectId}`);
  
  // Check if document exists
  const docSnapshot = await getDoc(projectDoc);
  const cleanedUpdates = removeUndefined({
    ...updates,
    updatedAt: new Date().toISOString(),
  });
  
  if (!docSnapshot.exists()) {
    // Document doesn't exist - create it with setDoc
    console.warn(`updateProject - Document does not exist, creating new document: ${projectId}`);
    const now = new Date().toISOString();
    await setDoc(projectDoc, {
      ...cleanedUpdates,
      createdAt: now,
    });
  } else {
    // Document exists - update it
    await updateDoc(projectDoc, cleanedUpdates);
  }
};

export const deleteProject = async (projectId: string): Promise<void> => {
  if (!isFirebaseInitialized() || !db) throw new Error('Firebase not initialized');
  const user = auth?.currentUser || null;
  if (!user) throw new Error('User not authenticated');
  
  const projectDoc = doc(db, `users/${user.uid}/projects/${projectId}`);
  console.log(`Firestore: Deleting project document at users/${user.uid}/projects/${projectId}`);
  await deleteDoc(projectDoc);
  console.log(`Firestore: Successfully deleted project document`);
};


