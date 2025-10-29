'use client';

import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { collection, addDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';
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
import { type Income, type Profile } from '@/lib/types';
import { CurrencyInput } from '../ui/currency-input';
import {
  personalIncomeCategories,
  homeIncomeCategories,
  businessIncomeCategories,
} from '@/lib/categories';

const formSchema = z.object({
  description: z.string().optional(),
  amount: z.coerce
    .number({
      required_error: text.addIncomeForm.validation.amountRequired,
      invalid_type_error: text.addIncomeForm.validation.amountRequired,
    })
    .positive({ message: text.addIncomeForm.validation.amountPositive }),
  mainCategory: z
    .string()
    .min(1, { message: text.addIncomeForm.validation.pleaseSelectCategory }),
  subcategory: z
    .string()
    .min(1, { message: text.addIncomeForm.validation.pleaseSelectSubcategory }),
  date: z.date({ required_error: 'A data é obrigatória.' }),
});

type AddIncomeFormProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  incomeToEdit?: Income | null;
};

const getCategoryConfig = (profile: Profile) => {
  switch (profile) {
    case 'Personal':
      return personalIncomeCategories;
    case 'Home':
      return homeIncomeCategories;
    case 'Business':
      return businessIncomeCategories;
    default:
      return {};
  }
};

export default function AddIncomeForm({
  isOpen,
  onOpenChange,
  incomeToEdit,
}: AddIncomeFormProps) {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const { toast } = useToast();
  const isEditMode = !!incomeToEdit;
  const [dateInput, setDateInput] = useState('');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (isOpen) {
      let initialDate;
      if (isEditMode && incomeToEdit) {
        initialDate = incomeToEdit.date.toDate();
        form.reset({
          description: incomeToEdit.description || '',
          amount: incomeToEdit.amount,
          mainCategory: incomeToEdit.mainCategory,
          subcategory: incomeToEdit.subcategory,
          date: initialDate,
        });
      } else {
        initialDate = new Date();
        form.reset({
          description: '',
          amount: undefined,
          mainCategory: '',
          subcategory: '',
          date: initialDate,
        });
      }
      setDateInput(format(initialDate, 'dd/MM/yyyy'));
    }
  }, [isOpen, isEditMode, incomeToEdit, form]);

  const { isSubmitting, watch, setValue, resetField, control } = form;

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
      if (!isEditMode) resetField('subcategory');
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
        description: text.addIncomeForm.notLoggedIn,
      });
      return;
    }

    const incomeData = {
      userId: user.uid,
      profile: activeProfile,
      description: values.description || '',
      amount: values.amount,
      mainCategory: values.mainCategory,
      subcategory: values.subcategory,
      date: Timestamp.fromDate(values.date),
    };

    try {
      if (isEditMode && incomeToEdit?.id) {
        const incomeRef = doc(db, 'incomes', incomeToEdit.id);
        await updateDoc(incomeRef, incomeData);
        toast({
          title: text.common.success,
          description: text.editIncomeForm.updateSuccess,
        });
      } else {
        await addDoc(collection(db, 'incomes'), incomeData);
        toast({
          title: text.common.success,
          description: text.addIncomeForm.addSuccess,
        });
      }
      handleOpenChange(false);
    } catch (error) {
      console.error('Error writing document to Firestore: ', error);
      toast({
        variant: 'destructive',
        title: text.common.error,
        description: isEditMode ? text.editIncomeForm.updateError : text.addIncomeForm.addError,
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
          <DialogTitle>{isEditMode ? text.editIncomeForm.title : text.addIncomeForm.title}</DialogTitle>
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
                      placeholder={text.addIncomeForm.descriptionPlaceholder}
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
                            placeholder={text.addIncomeForm.selectCategory}
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
                            placeholder={text.addIncomeForm.selectSubcategory}
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
                        placeholder={text.addIncomeForm.amountPlaceholder}
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
                  <FormLabel>{text.addIncomeForm.incomeDate}</FormLabel>
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
            </div>
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
                {isEditMode ? text.editIncomeForm.save : text.addIncomeForm.addIncome}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
