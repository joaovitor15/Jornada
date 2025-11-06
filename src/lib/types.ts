
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
  tags?: string[];
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
  tags?: string[];
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
  paymentDay?: number;
  dueDate?: Timestamp;
  subItems?: SubItem[];
  tags?: string[];
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

export interface RawTag {
  id: string;
  userId: string;
  profile: Profile;
  name: string;
  isPrincipal: boolean;
  parent: string | null;
  isArchived?: boolean;
}

export interface HierarchicalTag extends RawTag {
  children: RawTag[];
}
