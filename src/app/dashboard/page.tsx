'use client';

import ExpensesList from '@/components/dashboard/expenses-list';
import { text } from '@/lib/strings';

export default function DashboardPage() {
  return (
    <div className="container mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">{text.dashboard.title}</h1>
      </div>
      <ExpensesList />
    </div>
  );
}
