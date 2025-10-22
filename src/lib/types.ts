import type { Timestamp } from 'firebase/firestore';

export type Profile = 'Personal' | 'Home' | 'Business';

export type Expense = {
  id?: string;
  userId: string;
  profile: Profile;
  description: string;
  amount: number;
  category: string;
  date: Timestamp;
};

export const personalCategories = [
  'Lazer',
  'Saúde',
  'Carro',
  'Compras',
  'Educação',
  'Viagem',
  'Outros',
] as const;

export const homeCategories = [
  'Alimentação',
  'Contas',
  'Aluguel',
  'Manutenção',
  'Decoração',
  'Outros',
] as const;

export const businessCategories = [
  'Fornecedores',
  'Impostos',
  'Folha de Pagamento',
  'Marketing',
  'Infraestrutura',
  'Outros',
] as const;

export type PersonalCategory = (typeof personalCategories)[number];
export type HomeCategory = (typeof homeCategories)[number];
export type BusinessCategory = (typeof businessCategories)[number];

export type ExpenseCategory = PersonalCategory | HomeCategory | BusinessCategory;
