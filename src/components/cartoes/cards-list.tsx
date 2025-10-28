'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import { type Card } from '@/lib/types';
import AddCardForm from './add-card-form';

export default function CardsList() {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !activeProfile) {
      setLoading(false);
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

  return (
    <div>
      <div className="flex justify-end mb-4">
        <AddCardForm />
      </div>
      {loading ? (
        <p>Carregando cartões...</p>
      ) : cards.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card) => (
            <div key={card.id} className="border p-4 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold">{card.name}</h3>
              <p className="text-sm text-muted-foreground">
                Limite: R$ {card.limit.toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground">
                Fecha dia: {card.closingDay}
              </p>
              <p className="text-sm text-muted-foreground">
                Vence dia: {card.dueDay}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p>Nenhum cartão cadastrado ainda.</p>
      )}
    </div>
  );
}
