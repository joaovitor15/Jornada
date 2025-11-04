'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface AddTransactionModalContextType {
  isFormOpen: boolean;
  setIsFormOpen: (isOpen: boolean) => void;
}

const AddTransactionModalContext = createContext<AddTransactionModalContextType | undefined>(undefined);

export function AddTransactionModalProvider({ children }: { children: ReactNode }) {
  const [isFormOpen, setIsFormOpen] = useState(false);

  return (
    <AddTransactionModalContext.Provider value={{ isFormOpen, setIsFormOpen }}>
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
