import type { Timestamp } from 'firebase/firestore';

export type Expense = {
  id?: string;
  userId: string;
  description: string;
  amount: number;
  category: string;
  date: Timestamp;
};

export const expenseCategories = [
  'Food',
  'Travel',
  'Bills',
  'Shopping',
  'Entertainment',
  'Health',
  'Other',
] as const;

export type ExpenseCategory = typeof expenseCategories[number];
