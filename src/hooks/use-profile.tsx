'use client';

import { useContext } from 'react';
import {
  ProfileContext,
  type ProfileContextType,
} from '@/components/profile-provider';

export const useProfile = (): ProfileContextType => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};
