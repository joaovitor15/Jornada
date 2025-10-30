'use client';

import {
  createContext,
  useState,
  useEffect,
  ReactNode,
  Dispatch,
  SetStateAction,
} from 'react';
import type { Profile } from '@/lib/types';

const PROFILE_STORAGE_KEY = 'jornada-active-profile';

export interface ProfileContextType {
  activeProfile: Profile;
  setActiveProfile: Dispatch<SetStateAction<Profile>>;
}

export const ProfileContext = createContext<ProfileContextType | undefined>(
  undefined
);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [activeProfile, setActiveProfile] = useState<Profile>(() => {
    if (typeof window !== 'undefined') {
      try {
        const item = window.localStorage.getItem(PROFILE_STORAGE_KEY);
        return (item ? item : 'Personal') as Profile;
      } catch (error) {
        console.error('Failed to read from localStorage', error);
        return 'Personal';
      }
    }
    return 'Personal';
  });
  
  useEffect(() => {
    try {
      window.localStorage.setItem(PROFILE_STORAGE_KEY, activeProfile);
    } catch (error) {
       console.error('Failed to write to localStorage', error);
    }
  }, [activeProfile]);


  const value = { activeProfile, setActiveProfile };

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
}
