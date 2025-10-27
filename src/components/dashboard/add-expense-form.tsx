'use client';

import { useEffect, useMemo } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { collection, addDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
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
import { type Expense, type PaymentMethod, type Profile } from '@/lib/types';
import { CurrencyInput } from '../ui/currency-input';
import {
  personalExpenseCategories,
  homeExpenseCategories,
  businessExpenseCategories,
} from '@/lib/categories';

const paymentMethods: PaymentMethod[] = ['Pix', 'Dinheiro', 'Débito', 'Crédito'];

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

  date: z.date(),
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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && expenseToEdit) {
        form.reset({
          description: expenseToEdit.description || '',
          amount: expenseToEdit.amount,
          mainCategory: expenseToEdit.mainCategory,
          subcategory: expenseToEdit.subcategory,
          paymentMethod: expenseToEdit.paymentMethod,
          date: expenseToEdit.date.toDate(),
        });
      } else {
        form.reset({
          description: '',
          amount: undefined,
          mainCategory: '',
          subcategory: '',
          paymentMethod: '' as PaymentMethod,
          date: new Date(),
        });
      }
    }
  }, [isOpen, isEditMode, expenseToEdit, form]);


  const { isSubmitting, watch, setValue, resetField } = form;
  const selectedCategory = watch('mainCategory');
  const selectedSubcategory = watch('subcategory');

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

  useEffect(() => {
    if (selectedCategory && categoryConfig[selectedCategory]) {
      if(!isEditMode) resetField('subcategory');
    }
  }, [selectedCategory, categoryConfig, resetField, isEditMode]);
  
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

    const expenseData = {
      userId: user.uid,
      profile: activeProfile,
      description: values.description || '',
      amount: values.amount,
      mainCategory: values.mainCategory,
      subcategory: values.subcategory,
      paymentMethod: values.paymentMethod,
      date: Timestamp.fromDate(values.date),
    };

    try {
      if (isEditMode && expenseToEdit?.id) {
        const expenseRef = doc(db, 'expenses', expenseToEdit.id);
        await updateDoc(expenseRef, expenseData);
        toast({
          title: text.common.success,
          description: text.editExpenseForm.updateSuccess,
        });
      } else {
        await addDoc(collection(db, 'expenses'), expenseData);
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
        description: isEditMode ? text.editExpenseForm.updateError : text.addExpenseForm.addError,
      });
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
          <DialogTitle>{isEditMode ? text.editExpenseForm.title : text.addExpenseForm.title}</DialogTitle>
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
                            placeholder={text.addExpenseForm.selectSubcategory}
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
                        placeholder={text.addExpenseForm.amountPlaceholder}
                        disabled={isSubmitting}
                        value={field.value}
                        onValueChange={(values) => {
                          field.onChange(values.floatValue);
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
                            placeholder={text.addExpenseForm.selectPaymentMethod}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent position="popper">
                        {paymentMethods.map((method) => (
                          <SelectItem key={method} value={method}>
                            {method}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                {isEditMode ? text.editExpenseForm.save : text.dashboard.addExpense}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
