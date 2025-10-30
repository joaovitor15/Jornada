'use client';

import { useEffect, useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  doc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import { type Card, type Expense } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { CurrencyInput } from '../ui/currency-input';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ScrollArea } from '../ui/scroll-area';

const formSchema = z.object({
  parcelas: z.array(z.string()).min(1, 'Selecione pelo menos uma parcela para antecipar.'),
  novoValor: z.coerce
    .number({
      required_error: 'O novo valor é obrigatório.',
      invalid_type_error: 'O novo valor é obrigatório.',
    })
    .positive('O novo valor deve ser positivo.'),
});

interface AnteciparParcelasFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  expense: Expense;
  card: Card;
}

export default function AnteciparParcelasForm({
  isOpen,
  onOpenChange,
  expense,
  card,
}: AnteciparParcelasFormProps) {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const [futureInstallments, setFutureInstallments] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      parcelas: [],
      novoValor: undefined,
    },
  });

  const { isSubmitting, watch, control, formState: { errors } } = form;
  const selectedParcelasIds = watch('parcelas');

  useEffect(() => {
    const fetchFutureInstallments = async () => {
      if (!user || !activeProfile || !expense.originalExpenseId) return;
      setLoading(true);
      try {
        const q = query(
          collection(db, 'expenses'),
          where('userId', '==', user.uid),
          where('profile', '==', activeProfile),
          where('originalExpenseId', '==', expense.originalExpenseId),
          where('date', '>', expense.date)
        );
        const querySnapshot = await getDocs(q);
        const installments = querySnapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() } as Expense))
          .sort((a, b) => a.date.toMillis() - b.date.toMillis());
        setFutureInstallments(installments);
      } catch (error) {
        console.error('Error fetching future installments:', error);
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Não foi possível buscar as parcelas futuras.',
        });
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchFutureInstallments();
      form.reset();
    }
  }, [isOpen, user, activeProfile, expense, toast, form]);

  const originalTotal = useMemo(() => {
    return futureInstallments
      .filter((p) => selectedParcelasIds?.includes(p.id))
      .reduce((acc, p) => acc + p.amount, 0);
  }, [selectedParcelasIds, futureInstallments]);
  
  const discount = useMemo(() => {
      const newTotal = form.getValues('novoValor') || 0;
      if (originalTotal > 0 && newTotal > 0) {
        return originalTotal - newTotal;
      }
      return 0;
  }, [originalTotal, form.watch('novoValor')]);


  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user || !activeProfile) return;

    const batch = writeBatch(db);

    // 1. Delete the current installment to avoid duplication if it's included in logic, but here we only anticipate future ones.
    // The current expense is being replaced by the new anticipated one. So we delete it.
    const currentInstallmentRef = doc(db, 'expenses', expense.id);
    batch.delete(currentInstallmentRef);
    
    // 2. Delete selected future installments
    values.parcelas.forEach((parcelaId) => {
      const docRef = doc(db, 'expenses', parcelaId);
      batch.delete(docRef);
    });

    // 3. Create a new single expense for the anticipation
    const newExpenseRef = doc(collection(db, 'expenses'));
    const newExpense: Omit<Expense, 'id'> = {
      userId: user.uid,
      profile: activeProfile,
      amount: values.novoValor,
      description: `Antecipação: ${expense.description.replace(/\s\(\d+\/\d+\)/, '')}`,
      date: expense.date, // Use a data da parcela atual
      mainCategory: expense.mainCategory,
      subcategory: expense.subcategory,
      paymentMethod: expense.paymentMethod,
    };
    batch.set(newExpenseRef, newExpense);

    try {
      await batch.commit();
      toast({
        title: 'Sucesso!',
        description: 'Parcelas antecipadas com sucesso.',
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error anticipating installments:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível antecipar as parcelas.',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Antecipar Parcelas</DialogTitle>
          <DialogDescription>
            Selecione as parcelas futuras que deseja antecipar para a fatura atual.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
            <div className="flex items-center justify-center h-40">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
                <h4 className="font-medium">Parcelas Futuras</h4>
                <ScrollArea className="h-40 rounded-md border p-4">
                    <FormField
                        control={control}
                        name="parcelas"
                        render={({ field }) => (
                           <FormItem>
                            <div className="space-y-2">
                            {futureInstallments.map((installment) => (
                                <FormField
                                  key={installment.id}
                                  control={control}
                                  name="parcelas"
                                  render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(installment.id)}
                                          onCheckedChange={(checked) => {
                                            return checked
                                              ? field.onChange([...field.value, installment.id])
                                              : field.onChange(
                                                  field.value?.filter(
                                                    (value) => value !== installment.id
                                                  )
                                                )
                                          }}
                                        />
                                      </FormControl>
                                      <Label htmlFor={installment.id} className="flex justify-between w-full cursor-pointer font-normal">
                                        <span>{`Parcela ${installment.currentInstallment}/${installment.installments} - ${format(installment.date.toDate(), 'dd/MM/yyyy')}`}</span>
                                        <span>{installment.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL'})}</span>
                                      </Label>
                                    </FormItem>
                                  )}
                                />
                            ))}
                            </div>
                             <FormMessage className="pt-2"/>
                            </FormItem>
                        )}
                    />
                </ScrollArea>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <Label>Valor Original Selecionado</Label>
                    <p className="font-bold text-lg">{originalTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL'})}</p>
                </div>
                 <div className="space-y-1">
                    <Label>Desconto Obtido</Label>
                    <p className="font-bold text-lg text-green-600">{discount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL'})}</p>
                </div>
            </div>

            <FormField
              control={control}
              name="novoValor"
              render={({ field }) => (
                 <FormItem>
                  <FormLabel htmlFor="novo-valor">Novo Valor Total (com desconto)</FormLabel>
                   <FormControl>
                     <CurrencyInput
                      id="novo-valor"
                      placeholder="0,00"
                      disabled={isSubmitting}
                      value={field.value}
                      onValueChange={(values) => field.onChange(values?.floatValue)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting || (selectedParcelasIds?.length || 0) === 0}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Antecipar e Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
