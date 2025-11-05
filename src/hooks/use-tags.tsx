'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';

const TAG_CACHE_KEY = 'cached_tags_';

const getCachedTags = (profileId: string): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const cached = localStorage.getItem(`${TAG_CACHE_KEY}${profileId}`);
    return cached ? JSON.parse(cached) : [];
  } catch (error) {
    console.error('Failed to read tags from localStorage', error);
    return [];
  }
};

const setCachedTags = (profileId: string, tags: string[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${TAG_CACHE_KEY}${profileId}`, JSON.stringify(tags));
  } catch (error) {
    console.error('Failed to write tags to localStorage', error);
  }
};

export function useTags() {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAndCacheTags = useCallback(async () => {
    if (!user || !activeProfile) {
      setTags([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const profileId = `${user.uid}_${activeProfile}`;
    const profileDocRef = doc(db, 'profiles', profileId);

    const unsubscribe = onSnapshot(
      profileDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const profileData = docSnap.data();
          const fetchedTags = (profileData.tags || []).sort();
          setTags(fetchedTags);
          setCachedTags(profileId, fetchedTags);
        } else {
          // Document doesn't exist, likely new user/profile
          setTags([]);
          setCachedTags(profileId, []);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Failed to fetch tags from Firestore:', error);
        // Fallback to cache on error
        setTags(getCachedTags(profileId));
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, activeProfile]);

  useEffect(() => {
    if (user && activeProfile) {
      const profileId = `${user.uid}_${activeProfile}`;
      const cached = getCachedTags(profileId);
      if (cached.length > 0) {
        setTags(cached);
        setLoading(false);
      }
      fetchAndCacheTags();
    }
  }, [user, activeProfile, fetchAndCacheTags]);

  return { tags, loading, refreshTags: fetchAndCacheTags };
}
