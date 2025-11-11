
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { text } from '@/lib/strings';
import PlansList from '@/components/planos/plans-list';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, PlusCircle, Loader2 } from 'lucide-react';
import PlanForm from '@/components/planos/add-plan-form';
import PlanAnalysis from '@/components/planos/PlanAnalysis';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import { collection, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Plan, Expense } from '@/lib/types';
import { startOfMonth, endOfMonth } from 'date-fns';

type FilterType = 'Todos' | 'Mensal' | 'Anual' | 'Vitalício';

export default function PlanosAtuaisPage() {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [paidPlanIds, setPaidPlanIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const [filter, setFilter] = useState<FilterType>('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [planToEdit, setPlanToEdit] = useState<any | null>(null);

  useEffect(() => {
    if (!user || !activeProfile) {
      setLoading(false);
      setPlans([]);
      return;
    }

    setLoading(true);
    const plansQuery = query(
      collection(db, 'plans'),
      where('userId', '==', user.uid),
      where('profile', '==', activeProfile),
      orderBy('order', 'asc')
    );

    const unsubscribePlans = onSnapshot(
      plansQuery,
      (querySnapshot) => {
        const userPlans = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Plan[];
        setPlans(userPlans);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching plans: ', error);
        setLoading(false);
      }
    );
    
    // Listener for expenses of the current month to check for paid plans
    const today = new Date();
    const startOfCurrentMonth = startOfMonth(today);
    const endOfCurrentMonth = endOfMonth(today);

    const expensesQuery = query(
        collection(db, 'expenses'),
        where('userId', '==', user.uid),
        where('profile', '==', activeProfile),
        where('date', '>=', Timestamp.fromDate(startOfCurrentMonth)),
        where('date', '<=', Timestamp.fromDate(endOfCurrentMonth))
    );

    const unsubscribeExpenses = onSnapshot(expensesQuery, (snapshot) => {
        const paidIds = new Set<string>();
        snapshot.forEach(doc => {
            const expense = doc.data() as Expense;
            if (expense.tags) {
                expense.tags.forEach(tag => {
                    if (tag.startsWith('planId:')) {
                        paidIds.add(tag.split(':')[1]);
                    }
                });
            }
        });
        setPaidPlanIds(paidIds);
    });


    return () => {
      unsubscribePlans();
      unsubscribeExpenses();
    }
  }, [user, activeProfile]);

  const filterOptions = useMemo(() => {
    const baseOptions: { label: string; value: FilterType }[] = [
      { label: 'Todos', value: 'Todos' },
      { label: 'Mensal', value: 'Mensal' },
      { label: 'Anual', value: 'Anual' },
    ];
    if (activeProfile === 'Personal') {
      baseOptions.push({ label: 'Vitalício', value: 'Vitalício' });
    }
    return baseOptions;
  }, [activeProfile]);


  const handleAddClick = () => {
    setPlanToEdit(null);
    setIsFormOpen(true);
  };

  return (
    <>
      <div className="p-4 md:p-6 lg:p-8 lg:pt-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold">{text.sidebar.currentPlans}</h1>
            <p className="text-muted-foreground">{text.plans.description}</p>
          </div>
          <Button onClick={handleAddClick}>
            <PlusCircle className="mr-2 h-4 w-4" />
            {text.plans.newPlan}
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
              placeholder="Buscar planos..."
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
            <PlansList
              plans={plans}
              filter={filter}
              searchTerm={searchTerm}
              paidPlanIds={paidPlanIds}
              onEdit={(plan) => {
                setPlanToEdit(plan);
                setIsFormOpen(true);
              }}
            />
          )}
        </div>

        <Separator className="my-6" />

        <div>
          <PlanAnalysis plans={plans} loading={loading} />
        </div>
      </div>
      <PlanForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        planToEdit={planToEdit}
      />
    </>
  );
}
