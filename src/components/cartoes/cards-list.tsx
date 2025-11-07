
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import { type Card, HierarchicalTag } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { PlusCircle, CreditCard, ChevronRight } from 'lucide-react';
import { text } from '@/lib/strings';
import CardForm from './add-card-form';
import CardDetails from './CardDetails';
import { cn } from '@/lib/utils';
import { useCards } from '@/hooks/use-cards';
import { useTags } from '@/hooks/use-tags';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';

interface CardsListProps {
  selectedCardId: string | undefined;
  onCardSelect: (card: Card | null) => void;
}

export default function CardsList({ selectedCardId, onCardSelect }: CardsListProps) {
  const { cards, loading: cardsLoading } = useCards();
  const { hierarchicalTags, loading: tagsLoading } = useTags();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [cardToEdit, setCardToEdit] = useState<Card | null>(null);

  const loading = cardsLoading || tagsLoading;

  const cardPrincipalTag = useMemo((): HierarchicalTag | undefined => {
    return hierarchicalTags.find((tag) => tag.name === 'Cartões');
  }, [hierarchicalTags]);

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
    <div className="flex flex-col h-full">
       <div className="mb-4">
        <h1 className="text-2xl font-bold">Gerenciador de Tags de Cartão</h1>
      </div>

       <div className="flex justify-between items-center p-3 rounded-lg border bg-muted/50 mb-4">
        <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground"/>
            <span className="font-semibold">Cartões</span>
            {cardPrincipalTag && <Badge variant="secondary" className="px-1.5 py-0.5 text-xs rounded-full">{cardPrincipalTag.children.length}</Badge>}
        </div>
        <Button onClick={handleAddClick} size="sm">
          <PlusCircle className="mr-2 h-4 w-4" />
          Novo Cartão
        </Button>
      </div>

      <ScrollArea className="flex-grow">
        <div className="space-y-4 pr-4">
          {loading ? (
            <p>{text.cards.loading}</p>
          ) : cards.length > 0 ? (
            cards.map((card) => (
              <div key={card.id} onClick={() => handleSelectCard(card)} className={cn(
                "border p-4 rounded-lg shadow-sm relative cursor-pointer transition-all",
                selectedCardId === card.id ? "ring-2 ring-primary shadow-lg" : "hover:shadow-md"
              )}>
                <CardDetails card={card} onEdit={() => handleEditClick(card)} />
              </div>
            ))
          ) : (
            <div className="text-center py-10 border-2 border-dashed rounded-lg">
              <p>{text.cards.noCards}</p>
            </div>
          )}
        </div>
      </ScrollArea>
      
      <CardForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        cardToEdit={cardToEdit}
      />
    </div>
  );
}
