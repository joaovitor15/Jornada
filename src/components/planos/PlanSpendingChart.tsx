
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plan } from '@/lib/types';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

interface SpendingData {
  name: string;
  value: number;
  percent: number;
}

const CATEGORY_COLORS = [
  '#2563eb', '#f97316', '#22c55e', '#ef4444', '#8b5cf6',
  '#f59e0b', '#10b981', '#d946ef', '#0ea5e9', '#6d28d9',
  '#ec4899', '#f43f5e', '#84cc16', '#14b8a6', '#6366f1',
];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-background border border-border p-2 rounded-lg shadow-lg">
        <p className="font-bold">{`${data.name}: ${formatCurrency(data.value)}`}</p>
        <p className="text-sm text-muted-foreground">{`${data.percent.toFixed(2)}% do total`}</p>
      </div>
    );
  }
  return null;
};

export default function PlanSpendingChart({ plans }: { plans: Plan[] }) {
  const [fixedPlansData, setFixedPlansData] = useState<SpendingData[]>([]);
  const [variablePlans, setVariablePlans] = useState<Plan[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fixedValuePlans = plans.filter(p => p.valueType === 'Fixo');
    const variableValuePlans = plans.filter(p => p.valueType === 'Variável');

    const data = fixedValuePlans
      .map(plan => {
        const value = (plan.amount || 0) + (plan.subItems?.reduce((acc, item) => acc + item.price, 0) || 0);
        return {
          name: plan.name,
          value: value,
        };
      })
      .filter(item => item.value > 0);

    const totalValue = data.reduce((acc, item) => acc + item.value, 0);
    setTotal(totalValue);

    const chartItems = data
        .map(item => ({
            ...item,
            percent: totalValue > 0 ? (item.value / totalValue) * 100 : 0
        }))
        .sort((a,b) => b.value - a.value);

    setFixedPlansData(chartItems);
    setVariablePlans(variableValuePlans);
  }, [plans]);

  if (plans.length === 0) {
    return <div className="flex justify-center items-center h-64 text-muted-foreground">Nenhum plano para exibir.</div>;
  }

  return (
    <div className="flex flex-col items-center">
      {fixedPlansData.length > 0 && (
        <>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={fixedPlansData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={110}
                innerRadius={80}
                paddingAngle={2}
              >
                {fixedPlansData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                iconSize={10}
                layout="vertical"
                verticalAlign="middle"
                align="right"
                wrapperStyle={{ overflowY: 'auto', maxHeight: 280 }}
                formatter={(value, entry) => {
                  const { payload } = entry;
                  const percent = (payload as any)?.percent || 0;
                  return (
                    <span className="text-muted-foreground text-xs">
                      {value} ({formatCurrency(entry.payload?.value || 0)}) <span className="font-bold">{percent.toFixed(2)}%</span>
                    </span>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="text-center mt-4">
            <span className="text-sm text-muted-foreground">Total (Custo Fixo)</span>
            <p className="text-2xl font-bold">{formatCurrency(total)}</p>
          </div>
        </>
      )}

      {variablePlans.length > 0 && (
        <div className="w-full mt-6">
          {fixedPlansData.length > 0 && <Separator className="my-4" />}
          <h4 className="text-sm font-semibold text-center text-muted-foreground mb-3">Planos de Valor Variável</h4>
          <div className="flex flex-wrap justify-center gap-2">
            {variablePlans.map(plan => (
              <Badge key={plan.id} variant="outline">{plan.name}</Badge>
            ))}
          </div>
        </div>
      )}

      {fixedPlansData.length === 0 && variablePlans.length === 0 && (
         <div className="flex justify-center items-center h-64 text-muted-foreground">Nenhum plano para exibir.</div>
      )}
    </div>
  );
}
