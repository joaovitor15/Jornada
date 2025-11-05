'use client';

import { useEffect, useMemo, useState } from 'react';
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
  writeBatch,
  doc,
  updateDoc,
  getDocs,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format, parse, addMonths, isValid } from 'date-fns';
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
import {
  type Card,
  type PaymentMethod,
  type Profile,
  Expense,
  Income,
} from '@/lib/types';
import { CurrencyInput } from '../ui/currency-input';
import {
  personalExpenseCategories,
  homeExpenseCategories,
  businessExpenseCategories,
  personalIncomeCategories,
  homeIncomeCategories,
  businessIncomeCategories,
} from '@/lib/categories';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { useAddTransactionModal } from '@/contexts/AddTransactionModalContext';
import TagInput from '../ui/tag-input';

const basePaymentMethods: PaymentMethod[] = ['Dinheiro/Pix', 'Débito'];

const formSchema = z.object({
  type: z.enum(['expense', 'income'], {
    required_error: 'Selecione o tipo de lançamento.',
  }),
  description: z.string().optional(),
  amount: z.coerce
    .number({
      required_error: text.addExpenseForm.validation.amountRequired,
      invalid_type_error: text.addExpenseForm.validation.amountRequired,
    })
    .positive({ message: text.addExpenseForm.validation.amountPositive }),
  mainCategory: z
    .string()
    .min(1, { message: text.addExpenseForm.validation.pleaseSelectCategory }),
  subcategory: z
    .string()
    .min(1, { message: text.addExpenseForm.validation.pleaseSelectSubcategory }),
  paymentMethod: z.string().optional(),
  date: z.date({ required_error: 'A data é obrigatória.' }),
  installments: z.coerce.number().int().min(1).optional().default(1),
  tags: z.array(z.string()).optional(),
}).refine(data => {
    if (data.type === 'expense') {
        return !!data.paymentMethod && data.paymentMethod.length > 0;
    }
    return true;
}, {
    message: text.addExpenseForm.validation.pleaseSelectPaymentMethod,
    path: ['paymentMethod'],
});


const getCategoryConfig = (profile: Profile, type: 'expense' | 'income') => {
  if (type === 'expense') {
    switch (profile) {
      case 'Personal': return personalExpenseCategories;
      case 'Home': return homeExpenseCategories;
      case 'Business': return businessExpenseCategories;
      default: return {};
    }
  } else {
     switch (profile) {
      case 'Personal': return personalIncomeCategories;
      case 'Home': return homeIncomeCategories;
      case 'Business': return businessIncomeCategories;
      default: return {};
    }
  }
};

