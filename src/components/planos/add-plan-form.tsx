
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
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
import { text } from '@/lib/strings';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { CurrencyInput } from '../ui/currency-input';
import { type Plan, type Profile, type Card } from '@/lib/types';
import {
  personalExpenseCategories,
  homeExpenseCategories,
  businessExpenseCategories,
} from '@/lib/categories';
import { Separator } from '../ui/separator';
import { onSnapshot, query, where } from 'firebase/firestore';
import TagInput from '../ui/tag-input';

const planSchema = z
  .object({
    planName: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres.'),
    amount: z.coerce
      .number()
      .positive('O custo base deve ser um número positivo.'),
    type: z.enum(['Mensal', 'Anual']),
    paymentDay: z.coerce.number().int().min(1).max(31).optional(),
    dueDay: z.coerce.number().int().min(1, "O dia é obrigatório.").max(31, "Dia inválido.").optional(),
    dueMonth: z.coerce.number().int().min(0).max(11).optional(),
    dueYear: z.coerce.number().int().min(new Date().getFullYear()).optional(),
    paymentMethod: z.string().min(1, 'Selecione uma forma de pagamento.'),
    mainCategory: z.string().min(1, 'Selecione uma categoria.'),
    subcategory: z.string().min(1, 'Selecione uma subcategoria.'),
    subItems: z.array(z.object({
      name: z.string().min(1, 'O nome do item é obrigatório.'),
      price: z.coerce.number().min(0, 'O preço não pode ser negativo.'),
    })).optional(),
    tags: z.array(z.string()).optional(),
  })
  .refine(
    (data) => {
      if (data.type === 'Anual') {
        return data.dueDay !== undefined && data.dueMonth !== undefined && data.dueYear !== undefined;
      }
      return true;
    },
    {
      message: 'Para planos anuais, dia, mês e ano são obrigatórios.',
      path: ['dueDay'], 
    }
  )
   .refine(
    (data) => {
      if (data.type === 'Mensal') return !!data.paymentDay;
      return true;
    },
    {
      message: 'O dia do vencimento é obrigatório para planos mensais.',
      path: ['paymentDay'],
    }
  );


type PlanFormProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  planToEdit?: Plan | null;
};

