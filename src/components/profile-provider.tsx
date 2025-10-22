'use client';

import {
  createContext,
  useState,
  ReactNode,
  Dispatch,
  SetStateAction,
} from 'react';
import type { Profile } from '@/lib/types';

export interface ProfileContextType {
  activeProfile: Profile;
  setActiveProfile: Dispatch<SetStateAction<Profile>>;
}

export const ProfileContext = createContext<ProfileContextType | undefined>(
  undefined
);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [activeProfile, setActiveProfile] = useState<Profile>('Personal');

  const value = { activeProfile, setActiveProfile };

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
}
