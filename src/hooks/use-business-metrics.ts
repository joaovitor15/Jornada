
'use client';

import { useMemo } from 'react';
import { Income, Expense, HierarchicalTag } from '@/lib/types';

const calculateMetrics = (incomes: Income[], expenses: Expense[], tags: HierarchicalTag[]) => {
    if (!tags.length) return {
        netRevenue: 0, grossProfit: 0, grossMargin: 0, netProfit: 0, netMargin: 0, cmv: 0,
        costMargin: 0, personnelCost: 0, personnelCostMargin: 0, impostos: 0, impostosMargin: 0,
        sistema: 0, sistemaMargin: 0, fixedCosts: 0, fixedCostsMargin: 0,
    };
    
    const receitasTag = tags.find(tag => tag.name === 'Receitas');
    const receitaTagNames = new Set<string>(receitasTag ? [receitasTag.name, ...receitasTag.children.map((c:any) => c.name)] : []);
    const fornecedoresTag = tags.find(t => t.name === 'Fornecedores');
    const fornecedorTagNames = new Set<string>(fornecedoresTag ? [fornecedoresTag.name, ...fornecedoresTag.children.map((c:any) => c.name)] : []);
    const rhTag = tags.find(t => t.name === 'Recursos Humanos');
    const rhTagNames = new Set<string>(rhTag ? [rhTag.name, ...rhTag.children.map((c:any) => c.name)] : []);
    const impostosTag = tags.find(t => t.name === 'Impostos');
    const impostosTagNames = new Set<string>(impostosTag ? [impostosTag.name, ...impostosTag.children.map((c:any) => c.name)] : []);
    const sistemaTag = tags.find(t => t.name === 'Sistemas e Tecnologias');
    const sistemaTagNames = new Set<string>(sistemaTag ? [sistemaTag.name, ...sistemaTag.children.map((c:any) => c.name)] : []);

    const netRevenue = incomes.filter(inc => inc.tags?.some((t:string) => receitaTagNames.has(t)) ?? false).reduce((acc, inc) => acc + inc.amount, 0);
    const supplierCosts = expenses.filter(exp => exp.tags?.some((t:string) => fornecedorTagNames.has(t)) ?? false).reduce((acc, exp) => acc + exp.amount, 0);
    const personnelCost = expenses.filter(exp => exp.tags?.some((t:string) => rhTagNames.has(t)) ?? false).reduce((acc, exp) => acc + exp.amount, 0);
    const impostosCost = expenses.filter(exp => exp.tags?.some((t:string) => impostosTagNames.has(t)) ?? false).reduce((acc, exp) => acc + exp.amount, 0);
    const sistemaCost = expenses.filter(exp => exp.tags?.some((t:string) => sistemaTagNames.has(t)) ?? false).reduce((acc, exp) => acc + exp.amount, 0);
    const totalExpenses = expenses.reduce((acc, exp) => acc + exp.amount, 0);

    const grossProfit = netRevenue - supplierCosts;
    const netProfit = netRevenue - totalExpenses;
    const fixedCosts = totalExpenses - supplierCosts;

    return {
        netRevenue,
        grossProfit,
        grossMargin: netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0,
        netProfit,
        netMargin: netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0,
        cmv: supplierCosts,
        costMargin: netRevenue > 0 ? (supplierCosts / netRevenue) * 100 : 0,
        personnelCost,
        personnelCostMargin: netRevenue > 0 ? (personnelCost / netRevenue) * 100 : 0,
        impostos: impostosCost,
        impostosMargin: netRevenue > 0 ? (impostosCost / netRevenue) * 100 : 0,
        sistema: sistemaCost,
        sistemaMargin: netRevenue > 0 ? (sistemaCost / netRevenue) * 100 : 0,
        fixedCosts,
        fixedCostsMargin: netRevenue > 0 ? (fixedCosts / netRevenue) * 100 : 0,
    };
};

export function useBusinessMetrics(incomes: Income[], expenses: Expense[], tags: HierarchicalTag[]) {
  const metrics = useMemo(() => calculateMetrics(incomes, expenses, tags), [incomes, expenses, tags]);
  return metrics;
}
