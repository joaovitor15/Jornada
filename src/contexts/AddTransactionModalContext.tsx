'use client';

import { createContext, useContext, useState, ReactNode, Dispatch, SetStateAction } from 'react';
import { Expense, Income } from '@/lib/types';

type EditableTransaction = Expense | Income;

interface AddTransactionModalContextType {
  isFormOpen: boolean;
  setIsFormOpen: (isOpen: boolean) => void;
  transactionToEdit: EditableTransaction | null;
  setTransactionToEdit: (transaction: EditableTransaction | null) => void;
}

const AddTransactionModalContext = createContext<AddTransactionModalContextType | undefined>(undefined);

export function AddTransactionModalProvider({ children }: { children: ReactNode }) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [transactionToEdit, setTransactionToEditState] = useState<EditableTransaction | null>(null);

  const setTransactionToEdit = (transaction: EditableTransaction | null) => {
    setTransactionToEditState(transaction);
    setIsFormOpen(true); // Always open form when a transaction is set for editing
  };
  
  const value = {
    isFormOpen,
    setIsFormOpen,
    transactionToEdit,
    setTransactionToEdit,
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
