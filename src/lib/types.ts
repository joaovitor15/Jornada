
import type { Timestamp } from 'firebase/firestore';

export type Profile = 'Personal' | 'Home' | 'Business';

export type PaymentMethod = 'Dinheiro/Pix' | 'Débito' | string;

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

export type SubItem = {
  name: string;
  price: number;
};

export type Plan = {
  id: string;
  userId: string;
  profile: Profile;
  name: string;
  amount: number; // Base cost
  type: 'Mensal' | 'Anual';
  paymentMethod: string;
  paymentDay?: number; // Dia do vencimento (para planos mensais)
  dueDate?: Timestamp; // Data completa do vencimento (para planos anuais)
  mainCategory: string;
  subcategory: string;
  subItems?: SubItem[]; // Optional list for combo items
};


export type BillPayment = {
  id: string;
  userId: string;
  profile: Profile;
  cardId: string;
  amount: number;
  date: Timestamp;
  type: 'payment' | 'refund';
};

export type Transaction = Expense | BillPayment;

export type EmergencyReserve = {
  userId: string;
  profile: Profile;
  goal: number;
};

export type EmergencyReserveEntry = {
  id: string;
  userId: string;
  profile: Profile;
  amount: number;
  date: Timestamp;
  description?: string;
  location: string;
  mainCategory: string;
  subcategory: string;
};
