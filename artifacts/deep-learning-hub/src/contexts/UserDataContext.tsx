import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { GoalResponse, ConsumedItem, NutritionResponse } from '@/hooks/use-ml-api';

export interface LogItem extends ConsumedItem {
  nutrition: NutritionResponse;
  id: string;
  date: string;
}

interface UserData {
  goal: GoalResponse | null;
  log: LogItem[];
}

interface UserDataContextType {
  goal: GoalResponse | null;
  log: LogItem[];
  loadingData: boolean;
  updateGoal: (goal: GoalResponse) => Promise<void>;
  addLogItem: (item: Omit<LogItem, 'id' | 'date'>) => Promise<void>;
  removeLogItem: (id: string) => Promise<void>;
  clearDayLog: (date: string) => Promise<void>;
}

const UserDataContext = createContext<UserDataContextType | undefined>(undefined);

export function useUserData() {
  const context = useContext(UserDataContext);
  if (context === undefined) {
    throw new Error('useUserData must be used within a UserDataProvider');
  }
  return context;
}

export function UserDataProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  
  const [goal, setGoal] = useState<GoalResponse | null>(null);
  const [log, setLog] = useState<LogItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Firestore listener
  useEffect(() => {
    if (!currentUser) {
      setGoal(null);
      setLog([]);
      setLoadingData(false);
      return;
    }

    setLoadingData(true);
    const docRef = doc(db, 'users', currentUser.uid);
    
    // Listen to changes in realtime
    const unsubscribe = onSnapshot(docRef, (document) => {
      if (document.exists()) {
        const data = document.data() as UserData;
        setGoal(data.goal || null);
        
        // Prune logs older than 7 days automatically on read to keep array within size limits
        const nowMs = new Date().setHours(0,0,0,0);
        const prunedLogs = (data.log || []).filter(i => {
           if (!i.date) return true; // Keep malformed just in case
           const itemMs = new Date(i.date).setHours(0,0,0,0);
           const diffDays = (nowMs - itemMs) / (1000 * 60 * 60 * 24);
           return diffDays <= 7 && diffDays >= 0;
        });
        
        setLog(prunedLogs);
      } else {
        // Document doesn't exist yet
        setGoal(null);
        setLog([]);
      }
      setLoadingData(false);
    }, (error) => {
      console.error("Firestore Listen Error:", error);
      setLoadingData(false);
    });

    return unsubscribe;
  }, [currentUser]);

  // Mutations
  const saveToFirestore = async (newGoal: GoalResponse | null, newLog: LogItem[]) => {
    if (!currentUser) return;
    const docRef = doc(db, 'users', currentUser.uid);
    try {
      // Firebase throws if any field contains `undefined`. We deep clean via JSON parse/stringify.
      const cleanGoal = newGoal ? JSON.parse(JSON.stringify(newGoal)) : null;
      const cleanLog = newLog.length > 0 ? JSON.parse(JSON.stringify(newLog)) : [];
      await setDoc(docRef, { goal: cleanGoal, log: cleanLog }, { merge: true });
    } catch (e) {
      console.error("Error writing to Firestore:", e);
      throw e;
    }
  };

  const updateGoal = async (newGoal: GoalResponse) => {
    // Optimistic UI update
    setGoal(newGoal);
    await saveToFirestore(newGoal, log);
  };

  const addLogItem = async (item: Omit<LogItem, 'id' | 'date'>) => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    const newItem: LogItem = { ...item, id: crypto.randomUUID(), date: todayStr };
    const updatedLog = [...log, newItem];
    setLog(updatedLog);
    await saveToFirestore(goal, updatedLog);
  };

  const removeLogItem = async (id: string) => {
    const updatedLog = log.filter(i => i.id !== id);
    setLog(updatedLog);
    await saveToFirestore(goal, updatedLog);
  };

  const clearDayLog = async (date: string) => {
    const updatedLog = log.filter(i => i.date !== date);
    setLog(updatedLog);
    await saveToFirestore(goal, updatedLog);
  };

  const value = { goal, log, loadingData, updateGoal, addLogItem, removeLogItem, clearDayLog };

  return <UserDataContext.Provider value={value}>{children}</UserDataContext.Provider>;
}
