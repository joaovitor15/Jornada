
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
import CardDetails from './CardDetails';
import { cn } from '@/lib/utils';


interface CardsListProps {
  selectedCardId: string | undefined;
  onCardSelect: (card: Card | null) => void;
}

export default function CardsList({ selectedCardId, onCardSelect }: CardsListProps) {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [cardToEdit, setCardToEdit] = useState<Card | null>(null);

  useEffect(() => {
    if (!user || !activeProfile) {
      setLoading(false);
      onCardSelect(null);
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
        
        // Auto-select first card if none is selected or selected is gone
        if (userCards.length > 0) {
          const currentSelectedCardExists = selectedCardId && userCards.some(c => c.id === selectedCardId);
          if (!currentSelectedCardExists) {
             onCardSelect(userCards[0]);
          }
        } else {
          onCardSelect(null);
        }

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
  
  const handleSelectCard = (card: Card) => {
    onCardSelect(card);
  };


  return (
    <div className="space-y-4">
      <div className="flex justify-end mb-4">
        <Button onClick={handleAddClick}>
          <PlusCircle className="mr-2 h-4 w-4" />
          {text.addCardForm.title}
        </Button>
      </div>
      {loading ? (
        <p>{text.cards.loading}</p>
      ) : cards.length > 0 ? (
        <div className="space-y-4">
          {cards.map((card) => (
             <div key={card.id} onClick={() => handleSelectCard(card)} className={cn(
                "border p-4 rounded-lg shadow-sm relative cursor-pointer transition-all",
                selectedCardId === card.id ? "ring-2 ring-primary shadow-lg" : "hover:shadow-md"
              )}>
              <CardDetails card={card} onEdit={() => handleEditClick(card)} />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-10 border-2 border-dashed rounded-lg">
          <p>{text.cards.noCards}</p>
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

    