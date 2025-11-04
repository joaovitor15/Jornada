
'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAuth } from './use-auth';
import { useProfile } from './use-profile';
import { type Card } from '@/lib/types';

export function useCards() {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !activeProfile) {
      setLoading(false);
      setCards([]);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, 'cards'),
      where('userId', '==', user.uid),
      where('profile', '==', activeProfile)
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const userCards = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Card[];
        setCards(userCards);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching cards: ', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, activeProfile]);

  return { cards, loading };
}
