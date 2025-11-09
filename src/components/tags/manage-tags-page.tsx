
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
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
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
  ChevronLeft,
  ChevronRight,
  Archive,
  ArchiveX,
  ArrowUp,
  ArrowDown,
  Search,
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
import { useTags } from '@/hooks/use-tags';
import { HierarchicalTag, RawTag } from '@/lib/types';
import AddTagForm from './add-tag-form';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';

type FilterType = 'inUse' | 'registered' | 'archived';

export default function ManageTagsPageClient() {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const { toast } = useToast();
  const { hierarchicalTags, loading, refreshTags, usedTagNames, updateTagOrder } = useTags();

  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState<RawTag | null>(null);
  const [newTagName, setNewTagName] = useState('');
  const [isDeleting, setIsDeleting] = useState<RawTag | null>(null);
  const [isArchiving, setIsArchiving] = useState<RawTag | null>(null);
  const [isUnarchiving, setIsUnarchiving] = useState<RawTag | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('inUse');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTags = useMemo((): HierarchicalTag[] => {
    let baseList: HierarchicalTag[] = [];
    
    if (filter === 'inUse') {
        baseList = hierarchicalTags
            .map((tag) => {
                if (tag.isArchived) return null;

                const isPrincipalInUse = usedTagNames.has(tag.name);
                const isChildInUse = tag.children.some(child => !child.isArchived && usedTagNames.has(child.name));
                
                if (isPrincipalInUse || isChildInUse) {
                    const activeChildren = tag.children.filter(child => !child.isArchived && usedTagNames.has(child.name));
                    return { ...tag, children: activeChildren };
                }
                
                return null;
            })
            .filter((tag): tag is HierarchicalTag => tag !== null);

    } else if (filter === 'registered') {
        baseList = hierarchicalTags
            .map((tag) => {
                if (tag.isArchived) return null;
                const unusedChildren = tag.children.filter(child => !child.isArchived && !usedTagNames.has(child.name));
                const isPrincipalUsed = usedTagNames.has(tag.name);
                 const hasUsedChildren = tag.children.some(child => usedTagNames.has(child.name));


                if (!isPrincipalUsed && !hasUsedChildren) {
                     return { ...tag, children: unusedChildren };
                }
                
                return null;
            })
            .filter((tag): tag is HierarchicalTag => tag !== null);


    } else if (filter === 'archived') {
       baseList = hierarchicalTags
        .map(tag => {
            const archivedChildren = tag.children.filter(child => child.isArchived);
            if (tag.isArchived || archivedChildren.length > 0) {
                return { ...tag, children: archivedChildren };
            }
            return null;
        })
        .filter((tag): tag is HierarchicalTag => tag !== null);
    }

    if (!searchTerm) {
      return baseList;
    }
    
    return baseList
      .map(tag => {
        const matchingChildren = tag.children.filter(child => child.name.toLowerCase().includes(searchTerm.toLowerCase()));
        if (tag.name.toLowerCase().includes(searchTerm.toLowerCase()) || matchingChildren.length > 0) {
          // If parent matches, show all its (filtered by tab) children, not just matching ones
          if (tag.name.toLowerCase().includes(searchTerm.toLowerCase())) {
            return tag;
          }
          // If only children match, show parent with only matching children
          return { ...tag, children: matchingChildren };
        }
        return null;
      })
      .filter((tag): tag is HierarchicalTag => tag !== null);

  }, [hierarchicalTags, filter, usedTagNames, searchTerm]);


  const selectedTag = useMemo(() => {
    return filteredTags.find((tag) => tag.id === selectedTagId) || null;
  }, [selectedTagId, filteredTags]);

  const principalTagsForForm = useMemo(() => {
    return hierarchicalTags.filter((t) => t.isPrincipal && !t.isArchived);
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
  
   const handleReorder = async (tagId: string, direction: 'up' | 'down') => {
    const currentIndex = filteredTags.findIndex(t => t.id === tagId);
    if (currentIndex === -1) return;

    const newTags = Array.from(filteredTags);
    const [movedTag] = newTags.splice(currentIndex, 1);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    newTags.splice(newIndex, 0, movedTag);
    
    const newOrderIds = newTags.map(t => t.id);
    await updateTagOrder(newOrderIds);
  };


  const handleDeleteSubmit = async () => {
    if (!isDeleting || !user) return;

    try {
      if (usedTagNames.has(isDeleting.name)) {
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
        const children =
          hierarchicalTags.find((t) => t.id === isDeleting.id)?.children || [];
        if (children.length > 0) {
          toast({
            variant: 'destructive',
            title: 'Ação não permitida',
            description: `A tag "${isDeleting.name}" possui tags vinculadas e não pode ser excluída. Primeiro, remova ou reatribua as tags filhas.`,
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
      if (isDeleting.id === selectedTagId) {
        setSelectedTagId(null);
      }
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
  
  const handleArchiveSubmit = async () => {
    if (!isArchiving) return;
    try {
        const tagRef = doc(db, 'tags', isArchiving.id);
        await updateDoc(tagRef, { isArchived: true });
        toast({
            title: text.common.success,
            description: `A tag "${isArchiving.name}" foi arquivada.`,
        });
        refreshTags();
    } catch (error) {
         toast({
            variant: 'destructive',
            title: text.common.error,
            description: 'Erro ao arquivar a tag.',
        });
    } finally {
        setIsArchiving(null);
    }
  };

  const handleUnarchiveSubmit = async () => {
      if (!isUnarchiving) return;
      try {
        const tagRef = doc(db, 'tags', isUnarchiving.id);
        await updateDoc(tagRef, { isArchived: false });
        
        // Se a tag principal dela foi arquivada, ela se torna órfã.
        // A lógica de forçar a revinculação pode ser adicionada aqui se necessário.
        // Por agora, apenas desarquivamos.
        
        toast({
            title: text.common.success,
            description: `A tag "${isUnarchiving.name}" foi desarquivada.`,
        });
        refreshTags();
      } catch (error) {
          toast({
            variant: 'destructive',
            title: text.common.error,
            description: 'Erro ao desarquivar a tag.',
        });
      } finally {
        setIsUnarchiving(null);
      }
  };


  const handleSelectTag = (tagId: string) => {
    setSelectedTagId((prevId) => (prevId === tagId ? null : tagId));
  };

  const filterOptions: { label: string; value: FilterType }[] = [
    { label: text.tags.filters.inUse, value: 'inUse' },
    { label: text.tags.filters.registered, value: 'registered' },
    { label: text.tags.filters.archived, value: 'archived' },
  ];
  
  const renderActions = (tag: RawTag) => {
    switch (filter) {
      case 'inUse':
        return (
          <>
            <DropdownMenuItem onSelect={() => { setIsRenaming(tag); setNewTagName(tag.name); }}>
              <Pencil className="mr-2 h-4 w-4" /> {text.common.rename}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setIsArchiving(tag)}>
              <Archive className="mr-2 h-4 w-4" /> Arquivar
            </DropdownMenuItem>
          </>
        );
      case 'registered':
        return (
          <>
            <DropdownMenuItem onSelect={() => { setIsRenaming(tag); setNewTagName(tag.name); }}>
              <Pencil className="mr-2 h-4 w-4" /> {text.common.rename}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setIsDeleting(tag)} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" /> {text.common.delete}
            </DropdownMenuItem>
          </>
        );
      case 'archived':
         return (
          <>
            <DropdownMenuItem onSelect={() => { setIsRenaming(tag); setNewTagName(tag.name); }}>
              <Pencil className="mr-2 h-4 w-4" /> {text.common.rename}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setIsUnarchiving(tag)}>
              <ArchiveX className="mr-2 h-4 w-4" /> Desarquivar
            </DropdownMenuItem>
          </>
        );
      default:
        return null;
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
    <>
      <div className="flex flex-col mb-4 gap-4">
        <div className="flex justify-end items-start">
          <Button size="sm" onClick={() => setIsAddFormOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nova Tag
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {filterOptions.map((option) => (
            <Button
              key={option.value}
              variant={filter === option.value ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setFilter(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>
      
       <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Buscar tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100%-180px)]">
        {/* Coluna de Tags Principais */}
        <div className="md:col-span-1 space-y-3 overflow-y-auto">
          {filteredTags.length > 0 ? (
            filteredTags.map((tag, index) => (
              <div
                key={tag.id}
                onClick={() => handleSelectTag(tag.id)}
                className={cn(
                  'p-3 rounded-lg border cursor-pointer transition-all flex justify-between items-center group',
                  selectedTagId === tag.id
                    ? 'bg-primary/10 ring-2 ring-primary'
                    : 'hover:bg-muted/50'
                )}
              >
                <div className="flex items-center gap-2">
                    <span className="font-semibold">{tag.name}</span>
                    {tag.children.length > 0 && (
                        <Badge variant="secondary" className="px-1.5 py-0.5 text-xs rounded-full">
                            {tag.children.length}
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-0">
                   <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleReorder(tag.id, 'up'); }} disabled={index === 0}>
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleReorder(tag.id, 'down'); }} disabled={index === filteredTags.length - 1}>
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="h-8 w-8 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                       {renderActions(tag)}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {selectedTagId === tag.id ? (
                    <ChevronLeft className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-full border-2 border-dashed rounded-lg text-center text-muted-foreground p-4">
              <p className="text-lg font-semibold">Nenhuma tag encontrada.</p>
              <p>Tente um filtro diferente ou crie uma nova tag.</p>
            </div>
          )}
        </div>

        {/* Coluna de Tags Vinculadas */}
        <div className="md:col-span-2 overflow-y-auto pr-2">
          {selectedTag ? (
            <div className="space-y-4">
              {selectedTag.children.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {selectedTag.children.map((child) => (
                    <Card key={child.id}>
                      <CardHeader className="flex flex-row items-center justify-between p-3">
                        <CardTitle className="text-base">{child.name}</CardTitle>
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
                            {renderActions(child)}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground mt-4">
                  Nenhuma tag vinculada a esta tag principal neste filtro.
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full border-2 border-dashed rounded-lg text-center text-muted-foreground p-4">
              <p>
                Selecione uma Tag Principal à esquerda para ver suas tags
                vinculadas.
              </p>
            </div>
          )}
        </div>
      </div>

      <AddTagForm
        isOpen={isAddFormOpen}
        onOpenChange={setIsAddFormOpen}
        principalTags={principalTagsForForm}
        onTagCreated={handleTagCreated}
      />

       {/* Dialogs for actions */}
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
            id="tagNameInput"
            name="tagNameInput"
            autoComplete="off"
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
              ação não pode ser desfeita.
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
      
       <AlertDialog open={!!isArchiving} onOpenChange={(open) => !open && setIsArchiving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar Tag</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja arquivar a tag "{isArchiving?.name}"? Ela não aparecerá mais nas listas de seleção, mas seu histórico será mantido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchiveSubmit}>
              Arquivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!isUnarchiving} onOpenChange={(open) => !open && setIsUnarchiving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desarquivar Tag</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desarquivar a tag "{isUnarchiving?.name}"? Ela voltará a aparecer nas listas de seleção.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnarchiveSubmit}>
             Desarquivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
