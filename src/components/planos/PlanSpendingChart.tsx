
'use client';

import { useState, useEffect } from 'react';
import { Plan } from '@/lib/types';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';

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

export default function PlanSpendingChart({ plans, isAnnualized = false }: { plans: Plan[], isAnnualized?: boolean }) {
  const [chartData, setChartData] = useState<SpendingData[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const data = plans
      .map(plan => {
        let value = plan.valueType === 'Fixo'
          ? (plan.amount || 0) + (plan.subItems?.reduce((acc, item) => acc + item.price, 0) || 0)
          : 0; // Planos variáveis não entram no gráfico de custo fixo
          
        if (isAnnualized && plan.type === 'Mensal') {
            value = value * 12;
        }
        
        return {
          name: plan.name,
          value,
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

    setChartData(chartItems);
  }, [plans, isAnnualized]);

  if (plans.length === 0 || chartData.length === 0) {
    return <div className="flex justify-center items-center h-64 text-muted-foreground">Nenhum plano para exibir.</div>;
  }

  return (
    <div className="flex flex-col items-center">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={110}
            innerRadius={80}
            paddingAngle={2}
          >
            {chartData.map((entry, index) => (
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
        <span className="text-sm text-muted-foreground">Total</span>
        <p className="text-2xl font-bold">{formatCurrency(total)}</p>
      </div>
    </div>
  );
}
