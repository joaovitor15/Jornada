
'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { text } from '@/lib/strings';
import type { EmergencyReserveEntry } from '@/lib/types';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import { getMonth, getYear } from 'date-fns';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

// --- Base Spending Chart Component ---
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

function ReserveSpendingChart({ entries, groupBy }: { entries: EmergencyReserveEntry[], groupBy: 'mainCategory' | 'subcategory' | 'location' }) {
  const [chartData, setChartData] = useState<SpendingData[]>([]);

  useEffect(() => {
    const totals: { [key: string]: number } = {};
    entries.forEach((entry) => {
      const key = entry[groupBy];
      if (key) {
        totals[key] = (totals[key] || 0) + entry.amount;
      }
    });

    const totalSpending = Object.values(totals).reduce((acc, val) => acc + val, 0);

    const data = Object.entries(totals)
      .filter(([, value]) => value > 0) // Only show items with positive balance
      .map(([name, value]) => ({ name, value, percent: totalSpending > 0 ? (value / totalSpending) * 100 : 0 }))
      .sort((a, b) => b.value - a.value);

    setChartData(data);
  }, [entries, groupBy]);

  if (chartData.length === 0) {
    return <div className="flex justify-center items-center h-64 text-muted-foreground">Sem dados para exibir.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={80}
          innerRadius={60}
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
  );
}

export default function ReserveAnalysisTabs() {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const [entries, setEntries] = useState<EmergencyReserveEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !activeProfile) return;

    setLoading(true);

    const reserveQuery = query(
      collection(db, 'emergencyReserveEntries'),
      where('userId', '==', user.uid),
      where('profile', '==', activeProfile)
    );

    const unsubscribe = onSnapshot(reserveQuery, (snap) => {
      const fetchedEntries = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as EmergencyReserveEntry));
      setEntries(fetchedEntries);
      setLoading(false);
    }, () => setLoading(false));
    

    return () => unsubscribe();

  }, [user, activeProfile]);

  const TABS = [
    { value: "categories", label: "Categorias", content: <ReserveSpendingChart entries={entries} groupBy="mainCategory" /> },
    { value: "subcategories", label: "Subcategorias", content: <ReserveSpendingChart entries={entries} groupBy="subcategory" /> },
    { value: "locations", label: "Locais", content: <ReserveSpendingChart entries={entries} groupBy="location" /> },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <CardTitle>Análise da Reserva</CardTitle>
            <CardDescription>Visualize a distribuição dos seus recursos.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
          <Tabs defaultValue="categories">
            <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${TABS.length}, 1fr)` }}>
              {TABS.map(tab => (
                 <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
              ))}
            </TabsList>
             {loading ? <Loader2 className="mx-auto my-12 h-8 w-8 animate-spin" /> : (
              TABS.map(tab => (
                 <TabsContent key={tab.value} value={tab.value}>
                  {tab.content}
                </TabsContent>
              ))
             )}
          </Tabs>
      </CardContent>
    </Card>
  );
}
