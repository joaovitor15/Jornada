'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import { type Card } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { text } from '@/lib/strings';
import CardForm from './add-card-form';
import CardActionsMenu from './card-actions-menu';

export default function CardsList() {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [cardToEdit, setCardToEdit] = useState<Card | null>(null);

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

  const handleAddClick = () => {
    setCardToEdit(null);
    setIsFormOpen(true);
  };

  const handleEditClick = (card: Card) => {
    setCardToEdit(card);
    setIsFormOpen(true);
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={handleAddClick}>
          <PlusCircle className="mr-2 h-4 w-4" />
          {text.addCardForm.title}
        </Button>
      </div>
      {loading ? (
        <p>Carregando cartões...</p>
      ) : cards.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card) => (
            <div
              key={card.id}
              className="border p-4 rounded-lg shadow-sm relative"
            >
              <div className="absolute top-1 right-1">
                <CardActionsMenu card={card} onEdit={() => handleEditClick(card)} />
              </div>
              <h3 className="text-lg font-semibold pr-8">{card.name}</h3>
              <p className="text-sm text-muted-foreground">
                Limite:{' '}
                {card.limit.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
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
        <div className="text-center py-10">
          <p>Nenhum cartão cadastrado ainda.</p>
        </div>
      )}
      <CardForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        cardToEdit={cardToEdit}
      />
    </div>
  );
}
