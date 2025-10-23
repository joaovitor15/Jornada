'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface AddExpenseModalContextType {
  isFormOpen: boolean;
  setIsFormOpen: (isOpen: boolean) => void;
}

const AddExpenseModalContext = createContext<AddExpenseModalContextType | undefined>(undefined);

export function AddExpenseModalProvider({ children }: { children: ReactNode }) {
  const [isFormOpen, setIsFormOpen] = useState(false);

  return (
    <AddExpenseModalContext.Provider value={{ isFormOpen, setIsFormOpen }}>
      {children}
    </AddExpenseModalContext.Provider>
  );
}

export function useAddExpenseModal() {
  const context = useContext(AddExpenseModalContext);
  if (context === undefined) {
    throw new Error('useAddExpenseModal must be used within a AddExpenseModalProvider');
  }
  return context;
}
