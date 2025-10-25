'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface AddIncomeModalContextType {
  isFormOpen: boolean;
  setIsFormOpen: (isOpen: boolean) => void;
}

const AddIncomeModalContext = createContext<AddIncomeModalContextType | undefined>(undefined);

export function AddIncomeModalProvider({ children }: { children: ReactNode }) {
  const [isFormOpen, setIsFormOpen] = useState(false);

  return (
    <AddIncomeModalContext.Provider value={{ isFormOpen, setIsFormOpen }}>
      {children}
    </AddIncomeModalContext.Provider>
  );
}

export function useAddIncomeModal() {
  const context = useContext(AddIncomeModalContext);
  if (context === undefined) {
    throw new Error('useAddIncomeModal must be used within a AddIncomeModalProvider');
  }
  return context;
}
