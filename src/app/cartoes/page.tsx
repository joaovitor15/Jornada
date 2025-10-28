'use client';

import CardsList from '@/components/cartoes/cards-list';
import { text } from '@/lib/strings';

export default function CardsPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 lg:pt-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold">{text.sidebar.cards}</h1>
          <p className="text-muted-foreground">
            Gerencie seus cartões de crédito e débito.
          </p>
        </div>
      </div>
      <CardsList />
    </div>
  );
}