export default function AddTransactionForm() {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const { toast } = useToast();
  const [cards, setCards] = useState<Card[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [dateInput, setDateInput] = useState('');
  const { isFormOpen, closeForm, transactionToEdit } = useAddTransactionModal();
  
  const isEditMode = !!transactionToEdit;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tags: [],
    },
  });
  
  const { watch, setValue, reset, control, formState: { isSubmitting }, trigger } = form;
  const transactionType = watch('type');
  const selectedPaymentMethod = watch('paymentMethod');
  const isCreditCardPayment = useMemo(() => selectedPaymentMethod?.startsWith('Cartão:'), [selectedPaymentMethod]);
  
  useEffect(() => {
    const initialDate = new Date();
    if (isFormOpen) {
      if (isEditMode && transactionToEdit) {
         const type = 'paymentMethod' in transactionToEdit ? 'expense' : 'income';
         reset({
            type: type,
            description: transactionToEdit.description,
            amount: transactionToEdit.amount,
            mainCategory: transactionToEdit.mainCategory,
            subcategory: transactionToEdit.subcategory,
            paymentMethod: type === 'expense' ? (transactionToEdit as Expense).paymentMethod : undefined,
            date: transactionToEdit.date.toDate(),
            installments: type === 'expense' ? (transactionToEdit as Expense).installments || 1 : 1,
            tags: (transactionToEdit as Expense).tags || [],
        });
        setDateInput(format(transactionToEdit.date.toDate(), 'dd/MM/yyyy'));
      } else {
        reset({
            type: undefined,
            description: '',
            amount: undefined,
            mainCategory: '',
            subcategory: '',
            paymentMethod: '',
            date: initialDate,
            installments: 1,
            tags: [],
        });
        setDateInput(format(initialDate, 'dd/MM/yyyy'));
      }
    }
  }, [isFormOpen, isEditMode, transactionToEdit, reset]);

  // Handle dynamic form changes based on transaction type
  useEffect(() => {
    const subscription = watch((value, { name, type }) => {
      // When transaction type changes, reset categories
      if (name === 'type' && type === 'change' && !isEditMode) {
          setValue('mainCategory', '');
          setValue('subcategory', '');
      }
      
      // When main category changes, reset subcategory
      if (name === 'mainCategory' && type === 'change' && !isEditMode) {
        setValue('subcategory', '');
      }

      // If type becomes income, clear payment method and installments
      if (name === 'type' && value.type === 'income') {
        setValue('paymentMethod', undefined);
        setValue('installments', 1);
        setValue('tags', []);
        trigger('paymentMethod'); 
      }
      
      // Update date input when form date changes
      if (name === 'date' && value.date) {
        setDateInput(format(value.date, 'dd/MM/yyyy'));
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, setValue, trigger, isEditMode]);


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
        (doc) => ({ id: doc.id, ...doc.data() } as Card)
      );
      setCards(fetchedCards);
    });

    return () => unsubscribe();
  }, [user, activeProfile]);

  useEffect(() => {
    if (!user || !activeProfile || !isFormOpen || transactionType !== 'expense') {
      setAllTags([]);
      return;
    }

    const fetchAllTags = async () => {
      try {
        const q = query(
          collection(db, 'expenses'),
          where('userId', '==', user.uid),
          where('profile', '==', activeProfile)
        );
        const querySnapshot = await getDocs(q);
        const tagsSet = new Set<string>();
        querySnapshot.forEach((doc) => {
          const data = doc.data() as Expense;
          if (data.tags && Array.isArray(data.tags)) {
            data.tags.forEach((tag) => tagsSet.add(tag));
          }
        });
        setAllTags(Array.from(tagsSet));
      } catch (error) {
        console.error('Error fetching tags:', error);
        setAllTags([]); // Safeguard
      }
    };

    fetchAllTags();
  }, [user, activeProfile, isFormOpen, transactionType]);

  const categoryConfig = getCategoryConfig(activeProfile, transactionType);
  const allCategories = Object.keys(categoryConfig);
  const selectedCategory = watch('mainCategory');
  const subcategories =
    selectedCategory && categoryConfig[selectedCategory]
      ? categoryConfig[selectedCategory]
      : [];
      
  const paymentMethods = useMemo(() => {
    const cardNames = cards.map((card) => `Cartão: ${card.name}`);
    return [...basePaymentMethods, ...cardNames];
  }, [cards]);

  const handleOpenChange = (open: boolean) => {
    if (!isSubmitting) {
      if (!open) {
        closeForm();
      }
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
      toast({ variant: 'destructive', title: text.common.error, description: 'Você precisa estar logado.' });
      return;
    }
    
    try {
        if (isEditMode && transactionToEdit) {
            // EDIT LOGIC
            const collectionName = values.type === 'expense' ? 'expenses' : 'incomes';
            const docRef = doc(db, collectionName, transactionToEdit.id);
            
            const dataToUpdate: Partial<Expense | Income> = {
                description: values.description || '',
                amount: values.amount,
                mainCategory: values.mainCategory,
                subcategory: values.subcategory,
                date: Timestamp.fromDate(values.date),
            };

            if (values.type === 'expense') {
                (dataToUpdate as Partial<Expense>).paymentMethod = values.paymentMethod;
                (dataToUpdate as Partial<Expense>).tags = values.tags || [];
            }

            await updateDoc(docRef, dataToUpdate);
            toast({ title: text.common.success, description: "Lançamento atualizado com sucesso." });
        } else {
            // CREATE LOGIC
            if (values.type === 'expense') {
                const { installments = 1 } = values;
                const batch = writeBatch(db);
                const installmentAmount = values.amount / installments;
                const originalExpenseId = installments > 1 ? doc(collection(db, 'id')).id : null; 
                
                for (let i = 0; i < installments; i++) {
                  const installmentDate = addMonths(values.date, i);
                  const expenseData: any = {
                    userId: user.uid, profile: activeProfile,
                    description: installments > 1 ? `${values.description || 'Compra Parcelada'} (${i + 1}/${installments})` : values.description || '',
                    amount: installmentAmount, mainCategory: values.mainCategory, subcategory: values.subcategory,
                    paymentMethod: values.paymentMethod, date: Timestamp.fromDate(installmentDate),
                    installments: installments, currentInstallment: i + 1,
                    tags: values.tags || [],
                  };
                  
                  if (originalExpenseId) { expenseData.originalExpenseId = originalExpenseId; }
                  const docRef = doc(collection(db, 'expenses'));
                  batch.set(docRef, expenseData);
                }
                await batch.commit();
                toast({ title: text.common.success, description: text.addExpenseForm.addSuccess });
            } else { // 'income'
                const incomeData = {
                  userId: user.uid, profile: activeProfile, description: values.description || '',
                  amount: values.amount, mainCategory: values.mainCategory, subcategory: values.subcategory,
                  date: Timestamp.fromDate(values.date),
                };
                await addDoc(collection(db, 'incomes'), incomeData);
                toast({ title: text.common.success, description: text.addIncomeForm.addSuccess });
            }
        }
        closeForm();
    } catch (error) {
        console.error("Error saving transaction:", error);
        toast({ variant: 'destructive', title: text.common.error, description: isEditMode ? "Falha ao atualizar lançamento." : "Falha ao criar lançamento." });
    }
  }

  const handleDateInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const date = parse(e.target.value, 'dd/MM/yyyy', new Date());
    if (isValid(date)) {
      setValue('date', date, { shouldValidate: true });
    }
  };

  return (
    <Dialog open={isFormOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => { if (isSubmitting) e.preventDefault(); }}>
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Editar Lançamento' : 'Novo Lançamento'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Lançamento</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex space-x-4 pt-2"
                      disabled={isSubmitting || isEditMode}
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="expense" /></FormControl>
                        <FormLabel className="font-normal">Despesa</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="income" /></FormControl>
                        <FormLabel className="font-normal">Receita</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control} name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{text.common.description}</FormLabel>
                  <FormControl>
                    <Input placeholder={text.placeholders.description} {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={control} name="mainCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{text.common.mainCategory}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={text.addExpenseForm.selectCategory} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {allCategories.map((category) => (
                          <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control} name="subcategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{text.common.subcategory}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting || subcategories.length === 0}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={text.addExpenseForm.selectSubcategory} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {subcategories.map((sub) => (
                          <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                 <FormField
                    control={control} name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{text.common.amount}</FormLabel>
                        <FormControl>
                          <CurrencyInput
                            placeholder={text.placeholders.amount}
                            disabled={isSubmitting} value={field.value}
                            onValueChange={(values) => { field.onChange(values?.floatValue); }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                 {transactionType === 'expense' && (
                    <FormField
                        control={control} name="paymentMethod"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>{text.common.paymentMethod}</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting || (isEditMode && isCreditCardPayment)}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder={text.addExpenseForm.selectPaymentMethod} />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {paymentMethods.map((method) => (
                                <SelectItem key={method} value={method as string}>{method as string}</SelectItem>
                                ))}
                            </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                 )}
            </div>

            {transactionType === 'expense' && (
              <FormField
                control={control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <FormControl>
                      <TagInput
                        value={field.value || []}
                        onChange={field.onChange}
                        suggestions={allTags}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {transactionType === 'expense' && isCreditCardPayment && (
              <FormField
                control={control} name="installments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{text.addExpenseForm.installments}</FormLabel>
                    <FormControl>
                      <Input
                        type="number" min="1" {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 1)}
                        disabled={isSubmitting || isEditMode}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={control} name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data do Lançamento</FormLabel>
                  <Popover>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Input
                          className="pr-8" disabled={isSubmitting}
                          value={dateInput} onChange={(e) => setDateInput(e.target.value)}
                          onBlur={handleDateInputBlur} placeholder="DD/MM/AAAA"
                        />
                      </FormControl>
                      <PopoverTrigger asChild>
                        <Button
                          variant={'outline'} size="icon" className="h-10 w-10 rounded-full" disabled={isSubmitting}
                        >
                          <CalendarIcon className="h-4 w-4" />
                          <span className="sr-only">{text.addExpenseForm.pickDate}</span>
                        </Button>
                      </PopoverTrigger>
                    </div>
                    <FormMessage />
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single" selected={field.value}
                        onSelect={(date) => { if (date) field.onChange(date); }}
                        initialFocus disabled={isSubmitting} locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? 'Salvar Alterações' : 'Adicionar Lançamento'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

    