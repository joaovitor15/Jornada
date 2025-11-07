
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
  writeBatch,
  limit,
  setDoc,
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
import { type Card, RawTag } from '@/lib/types';

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

  const handleTagManagement = async (
    newCardName: string,
    oldCardName?: string
  ) => {
    if (!user || !activeProfile) return;

    const principalTagName = 'Cartões';
    const tagsRef = collection(db, 'tags');

    try {
      // --- Passo 1: Garantir que a tag principal "Cartões" exista ---
      const principalQuery = query(
        tagsRef,
        where('userId', '==', user.uid),
        where('profile', '==', activeProfile),
        where('name', '==', principalTagName),
        where('isPrincipal', '==', true),
        limit(1)
      );

      const principalSnapshot = await getDocs(principalQuery);
      let principalTagId: string;

      if (principalSnapshot.empty) {
        const principalRef = doc(tagsRef);
        principalTagId = principalRef.id;
        await setDoc(principalRef, {
          id: principalTagId,
          userId: user.uid,
          profile: activeProfile,
          name: principalTagName,
          isPrincipal: true,
          parent: null,
          order: -1, 
        });
      } else {
        principalTagId = principalSnapshot.docs[0].id;
      }
      
      // --- Passo 2: Lidar com a tag filha (o nome do cartão) ---
      if (isEditMode && oldCardName && oldCardName !== newCardName) {
        // Renomear: Encontrar a tag filha antiga e atualizar seu nome
        const childQuery = query(
          tagsRef,
          where('userId', '==', user.uid),
          where('profile', '==', activeProfile),
          where('name', '==', oldCardName),
          where('parent', '==', principalTagId),
          limit(1)
        );
        const childSnapshot = await getDocs(childQuery);
        if (!childSnapshot.empty) {
          const oldTagRef = childSnapshot.docs[0].ref;
          await updateDoc(oldTagRef, { name: newCardName });
        } else {
           const newChildRef = doc(tagsRef);
            await setDoc(newChildRef, {
                id: newChildRef.id,
                userId: user.uid,
                profile: activeProfile,
                name: newCardName,
                isPrincipal: false,
                parent: principalTagId,
            });
        }
      } else if (!isEditMode) {
        // Criar nova: Criar uma nova tag filha para o novo cartão
        const newChildRef = doc(tagsRef);
        await setDoc(newChildRef, {
          id: newChildRef.id,
          userId: user.uid,
          profile: activeProfile,
          name: newCardName,
          isPrincipal: false,
          parent: principalTagId,
        });
      }

    } catch (error) {
      console.error("Erro ao gerenciar tags de cartão:", error);
      toast({
        variant: "destructive",
        title: "Erro de Sincronização",
        description: "O cartão foi salvo, mas houve um erro ao criar/atualizar a tag associada.",
      });
    }
  };


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
      if (isEditMode && cardToEdit?.id) {
        const previousName = cardToEdit.name;
        const cardRef = doc(db, 'cards', cardToEdit.id);
        await updateDoc(cardRef, values);
        await handleTagManagement(values.name, previousName);
        toast({
          title: text.common.success,
          description: text.addCardForm.updateSuccess,
        });
      } else {
        await addDoc(collection(db, 'cards'), {
          ...values,
          userId: user.uid,
          profile: activeProfile,
          createdAt: serverTimestamp(),
        });
        await handleTagManagement(values.name);
        toast({
          title: text.common.success,
          description: text.addCardForm.addSuccess,
        });
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao salvar cartão:', error);
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
                      id="cardNameInput"
                      name="cardNameInput"
                      autoComplete="off"
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
