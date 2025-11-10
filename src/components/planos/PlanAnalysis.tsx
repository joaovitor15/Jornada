
'use client';

import { useState, useMemo } from 'react';
import { type Plan } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PlanSpendingChart from './PlanSpendingChart';

interface PlanAnalysisProps {
  plans: Plan[];
  loading: boolean;
}

export default function PlanAnalysis({ plans, loading }: PlanAnalysisProps) {
  const [selectedYear, setSelectedYear] = useState('Todos');

  const { monthlyPlans, annualPlans, lifetimePlans, availableYears } = useMemo(() => {
    const monthly = plans.filter(p => p.type === 'Mensal');
    const annual = plans.filter(p => p.type === 'Anual');
    const lifetime = plans.filter(p => p.type === 'Vitalício');

    const years = [...new Set(annual.map(p => p.dueDate?.toDate().getFullYear()).filter((y): y is number => y !== undefined))].sort((a,b) => b! - a!);
    const availableYearsOptions = years.map(String);

    const filteredAnnual = selectedYear === 'Todos'
        ? annual
        : annual.filter(p => p.dueDate && p.dueDate.toDate().getFullYear().toString() === selectedYear);

    return {
      monthlyPlans: monthly,
      annualPlans: filteredAnnual,
      lifetimePlans: lifetime,
      availableYears: availableYearsOptions,
    };
  }, [plans, selectedYear]);

  const tabs = [
    { value: "mensal", label: "Mensal", plans: monthlyPlans, description: "Custo anualizado dos planos mensais." },
    { value: "anual", label: "Anual", plans: annualPlans, description: "Soma dos planos com ciclo anual." },
    { value: "vitalicio", label: "Vitalício", plans: lifetimePlans, description: "Soma de planos com pagamento único." },
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
                 {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    tabs.map(tab => (
                        <TabsContent key={tab.value} value={tab.value}>
                            <div className="mt-4 border rounded-lg">
                                {tab.value === 'anual' && (
                                    <div className="flex justify-end p-4 border-b">
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
                                <div className="p-4">
                                     <PlanSpendingChart 
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
