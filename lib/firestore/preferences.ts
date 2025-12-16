import { doc, getDoc, setDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db, auth } from '../firebase/config';

export type ColumnKey = 'priority' | 'time' | 'status' | 'parent' | 'tag' | 'recurrence';
export type ThemeMode = 'dark' | 'light'; // Added for theme preference

export interface UserPreferences {
  columnOrder: ColumnKey[];
  theme: ThemeMode; // Added for theme preference
}

const DEFAULT_PREFERENCES: UserPreferences = {
  columnOrder: ['priority', 'time', 'status'],
  theme: 'dark', // Default theme
};

const getPreferencesDoc = (uid: string) => doc(db, `users/${uid}/preferences/settings`);

export const getUserPreferences = async (): Promise<UserPreferences> => {
  const user = auth.currentUser;
  if (!user) return DEFAULT_PREFERENCES;
  
  try {
    const prefDoc = await getDoc(getPreferencesDoc(user.uid));
    if (prefDoc.exists()) {
      const data = prefDoc.data();
      return {
        columnOrder: data.columnOrder || DEFAULT_PREFERENCES.columnOrder,
        theme: data.theme || DEFAULT_PREFERENCES.theme, // Read theme
      };
    }
  } catch (error) {
    console.error('Error loading preferences:', error);
  }
  
  return DEFAULT_PREFERENCES;
};

export const updateUserPreferences = async (preferences: Partial<UserPreferences>): Promise<void> => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  
  const prefDoc = getPreferencesDoc(user.uid);
  const currentPrefs = await getUserPreferences();
  
  await setDoc(prefDoc, {
    ...currentPrefs,
    ...preferences,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
};

export const subscribeToUserPreferences = (
  callback: (preferences: UserPreferences) => void
): Unsubscribe | null => {
  const user = auth.currentUser;
  if (!user) return null;
  
  const prefDoc = getPreferencesDoc(user.uid);
  
  return onSnapshot(prefDoc, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      callback({
        columnOrder: data.columnOrder || DEFAULT_PREFERENCES.columnOrder,
        theme: data.theme || DEFAULT_PREFERENCES.theme,
      });
    } else {
      callback(DEFAULT_PREFERENCES);
    }
  }, (error) => {
    console.error('Error listening to preferences:', error);
    callback(DEFAULT_PREFERENCES);
  });
};

