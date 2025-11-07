'use client';

import { createContext, useContext, useState, ReactNode, Dispatch, SetStateAction } from 'react';
import { Expense, Income } from '@/lib/types';

type EditableTransaction = Expense | Income;

interface AddTransactionModalContextType {
  isFormOpen: boolean;
  setIsFormOpen: (isOpen: boolean) => void; // Manter para compatibilidade
  transactionToEdit: EditableTransaction | null;
  setTransactionToEdit: (transaction: EditableTransaction) => void;
  closeForm: () => void;
  openForm: () => void; // Novo método
}

const AddTransactionModalContext = createContext<AddTransactionModalContextType | undefined>(undefined);

export function AddTransactionModalProvider({ children }: { children: ReactNode }) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [transactionToEdit, setTransactionToEditState] = useState<EditableTransaction | null>(null);

  const openForm = () => setIsFormOpen(true);

  const setTransactionToEdit = (transaction: EditableTransaction) => {
    setTransactionToEditState(transaction);
    setIsFormOpen(true);
  };
  
  const closeForm = () => {
    setTransactionToEditState(null);
    setIsFormOpen(false);
  };
  
  const value = {
    isFormOpen,
    setIsFormOpen, // Manter por enquanto
    transactionToEdit,
    setTransactionToEdit,
    closeForm,
    openForm,
  }

  return (
    <AddTransactionModalContext.Provider value={value}>
      {children}
    </AddTransactionModalContext.Provider>
  );
}

export function useAddTransactionModal() {
  const context = useContext(AddTransactionModalContext);
  if (context === undefined) {
    throw new Error('useAddTransactionModal must be used within a AddTransactionModalProvider');
  }
  return context;
}
