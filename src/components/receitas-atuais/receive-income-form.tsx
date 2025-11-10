
'use client';

import { useEffect, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  collection,
  addDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format, parse, isValid } from 'date-fns';
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
import { type IncomePlan } from '@/lib/types';
import { CurrencyInput } from '../ui/currency-input';
import { Badge } from '../ui/badge';
import { useMemo } from 'react';

const receiveIncomeSchema = z.object({
  date: z.date({ required_error: 'A data do recebimento é obrigatória.' }),
  receiptAmount: z.coerce.number().optional(),
});


type ReceiveIncomeFormProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  plan: IncomePlan;
};

export default function ReceiveIncomeForm({
  isOpen,
  onOpenChange,
  plan,
}: ReceiveIncomeFormProps) {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const { toast } = useToast();
  const [dateInput, setDateInput] = useState('');

  const isVariable = plan.valueType === 'Variável';
  
  const dynamicSchema = useMemo(() => {
    return receiveIncomeSchema.refine(data => {
      if (isVariable) {
        return data.receiptAmount !== undefined && data.receiptAmount > 0;
      }
      return true;
    }, {
      message: "O valor é obrigatório para receitas variáveis.",
      path: ['receiptAmount'],
    });
  }, [isVariable]);


  const form = useForm<z.infer<typeof dynamicSchema>>({
    resolver: zodResolver(dynamicSchema),
  });

  const { control, handleSubmit, watch, reset, setValue } = form;
  const { isSubmitting } = form.formState;

  useEffect(() => {
    if (isOpen) {
      const initialDate = new Date();
      
      reset({
        date: initialDate,
        receiptAmount: isVariable ? undefined : plan.amount,
      });
      setDateInput(format(initialDate, 'dd/MM/yyyy'));
    }
  }, [isOpen, reset, isVariable, plan]);

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

  const onSubmit = async (values: z.infer<typeof dynamicSchema>) => {
    if (!user || !activeProfile) {
      toast({
        variant: 'destructive',
        title: text.common.error,
        description: 'Você precisa estar logado.',
      });
      return;
    }
    
    const receiptAmount = isVariable ? values.receiptAmount : plan.amount;
    if (!receiptAmount || receiptAmount <= 0) {
       toast({
            variant: 'destructive',
            title: "Valor Inválido",
            description: "O valor do recebimento deve ser maior que zero.",
        });
        return;
    }

    try {
        await addDoc(collection(db, 'incomes'), {
            userId: user.uid,
            profile: activeProfile,
            description: plan.name,
            amount: receiptAmount,
            date: Timestamp.fromDate(values.date),
            tags: plan.tags || [],
        });

        toast({
            title: 'Sucesso!',
            description: `Receita "${plan.name}" lançada.`,
        });
        onOpenChange(false);
    } catch (error) {
        console.error('Erro ao lançar receita:', error);
        toast({
            variant: 'destructive',
            title: text.common.error,
            description: 'Falha ao processar o recebimento.',
        });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Lançar Recebimento</DialogTitle>
          <DialogDescription>
            Confirme os dados para lançar esta entrada de receita.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-4 py-2">
                <div className="p-4 border rounded-lg bg-muted/50 space-y-2">
                    <p className="text-lg font-bold">{plan.name}</p>
                     <div className="space-y-2">
                       {isVariable ? (
                          <FormField
                            control={control}
                            name="receiptAmount"
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormLabel>Valor Recebido</FormLabel>
                                <FormControl>
                                  <CurrencyInput
                                    placeholder={text.placeholders.amount}
                                    disabled={isSubmitting}
                                    value={field.value}
                                    onValueChange={(values) =>
                                      field.onChange(values?.floatValue)
                                    }
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ) : (
                          <div>
                            <p className="text-sm font-semibold text-muted-foreground">Valor</p>
                            <p className="text-2xl font-bold text-green-500">
                              {(plan.amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL'})}
                            </p>
                          </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap gap-1">
                    {plan.tags?.map(tag => <Badge key={tag} variant="outline">{tag}</Badge>)}
                </div>
            </div>

             <FormField
                control={control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data do Recebimento</FormLabel>
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
                            <span className="sr-only">Escolher data</span>
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
                Lançar Receita
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
