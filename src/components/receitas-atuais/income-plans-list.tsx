
'use client';

import React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import {
  doc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { type IncomePlan } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  MoreVertical,
  Pencil,
  Trash2,
  DollarSign,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { text } from '@/lib/strings';
import ReceiveIncomeForm from './receive-income-form';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { Badge } from '../ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function IncomePlanCard({
  plan,
  onEdit,
  onDelete,
  onReceive,
  onReorder,
  isFirst,
  isLast,
}: {
  plan: IncomePlan;
  onEdit: (plan: IncomePlan) => void;
  onDelete: (plan: IncomePlan) => void;
  onReceive: (plan: IncomePlan) => void;
  onReorder: (plan: IncomePlan, direction: 'left' | 'right') => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  
  const getReceiptDayText = (plan: IncomePlan) => {
    if (plan.type === 'Mensal' && plan.receiptDay) {
      return `Recebimento dia ${plan.receiptDay} de cada mês`;
    }
    if (plan.type === 'Diário') {
      return 'Recebimento diário';
    }
    return 'Recebimento não definido';
  };

  return (
    <div className="border p-4 rounded-lg shadow-sm relative flex flex-col h-full group">
      <div className="absolute top-1 right-1 flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={() => onReceive(plan)}
        >
          <DollarSign className="h-4 w-4 text-green-600" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0 rounded-full">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(plan)}>
              <Pencil className="mr-2 h-4 w-4" />
              <span>{text.common.rename}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(plan)}
              className="text-red-500"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              <span>{text.common.delete}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="absolute top-1/2 -translate-y-1/2 left-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => onReorder(plan, 'left')} disabled={isFirst}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
      <div className="absolute top-1/2 -translate-y-1/2 right-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => onReorder(plan, 'right')} disabled={isLast}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-grow">
        <h3 className="text-lg font-semibold pr-8">{plan.name}</h3>
        <p className="text-xl font-bold text-green-600">
          {plan.valueType === 'Fixo'
            ? plan.amount.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })
            : 'Valor Variável'}
        </p>
        <div className="flex flex-wrap gap-1 mt-2">
          {plan.tags
            ?.filter((tag) => tag !== 'Mensal' && tag !== 'Anual' && tag !== 'Vitalício')
            .map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
        </div>
      </div>

      <div className="flex flex-col justify-between items-start mt-4 pt-2 border-t space-y-2">
        <Badge variant="outline">{plan.type}</Badge>
        <p className="text-sm text-muted-foreground">
          {getReceiptDayText(plan)}
        </p>
      </div>
    </div>
  );
}

type FilterType = 'Todos' | 'Diário' | 'Mensal' | 'Anual';

interface IncomePlansListProps {
  plans: IncomePlan[];
  filter: FilterType;
  searchTerm: string;
  onEdit: (plan: IncomePlan) => void;
}

export default function IncomePlansList({ plans, filter, searchTerm, onEdit }: IncomePlansListProps) {
  const { toast } = useToast();
  const [isReceiveFormOpen, setIsReceiveFormOpen] = useState(false);
  const [planToReceive, setPlanToReceive] = useState<IncomePlan | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<IncomePlan | null>(null);

  const filteredPlans = useMemo(() => {
    let tempPlans = plans;

    if (filter !== 'Todos') {
      tempPlans = tempPlans.filter(plan => plan.type === filter);
    }

    if (searchTerm) {
      tempPlans = tempPlans.filter(plan =>
        plan.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return tempPlans;
  }, [plans, filter, searchTerm]);

  const handleReceiveClick = (plan: IncomePlan) => {
    setPlanToReceive(plan);
    setIsReceiveFormOpen(true);
  };

  const handleDeleteRequest = (plan: IncomePlan) => {
    setPlanToDelete(plan);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!planToDelete) return;
    try {
      await deleteDoc(doc(db, 'incomePlans', planToDelete.id));
      toast({
        title: text.common.success,
        description: 'Plano de receita excluído com sucesso.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: text.common.error,
        description: 'Falha ao excluir o plano de receita.',
      });
    }
    setIsDeleteDialogOpen(false);
    setPlanToDelete(null);
  };
  
  const handleReorder = async (plan: IncomePlan, direction: 'left' | 'right') => {
    const currentIndex = plans.findIndex(p => p.id === plan.id);
    if (currentIndex === -1) return;

    const newIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= plans.length) return;

    const newPlans = [...plans];
    const [movedPlan] = newPlans.splice(currentIndex, 1);
    newPlans.splice(newIndex, 0, movedPlan);

    const batch = writeBatch(db);
    newPlans.forEach((p, index) => {
      const planRef = doc(db, 'incomePlans', p.id);
      batch.update(planRef, { order: index });
    });

    try {
      await batch.commit();
    } catch (error) {
      console.error("Error reordering income plans:", error);
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível reordenar os planos.' });
    }
  };


  return (
    <>
      {filteredPlans.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredPlans.map((plan, index) => (
            <IncomePlanCard
              key={plan.id}
              plan={plan}
              onEdit={onEdit}
              onDelete={handleDeleteRequest}
              onReceive={handleReceiveClick}
              onReorder={handleReorder}
              isFirst={index === 0}
              isLast={index === filteredPlans.length - 1}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-10 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">Nenhum plano de receita encontrado.</p>
        </div>
      )}

      {planToReceive && (
        <ReceiveIncomeForm
          isOpen={isReceiveFormOpen}
          onOpenChange={setIsReceiveFormOpen}
          plan={planToReceive}
        />
      )}

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{text.common.delete}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente seu plano de receita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{text.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              {text.common.continue}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
