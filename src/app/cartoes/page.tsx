
'use client';

import { useMemo, useState } from 'react';
import CardsList from '@/components/cartoes/cards-list';
import { text } from '@/lib/strings';
import FaturaDetails from '@/components/cartoes/FaturaDetails';
import { Card, Expense } from '@/lib/types';
import FaturaSelector from '@/components/cartoes/FaturaSelector';
import { getCurrentFaturaMonthAndYear } from '@/lib/fatura-utils';
import AnteciparParcelasForm from '@/components/cartoes/AnteciparParcelasForm';
import { useAddTransactionModal } from '@/contexts/AddTransactionModalContext';
import { useCards } from '@/hooks/use-cards';

export default function CardsPage() {
  const { cards, loading: cardsLoading, filteredCards, filter, setFilter } = useCards();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const [selectedFatura, setSelectedFatura] = useState<{ month: number, year: number }>({
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
  });
  const [isFaturaSelectorOpen, setIsFaturaSelectorOpen] = useState(false);
  const [expenseToAnticipate, setExpenseToAnticipate] = useState<Expense | null>(null);
  const [isAnticipateFormOpen, setIsAnticipateFormOpen] = useState(false);
  const { setIsFormOpen } = useAddTransactionModal();

  const selectedCard = useMemo(() => {
    if (cardsLoading || filteredCards.length === 0) return null;
    
    const cardFromId = selectedCardId ? filteredCards.find(c => c.id === selectedCardId) : null;
    return cardFromId || filteredCards[0];
  }, [selectedCardId, filteredCards, cardsLoading]);
  
  const handleCardSelection = (cardId: string) => {
    setSelectedCardId(cardId);
    const card = cards.find(c => c.id === cardId);
    if (card) {
      const { month, year } = getCurrentFaturaMonthAndYear(new Date(), card.closingDay);
      setSelectedFatura({ month, year });
    }
  };

  const handleAnticipateExpense = (expense: Expense) => {
    setExpenseToAnticipate(expense);
    setIsAnticipateFormOpen(true);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 lg:pt-4 h-full flex flex-col">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-grow">
        {/* Coluna de Faturas */}
        <div className="lg:col-span-2 flex flex-col">
           <div className="flex justify-between items-center mb-4">
              <div>
                  <h1 className="text-2xl font-bold">{text.cards.myInvoices}</h1>
                  <p className="text-muted-foreground">
                      {text.cards.selectCardToSeeInvoice}
                  </p>
              </div>
          </div>
          {selectedCard ? (
              <FaturaDetails 
              card={selectedCard} 
              selectedFatura={selectedFatura} 
              onFaturaSelect={() => setIsFaturaSelectorOpen(true)}
              onAnticipateExpense={handleAnticipateExpense}
              />
          ) : (
              <div className="flex-1 flex items-center justify-center bg-muted/30 border-2 border-dashed border-muted-foreground/30 rounded-lg">
              <p className="text-muted-foreground">
                  {text.cards.selectCardToStart}
              </p>
              </div>
          )}
        </div>
        
        {/* Coluna de Cartões / Gerenciador de Tags */}
        <div className="lg:col-span-1">
          <CardsList
            cards={cards}
            loading={cardsLoading}
            filteredCards={filteredCards}
            selectedCardId={selectedCard?.id}
            onCardSelect={handleCardSelection}
            filter={filter}
            setFilter={setFilter}
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

      {expenseToAnticipate && selectedCard && (
        <AnteciparParcelasForm
          isOpen={isAnticipateFormOpen}
          onOpenChange={setIsAnticipateFormOpen}
          expense={expenseToAnticipate}
          card={selectedCard}
        />
      )}
    </div>
  );
}
