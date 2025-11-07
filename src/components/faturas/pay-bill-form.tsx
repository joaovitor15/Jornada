
'use client';

import { useEffect, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  collection,
  addDoc,
  Timestamp,
  onSnapshot,
  query,
  where,
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
import { text } from '@/lib/strings';
import { type Card } from '@/lib/types';
import { CurrencyInput } from '../ui/currency-input';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';

const formSchema = z.object({
  cardId: z
    .string()
    .min(1, { message: text.payBillForm.validation.cardRequired }),
  amount: z.coerce
    .number({
      required_error: text.payBillForm.validation.amountRequired,
      invalid_type_error: text.payBillForm.validation.amountRequired,
    })
    .positive({ message: text.payBillForm.validation.amountPositive }),
  date: z.date({ required_error: 'A data é obrigatória.' }),
  type: z.enum(['payment', 'refund'], {
    required_error: text.payBillForm.validation.typeRequired,
  }),
});

type PayBillFormProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export default function PayBillForm({
  isOpen,
  onOpenChange,
}: PayBillFormProps) {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const { toast } = useToast();
  const [cards, setCards] = useState<Card[]>([]);
  const [dateInput, setDateInput] = useState('');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: 'payment',
    },
  });

  const { isSubmitting, watch, setValue, control, reset } = form;

  const transactionType = watch('type');

  useEffect(() => {
    if (isOpen) {
      const initialDate = new Date();
      reset({
        cardId: '',
        amount: undefined,
        date: initialDate,
        type: 'payment',
      });
      setDateInput(format(initialDate, 'dd/MM/yyyy'));
    }
  }, [isOpen, reset]);

  useEffect(() => {
    if (!user || !activeProfile) {
      setCards([]);
      return;
    }

    const cardsQuery = query(
      collection(db, 'cards'),
      where('userId', '==', user.uid),
      where('profile', '==', activeProfile)
    );

    const unsubscribe = onSnapshot(cardsQuery, (snapshot) => {
      const fetchedCards = snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as Card)
      );
      setCards(fetchedCards);
    });

    return () => unsubscribe();
  }, [user, activeProfile]);

  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name === 'date' && value.date) {
        setDateInput(format(value.date, 'dd/MM/yyyy'));
      }
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
      toast({
        variant: 'destructive',
        title: text.common.error,
        description: text.payBillForm.notLoggedIn,
      });
      return;
    }

    const selectedCard = cards.find((card) => card.id === values.cardId);
    if (!selectedCard) {
      toast({
        variant: 'destructive',
        title: text.common.error,
        description: 'Cartão selecionado não encontrado.',
      });
      return;
    }

    try {
      await addDoc(collection(db, 'billPayments'), {
        userId: user.uid,
        profile: activeProfile,
        cardId: values.cardId,
        amount: values.amount,
        date: Timestamp.fromDate(values.date),
        type: values.type,
        tags: [selectedCard.name],
      });

      toast({
        title: text.common.success,
        description:
          values.type === 'payment'
            ? text.payBillForm.addSuccess
            : text.payBillForm.refundSuccess,
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error writing document to Firestore: ', error);
      toast({
        variant: 'destructive',
        title: text.common.error,
        description: text.payBillForm.addError,
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
      <DialogContent
        className="sm:max-w-[425px]"
        onInteractOutside={(e) => {
          if (isSubmitting) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {transactionType === 'payment'
              ? text.payBillForm.title
              : text.payBillForm.refundTitle}
          </DialogTitle>
          <DialogDescription>
            {text.payBillForm.description}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 py-4"
          >
            <FormField
              control={control}
              name="type"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>{text.payBillForm.transactionType}</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex space-x-4"
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="payment" />
                        </FormControl>
                        <FormLabel className="font-normal">{text.payBillForm.payment}</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="refund" />
                        </FormControl>
                        <FormLabel className="font-normal">{text.payBillForm.refund}</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="cardId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{text.payBillForm.cardLabel}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isSubmitting || cards.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={text.payBillForm.selectCardPlaceholder}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper">
                      {cards.map((card) => (
                        <SelectItem key={card.id} value={card.id}>
                          {card.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{transactionType === 'payment' ? text.payBillForm.amountLabel : text.payBillForm.refundAmountLabel}</FormLabel>
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
                    <FormLabel>{transactionType === 'payment' ? text.payBillForm.paymentDateLabel : text.payBillForm.refundDateLabel}</FormLabel>
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
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {transactionType === 'payment' ? text.payBillForm.submitButton : text.payBillForm.refundSubmitButton}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
