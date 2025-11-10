
'use client';

import { useEffect, useState, useMemo } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  collection,
  addDoc,
  Timestamp,
  writeBatch,
  doc,
  updateDoc,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator';

const payPlanSchema = z.object({
  date: z.date({ required_error: 'A data do pagamento é obrigatória.' }),
  dueDay: z.coerce.number().int().min(1).max(31).optional(),
  dueMonth: z.coerce.number().int().min(0).max(11).optional(),
  dueYear: z.coerce.number().int().min(new Date().getFullYear()).optional(),
}).refine(data => {
    // This validation logic will be conditional in the component
    return true;
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

  const isAnnual = plan.type !== 'Mensal';

  const form = useForm<z.infer<typeof payPlanSchema>>({
    resolver: zodResolver(payPlanSchema),
  });

  const { control, handleSubmit, watch, reset, setValue } = form;
  const { isSubmitting } = form.formState;
  
  const totalAmount = (plan.amount || 0) + (plan.subItems?.reduce((acc, item) => acc + item.price, 0) || 0);

  const monthOptions = Object.entries(text.dashboard.months).map(([key, label], index) => ({
    value: index,
    label: label,
  }));

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 10 }, (_, i) => currentYear + i);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const initialDate = new Date();
      let nextDueDateFields: Partial<z.infer<typeof payPlanSchema>> = {};

      if (isAnnual && plan.dueDate) {
        const currentDueDate = plan.dueDate.toDate();
        const nextDueDate = new Date(currentDueDate.getFullYear() + 1, currentDueDate.getMonth(), currentDueDate.getDate());
        nextDueDateFields = {
            dueDay: nextDueDate.getDate(),
            dueMonth: nextDueDate.getMonth(),
            dueYear: nextDueDate.getFullYear(),
        }
      }

      reset({
        date: initialDate,
        ...nextDueDateFields,
      });
      setDateInput(format(initialDate, 'dd/MM/yyyy'));
    }
  }, [isOpen, reset, isAnnual, plan]);

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
    
    if (isAnnual && (values.dueDay === undefined || values.dueMonth === undefined || values.dueYear === undefined)) {
        toast({
            variant: 'destructive',
            title: "Data de Vencimento Inválida",
            description: "Para planos anuais, por favor, defina o próximo vencimento.",
        });
        return;
    }


    const isCreditCard = plan.paymentMethod.startsWith('Cartão:');
    const installments = isCreditCard ? (plan.installments || 1) : 1;

    try {
        const batch = writeBatch(db);
        const installmentAmount = totalAmount / installments;
        const originalExpenseId = installments > 1 ? doc(collection(db, 'id')).id : null; 
        
        // 1. Create expense(s)
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
        
        // 2. Update plan's next due date if it's an annual plan
        if (isAnnual && values.dueDay !== undefined && values.dueMonth !== undefined && values.dueYear !== undefined) {
            const planRef = doc(db, 'plans', plan.id);
            const newDueDate = Timestamp.fromDate(new Date(values.dueYear, values.dueMonth, values.dueDay));
            batch.update(planRef, { dueDate: newDueDate });
        }


        await batch.commit();

        toast({
            title: 'Sucesso!',
            description: `Pagamento do plano "${plan.name}" lançado e plano atualizado.`,
        });
        onOpenChange(false);
    } catch (error) {
        console.error('Erro ao lançar despesa e atualizar plano:', error);
        toast({
            variant: 'destructive',
            title: text.common.error,
            description: 'Falha ao processar o pagamento e atualizar o plano.',
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

            {isAnnual && (
                <>
                <Separator />
                <div className="space-y-2">
                    <h4 className="text-sm font-medium">Próximo Vencimento</h4>
                     <div className="grid grid-cols-3 gap-2">
                    <FormField
                      control={form.control}
                      name="dueDay"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dia</FormLabel>
                          <FormControl>
                             <Input
                              type="number"
                              min={1}
                              max={31}
                              placeholder='Dia'
                              {...field}
                              onChange={(e) => field.onChange(e.target.valueAsNumber || undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name="dueMonth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mês</FormLabel>
                           <Select onValueChange={(value) => field.onChange(Number(value))} value={String(field.value)}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Mês" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {monthOptions.map((month) => (
                                  <SelectItem key={month.value} value={String(month.value)}>
                                    {month.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name="dueYear"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ano</FormLabel>
                          <Select onValueChange={(value) => field.onChange(Number(value))} value={String(field.value)}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Ano" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {yearOptions.map((year) => (
                                  <SelectItem key={year} value={String(year)}>
                                    {year}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                </>
            )}

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
