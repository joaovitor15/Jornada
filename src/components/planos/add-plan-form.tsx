
'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { type Plan } from '@/lib/types';

const planSchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres.'),
  amount: z.coerce.number().positive('O valor deve ser um número positivo.'),
  type: z.enum(['Mensal', 'Anual']),
  paymentDay: z.coerce
    .number()
    .min(1, 'O dia deve ser entre 1 e 31')
    .max(31, 'O dia deve ser entre 1 e 31'),
});

type PlanFormProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  planToEdit?: Plan | null;
};

export default function PlanForm({ isOpen, onOpenChange, planToEdit }: PlanFormProps) {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const { toast } = useToast();
  const isEditMode = !!planToEdit;

  const form = useForm<z.infer<typeof planSchema>>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      name: '',
      amount: undefined,
      type: 'Mensal',
      paymentDay: undefined,
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && planToEdit) {
        form.reset({
          name: planToEdit.name,
          amount: planToEdit.amount,
          type: planToEdit.type,
          paymentDay: planToEdit.paymentDay,
        });
      } else {
        form.reset({
          name: '',
          amount: undefined,
          type: 'Mensal',
          paymentDay: undefined,
        });
      }
    }
  }, [isOpen, isEditMode, planToEdit, form]);

  const { isSubmitting } = form.formState;

  const handleSubmit = async (values: z.infer<typeof planSchema>) => {
    if (!user || !activeProfile) {
      toast({
        variant: 'destructive',
        title: text.common.error,
        description: text.plans.form.notLoggedIn,
      });
      return;
    }

    try {
      if (isEditMode && planToEdit?.id) {
        const planRef = doc(db, 'plans', planToEdit.id);
        await updateDoc(planRef, { ...values });
        toast({
          title: text.common.success,
          description: text.plans.form.updateSuccess,
        });
      } else {
        await addDoc(collection(db, 'plans'), {
          ...values,
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? text.plans.form.editTitle : text.plans.form.title}</DialogTitle>
          <DialogDescription>
            {isEditMode ? text.plans.form.editDescription : text.plans.form.description}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{text.plans.form.name}</FormLabel>
                  <FormControl>
                    <Input placeholder={text.plans.form.namePlaceholder} {...field} />
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
                  <FormLabel>{text.plans.form.amount}</FormLabel>
                  <FormControl>
                    <CurrencyInput
                      placeholder={text.plans.form.amountPlaceholder}
                      disabled={isSubmitting}
                      value={field.value}
                      onValueChange={(values) => field.onChange(values?.floatValue)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{text.plans.form.type}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={text.plans.form.typePlaceholder} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Mensal">{text.plans.form.types.monthly}</SelectItem>
                        <SelectItem value="Anual">{text.plans.form.types.yearly}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paymentDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{text.plans.form.paymentDay}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={31}
                        {...field}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                {text.common.cancel}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? text.plans.form.save : text.plans.form.add}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
