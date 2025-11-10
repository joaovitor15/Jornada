
'use client';

import React, { useState, useMemo } from 'react';
import { text } from '@/lib/strings';
import PlansList from '@/components/planos/plans-list';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, PlusCircle } from 'lucide-react';
import PlanForm from '@/components/planos/add-plan-form';
import PlanAnalysis from '@/components/planos/PlanAnalysis';
import { Separator } from '@/components/ui/separator';

type FilterType = 'Todos' | 'Mensal' | 'Anual' | 'Vitalício';

export default function PlanosAtuaisPage() {
  const [filter, setFilter] = useState<FilterType>('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [planToEdit, setPlanToEdit] = useState<any | null>(null);

  const filterOptions: { label: string; value: FilterType }[] = [
    { label: 'Todos', value: 'Todos' },
    { label: 'Mensal', value: 'Mensal' },
    { label: 'Anual', value: 'Anual' },
    { label: 'Vitalício', value: 'Vitalício' },
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
          <PlansList 
            filter={filter} 
            searchTerm={searchTerm} 
            onEdit={(plan) => {
              setPlanToEdit(plan);
              setIsFormOpen(true);
            }} 
          />
        </div>

        <Separator className="my-6" />

        <div>
          <PlanAnalysis />
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
