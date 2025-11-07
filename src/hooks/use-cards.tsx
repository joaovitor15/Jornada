
'use client';

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, getDocs, orderBy } from 'firebase/firestore';
import { useAuth } from './use-auth';
import { useProfile } from './use-profile';
import { type Card } from '@/lib/types';

export function useCards() {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [usedCardNames, setUsedCardNames] = useState<Set<string>>(new Set());

  const refreshCards = useCallback(() => {
    if (!user || !activeProfile) {
      setCards([]);
      setUsedCardNames(new Set());
      setLoading(false);
      return () => {};
    }

    setLoading(true);
    const q = query(
      collection(db, 'cards'),
      where('userId', '==', user.uid),
      where('profile', '==', activeProfile),
      orderBy('name', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      async (querySnapshot) => {
        const userCards = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Card[];
        setCards(userCards);

        // Check for usage in expenses
        const expensesQuery = query(
            collection(db, 'expenses'),
            where('userId', '==', user.uid),
            where('profile', '==', activeProfile)
        );
        const expensesSnapshot = await getDocs(expensesQuery);
        const namesInUse = new Set<string>();
        expensesSnapshot.forEach(doc => {
            const expense = doc.data();
            if (expense.paymentMethod?.startsWith('Cartão: ')) {
                namesInUse.add(expense.paymentMethod.replace('Cartão: ', ''));
            }
        });
        setUsedCardNames(namesInUse);

        setLoading(false);
      },
      (error) => {
        console.error('Error fetching cards: ', error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user, activeProfile]);

  useEffect(() => {
    const unsubscribe = refreshCards();
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [refreshCards]);

  return { cards, loading, usedCardNames, refreshCards };
}
