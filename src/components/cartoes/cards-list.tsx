
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import { type Card } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { text } from '@/lib/strings';
import CardForm from './add-card-form';
import CardDetails from './CardDetails';
import { cn } from '@/lib/utils';
import { useCards } from '@/hooks/use-cards';

interface CardsListProps {
  selectedCardId: string | undefined;
  onCardSelect: (card: Card | null) => void;
}

export default function CardsList({ selectedCardId, onCardSelect }: CardsListProps) {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const { cards, loading } = useCards();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [cardToEdit, setCardToEdit] = useState<Card | null>(null);

  useEffect(() => {
    if (!loading) {
      if (cards.length > 0) {
        const currentSelectedCardExists = selectedCardId && cards.some(c => c.id === selectedCardId);
        if (!currentSelectedCardExists) {
          onCardSelect(cards[0]);
        }
      } else {
        onCardSelect(null);
      }
    }
  }, [loading, cards, selectedCardId, onCardSelect]);


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
