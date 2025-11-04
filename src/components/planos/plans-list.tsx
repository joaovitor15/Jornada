'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  deleteDoc,
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
  FolderOpen,
  AlertCircle,
} from 'lucide-react';
import { text } from '@/lib/strings';
import PlanForm from './add-plan-form';
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

function PlanCard({
  plan,
  onEdit,
  onDelete,
}: {
  plan: Plan;
  onEdit: (plan: Plan) => void;
  onDelete: (plan: Plan) => void;
}) {
  const calculateTotalAmount = (plan: Plan) => {
    const subItemsTotal =
      plan.subItems?.reduce((acc, item) => acc + item.price, 0) ?? 0;
    return plan.amount + subItemsTotal;
  };

  const hasSubItems = plan.subItems && plan.subItems.length > 0;

  return (
    <div className="border p-4 rounded-lg shadow-sm relative group flex flex-col h-full">
      <div className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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

      <div className="flex-grow">
        <h3 className="text-lg font-semibold pr-8">{plan.name}</h3>
        <p className="text-xl font-bold text-primary">
          {calculateTotalAmount(plan).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          })}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
          <Badge variant="secondary">{plan.mainCategory}</Badge>
          <span className="text-muted-foreground text-xs">&gt;</span>
          <Badge variant="outline">{plan.subcategory}</Badge>
        </div>
      </div>

      <div className="flex justify-between items-end mt-4 pt-2 border-t">
        <p className="text-sm text-muted-foreground">{plan.type}</p>
        <p className="text-sm text-muted-foreground">
          Vence dia: {plan.paymentDay}
        </p>
      </div>
    </div>
  );
}

export default function PlansList() {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [planToEdit, setPlanToEdit] = useState<Plan | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<Plan | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!user || !activeProfile) {
      setLoading(false);
      setPlans([]);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, 'plans'),
      where('userId', '==', user.uid),
      where('profile', '==', activeProfile)
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const userPlans = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Plan[];
        setPlans(userPlans);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching plans: ', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, activeProfile]);

  const handleAddClick = () => {
    setPlanToEdit(null);
    setIsFormOpen(true);
  };

  const handleEditClick = (plan: Plan) => {
    setPlanToEdit(plan);
    setIsFormOpen(true);
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

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={handleAddClick}>
          <PlusCircle className="mr-2 h-4 w-4" />
          {text.plans.newPlan}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : plans.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onEdit={handleEditClick}
              onDelete={handleDeleteRequest}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-10 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">{text.plans.noPlans}</p>
        </div>
      )}

      <PlanForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        planToEdit={planToEdit}
      />

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
