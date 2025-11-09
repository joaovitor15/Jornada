
'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  doc,
  serverTimestamp,
  updateDoc,
  query,
  where,
  getDocs,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
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
import { text } from '@/lib/strings';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { CurrencyInput } from '../ui/currency-input';
import { type Card, type RawTag, type Profile } from '@/lib/types';

const cardSchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres.'),
  limit: z.coerce.number().positive('O limite deve ser um número positivo.'),
  closingDay: z.coerce
    .number()
    .min(1, 'O dia deve ser entre 1 e 31')
    .max(31, 'O dia deve ser entre 1 e 31'),
  dueDay: z.coerce
    .number()
    .min(1, 'O dia deve ser entre 1 e 31')
    .max(31, 'O dia deve ser entre 1 e 31'),
});

type CardFormProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  cardToEdit?: Card | null;
};

// Função para garantir que uma tag principal exista e retornar seu ID
async function getOrCreatePrincipalTag(
  batch: any,
  userId: string,
  profile: Profile,
  tagName: 'Cartões' | 'Formas de Pagamento'
): Promise<string> {
  const tagsRef = collection(db, 'tags');
  const q = query(
    tagsRef,
    where('userId', '==', userId),
    where('profile', '==', profile),
    where('name', '==', tagName),
    where('isPrincipal', '==', true)
  );

  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    return querySnapshot.docs[0].id;
  } else {
    const newTagRef = doc(tagsRef);
    const newTagData = {
      id: newTagRef.id,
      userId: userId,
      profile: profile,
      name: tagName,
      isPrincipal: true,
      parent: null,
      order: tagName === 'Cartões' ? 99 : 98, // Prioritize 'Formas de Pagamento' before 'Cartões'
    };
    batch.set(newTagRef, newTagData);
    
     if (tagName === 'Formas de Pagamento') {
      const pixTagRef = doc(collection(db, 'tags'));
      const pixTagData: RawTag = {
        id: pixTagRef.id,
        userId: userId,
        profile: profile,
        name: 'Dinheiro/Pix',
        isPrincipal: false,
        parent: newTagRef.id,
        order: 0,
      };
      batch.set(pixTagRef, pixTagData);
    }
    
    return newTagRef.id;
  }
}

export default function CardForm({
  isOpen,
  onOpenChange,
  cardToEdit,
}: CardFormProps) {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const { toast } = useToast();
  const isEditMode = !!cardToEdit;

  const form = useForm<z.infer<typeof cardSchema>>({
    resolver: zodResolver(cardSchema),
    defaultValues: {
      name: '',
      limit: undefined,
      closingDay: undefined,
      dueDay: undefined,
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && cardToEdit) {
        form.reset({
          name: cardToEdit.name,
          limit: cardToEdit.limit,
          closingDay: cardToEdit.closingDay,
          dueDay: cardToEdit.dueDay,
        });
      } else {
        form.reset({
          name: '',
          limit: undefined,
          closingDay: undefined,
          dueDay: undefined,
        });
      }
    }
  }, [isOpen, isEditMode, cardToEdit, form]);

  const { isSubmitting } = form.formState;

  const handleSubmitCard = async (values: z.infer<typeof cardSchema>) => {
    if (!user || !activeProfile) {
      toast({
        variant: 'destructive',
        title: text.common.error,
        description: text.addCardForm.notLoggedIn,
      });
      return;
    }

    try {
      const batch = writeBatch(db);

      if (isEditMode && cardToEdit?.id) {
        const cardRef = doc(db, 'cards', cardToEdit.id);
        batch.update(cardRef, { ...values, isArchived: false });

        // Also update the corresponding tag
        const tagsQuery = query(
          collection(db, 'tags'),
          where('userId', '==', user.uid),
          where('profile', '==', activeProfile),
          where('name', '==', cardToEdit.name),
          where('parent', '!=', null)
        );
        const tagsSnapshot = await getDocs(tagsQuery);
        if (!tagsSnapshot.empty) {
          const tagDoc = tagsSnapshot.docs[0];
          const tagRef = doc(db, 'tags', tagDoc.id);
          batch.update(tagRef, { name: values.name.trim() });
        }
        
        await batch.commit();
        
        toast({
          title: text.common.success,
          description: text.addCardForm.updateSuccess,
        });

      } else {
        // Guarantee essential principal tags exist using the batch
        await getOrCreatePrincipalTag(batch, user.uid, activeProfile, 'Formas de Pagamento');
        const principalCartoesTagId = await getOrCreatePrincipalTag(batch, user.uid, activeProfile, 'Cartões');
        
        const childTagRef = doc(collection(db, 'tags'));
        const childTagData: RawTag = {
          id: childTagRef.id,
          userId: user.uid,
          profile: activeProfile,
          name: values.name.trim(),
          isPrincipal: false,
          parent: principalCartoesTagId,
          order: 0, // Order can be managed later
        };
        batch.set(childTagRef, childTagData);

        const newCardRef = doc(collection(db, 'cards'));
        const newCardData = {
          ...values,
          userId: user.uid,
          profile: activeProfile,
          createdAt: serverTimestamp(),
          isArchived: false,
        };
        batch.set(newCardRef, newCardData);
        
        await batch.commit();

        toast({
          title: text.common.success,
          description: text.addCardForm.addSuccess,
        });
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao salvar cartão ou gerenciar tags:', error);
      toast({
        variant: 'destructive',
        title: text.common.error,
        description: text.addCardForm.saveError(isEditMode),
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? text.addCardForm.editTitle : text.addCardForm.title}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? text.addCardForm.editDescription
              : text.addCardForm.description}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmitCard)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{text.addCardForm.cardName}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={text.addCardForm.cardNamePlaceholder}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="limit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{text.addCardForm.limit}</FormLabel>
                  <FormControl>
                    <CurrencyInput
                      placeholder={text.addCardForm.limitPlaceholder}
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
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="closingDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{text.addCardForm.closingDay}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={31}
                        {...field}
                        onChange={(e) =>
                          field.onChange(e.target.valueAsNumber)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dueDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{text.addCardForm.dueDay}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={31}
                        {...field}
                        onChange={(e) =>
                          field.onChange(e.target.valueAsNumber)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
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
                {isEditMode
                  ? text.addCardForm.saveChanges
                  : text.addCardForm.addCard}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