export default function PlanForm({
  isOpen,
  onOpenChange,
  planToEdit,
}: PlanFormProps) {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const { toast } = useToast();
  const [cards, setCards] = useState<Card[]>([]);
  const isEditMode = !!planToEdit;

  const form = useForm<z.infer<typeof planSchema>>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      planName: '',
      amount: undefined,
      type: 'Mensal',
      paymentDay: undefined,
      paymentMethod: '',
      mainCategory: '',
      subcategory: '',
      subItems: [],
      tags: [],
    },
  });

  const { watch, setValue, reset, control } = form;
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'subItems',
  });

  const planType = watch('type');
  
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

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && planToEdit) {
        let dueDay, dueMonth, dueYear;
        if (planToEdit.type === 'Anual' && planToEdit.dueDate) {
          const date = planToEdit.dueDate.toDate();
          dueDay = date.getDate();
          dueMonth = date.getMonth();
          dueYear = date.getFullYear();
        }
        
        form.reset({
          planName: planToEdit.name,
          amount: planToEdit.amount,
          type: planToEdit.type,
          paymentDay: planToEdit.paymentDay,
          dueDay: dueDay,
          dueMonth: dueMonth,
          dueYear: dueYear,
          paymentMethod: planToEdit.paymentMethod,
          mainCategory: planToEdit.mainCategory,
          subcategory: planToEdit.subcategory,
          subItems: planToEdit.subItems || [],
          tags: planToEdit.tags || [],
        });
      } else {
        form.reset({
          planName: '',
          amount: undefined,
          type: 'Mensal',
          paymentDay: undefined,
          dueDay: undefined,
          dueMonth: undefined,
          dueYear: undefined,
          paymentMethod: '',
          mainCategory: '',
          subcategory: '',
          subItems: [],
          tags: [],
        });
      }
    }
  }, [isOpen, isEditMode, planToEdit, form]);

  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name === 'mainCategory') {
        setValue('subcategory', '');
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, setValue]);

  useEffect(() => {
    if (!user || !activeProfile) return;
    const cardsQuery = query(
      collection(db, 'cards'),
      where('userId', '==', user.uid),
      where('profile', '==', activeProfile)
    );
    const unsubscribe = onSnapshot(cardsQuery, (snapshot) => {
      setCards(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Card))
      );
    });
    return () => unsubscribe();
  }, [user, activeProfile]);

  const { isSubmitting } = form.formState;

  const categoryConfig = getCategoryConfig(activeProfile);
  const mainCategories = Object.keys(categoryConfig);
  const selectedMainCategory = watch('mainCategory');
  const subcategories = useMemo(() => {
    return selectedMainCategory
      ? categoryConfig[selectedMainCategory] || []
      : [];
  }, [selectedMainCategory, categoryConfig]);
  
  const basePaymentMethods = ['Débito', 'Pix'];
  const paymentMethods = useMemo(() => {
    const cardMethods = cards.map((card) => `Cartão: ${card.name}`);
    return [...basePaymentMethods, ...cardMethods];
  }, [cards]);

  const watchedSubItems = watch('subItems');
  const watchedBaseAmount = watch('amount');
  const totalAmount = useMemo(() => {
    const subItemsTotal =
      watchedSubItems?.reduce((acc, item) => acc + (item.price || 0), 0) ?? 0;
    return (watchedBaseAmount || 0) + subItemsTotal;
  }, [watchedSubItems, watchedBaseAmount]);

  const monthOptions = Object.entries(text.dashboard.months).map(([key, label], index) => ({
    value: index,
    label: label,
  }));

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 10 }, (_, i) => currentYear + i);
  }, []);

  const handleSubmit = async (values: z.infer<typeof planSchema>) => {
    if (!user || !activeProfile) {
      toast({
        variant: 'destructive',
        title: text.common.error,
        description: text.plans.form.notLoggedIn,
      });
      return;
    }
    
    const { planName, dueDay, dueMonth, dueYear, paymentDay, ...rest } = values;

    const dataToSend: Partial<Omit<Plan, 'id' | 'userId' | 'profile'>> & { name: string; } = {
        name: planName,
        amount: rest.amount,
        type: rest.type,
        paymentMethod: rest.paymentMethod,
        mainCategory: rest.mainCategory,
        subcategory: rest.subcategory,
        subItems: values.subItems && values.subItems.length > 0 ? values.subItems : [],
        tags: values.tags || [],
    };
    
    if (rest.type === 'Anual' && dueDay !== undefined && dueMonth !== undefined && dueYear !== undefined) {
        dataToSend.dueDate = Timestamp.fromDate(new Date(dueYear, dueMonth, dueDay));
    } else if (rest.type === 'Mensal') {
        dataToSend.paymentDay = paymentDay;
    }

    try {
      if (isEditMode && planToEdit?.id) {
        const planRef = doc(db, 'plans', planToEdit.id);
        await updateDoc(planRef, dataToSend);
        toast({
          title: text.common.success,
          description: text.plans.form.updateSuccess,
        });
      } else {
        await addDoc(collection(db, 'plans'), {
          ...dataToSend,
          userId: user.uid,
          profile: activeProfile,
        });
        toast({
          title: text.common.success,
          description: text.plans.form.addSuccess,
        });
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao salvar plano:', error);
      toast({
        variant: 'destructive',
        title: text.common.error,
        description: text.plans.form.saveError(isEditMode),
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? text.plans.form.editTitle : text.plans.form.title}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col max-h-[80vh]"
          >
            <div className="space-y-4 overflow-y-auto pr-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="planName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{text.plans.form.name}</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Netflix, Meli+" {...field} />
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
                      <FormLabel>Custo Base</FormLabel>
                      <FormControl>
                        <CurrencyInput
                          placeholder={text.placeholders.amount}
                          disabled={isSubmitting}
                          value={field.value}
                          onValueChange={(values) =>
                            field.onChange(values?.floatValue)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="mainCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{text.common.mainCategory}</FormLabel>
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
                          {mainCategories.map((category) => (
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
                        disabled={isSubmitting || subcategories.length === 0}
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
                        <SelectContent>
                          {subcategories.map((sub) => (
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
                          disabled={isSubmitting}
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={text.addExpenseForm.selectPaymentMethod}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                 <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>{text.plans.form.type}</FormLabel>
                        <Select
                            onValueChange={field.onChange}
                            value={field.value}
                        >
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue
                                placeholder={text.plans.form.typePlaceholder}
                                />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            <SelectItem value="Mensal">
                                {text.plans.form.types.monthly}
                            </SelectItem>
                            <SelectItem value="Anual">
                                {text.plans.form.types.yearly}
                            </SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                {planType === 'Mensal' ? (
                    <FormField
                      control={form.control}
                      name="paymentDay"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dia do Vencimento</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              max={31}
                              {...field}
                              onChange={(e) => field.onChange(e.target.valueAsNumber || undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    <FormField
                      control={form.control}
                      name="dueDay"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dia</FormLabel>
                          <FormControl>
                             <Input
                              type="number"
                              min={1}
                              max={31}
                              placeholder='Dia'
                              {...field}
                              onChange={(e) => field.onChange(e.target.valueAsNumber || undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name="dueMonth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mês</FormLabel>
                           <Select onValueChange={(value) => field.onChange(Number(value))} value={String(field.value)}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Mês" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {monthOptions.map((month) => (
                                  <SelectItem key={month.value} value={String(month.value)}>
                                    {month.label}
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
                      name="dueYear"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ano</FormLabel>
                          <Select onValueChange={(value) => field.onChange(Number(value))} value={String(field.value)}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Ano" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {yearOptions.map((year) => (
                                  <SelectItem key={year} value={String(year)}>
                                    {year}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <FormLabel>Planos com Combo</FormLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ name: '', price: 0 })}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Item
                  </Button>
                </div>
                <div className="space-y-2 mt-2">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex items-end gap-2">
                      <FormField
                        control={form.control}
                        name={`subItems.${index}.name`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Nome do item (ex: Disney+)"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`subItems.${index}.price`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <CurrencyInput
                                placeholder="Preço"
                                className="w-32"
                                value={field.value}
                                onValueChange={(values) =>
                                  field.onChange(values?.floatValue)
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-6 mt-auto">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Valor Total do Plano
                </p>
                <p className="text-2xl font-bold">
                  {totalAmount.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </p>
              </div>
              <DialogFooter className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  {text.common.cancel}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isEditMode ? text.plans.form.save : text.plans.form.add}
                </Button>
              </DialogFooter>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
