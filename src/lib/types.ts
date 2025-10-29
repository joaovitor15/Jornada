import type { Timestamp } from 'firebase/firestore';

export type Profile = 'Personal' | 'Home' | 'Business';

export type PaymentMethod = 'Pix' | 'Dinheiro' | 'Débito' | string;

export type Expense = {
  id: string;
  userId: string;
  profile: Profile;
  description: string;
  amount: number;
  mainCategory: string;
  subcategory: string;
  date: Timestamp;
  paymentMethod: PaymentMethod;
  installments?: number;
  currentInstallment?: number;
  originalExpenseId?: string; 
};

export type Income = {
  id: string;
  userId: string;
  profile: Profile;
  description: string;
  amount: number;
  mainCategory: string;
  subcategory: string;
  date: Timestamp;
};

export type Card = {
  id: string;
  userId: string;
  profile: Profile;
  name: string;
  limit: number;
  closingDay: number;
  dueDay: number;
  createdAt: Timestamp;
};

export type BillPayment = {
  id: string;
  userId: string;
  profile: Profile;
  cardId: string;
  amount: number;
  date: Timestamp;
};

export type Transaction = Expense | BillPayment;
