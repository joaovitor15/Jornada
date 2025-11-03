
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
import { text } from '@/lib/strings';
import { CurrencyInput } from '../ui/currency-input';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { emergencyReserveLocations } from '@/lib/categories';

const formSchema = z.object({
  description: z.string().optional(),
  amount: z.coerce
    .number({
      required_error: text.addExpenseForm.validation.amountRequired,
      invalid_type_error: text.addExpenseForm.validation.amountRequired,
    })
    .positive({ message: text.addExpenseForm.validation.amountPositive }),
  date: z.date({ required_error: 'A data é obrigatória.' }),
  location: z.string().min(1, { message: 'Selecione um local.' }),
});

type AddReserveEntryFormProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export default function AddReserveEntryForm({
  isOpen,
  onOpenChange,
}: AddReserveEntryFormProps) {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const { toast } = useToast();
  const [dateInput, setDateInput] = useState('');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const { isSubmitting, watch, setValue, control, reset } = form;

  useEffect(() => {
    if (isOpen) {
      const initialDate = new Date();
      reset({
        description: '',
        amount: undefined,
        date: initialDate,
        location: '',
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

  const handleOpenChange = (open: boolean) => {
    if (!isSubmitting) {
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

    try {
      await addDoc(collection(db, 'emergencyReserveEntries'), {
        userId: user.uid,
        profile: activeProfile,
        description: values.description || 'Contribuição',
        amount: values.amount,
        date: Timestamp.fromDate(values.date),
        location: values.location,
      });

      toast({
        title: text.common.success,
        description: text.emergencyReserve.addSuccess,
      });
      handleOpenChange(false);
    } catch (error) {
      console.error('Error writing document to Firestore: ', error);
      toast({
        variant: 'destructive',
        title: text.common.error,
        description: text.emergencyReserve.addError,
      });
    }
  }

  const handleDateInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const date = parse(e.target.value, 'dd/MM/yyyy', new Date());
    if (isValid(date)) {
      setValue('date', date, { shouldValidate: true });
    }
  };

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
          <DialogTitle>{text.emergencyReserve.title}</DialogTitle>
          <DialogDescription>
            {text.emergencyReserve.description}
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
                      placeholder={text.emergencyReserve.descriptionPlaceholder}
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
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Local</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o local da reserva" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {emergencyReserveLocations.map((location) => (
                        <SelectItem key={location} value={location}>
                          {location}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{text.emergencyReserve.amountLabel}</FormLabel>
                    <FormControl>
                      <CurrencyInput
                        placeholder={text.addExpenseForm.amountPlaceholder}
                        disabled={isSubmitting}
                        value={field.value}
                        onValueChange={(values) => {
                          field.onChange(values?.floatValue);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{text.emergencyReserve.dateLabel}</FormLabel>
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
                            <span className="sr-only">
                              {text.addExpenseForm.pickDate}
                            </span>
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
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {text.emergencyReserve.title}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
