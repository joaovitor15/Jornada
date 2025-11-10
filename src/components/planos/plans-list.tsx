
'use client';

import React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  deleteDoc,
  writeBatch,
  orderBy,
} from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import { type Plan } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  PlusCircle,
  MoreVertical,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { text } from '@/lib/strings';
import PlanForm from './add-plan-form';
import PayPlanForm from './pay-plan-form';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '../ui/badge';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Timestamp } from 'firebase/firestore';

function PlanCard({
  plan,
  onEdit,
  onDelete,
  onPay,
  onReorder,
  isFirst,
  isLast,
  isPaid,
}: {
  plan: Plan;
  onEdit: (plan: Plan) => void;
  onDelete: (plan: Plan) => void;
  onPay: (plan: Plan) => void;
  onReorder: (plan: Plan, direction: 'left' | 'right') => void;
  isFirst: boolean;
  isLast: boolean;
  isPaid: boolean;
}) {
  const calculateTotalAmount = (plan: Plan) => {
    if (plan.valueType === 'Variável') return null;
    const subItemsTotal =
      plan.subItems?.reduce((acc, item) => acc + item.price, 0) ?? 0;
    return plan.amount + subItemsTotal;
  };

  const getVencimentoText = (plan: Plan) => {
    if (plan.type === 'Anual' && plan.dueDate && plan.dueDate.toDate) {
      const date = plan.dueDate.toDate();
      return `Vence em: ${format(date, "d 'de' MMMM 'de' yyyy", {
        locale: ptBR,
      })}`;
    }

    if (plan.type === 'Mensal' && plan.paymentDay) {
      const currentMonthName = format(new Date(), 'MMMM', { locale: ptBR });
      return `Vencimento: ${plan.paymentDay} de ${currentMonthName}`;
    }

    return 'Vencimento não definido';
  };

  const hasSubItems = plan.subItems && plan.subItems.length > 0;
  const isCard = plan.paymentMethod.startsWith('Cartão:');
  const totalAmount = calculateTotalAmount(plan);
  
  const getAnnualPlanStatus = () => {
    if (plan.type !== 'Anual' || !plan.dueDate) return null;
    const dueDate = plan.dueDate.toDate();
    const today = new Date();
    const daysUntilDue = differenceInDays(dueDate, today);

    if (daysUntilDue <= 30 && daysUntilDue >= 0) {
      return (
        <Badge variant="destructive" className="bg-orange-500 hover:bg-orange-600 pointer-events-none">
          Vencimento Próximo
        </Badge>
      );
    }
    return <Badge variant="secondary">Vigente</Badge>;
  };


  return (
    <div className="border p-4 rounded-lg shadow-sm relative flex flex-col h-full group">
      <div className="absolute top-1 right-1 flex items-center gap-1">
        {hasSubItems && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
              >
                <AlertCircle className="h-4 w-4 text-blue-500" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="space-y-2">
                <h4 className="font-medium leading-none">Itens do Combo</h4>
                <div className="text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Custo Base:</span>
                    <span className="font-medium text-foreground">
                      {plan.amount.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </span>
                  </div>
                  {plan.subItems?.map((item, index) => (
                    <div key={index} className="flex justify-between">
                      <span>{item.name}:</span>
                      <span className="font-medium text-foreground">
                        {item.price.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={() => onPay(plan)}
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
        <p className="text-xl font-bold text-primary">
          {totalAmount !== null
            ? totalAmount.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })
            : 'Valor Variável'}
        </p>
        <div className="flex flex-wrap gap-1 mt-2">
          {plan.tags
            ?.filter((tag) => !tag.startsWith('planId:'))
            .map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
        </div>
      </div>

      <div className="flex flex-col justify-between items-start mt-4 pt-2 border-t space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{plan.type}</Badge>
           {plan.type === 'Mensal' &&
            (isPaid ? (
              <Badge variant="default" className="bg-green-600 hover:bg-green-700 pointer-events-none">
                <CheckCircle className="mr-1 h-3 w-3" />
                Pago
              </Badge>
            ) : (
              <Badge variant="destructive" className="bg-orange-500 hover:bg-orange-600 pointer-events-none">
                <XCircle className="mr-1 h-3 w-3" />
                Não Pago
              </Badge>
            ))}
            {plan.type === 'Anual' && getAnnualPlanStatus()}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {isCard
              ? plan.paymentMethod.replace('Cartão: ', '')
              : plan.paymentMethod}
          </Badge>
          {isCard && (
            <span className="text-xs font-semibold text-muted-foreground">
              {plan.installments && plan.installments > 1
                ? `${plan.installments}x`
                : 'À Vista'}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {getVencimentoText(plan)}
        </p>
      </div>
    </div>
  );
}

type FilterType = 'Todos' | 'Mensal' | 'Anual' | 'Vitalício';

interface PlansListProps {
  plans: Plan[];
  filter: FilterType;
  searchTerm: string;
  onEdit: (plan: Plan) => void;
  paidPlanIds: Set<string>;
}

export default function PlansList({ plans, filter, searchTerm, onEdit, paidPlanIds }: PlansListProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isPayFormOpen, setIsPayFormOpen] = useState(false);
  const [planToPay, setPlanToPay] = useState<Plan | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<Plan | null>(null);

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

  const handlePayClick = (plan: Plan) => {
    setPlanToPay(plan);
    setIsPayFormOpen(true);
  };

  const handleDeleteRequest = (plan: Plan) => {
    setPlanToDelete(plan);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!planToDelete) return;
    try {
      await deleteDoc(doc(db, 'plans', planToDelete.id));
      toast({
        title: text.common.success,
        description: 'Plano excluído com sucesso.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: text.common.error,
        description: 'Falha ao excluir o plano.',
      });
    }
    setIsDeleteDialogOpen(false);
    setPlanToDelete(null);
  };
  
  const handleReorder = async (plan: Plan, direction: 'left' | 'right') => {
    const currentIndex = plans.findIndex(p => p.id === plan.id);
    if (currentIndex === -1) return;

    const newIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= plans.length) return;

    const newPlans = [...plans];
    const [movedPlan] = newPlans.splice(currentIndex, 1);
    newPlans.splice(newIndex, 0, movedPlan);

    const batch = writeBatch(db);
    newPlans.forEach((p, index) => {
      const planRef = doc(db, 'plans', p.id);
      batch.update(planRef, { order: index });
    });

    try {
      await batch.commit();
      // A UI será atualizada pelo listener do onSnapshot
    } catch (error) {
      console.error("Error reordering plans:", error);
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível reordenar os planos.' });
    }
  };


  return (
    <>
      {filteredPlans.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredPlans.map((plan, index) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onEdit={onEdit}
              onDelete={handleDeleteRequest}
              onPay={handlePayClick}
              onReorder={handleReorder}
              isFirst={index === 0}
              isLast={index === filteredPlans.length - 1}
              isPaid={plan.type === 'Mensal' && paidPlanIds.has(plan.id)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-10 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">{text.plans.noPlans}</p>
        </div>
      )}

      {planToPay && (
        <PayPlanForm
          isOpen={isPayFormOpen}
          onOpenChange={setIsPayFormOpen}
          plan={planToPay}
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
              {text.plans.deletePlanConfirmation}
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
