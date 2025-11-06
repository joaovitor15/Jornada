'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import { RawTag } from '@/lib/types';


export function useTags() {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const [rawTags, setRawTags] = useState<RawTag[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTags = useCallback(() => {
    if (!user || !activeProfile) {
      setRawTags([]);
      setLoading(false);
      return () => {};
    }

    setLoading(true);
    const q = query(
      collection(db, 'tags'),
      where('userId', '==', user.uid),
      where('profile', '==', activeProfile)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const tagsData = snapshot.docs.map(doc => doc.data() as RawTag);
        setRawTags(tagsData);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching tags:", error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user, activeProfile]);

  useEffect(() => {
    const unsubscribe = fetchTags();
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [fetchTags]);

  return { rawTags, loading, refreshTags: fetchTags };
}
