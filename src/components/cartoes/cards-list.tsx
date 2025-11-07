
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  PlusCircle,
  CreditCard,
  Archive,
  ArchiveX,
  Pencil,
  Trash2,
} from 'lucide-react';
import { text } from '@/lib/strings';
import CardForm from './add-card-form';
import CardDetails from './CardDetails';
import { cn } from '@/lib/utils';
import { useCards } from '@/hooks/use-cards';
import { HierarchicalTag, Card } from '@/lib/types';
import { useTags } from '@/hooks/use-tags';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type FilterType = 'inUse' | 'registered' | 'archived';

export default function CardsList({
  selectedCardId,
  onCardSelect,
}: {
  selectedCardId: string | undefined;
  onCardSelect: (card: Card | null) => void;
}) {
  const { cards, loading, usedCardNames, refreshCards } = useCards();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [cardToEdit, setCardToEdit] = useState<Card | null>(null);
  const [cardToHandle, setCardToHandle] = useState<Card | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [isUnarchiveDialogOpen, setIsUnarchiveDialogOpen] = useState(false);
  const [filter, setFilter] = useState<FilterType>('inUse');
  const { toast } = useToast();

  const filteredCards = useMemo(() => {
    if (filter === 'inUse') {
      return cards.filter(
        (card) => !card.isArchived && usedCardNames.has(card.name)
      );
    }
    if (filter === 'registered') {
      return cards.filter((card) => !card.isArchived);
    }
    if (filter === 'archived') {
      return cards.filter((card) => card.isArchived);
    }
    return [];
  }, [cards, filter, usedCardNames]);

  useEffect(() => {
    if (!loading) {
      if (filteredCards.length > 0) {
        const currentSelectedCardExists =
          selectedCardId && filteredCards.some((c) => c.id === selectedCardId);
        if (!currentSelectedCardExists) {
          onCardSelect(filteredCards[0]);
        }
      } else {
        onCardSelect(null);
      }
    }
  }, [loading, filteredCards, selectedCardId, onCardSelect]);

  const handleAddClick = () => {
    setCardToEdit(null);
    setIsFormOpen(true);
  };

  const handleEditClick = (card: Card) => {
    setCardToEdit(card);
    setIsFormOpen(true);
  };

  const handleSelectCard = (card: Card) => {
    onCardSelect(card);
  };

  const handleAction = async (
    card: Card,
    action: 'archive' | 'unarchive' | 'delete'
  ) => {
    setCardToHandle(card);
    if (action === 'archive') setIsArchiveDialogOpen(true);
    if (action === 'unarchive') setIsUnarchiveDialogOpen(true);
    if (action === 'delete') setIsDeleteDialogOpen(true);
  };

  const executeAction = async (
    action: 'archive' | 'unarchive' | 'delete'
  ) => {
    if (!cardToHandle) return;

    try {
      const cardRef = doc(db, 'cards', cardToHandle.id);
      if (action === 'delete') {
        if (usedCardNames.has(cardToHandle.name)) {
          toast({
            variant: 'destructive',
            title: 'Ação não permitida',
            description: `O cartão "${cardToHandle.name}" está em uso e não pode ser excluído.`,
          });
          return;
        }
        await deleteDoc(cardRef);
        // TODO: Also delete the associated tag.
        toast({ title: 'Sucesso', description: 'Cartão excluído.' });
      } else {
        await updateDoc(cardRef, { isArchived: action === 'archive' });
        toast({
          title: 'Sucesso',
          description: `Cartão ${action === 'archive' ? 'arquivado' : 'desarquivado'}.`,
        });
      }
      refreshCards();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível completar a ação.',
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setIsArchiveDialogOpen(false);
      setIsUnarchiveDialogOpen(false);
      setCardToHandle(null);
    }
  };
  
  const filterOptions: { label: string; value: FilterType }[] = [
    { label: text.tags.filters.inUse, value: 'inUse' },
    { label: text.tags.filters.registered, value: 'registered' },
    { label: text.tags.filters.archived, value: 'archived' },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Gerenciador de Cartões</h1>
        <Button onClick={handleAddClick} size="sm">
          <PlusCircle className="mr-2 h-4 w-4" />
          Novo Cartão
        </Button>
      </div>


       <div className="flex items-center gap-2 mb-4">
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

      <ScrollArea className="flex-grow pr-4">
        <div className="space-y-4 pr-2">
          {loading ? (
            <p>{text.cards.loading}</p>
          ) : filteredCards.length > 0 ? (
            filteredCards.map((card) => (
              <div
                key={card.id}
                onClick={() => handleSelectCard(card)}
                className={cn(
                  'border p-4 rounded-lg shadow-sm relative cursor-pointer transition-all',
                  selectedCardId === card.id
                    ? 'ring-2 ring-primary shadow-lg'
                    : 'hover:shadow-md'
                )}
              >
                <div className="absolute top-1 right-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0 rounded-full">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                       <DropdownMenuItem onSelect={() => handleEditClick(card)}>
                        <Pencil className="mr-2 h-4 w-4" /> Renomear
                      </DropdownMenuItem>
                       {filter === 'archived' ? (
                        <DropdownMenuItem onSelect={() => handleAction(card, 'unarchive')}>
                           <ArchiveX className="mr-2 h-4 w-4" /> Desarquivar
                        </DropdownMenuItem>
                      ) : (
                         <DropdownMenuItem onSelect={() => handleAction(card, 'archive')}>
                           <Archive className="mr-2 h-4 w-4" /> Arquivar
                        </DropdownMenuItem>
                      )}
                       <DropdownMenuItem
                        onSelect={() => handleAction(card, 'delete')}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardDetails card={card} onEdit={() => handleEditClick(card)} />
              </div>
            ))
          ) : (
            <div className="text-center py-10 border-2 border-dashed rounded-lg">
              <p>Nenhum cartão encontrado para este filtro.</p>
            </div>
          )}
        </div>
      </ScrollArea>

      <CardForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        cardToEdit={cardToEdit}
      />
      
       {/* Dialogs */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Cartão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => executeAction('delete')} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen}>
         <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar Cartão</AlertDialogTitle>
            <AlertDialogDescription>
              Arquivar este cartão o esconderá da maioria das listas. Você pode encontrá-lo no filtro "Arquivados".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => executeAction('archive')}>
              Arquivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={isUnarchiveDialogOpen} onOpenChange={setIsUnarchiveDialogOpen}>
         <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desarquivar Cartão</AlertDialogTitle>
            <AlertDialogDescription>
              Este cartão voltará a aparecer nas listas e seleções.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => executeAction('unarchive')}>
              Desarquivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
