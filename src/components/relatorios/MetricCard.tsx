
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { HelpCircle, Loader2, Percent } from 'lucide-react';
import { text } from '@/lib/strings';

type FormatType = 'currency' | 'percent';

interface SubMetric {
    title: string;
    monthlyValue: number;
    annualValue: number;
    format: FormatType;
}

interface MetricCardProps {
  title: string;
  tooltip: string;
  icon: React.ElementType;
  monthlyValue: number;
  annualValue: number;
  formatAs: FormatType;
  periodLabel: string;
  selectedYear: number;
  loading: boolean;
  subMetrics?: SubMetric[];
}

const formatValue = (value: number, format: FormatType) => {
    if (format === 'currency') {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
    return `${value.toFixed(2)}%`;
};

export default function MetricCard({
  title,
  tooltip,
  icon: Icon,
  monthlyValue,
  annualValue,
  formatAs,
  periodLabel,
  selectedYear,
  loading,
  subMetrics,
}: MetricCardProps) {
  const [viewMode, setViewMode] = useState('mensal');

  const mainValue = viewMode === 'mensal' ? monthlyValue : annualValue;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">{title}</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <div style={{ whiteSpace: 'pre-line' }}>{tooltip}</div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div>
            <Tabs
              value={viewMode}
              onValueChange={setViewMode}
              className="w-auto"
            >
              <TabsList className="h-8">
                <TabsTrigger value="mensal" className="text-xs px-2 py-1">
                  {text.reports.monthly}
                </TabsTrigger>
                <TabsTrigger value="anual" className="text-xs px-2 py-1">
                  {text.reports.annual}
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <p className="text-xs text-muted-foreground text-center mt-1">
              ({viewMode === 'mensal' ? periodLabel : selectedYear})
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex justify-start items-center h-24">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50">
                <Icon className="h-6 w-6 text-blue-500" />
              </div>
              <span className="text-2xl font-bold">
                {formatValue(mainValue, formatAs)}
              </span>
            </div>

            {subMetrics && subMetrics.map(sub => {
                const subValue = viewMode === 'mensal' ? sub.monthlyValue : sub.annualValue;
                return (
                    <div key={sub.title} className="mt-4 space-y-2">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{sub.title}</h3>
                        </div>
                        <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900/50">
                            <Percent className="h-6 w-6 text-gray-500" />
                        </div>
                        <span className="text-2xl font-bold">
                            {formatValue(subValue, sub.format)}
                        </span>
                        </div>
                    </div>
                )
            })}
          </>
        )}
      </CardContent>
    </Card>
  );
}

    