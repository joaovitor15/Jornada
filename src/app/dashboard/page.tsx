'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2 } from 'lucide-react';
import AddExpenseForm from '@/components/dashboard/add-expense-form';
import ExpensesList from '@/components/dashboard/expenses-list';
import { text } from '@/lib/strings';
import { useProfile } from '@/hooks/use-profile';
import {
  personalCategories,
  homeCategories,
  businessCategories,
} from '@/lib/types';
import type { ExpenseCategory } from '@/lib/types';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { activeProfile } = useProfile();
  const router = useRouter();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentCategories, setCurrentCategories] = useState<
    readonly ExpenseCategory[]
  >(personalCategories);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    switch (activeProfile) {
      case 'Personal':
        setCurrentCategories(personalCategories);
        break;
      case 'Home':
        setCurrentCategories(homeCategories);
        break;
      case 'Business':
        setCurrentCategories(businessCategories);
        break;
      default:
        setCurrentCategories(personalCategories);
    }
  }, [activeProfile]);

  if (authLoading || !user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">{text.dashboard.title}</h1>
        <Button
          onClick={() => setIsFormOpen(true)}
          style={{
            backgroundColor: 'hsl(var(--accent))',
            color: 'hsl(var(--accent-foreground))',
          }}
          size="lg"
          className="h-auto py-4 px-8 text-lg"
        >
          <PlusCircle className="mr-2 h-6 w-6" /> {text.dashboard.addExpense}
        </Button>
      </div>

      <AddExpenseForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        categories={currentCategories}
      />
      <ExpensesList />
    </div>
  );
}
