
'use client';

import { useEffect, useState } from 'react';
import CardsList from '@/components/cartoes/cards-list';
import { text } from '@/lib/strings';
import FaturaDetails from '@/components/cartoes/FaturaDetails';
import { Card, Expense } from '@/lib/types';
import FaturaSelector from '@/components/cartoes/FaturaSelector';
import { getCurrentFaturaMonthAndYear } from '@/lib/fatura-utils';
import AnteciparParcelasForm from '@/components/cartoes/AnteciparParcelasForm';
import { useAddTransactionModal } from '@/contexts/AddTransactionModalContext';
import CardTagsManager from '@/components/cartoes/CardTagsManager';


export default function CardsPage() {
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [selectedFatura, setSelectedFatura] = useState<{ month: number, year: number }>({
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
  });
  const [isFaturaSelectorOpen, setIsFaturaSelectorOpen] = useState(false);
  const [expenseToAnticipate, setExpenseToAnticipate] = useState<Expense | null>(null);
  const [isAnticipateFormOpen, setIsAnticipateFormOpen] = useState(false);
  const { setIsFormOpen } = useAddTransactionModal();


  const handleCardSelection = (card: Card | null) => {
    setSelectedCard(card);
    if (card) {
      // Quando um novo cartão é selecionado, define a fatura para a "atual"
      const { month, year } = getCurrentFaturaMonthAndYear(new Date(), card.closingDay);
      setSelectedFatura({ month, year });
    }
  };

  // Ajusta a fatura selecionada se o cartão mudar
  useEffect(() => {
    if (selectedCard) {
      const { month, year } = getCurrentFaturaMonthAndYear(new Date(), selectedCard.closingDay);
      setSelectedFatura({ month, year });
    }
  }, [selectedCard]);
  
  const handleEditExpense = (expense: Expense) => {
    // TODO: Implementar a edição de despesas com o novo formulário unificado.
    // Atualmente, estamos apenas abrindo o formulário de adição.
    setIsFormOpen(true);
  };

  const handleAnticipateExpense = (expense: Expense) => {
    setExpenseToAnticipate(expense);
    setIsAnticipateFormOpen(true);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 lg:pt-4 h-full flex flex-col">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-grow">
        {/* Coluna de Faturas e Gerenciador de Tags */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          <div className="flex flex-col h-full">
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
           <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4">Gerenciador de Tags de Cartão</h2>
             <CardTagsManager />
          </div>
        </div>
        
        {/* Coluna de Cartões */}
        <div className="lg:col-span-1">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold">{text.sidebar.cards}</h1>
              <p className="text-muted-foreground">
                {text.cards.manageYourCards}
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
