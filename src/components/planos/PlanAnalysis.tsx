
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { type Plan } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Loader2 } from 'lucide-react';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export default function PlanAnalysis() {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState('Todos');

  useEffect(() => {
    if (!user || !activeProfile) {
      setLoading(false);
      setPlans([]);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, 'plans'),
      where('userId', '==', user.uid),
      where('profile', '==', activeProfile)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allPlans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Plan[];
      setPlans(allPlans);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching plans for analysis: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, activeProfile]);

  const { monthlyTotal, annualTotal, lifetimeTotal, availableYears } = useMemo(() => {
    const monthly = plans.filter(p => p.type === 'Mensal');
    const annual = plans.filter(p => p.type === 'Anual');
    const lifetime = plans.filter(p => p.type === 'Vitalício');

    const monthlyCost = monthly.reduce((acc, plan) => {
        if (plan.valueType === 'Fixo') {
             const baseAmount = plan.amount || 0;
             const subItemsAmount = plan.subItems?.reduce((sAcc, sItem) => sAcc + sItem.price, 0) || 0;
             return acc + (baseAmount + subItemsAmount);
        }
        return acc;
    }, 0);

    const years = [...new Set(annual.map(p => p.dueDate?.toDate().getFullYear()).filter(y => y !== undefined))].sort((a,b) => b! - a!);
    const availableYears = years.map(String);


    const filteredAnnual = selectedYear === 'Todos'
        ? annual
        : annual.filter(p => p.dueDate?.toDate().getFullYear().toString() === selectedYear);

    const annualCost = filteredAnnual.reduce((acc, plan) => {
        const baseAmount = plan.amount || 0;
        const subItemsAmount = plan.subItems?.reduce((sAcc, sItem) => sAcc + sItem.price, 0) || 0;
        return acc + (baseAmount + subItemsAmount);
    }, 0);
    
    const lifetimeCost = lifetime.reduce((acc, plan) => {
        const baseAmount = plan.amount || 0;
        const subItemsAmount = plan.subItems?.reduce((sAcc, sItem) => sAcc + sItem.price, 0) || 0;
        return acc + (baseAmount + subItemsAmount);
    }, 0);


    return {
      monthlyTotal: monthlyCost * 12,
      annualTotal: annualCost,
      lifetimeTotal: lifetimeCost,
      availableYears: availableYears as string[],
    };
  }, [plans, selectedYear]);

  if (loading) {
    return <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="w-full">
      <h2 className="text-xl font-bold mb-4">Análise de Planos</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Custo Anual (Planos Mensais)</CardTitle>
            <CardDescription>Valor projetado para 12 meses.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(monthlyTotal)}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
                 <CardTitle>Custo Planos Anuais</CardTitle>
                 <Select value={selectedYear} onValueChange={setSelectedYear} disabled={availableYears.length === 0}>
                    <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Ano" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Todos">Todos</SelectItem>
                        {availableYears.map(year => (
                            <SelectItem key={year} value={year}>{year}</SelectItem>
                        ))}
                    </SelectContent>
                 </Select>
            </div>
            <CardDescription>Soma dos planos com ciclo anual.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(annualTotal)}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Custo Planos Vitalícios</CardTitle>
             <CardDescription>Soma de planos com pagamento único.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(lifetimeTotal)}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
