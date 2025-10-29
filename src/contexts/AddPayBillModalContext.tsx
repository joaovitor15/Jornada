'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface AddPayBillModalContextType {
  isFormOpen: boolean;
  setIsFormOpen: (isOpen: boolean) => void;
}

const AddPayBillModalContext = createContext<AddPayBillModalContextType | undefined>(undefined);

export function AddPayBillModalProvider({ children }: { children: ReactNode }) {
  const [isFormOpen, setIsFormOpen] = useState(false);

  return (
    <AddPayBillModalContext.Provider value={{ isFormOpen, setIsFormOpen }}>
      {children}
    </AddPayBillModalContext.Provider>
  );
}

export function useAddPayBillModal() {
  const context = useContext(AddPayBillModalContext);
  if (context === undefined) {
    throw new Error('useAddPayBillModal must be used within a AddPayBillModalProvider');
  }
  return context;
}
