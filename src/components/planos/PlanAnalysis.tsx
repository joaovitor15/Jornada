
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

    const years = [...new Set(annual.map(p => p.dueDate?.toDate().getFullYear()).filter((y): y is number => y !== undefined))].sort((a,b) => b! - a!);
    const availableYearsOptions = years.map(String);

    const filteredAnnual = selectedYear === 'Todos'
        ? annual
        : annual.filter(p => p.dueDate && p.dueDate.toDate().getFullYear().toString() === selectedYear);

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
      availableYears: availableYearsOptions,
    };
  }, [plans, selectedYear]);

  const tabs = [
    { value: "mensal", label: "Mensal (Anualizado)", total: monthlyTotal, description: "Valor projetado para 12 meses." },
    { value: "anual", label: "Anual", total: annualTotal, description: "Soma dos planos com ciclo anual." },
    { value: "vitalicio", label: "Vitalício", total: lifetimeTotal, description: "Soma de planos com pagamento único." },
  ];

  if (loading) {
    return <div className="flex justify-center mt-6"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <Card>
        <CardHeader>
            <CardTitle>Análise de Planos</CardTitle>
            <CardDescription>Visualize o custo total dos seus planos por período.</CardDescription>
        </CardHeader>
        <CardContent>
            <Tabs defaultValue="mensal" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    {tabs.map(tab => (
                        <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
                    ))}
                </TabsList>
                {tabs.map(tab => (
                    <TabsContent key={tab.value} value={tab.value}>
                        <div className="mt-4 p-4 border rounded-lg">
                            {tab.value === 'anual' && (
                                <div className="flex justify-end mb-4">
                                     <Select value={selectedYear} onValueChange={setSelectedYear} disabled={availableYears.length === 0}>
                                        <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Filtrar por ano" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Todos">Todos os Anos</SelectItem>
                                            {availableYears.map(year => (
                                                <SelectItem key={year} value={year}>{year}</SelectItem>
                                            ))}
                                        </SelectContent>
                                     </Select>
                                </div>
                            )}
                            <div className="text-center">
                                <p className="text-sm text-muted-foreground">{tab.description}</p>
                                <p className="text-4xl font-bold mt-2">{formatCurrency(tab.total)}</p>
                            </div>
                        </div>
                    </TabsContent>
                ))}
            </Tabs>
        </CardContent>
    </Card>
  );
}
