
'use client';

import { text } from '@/lib/strings';
import { type Card } from '@/lib/types';
import CardActionsMenu from './card-actions-menu';

interface CardDetailsProps {
  card: Card;
  onEdit: () => void;
}

export default function CardDetails({ card, onEdit }: CardDetailsProps) {
  return (
    <>
      <div className="absolute top-1 right-1">
        <CardActionsMenu card={card} onEdit={onEdit} />
      </div>
      <h3 className="text-lg font-semibold pr-8">{card.name}</h3>
      <p className="text-sm text-muted-foreground">
        {text.cards.cardDetails.limit}:{' '}
        {card.limit.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        })}
      </p>
      <p className="text-sm text-muted-foreground">
        {text.cards.cardDetails.closingDay}: {card.closingDay}
      </p>
      <p className="text-sm text-muted-foreground">
        {text.cards.cardDetails.dueDay}: {card.dueDay}
      </p>
    </>
  );
}

    