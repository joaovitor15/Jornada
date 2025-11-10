
import type { Timestamp } from 'firebase/firestore';

export type Profile = 'Personal' | 'Home' | 'Business';

export type PaymentMethod = 'Dinheiro/Pix' | 'Débito' | string;

export type Expense = {
  id: string;
  userId: string;
  profile: Profile;
  description: string;
  amount: number;
  date: Timestamp;
  paymentMethod: PaymentMethod;
  installments?: number;
  currentInstallment?: number;
  originalExpenseId?: string;
  tags: string[];
};

export type Income = {
  id: string;
  userId: string;
  profile: Profile;
  description: string;
  amount: number;
  date: Timestamp;
  tags: string[];
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
  isArchived?: boolean;
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
  amount: number; // For 'Fixo' type, optional for 'Variável'
  valueType: 'Fixo' | 'Variável';
  type: 'Mensal' | 'Anual' | 'Vitalício';
  paymentMethod: string;
  paymentDay?: number;
  dueDate?: Timestamp;
  installments?: number;
  subItems?: SubItem[];
  tags?: string[];
  order?: number;
};

export type IncomePlan = {
  id: string;
  userId: string;
  profile: Profile;
  name: string;
  amount: number;
  valueType: 'Fixo' | 'Variável';
  type: 'Mensal' | 'Anual';
  receiptDay?: number;
  tags?: string[];
  order?: number;
};


export type BillPayment = {
  id: string;
  userId: string;
  profile: Profile;
  cardId: string;
  amount: number;
  date: Timestamp;
  type: 'payment' | 'refund';
  description?: string;
  tags?: string[];
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
  bank: string;
  tags: string[];
};

export interface RawTag {
  id: string;
  userId: string;
  profile: Profile;
  name: string;
  isPrincipal: boolean;
  parent: string | null;
  isArchived?: boolean;
  order?: number;
}

export interface HierarchicalTag extends RawTag {
  children: RawTag[];
}
