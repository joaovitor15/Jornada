'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2 } from 'lucide-react';
import AddExpenseForm from '@/components/dashboard/add-expense-form';
import { text } from '@/lib/strings';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/');
    }
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return (
       <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      <div className="flex items-center justify-center mb-6">
        <Button
          onClick={() => setIsFormOpen(true)}
          style={{
            backgroundColor: 'hsl(var(--accent))',
            color: 'hsl(var(--accent-foreground))',
          }}
          size="lg"
          className="h-auto py-4 px-8 text-lg"
        >
          <PlusCircle className="mr-2 h-6 w-6" /> {text.addExpense}
        </Button>
      </div>

      <AddExpenseForm isOpen={isFormOpen} onOpenChange={setIsFormOpen} />
    </div>
  );
}
