'use client';

import { useState } from 'react';
import CardsList from '@/components/cartoes/cards-list';
import { text } from '@/lib/strings';
import FaturaDetails from '@/components/cartoes/FaturaDetails';
import { Card } from '@/lib/types';
import FaturaSelector from '@/components/cartoes/FaturaSelector';

export default function CardsPage() {
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [selectedFatura, setSelectedFatura] = useState<{ month: number, year: number }>({
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
  });
  const [isFaturaSelectorOpen, setIsFaturaSelectorOpen] = useState(false);

  const handleCardSelection = (card: Card | null) => {
    setSelectedCard(card);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 lg:pt-4 h-full">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
        {/* Coluna de Faturas */}
        <div className="lg:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold">Minhas Faturas</h1>
              <p className="text-muted-foreground">
                Selecione um cartão para ver os detalhes da fatura.
              </p>
            </div>
          </div>
          {selectedCard ? (
            <FaturaDetails 
              card={selectedCard} 
              selectedFatura={selectedFatura} 
              onFaturaSelect={() => setIsFaturaSelectorOpen(true)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-muted/30 border-2 border-dashed border-muted-foreground/30 rounded-lg">
              <p className="text-muted-foreground">
                Selecione um cartão ao lado para começar.
              </p>
            </div>
          )}
        </div>

        {/* Coluna de Cartões */}
        <div className="lg:col-span-1">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold">{text.sidebar.cards}</h1>
              <p className="text-muted-foreground">
                Gerencie seus cartões.
              </p>
            </div>
          </div>
          <CardsList
            selectedCardId={selectedCard?.id}
            onCardSelect={handleCardSelection}
          />
        </div>
      </div>
      
      {selectedCard && (
        <FaturaSelector
          isOpen={isFaturaSelectorOpen}
          onOpenChange={setIsFaturaSelectorOpen}
          card={selectedCard}
          onFaturaSelect={setSelectedFatura}
          currentFatura={selectedFatura}
        />
      )}
    </div>
  );
}
