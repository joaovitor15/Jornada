
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, query, where, onSnapshot, getDocs, orderBy, writeBatch, doc } from 'firebase/firestore';
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

  const refreshTags = useCallback(() => {
    if (!user || !activeProfile) {
      setRawTags([]);
      setLoading(false);
      return;
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
        
        // Garantir que a ordem está correta
        tagsData.sort((a, b) => (a.order || 0) - (b.order || 0));

        setRawTags(tagsData);

        const collectionsToSearch = ['expenses', 'incomes', 'plans'];
        const allUsedTags = new Set<string>();

        // Search in 'tags' array
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
        
        // Search in 'paymentMethod' field for expenses
        const expensePaymentMethodQuery = query(
          collection(db, 'expenses'),
          where('userId', '==', user.uid),
          where('profile', '==', activeProfile)
        );
        const expenseSnapshot = await getDocs(expensePaymentMethodQuery);
        expenseSnapshot.forEach(doc => {
            const expense = doc.data();
            if (expense.paymentMethod) {
                const paymentTag = expense.paymentMethod.startsWith('Cartão: ') 
                    ? expense.paymentMethod.replace('Cartão: ', '') 
                    : expense.paymentMethod;
                allUsedTags.add(paymentTag);
            }
        });

        // Search in 'cardId' for billPayments to get card name
        const billPaymentQuery = query(
          collection(db, 'billPayments'),
           where('userId', '==', user.uid),
           where('profile', '==', activeProfile)
        );
        const billPaymentSnapshot = await getDocs(billPaymentQuery);
        const cardIdsInUse = new Set<string>();
        billPaymentSnapshot.forEach(doc => cardIdsInUse.add(doc.data().cardId));

        if (cardIdsInUse.size > 0) {
            const cardsQuery = query(collection(db, 'cards'), where('userId', '==', user.uid), where('profile', '==', activeProfile));
            const cardsSnapshot = await getDocs(cardsQuery);
            cardsSnapshot.forEach(doc => {
                if (cardIdsInUse.has(doc.id)) {
                    allUsedTags.add(doc.data().name);
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
    const unsubscribe = refreshTags();
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [refreshTags]);
  
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

    return Array.from(tagMap.values()).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [rawTags]);
  
  
  const updateTagOrder = async (orderedPrincipalTagIds: string[]) => {
    const batch = writeBatch(db);
    orderedPrincipalTagIds.forEach((tagId, index) => {
      const tagRef = doc(db, 'tags', tagId);
      batch.update(tagRef, { order: index });
    });
    await batch.commit();
    refreshTags(); 
  };


  return { rawTags, hierarchicalTags, loading, usedTagNames, refreshTags, updateTagOrder };
}
