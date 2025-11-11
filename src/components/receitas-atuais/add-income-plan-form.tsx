
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, writeBatch, getDocs, query, where } from 'firebase/firestore';
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
import { Loader2 } from 'lucide-react';
import { CurrencyInput } from '../ui/currency-input';
import { type IncomePlan, RawTag } from '@/lib/types';
import TagInput from '../ui/tag-input';
import { useTags } from '@/hooks/use-tags';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';

const incomePlanSchema = z
  .object({
    title: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres.'),
    valueType: z.enum(['Fixo', 'Variável']),
    amount: z.coerce.number().optional(),
    type: z.string().min(1, 'A frequência é obrigatória.'),
    receiptDay: z.coerce.number().int().min(1).max(31).optional(),
    tags: z.array(z.string()).optional(),
  })
  .refine(
    (data) => {
      if (data.valueType === 'Fixo' && (data.amount === undefined || data.amount <= 0)) {
        return false;
      }
      return true;
    }, {
      message: 'O valor deve ser um número positivo para receitas de valor fixo.',
      path: ['amount'],
    }
  );


type AddIncomePlanFormProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  planToEdit?: IncomePlan | null;
};

const ensurePeriodTags = async (userId: string, profile: string, allTags: RawTag[], refreshTags: () => void) => {
    const periodTagExists = allTags.some(tag => tag.name === 'Período' && tag.isPrincipal);

    if (!periodTagExists) {
        try {
            const batch = writeBatch(db);
            const tagsRef = collection(db, 'tags');

            const periodTagRef = doc(tagsRef);
            const periodTagData: RawTag = {
                id: periodTagRef.id,
                userId,
                profile,
                name: 'Período',
                isPrincipal: true,
                parent: null,
                order: 100,
            };
            batch.set(periodTagRef, periodTagData);
            
            await batch.commit();
            refreshTags();
        } catch (error) {
            console.error("Failed to create base period tags:", error);
        }
    }
};

