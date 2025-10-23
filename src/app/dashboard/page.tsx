'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { LayoutGrid, Plus, Loader2 } from 'lucide-react';
import AddExpenseForm from '@/components/dashboard/add-expense-form';
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
      case 'Business
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
    <div className="container mx-auto flex flex-col items-center text-center">
      <div className="mb-8">
        <p className="text-muted-foreground">{text.summary.totalBalance}</p>
        <p className="text-4xl font-bold">R$ 0,00</p>
      </div>

      <div className="flex gap-4">
        <div className="flex flex-col items-center">
          <Button
            asChild
            className="rounded-full w-24 h-24"
            style={{
              backgroundColor: 'hsl(var(--accent))',
              color: 'hsl(var(--accent-foreground))',
            }}
          >
            <Link href="/lancamentos">
              <LayoutGrid className="h-10 w-10" />
            </Link>
          </Button>
          <span className="mt-2 font-semibold">
            {text.summary.goToDashboard}
          </span>
        </div>
        <div className="flex flex-col items-center">
          <Button
            onClick={() => setIsFormOpen(true)}
            className="rounded-full w-24 h-24"
            style={{
              backgroundColor: 'hsl(var(--accent))',
              color: 'hsl(var(--accent-foreground))',
            }}
          >
            <Plus className="h-10 w-10" />
          </Button>
          <span className="mt-2 font-semibold">
            {text.summary.newTransaction}
          </span>
        </div>
      </div>

      <AddExpenseForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
      />
    </div>
  );
}
