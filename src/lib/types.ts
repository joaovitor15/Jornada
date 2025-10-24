import type { Timestamp } from 'firebase/firestore';

export type Profile = 'Personal' | 'Home' | 'Business';

export type PaymentMethod = 'Pix' | 'Cash' | 'Debit' | 'Credit';

export type Expense = {
  id?: string;
  userId: string;
  profile: Profile;
  description: string;
  amount: number;
  mainCategory: string;
  subcategory: string;
  date: Timestamp;
  paymentMethod: PaymentMethod;
};
