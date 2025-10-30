
'use client';

import { useEffect, useState } from 'react';
import CardsList from '@/components/cartoes/cards-list';
import { text } from '@/lib/strings';
import FaturaDetails from '@/components/cartoes/FaturaDetails';
import { Card, Expense } from '@/lib/types';
import FaturaSelector from '@/components/cartoes/FaturaSelector';
import { getCurrentFaturaMonthAndYear } from '@/lib/fatura-utils';
import AddExpenseForm from '@/components/dashboard/add-expense-form';
import AnteciparParcelasForm from '@/components/cartoes/AnteciparParcelasForm';


export default function CardsPage() {
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [selectedFatura, setSelectedFatura] = useState<{ month: number, year: number }>({
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
  });
  const [isFaturaSelectorOpen, setIsFaturaSelectorOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [expenseToAnticipate, setExpenseToAnticipate] = useState<Expense | null>(null);
  const [isAnticipateFormOpen, setIsAnticipateFormOpen] = useState(false);


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
    setExpenseToEdit(expense);
    setIsEditFormOpen(true);
  };

  const handleAnticipateExpense = (expense: Expense) => {
    setExpenseToAnticipate(expense);
    setIsAnticipateFormOpen(true);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 lg:pt-4 h-full">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
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
              onEditExpense={handleEditExpense}
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
      
       {expenseToEdit && (
        <AddExpenseForm
          isOpen={isEditFormOpen}
          onOpenChange={setIsEditFormOpen}
          expenseToEdit={expenseToEdit}
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

    