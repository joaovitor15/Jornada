
'use client';

import { useEffect, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  collection,
  addDoc,
  Timestamp,
  writeBatch,
  doc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format, parse, isValid, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { text } from '@/lib/strings';
import { type Plan } from '@/lib/types';
import { CurrencyInput } from '../ui/currency-input';
import { Badge } from '../ui/badge';

const payPlanSchema = z.object({
  date: z.date({ required_error: 'A data do pagamento é obrigatória.' }),
});

type PayPlanFormProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  plan: Plan;
};

export default function PayPlanForm({
  isOpen,
  onOpenChange,
  plan,
}: PayPlanFormProps) {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const { toast } = useToast();
  const [dateInput, setDateInput] = useState('');

  const form = useForm<z.infer<typeof payPlanSchema>>({
    resolver: zodResolver(payPlanSchema),
  });

  const { control, handleSubmit, watch, reset, setValue } = form;
  const { isSubmitting } = form.formState;
  
  const totalAmount = (plan.amount || 0) + (plan.subItems?.reduce((acc, item) => acc + item.price, 0) || 0);

  useEffect(() => {
    if (isOpen) {
      const initialDate = new Date();
      reset({
        date: initialDate,
      });
      setDateInput(format(initialDate, 'dd/MM/yyyy'));
    }
  }, [isOpen, reset]);

  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name === 'date' && value.date) {
        setDateInput(format(value.date, 'dd/MM/yyyy'));
      }
    });
    return () => subscription.unsubscribe();
  }, [watch]);
  
  const handleDateInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const date = parse(e.target.value, 'dd/MM/yyyy', new Date());
    if (isValid(date)) {
      setValue('date', date, { shouldValidate: true });
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!isSubmitting) {
      onOpenChange(open);
    }
  };

  const onSubmit = async (values: z.infer<typeof payPlanSchema>) => {
    if (!user || !activeProfile) {
      toast({
        variant: 'destructive',
        title: text.common.error,
        description: 'Você precisa estar logado.',
      });
      return;
    }
    
    const isCreditCard = plan.paymentMethod.startsWith('Cartão:');
    const installments = isCreditCard ? (plan.installments || 1) : 1;

    try {
        const batch = writeBatch(db);
        const installmentAmount = totalAmount / installments;
        const originalExpenseId = installments > 1 ? doc(collection(db, 'id')).id : null; 
        
        for (let i = 0; i < installments; i++) {
          const installmentDate = addMonths(values.date, i);
          const expenseData: any = {
            userId: user.uid, 
            profile: activeProfile,
            description: installments > 1 ? `${plan.name} (${i + 1}/${installments})` : plan.name,
            amount: installmentAmount, 
            paymentMethod: plan.paymentMethod, 
            date: Timestamp.fromDate(installmentDate),
            installments: installments, 
            currentInstallment: i + 1,
            tags: plan.tags || [],
          };
          
          if (originalExpenseId) { expenseData.originalExpenseId = originalExpenseId; }
          const docRef = doc(collection(db, 'expenses'));
          batch.set(docRef, expenseData);
        }

        await batch.commit();

        toast({
            title: 'Sucesso!',
            description: `Pagamento do plano "${plan.name}" lançado como despesa.`,
        });
        onOpenChange(false);
    } catch (error) {
        console.error('Erro ao lançar despesa do plano:', error);
        toast({
            variant: 'destructive',
            title: text.common.error,
            description: 'Falha ao lançar a despesa do plano.',
        });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Lançar Pagamento do Plano</DialogTitle>
          <DialogDescription>
            Confirme os dados para lançar esta despesa.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
            <div className="p-4 border rounded-lg bg-muted/50">
                <p className="text-sm font-semibold text-muted-foreground">Plano</p>
                <p className="text-lg font-bold">{plan.name}</p>
                <div className="flex justify-between items-end mt-2">
                    <div>
                         <p className="text-sm font-semibold text-muted-foreground">Valor</p>
                         <p className="text-2xl font-bold text-primary">{totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL'})}</p>
                    </div>
                    <Badge variant="secondary">{plan.paymentMethod}</Badge>
                </div>
            </div>

            <div className="flex flex-wrap gap-1">
                {plan.tags?.map(tag => <Badge key={tag} variant="outline">{tag}</Badge>)}
            </div>
        </div>

        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
             <FormField
                control={control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data do Pagamento</FormLabel>
                    <Popover>
                      <div className="flex items-center gap-2">
                        <FormControl>
                          <Input
                            className="pr-8"
                            disabled={isSubmitting}
                            value={dateInput}
                            onChange={(e) => setDateInput(e.target.value)}
                            onBlur={handleDateInputBlur}
                            placeholder="DD/MM/AAAA"
                          />
                        </FormControl>
                        <PopoverTrigger asChild>
                          <Button
                            variant={'outline'}
                            size="icon"
                            className="h-10 w-10 rounded-full"
                            disabled={isSubmitting}
                          >
                            <CalendarIcon className="h-4 w-4" />
                            <span className="sr-only">{text.addExpenseForm.pickDate}</span>
                          </Button>
                        </PopoverTrigger>
                      </div>
                      <FormMessage />
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            if (date) field.onChange(date);
                          }}
                          initialFocus
                          disabled={isSubmitting}
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                  </FormItem>
                )}
              />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                {text.common.cancel}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Lançar Despesa
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
