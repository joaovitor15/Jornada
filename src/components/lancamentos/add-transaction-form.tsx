'use client';

import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  collection,
  addDoc,
  Timestamp,
  writeBatch,
  doc,
  updateDoc,
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
  type Profile,
  Expense,
  Income,
  RawTag,
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
import { useTags } from '@/hooks/use-tags';

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
  mainCategory: z.string().optional(),
  subcategory: z.string().optional(),
  paymentMethod: z.string().optional(),
  date: z.date({ required_error: 'A data é obrigatória.' }),
  installments: z.coerce.number().int().min(1).optional().default(1),
  tags: z.array(z.string()).optional(),
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
  const { hierarchicalTags: allTags } = useTags();
  const [dateInput, setDateInput] = useState('');
  const { isFormOpen, closeForm, transactionToEdit } = useAddTransactionModal();
  
  const isEditMode = !!transactionToEdit;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });
  
  const { watch, setValue, reset, control, formState: { isSubmitting }, trigger } = form;
  const transactionType = watch('type');
  const selectedPaymentMethod = watch('paymentMethod');
  
  const { paymentMethodTags, cardTags, nonCardTags } = useMemo(() => {
    const cardsPrincipal = allTags.find(t => t.name === 'Cartões');
    const paymentMethodsPrincipal = allTags.find(t => t.name === 'Formas de Pagamento');
  
    const pmt = paymentMethodsPrincipal?.children.filter(c => !c.isArchived) || [];
    const ct = cardsPrincipal?.children.filter(c => !c.isArchived) || [];

    const generalTags = allTags
      .filter(pt => pt.name !== 'Cartões' && pt.name !== 'Formas de Pagamento')
      .flatMap(pt => [pt, ...pt.children])
      .filter(t => !t.isArchived)
      .map(t => t.name);

    return {
      paymentMethodTags: pmt,
      cardTags: ct,
      nonCardTags: Array.from(new Set(generalTags)),
    };
  }, [allTags]);
  
  const isCreditCardPayment = useMemo(() => {
    if (!selectedPaymentMethod) return false;
    return cardTags.some(card => card.name === selectedPaymentMethod);
  }, [selectedPaymentMethod, cardTags]);



  useEffect(() => {
    if (isFormOpen) {
      if (isEditMode && transactionToEdit) {
         const type = 'paymentMethod' in transactionToEdit ? 'expense' : 'income';
         
         const expense = transactionToEdit as Expense;
         let paymentMethod = expense.paymentMethod;
         if (paymentMethod?.startsWith('Cartão: ')) {
             paymentMethod = paymentMethod.replace('Cartão: ', '');
         }

         reset({
            type: type,
            description: transactionToEdit.description,
            amount: transactionToEdit.amount,
            mainCategory: transactionToEdit.mainCategory,
            subcategory: transactionToEdit.subcategory,
            paymentMethod: paymentMethod,
            date: transactionToEdit.date.toDate(),
            installments: type === 'expense' ? (transactionToEdit as Expense).installments || 1 : 1,
            tags: transactionToEdit.tags || [],
        });
        setDateInput(format(transactionToEdit.date.toDate(), 'dd/MM/yyyy'));
      } else {
        const initialDate = new Date();
        reset({
            type: undefined,
            description: '',
            amount: undefined,
            mainCategory: '',
            subcategory: '',
            paymentMethod: 'Dinheiro/Pix', // Default payment method
            date: initialDate,
            installments: 1,
            tags: [],
        });
        setDateInput(format(initialDate, 'dd/MM/yyyy'));
      }
    }
  }, [isFormOpen, isEditMode, transactionToEdit, reset]);

  // Handle dynamic form changes
  useEffect(() => {
    const subscription = watch((value, { name, type }) => {
      if ((name === 'type' || name === 'mainCategory') && type === 'change' && !isEditMode) {
        if(name === 'type') setValue('mainCategory', '');
        setValue('subcategory', '');
      }

      if (name === 'type' && value.type === 'income' && !isEditMode) {
        setValue('paymentMethod', undefined);
        setValue('installments', 1);
      }
      
      if (name === 'date' && value.date) {
        setDateInput(format(value.date, 'dd/MM/yyyy'));
      }
      
      if (name === 'paymentMethod') {
        if(!isCreditCardPayment) {
            setValue('installments', 1);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, setValue, trigger, isEditMode, isCreditCardPayment]);


  const categoryConfig = getCategoryConfig(activeProfile, transactionType);
  const allCategories = Object.keys(categoryConfig);
  const selectedCategory = watch('mainCategory');
  const subcategories =
    selectedCategory && categoryConfig[selectedCategory]
      ? categoryConfig[selectedCategory]
      : [];
      
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
        const finalTags = values.tags || [];

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
                tags: finalTags,
            };

            if (values.type === 'expense') {
                (dataToUpdate as Partial<Expense>).paymentMethod = isCreditCardPayment ? `Cartão: ${values.paymentMethod}` : values.paymentMethod;
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
                
                const finalPaymentMethod = isCreditCardPayment ? `Cartão: ${values.paymentMethod}` : values.paymentMethod;

                for (let i = 0; i < installments; i++) {
                  const installmentDate = addMonths(values.date, i);
                  const expenseData: any = {
                    userId: user.uid, profile: activeProfile,
                    description: installments > 1 ? `${values.description || 'Compra Parcelada'} (${i + 1}/${installments})` : values.description || '',
                    amount: installmentAmount, mainCategory: values.mainCategory || 'Geral', subcategory: values.subcategory || 'Geral',
                    paymentMethod: finalPaymentMethod, date: Timestamp.fromDate(installmentDate),
                    installments: installments, currentInstallment: i + 1,
                    tags: finalTags,
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
                  amount: values.amount, mainCategory: values.mainCategory || 'Geral', subcategory: values.subcategory || 'Geral',
                  date: Timestamp.fromDate(values.date),
                  tags: finalTags,
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

            <>
              <FormField
                control={control} name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{text.common.description}</FormLabel>
                    <FormControl>
                      <Input placeholder={text.placeholders.description} {...field} disabled={isSubmitting || !transactionType} />
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
                      <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting || !transactionType}>
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
                      <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting || subcategories.length === 0 || !transactionType}>
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
              
              <div className="grid grid-cols-2 gap-4 items-end">
                    <FormField
                      control={control} name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{text.common.amount}</FormLabel>
                          <FormControl>
                            <CurrencyInput
                              placeholder={text.placeholders.amount}
                              disabled={isSubmitting || !transactionType} value={field.value}
                              onValueChange={(values) => { field.onChange(values?.floatValue); }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {transactionType === 'expense' && (
                       <FormField
                          control={control}
                          name="paymentMethod"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Forma de Pagamento</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting || (isEditMode && isCreditCardPayment)}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {paymentMethodTags.length > 0 && (
                                        <SelectGroup>
                                            <SelectLabel>Formas de Pagamento</SelectLabel>
                                            {paymentMethodTags.map((tag: RawTag) => (
                                               <SelectItem key={tag.id} value={tag.name}>
                                                  {tag.name}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    )}
                                    {cardTags.length > 0 && (
                                        <SelectGroup>
                                            <SelectLabel>Cartões</SelectLabel>
                                            {cardTags.map((tag: RawTag) => (
                                               <SelectItem key={tag.id} value={tag.name}>
                                                  {tag.name}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    )}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                    )}
              </div>

              {transactionType === 'expense' && isCreditCardPayment && !isEditMode && (
                <FormField
                  control={control} name="installments"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{text.addExpenseForm.installments}</FormLabel>
                      <FormControl>
                        <Input
                          type="number" min="1" {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 1)}
                          disabled={isSubmitting || isEditMode || !transactionType}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={control} name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags (Opcional)</FormLabel>
                    <FormControl>
                      <TagInput
                          availableTags={nonCardTags}
                          placeholder="Selecione as tags..."
                          value={field.value || []}
                          onChange={field.onChange}
                          disabled={isSubmitting || !transactionType}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control} name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data do Lançamento</FormLabel>
                    <Popover>
                      <div className="flex items-center gap-2">
                        <FormControl>
                          <Input
                            className="pr-8" disabled={isSubmitting || !transactionType}
                            value={dateInput} onChange={(e) => setDateInput(e.target.value)}
                            onBlur={handleDateInputBlur} placeholder="DD/MM/AAAA"
                          />
                        </FormControl>
                        <PopoverTrigger asChild>
                          <Button
                            variant={'outline'} size="icon" className="h-10 w-10 rounded-full" disabled={isSubmitting || !transactionType}
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
            </>
            
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting || !transactionType} className="w-full">
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