export default function AddIncomePlanForm({
  isOpen,
  onOpenChange,
  planToEdit,
}: AddIncomePlanFormProps) {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const { toast } = useToast();
  const isEditMode = !!planToEdit;
  const { hierarchicalTags: allTags, rawTags, refreshTags } = useTags();

  const form = useForm<z.infer<typeof incomePlanSchema>>({
    resolver: zodResolver(incomePlanSchema),
    defaultValues: {
      title: '',
      valueType: 'Fixo',
      amount: undefined,
      type: 'Mensal',
      receiptDay: undefined,
      tags: [],
    },
  });

  const { watch, setValue, reset, control } = form;
  
  const { availableTags, frequencyOptions } = useMemo(() => {
    const periodPrincipal = allTags.find(
      (tag) => tag.name === 'Período' && tag.isPrincipal
    );

    const freqOptions =
      periodPrincipal?.children
        .filter((c) => !c.isArchived && c.name !== 'Vitalício')
        .map((c) => c.name) || ['Diário', 'Mensal', 'Anual'];
    
    const generalTags = allTags
      .filter(pt => pt.name !== 'Período')
      .flatMap(pt => pt.children)
      .filter(t => !t.isArchived)
      .map(t => t.name);

    return {
      availableTags: Array.from(new Set(generalTags)),
      frequencyOptions: freqOptions,
    };
  }, [allTags]);


  const planType = watch('type');
  const valueType = watch('valueType');


  useEffect(() => {
     if (isOpen && user && activeProfile) {
        ensurePeriodTags(user.uid, activeProfile, rawTags, refreshTags);
    }
    if (isOpen) {
      if (isEditMode && planToEdit) {
        form.reset({
          title: planToEdit.name,
          valueType: planToEdit.valueType || 'Fixo',
          amount: planToEdit.amount,
          type: planToEdit.type,
          receiptDay: planToEdit.receiptDay || undefined,
          tags: planToEdit.tags || [],
        });
      } else {
        form.reset({
          title: '',
          valueType: 'Fixo',
          amount: undefined,
          type: 'Mensal',
          receiptDay: undefined,
          tags: [],
        });
      }
    }
  }, [isOpen, isEditMode, planToEdit, form, user, activeProfile, rawTags, refreshTags]);

  useEffect(() => {
    if (valueType === 'Variável') {
      setValue('amount', 0);
    }
  }, [valueType, setValue]);

  const { isSubmitting } = form.formState;

  const handleSubmit = async (values: z.infer<typeof incomePlanSchema>) => {
    if (!user || !activeProfile) {
      toast({
        variant: 'destructive',
        title: text.common.error,
        description: "Você precisa estar logado.",
      });
      return;
    }
    
    const { title, ...rest } = values;

    let order = planToEdit?.order;
    if (!isEditMode) {
      const plansQuery = query(collection(db, 'incomePlans'), where('userId', '==', user.uid), where('profile', '==', activeProfile));
      const querySnapshot = await getDocs(plansQuery);
      order = querySnapshot.size;
    }

    const dataToSend: Partial<Omit<IncomePlan, 'id' | 'userId' | 'profile'>> & { name: string; } = {
        name: title,
        valueType: rest.valueType,
        amount: rest.valueType === 'Fixo' ? rest.amount || 0 : 0,
        type: rest.type as 'Diário' | 'Mensal' | 'Anual',
        tags: values.tags || [],
        order,
        receiptDay: rest.receiptDay || null,
    };
    
    if (rest.type !== 'Mensal') {
        dataToSend.receiptDay = null;
    }

    try {
      if (isEditMode && planToEdit?.id) {
        const planRef = doc(db, 'incomePlans', planToEdit.id);
        await updateDoc(planRef, dataToSend as { [x: string]: any });
        toast({
          title: text.common.success,
          description: "Plano de receita atualizado com sucesso!",
        });
      } else {
        await addDoc(collection(db, 'incomePlans'), {
          ...dataToSend,
          userId: user.uid,
          profile: activeProfile,
        });
        toast({
          title: text.common.success,
          description: "Plano de receita adicionado com sucesso!",
        });
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao salvar plano de receita:', error);
      toast({
        variant: 'destructive',
        title: text.common.error,
        description: isEditMode ? "Erro ao atualizar plano de receita." : "Erro ao adicionar plano de receita.",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Editar Receita Recorrente" : "Nova Receita Recorrente"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col max-h-[80vh]"
          >
            <div className="space-y-4 overflow-y-auto pr-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Receita</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Salário, Aluguel" {...field} autoComplete="off" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="valueType"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Tipo de Valor</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex space-x-4"
                        disabled={isSubmitting}
                      >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="Fixo" />
                          </FormControl>
                          <FormLabel className="font-normal">Fixo</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="Variável" />
                          </FormControl>
                          <FormLabel className="font-normal">Variável</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {valueType === 'Fixo' && (
                 <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor Base</FormLabel>
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
              )}

              <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags</FormLabel>
                      <FormControl>
                        <TagInput
                            availableTags={availableTags}
                            placeholder="Selecione as tags..."
                            value={field.value || []}
                            onChange={field.onChange}
                            disabled={isSubmitting}
                        />
                      </FormControl>
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
                        <FormLabel>Período</FormLabel>
                        <Select
                            onValueChange={field.onChange}
                            value={field.value}
                        >
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue
                                placeholder="Selecione o período"
                                />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {frequencyOptions.map(freq => (
                                <SelectItem key={freq} value={freq}>
                                  {freq}
                                </SelectItem>
                              ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                {planType === 'Mensal' && (
                    <FormField
                      control={form.control}
                      name="receiptDay"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dia do Recebimento (Opcional)</FormLabel>
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
              </div>

            </div>

            <div className="pt-6 mt-auto">
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
                  {isEditMode ? text.plans.form.save : "Adicionar Receita"}
                </Button>
              </DialogFooter>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
