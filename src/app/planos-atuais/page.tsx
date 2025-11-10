
'use client';

import React, { useState, useMemo } from 'react';
import { text } from '@/lib/strings';
import PlansList from '@/components/planos/plans-list';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

type FilterType = 'Todos' | 'Mensal' | 'Anual' | 'Vitalício';

export default function PlanosAtuaisPage() {
  const [filter, setFilter] = useState<FilterType>('Todos');
  const [searchTerm, setSearchTerm] = useState('');

  const filterOptions: { label: string; value: FilterType }[] = [
    { label: 'Todos', value: 'Todos' },
    { label: 'Mensal', value: 'Mensal' },
    { label: 'Anual', value: 'Anual' },
    { label: 'Vitalício', value: 'Vitalício' },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8 lg:pt-4 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold">{text.sidebar.currentPlans}</h1>
          <p className="text-muted-foreground">{text.plans.description}</p>
        </div>
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
      <div className="flex-grow overflow-auto">
        <PlansList filter={filter} searchTerm={searchTerm} />
      </div>
    </div>
  );
}
