
'use client';

import { useEffect, useState, useMemo } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { collection, addDoc, Timestamp, writeBatch, doc } from 'firebase/firestore';
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
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import TagInput from '../ui/tag-input';
import { useTags } from '@/hooks/use-tags';
import { RawTag } from '@/lib/types';


const formSchema = z.object({
  description: z.string().optional(),
  amount: z.coerce
    .number({
      required_error: text.addExpenseForm.validation.amountRequired,
      invalid_type_error: text.addExpenseForm.validation.amountRequired,
    })
    .positive({ message: text.addExpenseForm.validation.amountPositive }),
  date: z.date({ required_error: 'A data é obrigatória.' }),
  bank: z.string().min(1, { message: 'Selecione um banco.' }),
  tags: z.array(z.string()).min(1, { message: 'Selecione pelo menos uma tag.' }),
  type: z.enum(['add', 'withdraw']).default('add'),
});

const ensureBaseReserveTags = async (userId: string, profile: string, allTags: RawTag[], refreshTags: () => void) => {
    const hasBankTag = allTags.some(tag => tag.name === 'Banco' && tag.isPrincipal);
    const hasEmergencyTag = allTags.some(tag => tag.name === 'Reserva de Emergência' && tag.isPrincipal);

    if (!hasBankTag || !hasEmergencyTag) {
        try {
            const batch = writeBatch(db);
            const tagsRef = collection(db, 'tags');

            if (!hasBankTag) {
                const bankTagRef = doc(tagsRef);
                const bankTagData: RawTag = {
                    id: bankTagRef.id, userId, profile, name: 'Banco',
                    isPrincipal: true, parent: null, order: 101,
                };
                batch.set(bankTagRef, bankTagData);
            }
            if (!hasEmergencyTag) {
                const emergencyTagRef = doc(tagsRef);
                const emergencyTagData: RawTag = {
                    id: emergencyTagRef.id, userId, profile, name: 'Reserva de Emergência',
                    isPrincipal: true, parent: null, order: 102,
                };
                batch.set(emergencyTagRef, emergencyTagData);
            }
            
            await batch.commit();
            refreshTags();
        } catch (error) {
            console.error("Failed to create base reserve tags:", error);
        }
    }
};

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
  const { hierarchicalTags, rawTags, refreshTags } = useTags();
  const [dateInput, setDateInput] = useState('');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: 'add',
    },
  });

  const { isSubmitting, watch, setValue, control, reset } = form;
  const transactionType = watch('type');
  
  const { reserveTagOptions, bankTagOptions } = useMemo(() => {
    const emergencyTag = hierarchicalTags.find(t => t.name === 'Reserva de Emergência');
    const programmedTag = hierarchicalTags.find(t => t.name === 'Reserva Programada');
    const bankTag = hierarchicalTags.find(t => t.name === 'Banco');

    const emergencyChildren = emergencyTag?.children.filter(c => !c.isArchived).map(c => c.name) || [];
    const programmedChildren = programmedTag?.children.filter(c => !c.isArchived).map(c => c.name) || [];
    
    return {
      reserveTagOptions: [...emergencyChildren, ...programmedChildren],
      bankTagOptions: bankTag?.children.filter(c => !c.isArchived).map(c => c.name) || []
    };
  }, [hierarchicalTags]);

  useEffect(() => {
    if (isOpen) {
       if (user && activeProfile) {
          ensureBaseReserveTags(user.uid, activeProfile, rawTags, refreshTags);
       }
      const initialDate = new Date();
      reset({
        description: '',
        amount: undefined,
        date: initialDate,
        bank: '',
        tags: [],
        type: 'add',
      });
      setDateInput(format(initialDate, 'dd/MM/yyyy'));
    }
  }, [isOpen, reset, user, activeProfile, rawTags, refreshTags]);

  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name === 'date' && value.date) {
        setDateInput(format(value.date, 'dd/MM/yyyy'));
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, setValue]);

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

    const finalAmount =
      values.type === 'withdraw' ? -Math.abs(values.amount) : values.amount;

    try {
      await addDoc(collection(db, 'emergencyReserveEntries'), {
        userId: user.uid,
        profile: activeProfile,
        description:
          values.description ||
          (values.type === 'add' ? 'Contribuição' : 'Retirada'),
        amount: finalAmount,
        date: Timestamp.fromDate(values.date),
        bank: values.bank,
        tags: values.tags,
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
        className="sm:max-w-md"
        onInteractOutside={(e) => {
          if (isSubmitting) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{text.emergencyReserve.formTitle}</DialogTitle>
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
                  <FormLabel>Tipo de Movimentação</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex space-x-4"
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="add" />
                        </FormControl>
                        <FormLabel className="font-normal">Adicionar</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="withdraw" />
                        </FormControl>
                        <FormLabel className="font-normal">Retirar</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{text.common.description}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={text.placeholders.description}
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
                control={form.control} name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags da Reserva</FormLabel>
                    <FormControl>
                      <TagInput
                          availableTags={reserveTagOptions}
                          placeholder="Selecione as tags..."
                          value={field.value || []}
                          onChange={field.onChange}
                          disabled={isSubmitting || reserveTagOptions.length === 0}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            
            <FormField
              control={form.control}
              name="bank"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Banco</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isSubmitting || bankTagOptions.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o banco" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {bankTagOptions.map((bank) => (
                        <SelectItem key={bank} value={bank}>
                          {bank}
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
                        placeholder={text.placeholders.amount}
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
                {transactionType === 'add'
                  ? text.emergencyReserve.title
                  : 'Registrar Retirada'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
