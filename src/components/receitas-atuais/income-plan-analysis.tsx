
'use client';

import { useState, useMemo } from 'react';
import { type IncomePlan } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import IncomeSpendingChart from './income-spending-chart';

interface IncomePlanAnalysisProps {
  plans: IncomePlan[];
  loading: boolean;
}

export default function IncomePlanAnalysis({ plans, loading }: IncomePlanAnalysisProps) {

  const { monthlyPlans, annualPlans, lifetimePlans } = useMemo(() => {
    const monthly = plans.filter(p => p.type === 'Mensal');
    const annual = plans.filter(p => p.type === 'Anual');
    const lifetime = plans.filter(p => p.type === 'Vitalício');

    return {
      monthlyPlans: monthly,
      annualPlans: annual,
      lifetimePlans: lifetime,
    };
  }, [plans]);

  const tabs = [
    { value: "mensal", label: "Mensal", plans: monthlyPlans, description: "Previsão anualizada das receitas mensais." },
    { value: "anual", label: "Anual", plans: annualPlans, description: "Soma das receitas com ciclo anual." },
    { value: "vitalicio", label: "Vitalício", plans: lifetimePlans, description: "Soma de receitas com pagamento único." },
  ];

  if (loading) {
    return <div className="flex justify-center mt-6"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <Card>
        <CardHeader>
            <CardTitle>Análise de Receitas</CardTitle>
            <CardDescription>Visualize o total de suas receitas recorrentes por período.</CardDescription>
        </CardHeader>
        <CardContent>
            <Tabs defaultValue="mensal" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    {tabs.map(tab => (
                        <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
                    ))}
                </TabsList>
                 {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    tabs.map(tab => (
                        <TabsContent key={tab.value} value={tab.value}>
                            <div className="mt-4 border rounded-lg">
                                <div className="p-4">
                                     <IncomeSpendingChart 
                                        plans={tab.plans} 
                                        isAnnualized={tab.value === 'mensal'}
                                    />
                                </div>
                            </div>
                        </TabsContent>
                    ))
                )}
            </Tabs>
        </CardContent>
    </Card>
  );
}
