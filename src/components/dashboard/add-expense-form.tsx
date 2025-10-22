'use client';

import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import React, { useState, useEffect } from 'react';

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
import { type ExpenseCategory } from '@/lib/types';
import { text } from '@/lib/strings';

const formSchema = z.object({
  description: z.string().min(2, {
    message: text.addExpenseForm.validation.descriptionMinChars,
  }),
  amount: z.coerce
    .number()
    .positive({ message: text.addExpenseForm.validation.amountPositive }),
  category: z
    .string()
    .min(1, { message: text.addExpenseForm.validation.pleaseSelectCategory }),
  date: z.date(),
});

type AddExpenseFormProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  categories: readonly ExpenseCategory[];
};

export default function AddExpenseForm({
  isOpen,
  onOpenChange,
  categories,
}: AddExpenseFormProps) {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: '',
      amount: 0,
      category: '',
      date: new Date(),
    },
  });

  const handleOpenChange = (open: boolean) => {
    if (!isSubmitting) {
      if (!open) {
        form.reset({
          description: '',
          amount: 0,
          category: '',
          date: new Date(),
        });
      }
      onOpenChange(open);
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

    setIsSubmitting(true);

    const expenseData = {
      userId: user.uid,
      profile: activeProfile,
      description: values.description,
      amount: values.amount,
      category: values.category,
      date: Timestamp.fromDate(values.date),
    };

    try {
      console.log('Adding expense:', expenseData);
      await addDoc(collection(db, 'expenses'), expenseData);
      toast({
        title: text.common.success,
        description: text.addExpenseForm.addSuccess,
      });
      handleOpenChange(false);
    } catch (error) {
      console.error('Error adding document to Firestore: ', error);
      toast({
        variant: 'destructive',
        title: text.common.error,
        description: text.addExpenseForm.addError,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
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
          <DialogDescription>
            {text.addExpenseForm.description}
          </DialogDescription>
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
              render={({ field }) => {
                const [displayValue, setDisplayValue] = useState('');
                const [isFocused, setIsFocused] = useState(false);

                useEffect(() => {
                  if (field.value > 0 && !isFocused) {
                    setDisplayValue(
                      field.value.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    );
                  } else if (field.value === 0 && !isFocused) {
                    setDisplayValue('');
                  } else if (isFocused) {
                    // Keep the raw value when focused
                     if (field.value > 0) {
                       setDisplayValue(String(field.value.toFixed(2)).replace('.', ','));
                     } else {
                       setDisplayValue('');
                     }
                  }
                }, [field.value, isFocused]);


                const handleInputChange = (
                  e: React.ChangeEvent<HTMLInputElement>
                ) => {
                  let value = e.target.value;
                  value = value.replace(/[^0-9,]/g, '');

                  const commaCount = value.split(',').length - 1;
                  if (commaCount > 1) {
                    value = value.substring(0, value.lastIndexOf(','));
                  }

                  if (value.includes(',')) {
                    const parts = value.split(',');
                    if (parts[1] && parts[1].length > 2) {
                      parts[1] = parts[1].substring(0, 2);
                      value = parts.join(',');
                    }
                  }

                  setDisplayValue(value);

                  const numericValue = parseFloat(value.replace(',', '.'));
                  field.onChange(isNaN(numericValue) ? 0 : numericValue);
                };

                const handleFocus = () => {
                  setIsFocused(true);
                  if (field.value > 0) {
                    setDisplayValue(String(field.value.toFixed(2)).replace('.', ','));
                  } else {
                    setDisplayValue('');
                  }
                };

                const handleBlur = () => {
                  setIsFocused(false);
                  field.onBlur();
                  if (field.value > 0) {
                     setDisplayValue(
                       field.value.toLocaleString('pt-BR', {
                         minimumFractionDigits: 2,
                         maximumFractionDigits: 2,
                       })
                     );
                  } else {
                     setDisplayValue('');
                  }
                };

                return (
                  <FormItem>
                    <FormLabel>{text.common.amount}</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder={text.addExpenseForm.amountPlaceholder}
                        disabled={isSubmitting}
                        value={displayValue}
                        onChange={handleInputChange}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{text.common.category}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={text.addExpenseForm.selectCategory}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((category) => (
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
                            format(field.value, 'dd/MM/yyyy', { locale: ptBR })
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
                        locale={ptBR}
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
