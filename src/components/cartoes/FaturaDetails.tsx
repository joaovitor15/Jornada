'use client';

import { Card as CardType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { format, getMonth, getYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, TrendingUp, TrendingDown } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface FaturaDetailsProps {
  card: CardType;
  selectedFatura: { month: number; year: number };
  onFaturaSelect: () => void;
}

// Mock data - will be replaced with real data later
const mockTransactions = [
  {
    id: '1',
    date: '2024-07-15',
    description: 'Compra no Mercado Livre',
    amount: -150.75,
  },
  {
    id: '2',
    date: '2024-07-12',
    description: 'Pagamento da Fatura',
    amount: 1000.0,
  },
  {
    id: '3',
    date: '2024-07-10',
    description: 'Restaurante',
    amount: -85.5,
  },
    {
    id: '4',
    date: '2024-07-05',
    description: 'Shopee',
    amount: -45.99,
  },
];

const mockFaturaValue = 1234.56;
const mockClosingDate = '25/07/2024';
const mockDueDate = '04/08/2024';

export default function FaturaDetails({
  card,
  selectedFatura,
  onFaturaSelect,
}: FaturaDetailsProps) {
  const faturaDate = new Date(selectedFatura.year, selectedFatura.month);
  const formattedFatura =
    format(faturaDate, 'MMMM', { locale: ptBR }) +
    ` de ${selectedFatura.year}`;

  return (
    <div className="flex flex-col h-full border rounded-lg p-4 space-y-4">
      <Button variant="outline" className="w-full" onClick={onFaturaSelect}>
        <CalendarIcon className="mr-2 h-4 w-4" />
        <span>{formattedFatura}</span>
      </Button>

      {/* Resumo da Fatura */}
      <div className="border rounded-lg p-4 text-center">
        <p className="text-sm text-green-500 font-semibold">Fatura Paga</p>
        <p className="text-3xl font-bold">
          {mockFaturaValue.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          })}
        </p>
        <div className="flex justify-center gap-4 text-xs text-muted-foreground mt-1">
          <span>Fechamento: {mockClosingDate}</span>
          <span>Vencimento: {mockDueDate}</span>
        </div>
      </div>
      
      {/* Lista de Movimentações */}
      <div className="flex-1 overflow-auto">
        <h3 className="text-md font-semibold mb-2">Movimentações da Fatura</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockTransactions.map((tx) => (
              <TableRow key={tx.id}>
                <TableCell className="text-xs text-muted-foreground">{new Date(tx.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</TableCell>
                <TableCell className="font-medium flex items-center gap-2">
                   {tx.amount > 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                  {tx.description}
                </TableCell>
                <TableCell
                  className={`text-right font-semibold ${
                    tx.amount > 0 ? 'text-green-500' : 'text-foreground'
                  }`}
                >
                  {Math.abs(tx.amount).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
