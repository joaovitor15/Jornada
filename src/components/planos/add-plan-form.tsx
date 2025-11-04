
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
import { Loader2, PlusCircle, Trash2, CalendarIcon } from 'lucide-react';
import { CurrencyInput } from '../ui/currency-input';
import { type Plan, type Profile, type Card } from '@/lib/types';
import {
  personalExpenseCategories,
  homeExpenseCategories,
  businessExpenseCategories,
} from '@/lib/categories';
import { Separator } from '../ui/separator';
import { onSnapshot, query, where } from 'firebase/firestore';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

const basePaymentMethods = ['Débito', 'Pix'];

const planSchema = z
  .object({
    planName: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres.'),
    amount: z.coerce
      .number()
      .positive('O custo base deve ser um número positivo.'),
    type: z.enum(['Mensal', 'Anual']),
    paymentDay: z.coerce
      .number()
      .int()
      .min(1)
      .max(31)
      .optional(),
    dueDate: z.date().optional(),
    paymentMethod: z.string().min(1, 'Selecione uma forma de pagamento.'),
    mainCategory: z.string().min(1, 'Selecione uma categoria.'),
    subcategory: z.string().min(1, 'Selecione uma subcategoria.'),
    subItems: z.array(z.object({
      name: z.string().min(1, 'O nome do item é obrigatório.'),
      price: z.coerce.number().min(0, 'O preço não pode ser negativo.'),
    })).optional(),
  })
  .refine(
    (data) => {
      if (data.type === 'Anual') return !!data.dueDate;
      return true;
    },
    {
      message: 'A data de vencimento é obrigatória para planos anuais.',
      path: ['dueDate'],
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
      dueDate: undefined,
      paymentMethod: '',
      mainCategory: '',
      subcategory: '',
      subItems: [],
    },
  });

  const { watch, setValue, reset, control } = form;
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'subItems',
  });

  const planType = watch('type');

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && planToEdit) {
        form.reset({
          planName: planToEdit.name,
          amount: planToEdit.amount,
          type: planToEdit.type,
          paymentDay: planToEdit.paymentDay,
          dueDate: planToEdit.dueDate ? planToEdit.dueDate.toDate() : undefined,
          paymentMethod: planToEdit.paymentMethod,
          mainCategory: planToEdit.mainCategory,
          subcategory: planToEdit.subcategory,
          subItems: planToEdit.subItems || [],
        });
      } else {
        form.reset({
          planName: '',
          amount: undefined,
          type: 'Mensal',
          paymentDay: undefined,
          dueDate: undefined,
          paymentMethod: '',
          mainCategory: '',
          subcategory: '',
          subItems: [],
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

  const handleSubmit = async (values: z.infer<typeof planSchema>) => {
    if (!user || !activeProfile) {
      toast({
        variant: 'destructive',
        title: text.common.error,
        description: text.plans.form.notLoggedIn,
      });
      return;
    }
    
    const { planName, ...rest } = values;

    const dataToSend: Partial<Omit<Plan, 'id' | 'userId' | 'profile'>> & { name: string; } = {
        name: planName,
        amount: rest.amount,
        type: rest.type,
        paymentMethod: rest.paymentMethod,
        mainCategory: rest.mainCategory,
        subcategory: rest.subcategory,
        subItems: values.subItems && values.subItems.length > 0 ? values.subItems : [],
    };
    
    if (rest.type === 'Anual') {
        dataToSend.dueDate = Timestamp.fromDate(rest.dueDate!);
    } else {
        dataToSend.paymentDay = rest.paymentDay;
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
                {planType === 'Mensal' && (
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
                )}
                {planType === 'Anual' && (
                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Data do Vencimento</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP", { locale: ptBR })
                                ) : (
                                  <span>Escolha uma data</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date("1900-01-01")}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
