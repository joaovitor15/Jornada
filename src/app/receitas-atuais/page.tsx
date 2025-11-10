
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { text } from '@/lib/strings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, PlusCircle, Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { IncomePlan } from '@/lib/types';
import IncomePlansList from '@/components/receitas-atuais/income-plans-list';
import AddIncomePlanForm from '@/components/receitas-atuais/add-income-plan-form';
import IncomePlanAnalysis from '@/components/receitas-atuais/income-plan-analysis';


type FilterType = 'Todos' | 'Diário' | 'Mensal' | 'Anual';

export default function ReceitasAtuaisPage() {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const [incomePlans, setIncomePlans] = useState<IncomePlan[]>([]);
  const [loading, setLoading] = useState(true);

  const [filter, setFilter] = useState<FilterType>('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [planToEdit, setPlanToEdit] = useState<IncomePlan | null>(null);

  useEffect(() => {
    if (!user || !activeProfile) {
      setLoading(false);
      setIncomePlans([]);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, 'incomePlans'),
      where('userId', '==', user.uid),
      where('profile', '==', activeProfile),
      orderBy('order', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const userPlans = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as IncomePlan[];
        setIncomePlans(userPlans);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching income plans: ', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, activeProfile]);

  const filterOptions: { label: string; value: FilterType }[] = [
    { label: 'Todos', value: 'Todos' },
    { label: 'Diário', value: 'Diário' },
    { label: 'Mensal', value: 'Mensal' },
    { label: 'Anual', value: 'Anual' },
  ];

  const handleAddClick = () => {
    setPlanToEdit(null);
    setIsFormOpen(true);
  };

  return (
    <>
      <div className="p-4 md:p-6 lg:p-8 lg:pt-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold">Receitas Atuais</h1>
            <p className="text-muted-foreground">Gerencie suas receitas recorrentes.</p>
          </div>
          <Button onClick={handleAddClick}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nova Receita
          </Button>
        </div>
        <div className="flex flex-col mb-4 gap-4">
          <div className="flex items-center gap-2">
            {filterOptions.map((option) => (
              <Button
                key={option.value}
                variant={filter === option.value ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setFilter(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Buscar receitas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="pb-4">
          {loading ? (
             <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <IncomePlansList
              plans={incomePlans}
              filter={filter}
              searchTerm={searchTerm}
              onEdit={(plan) => {
                setPlanToEdit(plan);
                setIsFormOpen(true);
              }}
            />
          )}
        </div>

        <Separator className="my-6" />

        <div>
          <IncomePlanAnalysis plans={incomePlans} loading={loading} />
        </div>
      </div>
      <AddIncomePlanForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        planToEdit={planToEdit}
      />
    </>
  );
}
