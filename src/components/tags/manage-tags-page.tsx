'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  collection,
  query,
  where,
  writeBatch,
  doc,
  updateDoc,
  getDocs,
  limit,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Loader2,
  Pencil,
  Trash2,
  PlusCircle,
  MoreVertical,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { text } from '@/lib/strings';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '../ui/badge';
import { useTags } from '@/hooks/use-tags';
import { HierarchicalTag, RawTag } from '@/lib/types';
import AddTagForm from './add-tag-form';

export default function ManageTagsPageClient() {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const { toast } = useToast();
  const { rawTags, loading, refreshTags } = useTags();

  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState<RawTag | null>(null);
  const [newTagName, setNewTagName] = useState('');
  const [isDeleting, setIsDeleting] = useState<RawTag | null>(null);

  const hierarchicalTags = useMemo((): HierarchicalTag[] => {
    const principals = rawTags
      .filter((tag) => tag.isPrincipal)
      .map(
        (tag): HierarchicalTag => ({
          ...tag,
          children: [],
        })
      );

    const children = rawTags.filter((tag) => !tag.isPrincipal && tag.parent);
    const tagMap = new Map(principals.map((tag) => [tag.id, tag]));

    children.forEach((child) => {
      const parent = tagMap.get(child.parent!);
      if (parent) {
        parent.children.push(child);
      }
    });

    return Array.from(tagMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [rawTags]);

  const principalTagsForForm = useMemo(() => {
    return rawTags.filter((t) => t.isPrincipal);
  }, [rawTags]);

  const handleTagCreated = () => {
    refreshTags();
  };

  const handleRenameSubmit = async () => {
    if (!isRenaming || !newTagName.trim() || !user) return;

    const newName = newTagName.trim();
    if (newName === isRenaming.name) {
      setIsRenaming(null);
      return;
    }

    try {
      const tagRef = doc(db, 'tags', isRenaming.id);
      await updateDoc(tagRef, { name: newName });
      toast({
        title: text.common.success,
        description: `Tag "${isRenaming.name}" renomeada para "${newName}".`,
      });
      refreshTags();
    } catch (error) {
      console.error('Error renaming tag:', error);
      toast({
        variant: 'destructive',
        title: text.common.error,
        description: text.tags.renameError,
      });
    } finally {
      setIsRenaming(null);
      setNewTagName('');
    }
  };

  const handleDeleteSubmit = async () => {
    if (!isDeleting || !user) return;

    try {
      const collectionsToSearch = ['expenses', 'incomes', 'plans'];
      let isTagInUse = false;

      for (const col of collectionsToSearch) {
        const q = query(
          collection(db, col),
          where('userId', '==', user.uid),
          where('profile', '==', activeProfile),
          where('tags', 'array-contains', isDeleting.name),
          limit(1)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          isTagInUse = true;
          break;
        }
      }

      if (isTagInUse) {
        toast({
          variant: 'destructive',
          title: 'Ação não permitida',
          description: `A tag "${isDeleting.name}" está em uso e não pode ser excluída.`,
        });
        setIsDeleting(null);
        return;
      }

      const batch = writeBatch(db);
      const tagRef = doc(db, 'tags', isDeleting.id);

      if (isDeleting.isPrincipal) {
        const children = rawTags.filter((tag) => tag.parent === isDeleting.id);
        if (children.length > 0) {
          toast({
            variant: 'destructive',
            title: 'Ação não permitida',
            description: `A tag "${isDeleting.name}" possui tags vinculadas e não pode ser excluída.`,
          });
          setIsDeleting(null);
          return;
        }
      }

      batch.delete(tagRef);
      await batch.commit();

      toast({
        title: text.common.success,
        description: `A tag "${isDeleting.name}" foi excluída.`,
      });
      refreshTags();
    } catch (error) {
      console.error('Error deleting tag:', error);
      toast({
        variant: 'destructive',
        title: text.common.error,
        description: 'Erro ao tentar excluir a tag.',
      });
    } finally {
      setIsDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setIsAddFormOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nova Tag
        </Button>
      </div>

      {hierarchicalTags.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {hierarchicalTags.map((tag) => (
            <Card key={tag.id} className="flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-bold">{tag.name}</CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-8 w-8 p-0 rounded-full"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onSelect={() => {
                        setIsRenaming(tag);
                        setNewTagName(tag.name);
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      {text.common.rename}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => setIsDeleting(tag)}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {text.common.delete}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="flex-grow">
                {tag.children.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {tag.children.map((child) => (
                      <Badge key={child.id} variant="secondary">
                        {child.name}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma tag vinculada.
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg text-center text-muted-foreground">
          <p className="text-lg font-semibold">Nenhuma tag criada ainda.</p>
          <p>Clique em "Nova Tag" para começar a organizar suas finanças.</p>
        </div>
      )}

      <AddTagForm
        isOpen={isAddFormOpen}
        onOpenChange={setIsAddFormOpen}
        principalTags={principalTagsForForm}
        onTagCreated={handleTagCreated}
      />

      <AlertDialog
        open={!!isRenaming}
        onOpenChange={(open) => !open && setIsRenaming(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Renomear Tag</AlertDialogTitle>
            <AlertDialogDescription>
              Renomear a tag "{isRenaming?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRenameSubmit}
              disabled={
                !newTagName.trim() || newTagName.trim() === isRenaming?.name
              }
            >
              Renomear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!isDeleting}
        onOpenChange={(open) => !open && setIsDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Tag</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a tag "{isDeleting?.name}"? Esta
              ação não pode ser desfeita. A tag só será excluída se não estiver
              em uso e, no caso de uma tag principal, se não tiver outras tags
              vinculadas a ela.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSubmit}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
