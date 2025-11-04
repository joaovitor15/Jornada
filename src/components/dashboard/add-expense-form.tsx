
'use client';

import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  Timestamp,
  onSnapshot,
  query,
  where,
  writeBatch,
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
import { cn } from '@/lib/utils';
import { text } from '@/lib/strings';
import {
  type Card,
  type Expense,
  type PaymentMethod,
  type Profile,
} from '@/lib/types';
import { CurrencyInput } from '../ui/currency-input';
import {
  personalExpenseCategories,
  homeExpenseCategories,
  businessExpenseCategories,
} from '@/lib/categories';

const basePaymentMethods: PaymentMethod[] = ['Dinheiro/Pix', 'Débito'];

const formSchema = z.object({
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
  paymentMethod: z
    .string()
    .min(1, { message: text.addExpenseForm.validation.pleaseSelectPaymentMethod }),
  date: z.date({ required_error: 'A data é obrigatória.' }),
  installments: z.coerce.number().int().min(1).optional().default(1),
});

type AddExpenseFormProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  expenseToEdit?: Expense | null;
};

const getCategoryConfig = (profile: Profile) => {
  switch (profile) {
    case 'Personal':
      return personalExpenseCategories;
    case 'Home':
      return homeExpenseCategories;
    case 'Business':
      return businessExpenseCategories;
    default:
      return {};
  }
};

