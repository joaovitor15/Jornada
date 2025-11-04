'use client';

import { text } from '@/lib/strings';
import PlansList from '@/components/planos/plans-list';

export default function PlanosAtuaisPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 lg:pt-4 h-full">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold">{text.sidebar.currentPlans}</h1>
          <p className="text-muted-foreground">{text.plans.description}</p>
        </div>
      </div>
      <PlansList />
    </div>
  );
}
