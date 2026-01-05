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
import { 
  validateTitle, 
  validateDescription, 
  validateNotes,
  sanitizeInput,
  validateStringLength,
  MAX_LENGTHS,
  isValidPriority,
  isValidStatusPrimary,
  isValidRecurrenceType,
  validateStringArray,
  isValidISODate,
} from '../utils/validation';

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
  
  // Validate and sanitize input
  const validatedTitle = validateTitle(programData.title);
  if (!validatedTitle) {
    throw new Error('Title is required and must be a valid string');
  }
  
  if (programData.description && !validateStringLength(programData.description, MAX_LENGTHS.DESCRIPTION)) {
    throw new Error(`Description must be ${MAX_LENGTHS.DESCRIPTION} characters or less`);
  }
  
  if (programData.notes && !validateStringLength(programData.notes, MAX_LENGTHS.NOTES)) {
    throw new Error(`Notes must be ${MAX_LENGTHS.NOTES} characters or less`);
  }
  
  if (programData.priority && !isValidPriority(programData.priority)) {
    throw new Error('Invalid priority value');
  }
  
  if (programData.status && !isValidStatusPrimary(programData.status)) {
    throw new Error('Invalid status value');
  }
  
  if (programData.recurrence?.type && !isValidRecurrenceType(programData.recurrence.type)) {
    throw new Error('Invalid recurrence type');
  }
  
  if (programData.tags && !validateStringArray(programData.tags, MAX_LENGTHS.MAX_TAGS)) {
    throw new Error(`Tags must be an array with at most ${MAX_LENGTHS.MAX_TAGS} items`);
  }
  
  if (programData.resources && !validateStringArray(programData.resources, MAX_LENGTHS.MAX_RESOURCES)) {
    throw new Error(`Resources must be an array with at most ${MAX_LENGTHS.MAX_RESOURCES} items`);
  }
  
  if (programData.timeframe) {
    if (programData.timeframe.start && !isValidISODate(programData.timeframe.start)) {
      throw new Error('Invalid start date format');
    }
    if (programData.timeframe.deadline && !isValidISODate(programData.timeframe.deadline)) {
      throw new Error('Invalid deadline date format');
    }
    if (programData.timeframe.targetEnd && !isValidISODate(programData.timeframe.targetEnd)) {
      throw new Error('Invalid target end date format');
    }
    if (programData.timeframe.actualEnd && !isValidISODate(programData.timeframe.actualEnd)) {
      throw new Error('Invalid actual end date format');
    }
  }
  
  const programId = generateId();
  const programDoc = doc(db, `users/${user.uid}/programs/${programId}`);
  const now = new Date().toISOString();
  
  // Sanitize string fields
  const sanitizedData = {
    ...programData,
    title: validatedTitle,
    description: programData.description ? sanitizeInput(programData.description) : undefined,
    notes: programData.notes ? sanitizeInput(programData.notes) : undefined,
    category: programData.category ? sanitizeInput(programData.category).slice(0, MAX_LENGTHS.CATEGORY) : undefined,
    objective: programData.objective ? sanitizeInput(programData.objective).slice(0, MAX_LENGTHS.OBJECTIVE) : undefined,
    tags: programData.tags ? programData.tags.map(tag => sanitizeInput(tag).slice(0, MAX_LENGTHS.TAG)) : undefined,
    resources: programData.resources ? programData.resources.map(res => sanitizeInput(res).slice(0, MAX_LENGTHS.TAG)) : undefined,
  };
  
  const cleanedData = removeUndefined({
    ...sanitizedData,
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
  await deleteDoc(programDoc);
};


