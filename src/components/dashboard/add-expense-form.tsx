'use client';

import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { expenseCategories } from '@/lib/types';
import { text } from '@/lib/strings';

const formSchema = z.object({
  description: z.string().min(2, {
    message: text.addExpenseForm.validation.descriptionMinChars,
  }),
  amount: z.coerce.number().positive({ message: text.addExpenseForm.validation.amountPositive }),
  category: z.string().min(1, { message: text.addExpenseForm.validation.pleaseSelectCategory }),
  date: z.date(),
});

type AddExpenseFormProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export default function AddExpenseForm({
  isOpen,
  onOpenChange,
}: AddExpenseFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: '',
      amount: 0,
      category: '',
      date: new Date(),
    },
  });

  const { isSubmitting } = form.formState;
  const handleAmountBlur = (event: React.FocusEvent<HTMLInputElement>) => {
  const value = event.target.value;
  const parsedValue = parseFloat(value.replace(',', '.')); // Lida com vírgula também

  if (!isNaN(parsedValue)) {
    form.setValue('amount', parseFloat(parsedValue.toFixed(2)), {
      shouldValidate: true,
    });
    } else if (value.trim() === '') {
      form.setValue('amount', 0); // Ou undefined
    }
  };
  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
      toast({
        variant: 'destructive',
        title: text.common.error,
        description: text.addExpenseForm.notLoggedIn,
      });
      return;
    }

    const expenseData = {
      userId: user.uid,
      description: values.description,
      amount: values.amount,
      category: values.category,
      date: Timestamp.fromDate(values.date),
    };

    try {
      await addDoc(collection(db, 'expenses'), expenseData);
      toast({
        title: text.common.success,
        description: text.addExpenseForm.addSuccess,
      });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding document to Firestore: ', error);
      toast({
        variant: 'destructive',
        title: text.common.error,
        description: text.addExpenseForm.addError,
      });
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!isSubmitting) {
          onOpenChange(open);
        }
      }}
    >
      <DialogContent
        className="sm:max-w-[425px]"
        onInteractOutside={(e) => {
          if (isSubmitting) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{text.addExpenseForm.title}</DialogTitle>
          <DialogDescription>{text.addExpenseForm.description}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 py-4"
          >
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{text.common.description}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={text.addExpenseForm.descriptionPlaceholder}
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{text.common.amount}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder={text.addExpenseForm.amountPlaceholder}
                      {...field}
                      value={field.value === undefined || field.value === null || isNaN(field.value) ? '' : String(field.value)} // Ajustar
                      onChange={(e) => { // Ajustar
                        const value = e.target.value.replace(',', '.');
                        const numericValue = value === '' ? undefined : parseFloat(value);
                        field.onChange(numericValue);
                      }}
                        onBlur={handleAmountBlur} // Adicionar
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{text.common.category}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={text.addExpenseForm.selectCategory} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {expenseCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
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
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{text.addExpenseForm.expenseDate}</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={'outline'}
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                          disabled={isSubmitting}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? (
                            format(field.value, 'PPP')
                          ) : (
                            <span>{text.addExpenseForm.pickDate}</span>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                        disabled={isSubmitting}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="submit"
                disabled={isSubmitting}
                style={{
                  backgroundColor: 'hsl(var(--accent))',
                  color: 'hsl(var(--accent-foreground))',
                }}
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {text.dashboard.addExpense}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
