'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AnnualFinancialChart from '@/components/relatorios/AnnualFinancialChart';
import BusinessSummary from '@/components/relatorios/BusinessSummary';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { text } from '@/lib/strings';
import { useProfile } from '@/hooks/use-profile';

const generateYearOptions = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = 0; i < 5; i++) {
    years.push(currentYear - i);
  }
  return years;
};

export default function ReportsPage() {
  const { activeProfile } = useProfile();
  const yearOptions = generateYearOptions();
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  return (
    <div className="p-4 md:p-6 lg:p-8 lg:pt-4">
      <div className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-2xl font-bold">{text.sidebar.reports}</h1>
            <p className="text-muted-foreground">
                Visualize o resumo financeiro de seus perfis.
            </p>
        </div>
        <div className="flex items-center gap-4">
            <span className="font-semibold">{text.dashboard.yearLabel}:</span>
             <Select
                value={String(selectedYear)}
                onValueChange={(value) => setSelectedYear(Number(value))}
            >
                <SelectTrigger className="w-32">
                <SelectValue placeholder={text.dashboard.selectPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                {yearOptions.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                    {year}
                    </SelectItem>
                ))}
                </SelectContent>
            </Select>
        </div>
      </div>

      {activeProfile === 'Business' ? (
        <div className="space-y-6">
            <BusinessSummary year={selectedYear} />
            <Card>
                <CardHeader>
                <CardTitle>Resumo Gráfico Anual de {selectedYear}</CardTitle>
                </CardHeader>
                <CardContent>
                <AnnualFinancialChart year={selectedYear} />
                </CardContent>
            </Card>
        </div>
      ) : (
        <Card>
            <CardHeader>
            <CardTitle>Resumo Financeiro Anual de {selectedYear}</CardTitle>
            </CardHeader>
            <CardContent>
            <AnnualFinancialChart year={selectedYear} />
            </CardContent>
        </Card>
      )}
    </div>
  );
}
