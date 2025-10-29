'use client';

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
    </>
  );
}
