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
import type { Income } from '@/lib/types';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import { useTags } from '@/hooks/use-tags';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

// --- Base Income Chart Component ---
interface IncomeData {
  name: string;
  value: number;
  percent: number;
}

const CATEGORY_COLORS = [
  '#22c55e', '#8b5cf6', '#f97316', '#2563eb', '#ef4444',
  '#10b981', '#f59e0b', '#d946ef', '#6d28d9', '#0ea5e9',
  '#f43f5e', '#ec4899', '#14b8a6', '#84cc16', '#6366f1',
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

function IncomeChart({ incomes, selectedPrincipalTagId, analysisType }: { incomes: Income[], selectedPrincipalTagId: string | 'all', analysisType: 'principal' | 'secundaria' }) {
  const [chartData, setChartData] = useState<IncomeData[]>([]);
  const { hierarchicalTags } = useTags();

  useEffect(() => {
    const totals: { [key: string]: number } = {};
    const totalIncomes = incomes.reduce((acc, inc) => acc + inc.amount, 0);

    if (analysisType === 'principal') {
        const tagToPrincipalMap: { [key: string]: string } = {};
        hierarchicalTags.forEach(pt => {
            pt.children.forEach(st => {
                tagToPrincipalMap[st.name] = pt.name;
            });
        });

        incomes.forEach(income => {
            if (income.tags && income.tags.length > 0) {
                const uniquePrincipalTags = new Set<string>();
                income.tags.forEach(tag => {
                    if (tagToPrincipalMap[tag]) {
                        uniquePrincipalTags.add(tagToPrincipalMap[tag]);
                    }
                });
                uniquePrincipalTags.forEach(principalTag => {
                    totals[principalTag] = (totals[principalTag] || 0) + income.amount;
                });
            }
        });
    } else { // 'secundaria'
        const relevantSubTags = selectedPrincipalTagId === 'all'
            ? hierarchicalTags.flatMap(pt => pt.children.map(st => st.name))
            : hierarchicalTags.find(pt => pt.id === selectedPrincipalTagId)?.children.map(st => st.name) || [];

        incomes.forEach((income) => {
            if (income.tags && income.tags.length > 0) {
                income.tags.forEach(tag => {
                    if (relevantSubTags.includes(tag)) {
                        totals[tag] = (totals[tag] || 0) + income.amount;
                    }
                });
            }
        });
    }

    const data = Object.entries(totals)
      .map(([name, value]) => ({ name, value, percent: totalIncomes > 0 ? (value / totalIncomes) * 100 : 0 }))
      .sort((a, b) => b.value - a.value);

    setChartData(data);
  }, [incomes, selectedPrincipalTagId, analysisType, hierarchicalTags]);

  if (incomes.length === 0) {
    return <div className="flex justify-center items-center h-64 text-muted-foreground">Sem receitas neste período.</div>;
  }
  
  if (chartData.length === 0) {
     return <div className="flex justify-center items-center h-64 text-muted-foreground">Sem receitas com tags neste período/filtro.</div>;
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


interface IncomeAnalysisTabsProps {
  selectedMonth: number;
  selectedYear: number;
}


// --- Main Tabs Component ---
export default function IncomeAnalysisTabs({ selectedMonth, selectedYear }: IncomeAnalysisTabsProps) {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const { hierarchicalTags, loading: tagsLoading } = useTags();
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('mensal');
  const [analysisType, setAnalysisType] = useState<'principal' | 'secundaria'>('principal');
  const [selectedPrincipalTagId, setSelectedPrincipalTagId] = useState<string | 'all'>('all');

  const principalTags = useMemo(() => {
    return hierarchicalTags.filter(t => t.isPrincipal && t.children.length > 0);
  }, [hierarchicalTags]);

  const months = Object.values(text.dashboard.months);
  const periodLabel = useMemo(() => {
    return viewMode === 'mensal' ? `${months[selectedMonth]} de ${selectedYear}` : selectedYear;
  }, [selectedMonth, selectedYear, viewMode, months]);


  useEffect(() => {
    if (!user || !activeProfile) return;

    setLoading(true);

    const startDate = viewMode === 'mensal'
      ? new Date(selectedYear, selectedMonth, 1)
      : new Date(selectedYear, 0, 1);
    const endDate = viewMode === 'mensal'
      ? new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59)
      : new Date(selectedYear, 11, 31, 23, 59, 59);

    const incomesQuery = query(
      collection(db, 'incomes'),
      where('userId', '==', user.uid),
      where('profile', '==', activeProfile),
      where('date', '>=', Timestamp.fromDate(startDate)),
      where('date', '<=', Timestamp.fromDate(endDate))
    );

    const unsubIncomes = onSnapshot(incomesQuery, (snap) => {
      const fetchedIncomes = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Income));
      setIncomes(fetchedIncomes);
      setLoading(false);
    }, () => setLoading(false));

    return () => {
      unsubIncomes();
    };

  }, [user, activeProfile, selectedYear, selectedMonth, viewMode]);

  const TAG_TABS = [
     { value: 'principal', label: 'Tag Principal' },
     { value: 'secundaria', label: 'Tag Secundária' },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <CardTitle>Análise de Receitas</CardTitle>
            <CardDescription>Veja suas receitas por tags.</CardDescription>
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
              ({periodLabel})
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
          <Tabs defaultValue="principal" value={analysisType} onValueChange={(v) => setAnalysisType(v as any)}>
            <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${TAG_TABS.length}, 1fr)` }}>
              {TAG_TABS.map(tab => (
                 <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
              ))}
            </TabsList>
             {(loading || tagsLoading) ? <Loader2 className="mx-auto my-12 h-8 w-8 animate-spin" /> : (
              TAG_TABS.map(tab => (
                 <TabsContent key={tab.value} value={tab.value} className="mt-4">
                   {tab.value === 'secundaria' && (
                     <div className="mb-4">
                        <Select value={selectedPrincipalTagId} onValueChange={setSelectedPrincipalTagId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione uma Tag Principal" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas as Tags</SelectItem>
                                {principalTags.map(tag => (
                                    <SelectItem key={tag.id} value={tag.id}>{tag.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                  )}
                  <IncomeChart incomes={incomes} selectedPrincipalTagId={selectedPrincipalTagId} analysisType={tab.value as any} />
                </TabsContent>
              ))
             )}
          </Tabs>
      </CardContent>
    </Card>
  );
}