export default function AddExpenseForm({
  isOpen,
  onOpenChange,
  expenseToEdit,
}: AddExpenseFormProps) {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const { toast } = useToast();
  const isEditMode = !!expenseToEdit;
  const [cards, setCards] = useState<Card[]>([]);
  const [dateInput, setDateInput] = useState('');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });
  
  const { watch, setValue, reset, control, formState: { isSubmitting, errors }, getValues } = form;
  const selectedPaymentMethod = watch('paymentMethod');
  const isCreditCardPayment = useMemo(() => selectedPaymentMethod?.startsWith('Cartão:'), [selectedPaymentMethod]);

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
    if (isOpen) {
      let initialDate;
      if (isEditMode && expenseToEdit) {
        initialDate = expenseToEdit.date.toDate();
        form.reset({
          description: expenseToEdit.description || '',
          amount: expenseToEdit.amount,
          mainCategory: expenseToEdit.mainCategory,
          subcategory: expenseToEdit.subcategory,
          paymentMethod: expenseToEdit.paymentMethod,
          date: initialDate,
          installments: expenseToEdit.installments || 1,
        });
      } else {
        initialDate = new Date();
        form.reset({
          description: '',
          amount: undefined,
          mainCategory: '',
          subcategory: '',
          paymentMethod: '',
          date: initialDate,
          installments: 1,
        });
      }
      setDateInput(format(initialDate, 'dd/MM/yyyy'));
    }
  }, [isOpen, isEditMode, expenseToEdit, form]);
  
  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name === 'date' && value.date) {
        setDateInput(format(value.date, 'dd/MM/yyyy'));
      }
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  const selectedCategory = watch('mainCategory');
  const selectedSubcategory = watch('subcategory');

  const paymentMethods = useMemo(() => {
    const cardNames = cards.map((card) => `Cartão: ${card.name}`);
    return [...basePaymentMethods, ...cardNames];
  }, [cards]);

  const categoryConfig = getCategoryConfig(activeProfile);
  const allCategories = Object.keys(categoryConfig);
  const subcategories =
    selectedCategory && categoryConfig[selectedCategory]
      ? categoryConfig[selectedCategory]
      : [];

  const allSubcategories = useMemo(() => {
    return Object.values(categoryConfig).flat();
  }, [categoryConfig]);

  const subcategoryToMainCategoryMap = useMemo(() => {
    const map: { [key: string]: string } = {};
    for (const mainCategory in categoryConfig) {
      for (const subcategory of categoryConfig[mainCategory]) {
        map[subcategory] = mainCategory;
      }
    }
    return map;
  }, [categoryConfig]);

  // Auto-select subcategory if there's only one
  useEffect(() => {
    if (selectedCategory && categoryConfig[selectedCategory] && !isEditMode) {
      const subcategoriesForSelected = categoryConfig[selectedCategory];
      if (subcategoriesForSelected.length === 1) {
        setValue('subcategory', subcategoriesForSelected[0], { shouldValidate: true });
      }
    }
  }, [selectedCategory, categoryConfig, setValue, isEditMode]);

  // Auto-select main category when subcategory is chosen
  useEffect(() => {
    if (selectedSubcategory && subcategoryToMainCategoryMap[selectedSubcategory]) {
      const correspondingMainCategory = subcategoryToMainCategoryMap[selectedSubcategory];
      if (selectedCategory !== correspondingMainCategory) {
        setValue('mainCategory', correspondingMainCategory, { shouldValidate: true });
      }
    }
  }, [selectedSubcategory, subcategoryToMainCategoryMap, setValue, selectedCategory]);

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
     const { installments = 1 } = values;

    try {
      if (isEditMode && expenseToEdit?.id) {
        // Logic for editing is simplified for now, no installment change handling
        const expenseData = {
          ...expenseToEdit,
          description: values.description || '',
          amount: values.amount,
          mainCategory: values.mainCategory,
          subcategory: values.subcategory,
          paymentMethod: values.paymentMethod,
          date: Timestamp.fromDate(values.date),
        };
        const expenseRef = doc(db, 'expenses', expenseToEdit.id);
        await updateDoc(expenseRef, expenseData);
        toast({
          title: text.common.success,
          description: text.editExpenseForm.updateSuccess,
        });

      } else {
        const batch = writeBatch(db);
        const installmentAmount = values.amount / installments;
        const originalExpenseId = installments > 1 ? doc(collection(db, 'id')).id : null; 
        
        for (let i = 0; i < installments; i++) {
          const installmentDate = addMonths(values.date, i);
          const expenseData: any = {
            userId: user.uid,
            profile: activeProfile,
            description: installments > 1 ? `${values.description || 'Compra Parcelada'} (${i + 1}/${installments})` : values.description || '',
            amount: installmentAmount,
            mainCategory: values.mainCategory,
            subcategory: values.subcategory,
            paymentMethod: values.paymentMethod,
            date: Timestamp.fromDate(installmentDate),
            installments: installments,
            currentInstallment: i + 1,
          };
          
          if (originalExpenseId) {
            expenseData.originalExpenseId = originalExpenseId;
          }

          const docRef = doc(collection(db, 'expenses'));
          batch.set(docRef, expenseData);
        }
        await batch.commit();

        toast({
          title: text.common.success,
          description: text.addExpenseForm.addSuccess,
        });
      }
      handleOpenChange(false);
    } catch (error) {
      console.error('Error writing document to Firestore: ', error);
      toast({
        variant: 'destructive',
        title: text.common.error,
        description: isEditMode
          ? text.editExpenseForm.updateError
          : text.addExpenseForm.addError,
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
          <DialogTitle>
            {isEditMode
              ? text.editExpenseForm.title
              : text.addExpenseForm.title}
          </DialogTitle>
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
                      placeholder={text.placeholders.description}
                      {...field}
                      disabled={isSubmitting || (isEditMode && getValues('installments') > 1)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="mainCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{text.common.mainCategory}</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                      }}
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
                      <SelectContent position="popper">
                        {allCategories.map((category) => (
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
                name="subcategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{text.common.subcategory}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              text.addExpenseForm.selectSubcategory
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent position="popper">
                        {selectedCategory
                          ? subcategories.map((sub) => (
                              <SelectItem key={sub} value={sub}>
                                {sub}
                              </SelectItem>
                            ))
                          : allSubcategories.map((sub) => (
                              <SelectItem key={sub} value={sub}>
                                {sub}
                              </SelectItem>
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
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{text.common.amount}</FormLabel>
                    <FormControl>
                      <CurrencyInput
                        placeholder={text.placeholders.amount}
                        disabled={isSubmitting || (isEditMode && getValues('installments') > 1)}
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
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{text.common.paymentMethod}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              text.addExpenseForm.selectPaymentMethod
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent position="popper">
                        {paymentMethods.map((method) => (
                          <SelectItem key={method} value={method as string}>
                            {method as string}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
             {isCreditCardPayment && !isEditMode && (
              <FormField
                control={control}
                name="installments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{text.addExpenseForm.installments}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 1)}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{text.addExpenseForm.expenseDate}</FormLabel>
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
              <Button
                type="submit"
                disabled={isSubmitting}
                 className="w-full"
                style={{
                  backgroundColor: 'hsl(var(--accent))',
                  color: 'hsl(var(--accent-foreground))',
                }}
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {isEditMode
                  ? text.editExpenseForm.save
                  : text.addExpenseForm.addExpense}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
