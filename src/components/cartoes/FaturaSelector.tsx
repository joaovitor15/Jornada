'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card as CardType } from '@/lib/types';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';


// Mock data
const mockFaturas = [
  { month: 6, year: 2024, status: 'Fatura atual', value: 1234.56 },
  { month: 5, year: 2024, status: 'Fatura paga', value: 1150.23 },
  { month: 4, year: 2024, status: 'Fatura paga', value: 987.45 },
  { month: 3, year: 2024, status: 'Fatura paga', value: 1321.00 },
];

const months = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];


interface FaturaSelectorProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  card: CardType;
  onFaturaSelect: (fatura: { month: number, year: number }) => void;
  currentFatura: { month: number, year: number };
}

export default function FaturaSelector({ isOpen, onOpenChange, card, onFaturaSelect, currentFatura }: FaturaSelectorProps) {

  const handleSelect = (fatura: { month: number, year: number }) => {
    onFaturaSelect(fatura);
    onOpenChange(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Selecione uma fatura</DialogTitle>
          <DialogDescription>
            Escolha um mês para visualizar os detalhes da fatura do cartão {card.name}.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col space-y-2 py-4">
          {mockFaturas.map((fatura, index) => (
             <button
              key={index}
              onClick={() => handleSelect(fatura)}
              className={cn(
                "w-full text-left p-3 rounded-lg transition-colors flex items-center justify-between",
                currentFatura.month === fatura.month && currentFatura.year === fatura.year 
                  ? "bg-primary/10" 
                  : "hover:bg-muted"
              )}
            >
              <div>
                <p className="font-semibold">{months[fatura.month]} de {fatura.year}</p>
                <p className={`text-sm ${fatura.status === 'Fatura paga' ? 'text-green-500' : 'text-blue-500'}`}>
                  {fatura.status}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-bold text-lg">
                  {fatura.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
                  <ChevronRight className="h-5 w-5 text-secondary-foreground" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
