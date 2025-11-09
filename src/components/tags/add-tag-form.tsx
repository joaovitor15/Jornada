
'use client';

import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { collection, addDoc, doc, setDoc, getCountFromServer, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import { Loader2 } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { text } from '@/lib/strings';
import { RawTag } from '@/lib/types';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';

const formSchema = z.object({
  tagName: z.string().min(1, 'O nome da tag é obrigatório.'),
  type: z.enum(['principal', 'vinculada'], { required_error: 'Selecione um tipo de tag.' }),
  parentId: z.string().optional(),
}).refine((data) => {
  if (data.type === 'vinculada') {
    return !!data.parentId;
  }
  return true;
}, {
  message: 'Selecione uma Tag Principal para vincular.',
  path: ['parentId'],
});

type AddTagFormProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  principalTags: RawTag[];
  onTagCreated: () => void;
};

export default function AddTagForm({
  isOpen,
  onOpenChange,
  principalTags,
  onTagCreated,
}: AddTagFormProps) {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tagName: '',
      type: 'principal',
      parentId: undefined,
    },
  });

  const { control, handleSubmit, watch, reset, setValue } = form;
  const { isSubmitting } = form.formState;

  const tagType = watch('type');

  useEffect(() => {
    if (isOpen) {
      reset({
        tagName: '',
        type: 'principal',
        parentId: undefined,
      });
    }
  }, [isOpen, reset]);
  
  useEffect(() => {
    if (tagType === 'principal') {
        setValue('parentId', undefined);
    }
  }, [tagType, setValue]);


  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user || !activeProfile) {
      toast({
        variant: 'destructive',
        title: text.common.error,
        description: text.tags.createError,
      });
      return;
    }

    try {
      const batch = writeBatch(db);
      const newTagRef = doc(collection(db, 'tags'));
      
      const newTagData: RawTag = {
        id: newTagRef.id,
        userId: user.uid,
        profile: activeProfile,
        name: values.tagName.trim(),
        isPrincipal: values.type === 'principal',
        parent: values.parentId || null,
        order: 0, // Order is managed separately
      };
      
      batch.set(newTagRef, newTagData);

      // Auto-create 'Dinheiro/Pix' if 'Formas de Pagamento' is being created
       if (values.tagName.trim() === 'Formas de Pagamento' && values.type === 'principal') {
          const pixTagRef = doc(collection(db, 'tags'));
          const pixTagData: RawTag = {
            id: pixTagRef.id,
            userId: user.uid,
            profile: activeProfile,
            name: 'Dinheiro/Pix',
            isPrincipal: false,
            parent: newTagRef.id,
            order: 0,
          };
          batch.set(pixTagRef, pixTagData);
       }

      await batch.commit();

      toast({
        title: text.common.success,
        description: text.tags.createSuccess,
      });
      onTagCreated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating tag:', error);
      toast({
        variant: 'destructive',
        title: text.common.error,
        description: text.tags.createError,
      });
    }
  };

  const principalTagOptions = useMemo(() => {
    return principalTags.map(tag => ({ value: tag.id, label: tag.name }));
  }, [principalTags]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{text.tags.createTitle}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={control}
              name="type"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Tipo de Tag</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex space-x-4"
                      disabled={isSubmitting}
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="principal" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Tag Principal
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="vinculada" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Tag Vinculada
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {tagType === 'vinculada' && (
              <FormField
                control={control}
                name="parentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vincular à Tag Principal</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isSubmitting || principalTagOptions.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a tag principal" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {principalTagOptions.length === 0 ? (
                          <SelectItem value="-" disabled>
                            Nenhuma tag principal encontrada.
                          </SelectItem>
                        ) : (
                          principalTagOptions.map((tag) => (
                            <SelectItem key={tag.value} value={tag.value}>
                              {tag.label}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={control}
              name="tagName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Nova Tag</FormLabel>
                  <FormControl>
                    <Input
                      id="newTagInput"
                      name="newTagInput"
                      placeholder={
                        tagType === 'principal'
                          ? 'Ex: Conta de Luz, Supermercado'
                          : 'Ex: CEEE, Asun'
                      }
                      {...field}
                      disabled={isSubmitting}
                      autoComplete="off"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                {text.tags.createButton}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
