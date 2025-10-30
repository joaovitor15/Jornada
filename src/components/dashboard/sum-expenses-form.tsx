'use client';

import { useEffect, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '../ui/textarea';
import { text } from '@/lib/strings';

const formSchema = z.object({
  values: z.string().min(1, 'Pelo menos um valor é necessário.'),
  date: z.date({ required_error: 'A data é obrigatória.' }),
});

type SumExpensesFormProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export default function SumExpensesForm({
  isOpen,
  onOpenChange,
}: SumExpensesFormProps) {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const { toast } = useToast();
  const [total, setTotal] = useState(0);
  const [dateInput, setDateInput] = useState('');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });
  
  const { control, handleSubmit, watch, reset, setValue } = form;
  const { isSubmitting } = form.formState;

  const valuesInput = watch('values');

  useEffect(() => {
    if (!valuesInput) {
      setTotal(0);
      return;
    }
    const numbers = valuesInput
      .replace(/,/g, '.')
      .split(/\s+/)
      .map(parseFloat)
      .filter(n => !isNaN(n));
    
    const sum = numbers.reduce((acc, curr) => acc + curr, 0);
    setTotal(sum);
  }, [valuesInput]);

  useEffect(() => {
    if (isOpen) {
      const initialDate = new Date();
      reset({
        values: '',
        date: initialDate,
      });
      setDateInput(format(initialDate, 'dd/MM/yyyy'));
      setTotal(0);
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

  async function onSubmit(data: z.infer<typeof formSchema>) {
    if (!user || !activeProfile) return;
    if (total <= 0) {
      toast({
        variant: 'destructive',
        title: 'Valor inválido',
        description: 'A soma dos valores deve ser maior que zero.',
      });
      return;
    }

    try {
      await addDoc(collection(db, 'expenses'), {
        userId: user.uid,
        profile: activeProfile,
        description: 'Alimentos',
        amount: total,
        mainCategory: 'Alimentação',
        subcategory: 'Comida',
        paymentMethod: 'Dinheiro',
        date: Timestamp.fromDate(data.date),
      });
      toast({
        title: 'Sucesso!',
        description: 'Despesa somada e lançada com sucesso.',
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding summed expense:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível lançar a despesa.',
      });
    }
  }
  
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


  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Somar Despesas de Alimentação</DialogTitle>
          <DialogDescription>
            Digite os valores das notas fiscais separados por espaço. O total
            será lançado como uma única despesa de "Alimentação / Comida".
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={control}
              name="values"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valores</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="12,50 8,75 114,20 ..."
                      className="min-h-[100px] resize-y"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="text-right font-bold text-lg">
                Total Calculado: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
            </div>

            <FormField
              control={control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data da Compra</FormLabel>
                  <Popover>
                    <div className="flex items-center gap-2">
                       <FormControl>
                         <input
                           className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm pr-8"
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
                          className="h-10 w-10 shrink-0 rounded-full"
                          disabled={isSubmitting}
                        >
                          <CalendarIcon className="h-4 w-4" />
                          <span className="sr-only">Abrir calendário</span>
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
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Lançar Despesa Total
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
