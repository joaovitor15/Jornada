'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

type ModalType = 'pay'; // The only modal type now
type BillTransactionType = 'payment' | 'anticipate' | 'refund';

interface ModalState {
  isOpen: boolean;
  type?: BillTransactionType;
}

interface AddBillTransactionModalContextType {
  payBillModal: ModalState;
  openModal: (type: ModalType, billType?: BillTransactionType) => void;
  closeModal: (type: ModalType) => void;
}

const AddBillTransactionModalContext = createContext<AddBillTransactionModalContextType | undefined>(undefined);

export function AddBillTransactionModalProvider({ children }: { children: ReactNode }) {
  const [payBillModal, setPayBillModal] = useState<ModalState>({ isOpen: false });

  const openModal = (type: ModalType, billType?: BillTransactionType) => {
    if (type === 'pay') {
      setPayBillModal({ isOpen: true, type: billType });
    }
  };

  const closeModal = (type: ModalType) => {
    if (type === 'pay') {
      setPayBillModal({ isOpen: false });
    }
  };

  return (
    <AddBillTransactionModalContext.Provider value={{ payBillModal, openModal, closeModal }}>
      {children}
    </AddBillTransactionModalContext.Provider>
  );
}

export function useAddBillTransactionModal() {
  const context = useContext(AddBillTransactionModalContext);
  if (context === undefined) {
    throw new Error('useAddBillTransactionModal must be used within a AddBillTransactionModalProvider');
  }
  return context;
}
