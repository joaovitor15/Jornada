'use client';

import { useState, useEffect, useCallback } from 'react';
import { collectionGroup, query, where, getDocs } from 'firebase/firestore';
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
    console.error("Failed to read tags from localStorage", error);
    return [];
  }
};

const setCachedTags = (profileId: string, tags: string[]) => {
   if (typeof window === 'undefined') return;
   try {
    localStorage.setItem(`${TAG_CACHE_KEY}${profileId}`, JSON.stringify(tags));
  } catch (error) {
    console.error("Failed to write tags to localStorage", error);
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

    try {
      const tagSet = new Set<string>();
      const collectionsToSearch = ['expenses', 'incomes', 'plans', 'profiles'];

      for (const col of collectionsToSearch) {
        const q = query(
          collectionGroup(db, col),
          where('userId', '==', user.uid),
          where('profile', '==', activeProfile)
        );
        const snapshot = await getDocs(q);
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.tags && Array.isArray(data.tags)) {
            data.tags.forEach((tag: string) => tagSet.add(tag));
          }
        });
      }
      
      // Also check the specific profile document for pre-defined tags
      const profileDocQuery = query(collection(db, 'profiles'), where('id', '==', profileId));
      const profileSnap = await getDocs(profileDocQuery);
       if (!profileSnap.empty) {
        const profileData = profileSnap.docs[0].data();
        if (profileData.tags && Array.isArray(profileData.tags)) {
            profileData.tags.forEach((tag: string) => tagSet.add(tag));
        }
      }

      const allTags = Array.from(tagSet).sort();
      setTags(allTags);
      setCachedTags(profileId, allTags);
    } catch (error) {
      console.error('Failed to fetch tags from Firestore:', error);
      // Fallback to cache if firestore fails
      setTags(getCachedTags(profileId));
    } finally {
      setLoading(false);
    }
  }, [user, activeProfile]);

  useEffect(() => {
    if (user && activeProfile) {
        const profileId = `${user.uid}_${activeProfile}`;
        setTags(getCachedTags(profileId)); // Load from cache immediately
        fetchAndCacheTags(); // Then fetch fresh data
    }
  }, [user, activeProfile, fetchAndCacheTags]);

  return { tags, loading, refreshTags: fetchAndCacheTags };
}
