'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, query, where, onSnapshot, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import { HierarchicalTag, RawTag } from '@/lib/types';


export function useTags() {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const [rawTags, setRawTags] = useState<RawTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [usedTagNames, setUsedTagNames] = useState<Set<string>>(new Set());

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
      where('profile', '==', activeProfile),
      orderBy('order', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const tagsData = snapshot.docs.map(doc => doc.data() as RawTag);
        setRawTags(tagsData);

        // After fetching tags, find out which ones are used
        const collectionsToSearch = ['expenses', 'incomes', 'plans'];
        const allUsedTags = new Set<string>();

        for (const col of collectionsToSearch) {
          const usageQuery = query(
            collection(db, col),
            where('userId', '==', user.uid),
            where('profile', '==', activeProfile)
          );
          const usageSnapshot = await getDocs(usageQuery);
          usageSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.tags && Array.isArray(data.tags)) {
              data.tags.forEach(tag => allUsedTags.add(tag));
            }
          });
        }
        setUsedTagNames(allUsedTags);
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
  
  const hierarchicalTags = useMemo((): HierarchicalTag[] => {
    const principals = rawTags
      .filter((tag) => tag.isPrincipal)
      .map(
        (tag): HierarchicalTag => ({
          ...tag,
          children: [],
        })
      );

    const children = rawTags.filter((tag) => !tag.isPrincipal && tag.parent);
    const tagMap = new Map(principals.map((tag) => [tag.id, tag]));

    children.forEach((child) => {
      const parent = tagMap.get(child.parent!);
      if (parent) {
        parent.children.push(child);
      }
    });

    return Array.from(tagMap.values());
  }, [rawTags]);
  
  const tags = useMemo(() => {
    return rawTags.filter(tag => !tag.isArchived).map(tag => tag.name).sort();
  }, [rawTags]);


  return { rawTags, hierarchicalTags, tags, loading, usedTagNames, refreshTags: fetchTags };
}
