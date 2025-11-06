
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  collection,
  query,
  where,
  writeBatch,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
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
  ChevronRight,
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
import { cn } from '@/lib/utils';

export default function ManageTagsPageClient() {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const { toast } = useToast();
  const { rawTags, loading, refreshTags } = useTags();

  const [selectedTag, setSelectedTag] = useState<HierarchicalTag | null>(null);
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

    return Array.from(tagMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [rawTags]);
  
  const principalTagsForForm = useMemo(() => {
    return rawTags.filter(t => t.isPrincipal);
  }, [rawTags]);
  
  useEffect(() => {
    if (selectedTag) {
        const updatedSelectedTag = hierarchicalTags.find(t => t.id === selectedTag.id);
        setSelectedTag(updatedSelectedTag || null);
    } else if (hierarchicalTags.length > 0) {
        setSelectedTag(hierarchicalTags[0]);
    } else {
        setSelectedTag(null);
    }
  }, [hierarchicalTags]);

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
        const childrenQuery = query(collection(db, 'tags'), where('parent', '==', isDeleting.id));
        const childrenSnap = await getDocs(childrenQuery);
        if (!childrenSnap.empty) {
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
      
      if (isDeleting.id === selectedTag?.id) {
        setSelectedTag(null);
      }
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
      <div className="md:col-span-1 flex flex-col h-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Tags Principais</h2>
          <Button size="sm" onClick={() => setIsAddFormOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nova Tag
          </Button>
        </div>
        <Card className="flex-1">
          <CardContent className="p-2 h-full overflow-y-auto">
            {hierarchicalTags.length > 0 ? (
              <div className="space-y-1">
                {hierarchicalTags.map((tag) => (
                  <div
                    key={tag.id}
                    className={cn(
                      'w-full text-left p-2 rounded-lg transition-colors flex items-center justify-between group',
                      selectedTag?.id === tag.id
                        ? 'bg-primary/10'
                        : 'hover:bg-muted'
                    )}
                  >
                    <button
                      onClick={() => setSelectedTag(tag)}
                      className="flex-grow flex items-center justify-between text-left"
                    >
                      <span className="font-semibold">{tag.name}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant={selectedTag?.id === tag.id ? "default" : "secondary"}>{tag.children.length}</Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => { setIsRenaming(tag); setNewTagName(tag.name); }}>
                          <Pencil className="mr-2 h-4 w-4" />
                          {text.common.rename}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setIsDeleting(tag)} className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          {text.common.delete}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-center text-muted-foreground p-4">
                <p>Nenhuma tag principal criada. Clique em "Nova Tag" para começar.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="md:col-span-2 flex flex-col h-full">
         <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">
              {selectedTag ? `Tags Vinculadas a "${selectedTag.name}"` : 'Selecione uma Tag Principal'}
            </h2>
        </div>
        <Card className="flex-1">
          <CardContent className="p-4 h-full overflow-y-auto">
             {selectedTag ? (
                 selectedTag.children.length > 0 ? (
                    <div className="space-y-2">
                         {selectedTag.children.map((child) => (
                             <div key={child.id} className="flex justify-between items-center p-2 rounded-md hover:bg-muted/50">
                                 <Badge variant="outline">{child.name}</Badge>
                                 <div className="flex items-center">
                                     <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setIsRenaming(child); setNewTagName(child.name); }}>
                                        <Pencil className="h-4 w-4" />
                                     </Button>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setIsDeleting(child)}>
                                        <Trash2 className="h-4 w-4" />
                                     </Button>
                                 </div>
                             </div>
                         ))}
                    </div>
                 ) : (
                     <div className="flex items-center justify-center h-full text-center text-muted-foreground p-4">
                        <p>Nenhuma tag vinculada. Adicione uma usando o formulário.</p>
                    </div>
                 )
             ) : (
                 <div className="flex items-center justify-center h-full text-center text-muted-foreground p-4">
                    <p>Selecione uma tag principal na lista à esquerda para ver suas tags vinculadas.</p>
                </div>
             )}
          </CardContent>
        </Card>
      </div>
      
      <AddTagForm 
        isOpen={isAddFormOpen}
        onOpenChange={setIsAddFormOpen}
        principalTags={principalTagsForForm}
        onTagCreated={handleTagCreated}
      />
      
      <AlertDialog open={!!isRenaming} onOpenChange={(open) => !open && setIsRenaming(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Renomear Tag</AlertDialogTitle>
            <AlertDialogDescription>
              Renomear a tag "{isRenaming?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input value={newTagName} onChange={(e) => setNewTagName(e.target.value)} />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRenameSubmit} disabled={!newTagName.trim() || newTagName.trim() === isRenaming?.name}>
              Renomear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!isDeleting} onOpenChange={(open) => !open && setIsDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Tag</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a tag "{isDeleting?.name}"? Esta ação não pode ser desfeita. A tag só será excluída se não estiver em uso e se não tiver outras tags vinculadas a ela.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSubmit} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
