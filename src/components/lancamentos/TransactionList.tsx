'use client';

import { useEffect, useState, useMemo } from 'react';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Expense, Income, BillPayment, EmergencyReserveEntry } from '@/lib/types';
import { format } from 'date-fns';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '../ui/button';
import { Trash2, Loader2, MoreHorizontal, Pencil } from 'lucide-react';
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
import { text } from '@/lib/strings';
import { cn } from '@/lib/utils';
import { useAddTransactionModal } from '@/contexts/AddTransactionModalContext';
import { Badge } from '../ui/badge';
import { useCards } from '@/hooks/use-cards';
import { useTags } from '@/hooks/use-tags';

type Transaction = Expense | Income | BillPayment | EmergencyReserveEntry;
type TransactionType = 'expense' | 'income' | 'billPayment' | 'reserveEntry';

interface TransactionListProps {
  type: TransactionType;
  transactions: Transaction[];
  loading: boolean;
  onEditItem?: (item: any) => void;
}

export default function TransactionList({
  type,
  transactions,
  loading,
  onEditItem,
}: TransactionListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Transaction | null>(null);
  const { toast } = useToast();
  const { setTransactionToEdit } = useAddTransactionModal();
  const { cards } = useCards();
  const { hierarchicalTags } = useTags();

  const ITEMS_PER_PAGE = 10;
  
  // Reset page to 1 when transactions change (e.g., profile switch)
  useEffect(() => {
    setCurrentPage(1);
  }, [transactions]);

  const cardsMap = useMemo(() => {
    return new Map(cards.map(card => [card.id, card.name]));
  }, [cards]);

  const listConfig = useMemo(() => {
    const baseConfig = {
        options: {
          showEdit: true,
          showDelete: true,
        },
        columns: [
          { key: 'description', label: text.common.description, render: (item: any) => item.description || '-' },
          { key: 'tags', label: 'Tags', render: (item: any) => (
            <div className="flex flex-wrap gap-1">
              {item.tags?.filter((tag: string) => !tag.startsWith('planId:')).map((tag: string) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )},
          { key: 'date', label: text.common.date, render: (item: any) => item.date ? format(item.date.toDate(), 'dd/MM/yyyy') : '-' },
          { key: 'amount', label: text.common.amount, render: (item: any) => (
              <span className={cn(type === 'income' || (type === 'reserveEntry' && item.amount > 0) ? 'text-green-600' : (type === 'reserveEntry' && item.amount < 0) ? 'text-red-600' : '')}>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.amount)}
              </span>
            ), className: 'text-right'
          },
        ]
    };

    switch (type) {
      case 'expense':
        return {
          title: text.lists.expenses,
          collectionName: 'expenses',
          noItems: text.expensesList.noExpenses,
          clickToAdd: text.expensesList.clickToAdd,
          deleteSuccess: text.expensesList.deleteSuccess,
          deleteError: text.expensesList.deleteError,
          deleteConfirmTitle: text.expensesList.deleteConfirmTitle,
          deleteConfirmDescription: text.expensesList.deleteConfirmDescription,
          columns: [
            baseConfig.columns[1],
            baseConfig.columns[0],
            { key: 'paymentMethod', label: text.common.paymentMethod, render: (item: any) => {
              const isCardPayment = item.paymentMethod.startsWith('Cartão: ');
              const cardName = isCardPayment ? item.paymentMethod.replace('Cartão: ', '') : null;
              return <Badge variant={cardName ? 'default' : 'outline'}>{cardName || item.paymentMethod}</Badge>;
            }},
            baseConfig.columns[2],
            baseConfig.columns[3],
          ],
          options: baseConfig.options,
        };
      case 'income':
        return {
          title: text.lists.income,
          collectionName: 'incomes',
          noItems: text.incomesList.noIncomes,
          clickToAdd: text.incomesList.clickToAdd,
          deleteSuccess: text.incomesList.deleteSuccess,
          deleteError: text.incomesList.deleteError,
          deleteConfirmTitle: text.incomesList.deleteConfirmTitle,
          deleteConfirmDescription: text.incomesList.deleteConfirmDescription,
          columns: [ baseConfig.columns[1], baseConfig.columns[0], baseConfig.columns[2], baseConfig.columns[3] ],
          options: baseConfig.options,
        };
      case 'billPayment':
         return {
          title: text.lists.billPayments,
          collectionName: 'billPayments',
          noItems: text.billPaymentsList.noPayments,
          deleteSuccess: text.billPaymentsList.deleteSuccess,
          deleteError: text.billPaymentsList.deleteError,
          deleteConfirmTitle: text.billPaymentsList.deleteConfirmTitle,
          deleteConfirmDescription: text.billPaymentsList.deleteConfirmDescription,
          columns: [
            baseConfig.columns[1],
            { key: 'card', label: text.payBillForm.cardLabel, render: (item: any) => cardsMap.get(item.cardId) || '-' },
            baseConfig.columns[2], // date
            { key: 'amount', label: text.payBillForm.amountLabel, render: (item: any) => (
                <span className={cn(item.type === 'refund' ? 'text-green-500' : '')}>
                  {item.type === 'refund' ? '+' : ''}
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.amount)}
                </span>
              ), className: 'text-right'
            },
          ],
          options: { showEdit: false, showDelete: true },
        };
      case 'reserveEntry':
         const getParentTagName = (childTagName: string) => {
            for (const parentTag of hierarchicalTags) {
              if (parentTag.children.some(child => child.name === childTagName)) {
                return parentTag.name;
              }
            }
            return null;
          };
         return {
          title: text.sidebar.emergencyReserve,
          collectionName: 'emergencyReserveEntries',
          noItems: 'Nenhuma movimentação registrada.',
          deleteSuccess: 'Lançamento da reserva excluído.',
          deleteError: 'Falha ao excluir lançamento da reserva.',
          deleteConfirmTitle: 'Excluir lançamento da reserva?',
          deleteConfirmDescription: 'Esta ação não pode ser desfeita. Isso excluirá permanentemente esta movimentação.',
          columns: [
            { key: 'description', label: text.common.description, render: (item: any) => item.description || (item.tags && item.tags.length > 0 && getParentTagName(item.tags[0])) || 'Movimentação'},
            baseConfig.columns[1], // tags
            { key: 'bank', label: 'Banco', render: (item: any) => item.bank },
            baseConfig.columns[2], // date
            baseConfig.columns[3], // amount
          ],
          options: baseConfig.options,
        };
      default:
        throw new Error(`Invalid transaction type: ${type}`);
    }
  }, [type, cardsMap, hierarchicalTags]);


  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, listConfig.collectionName, id));
      toast({
        title: text.common.success,
        description: listConfig.deleteSuccess,
      });
    } catch (error) {
      console.error('Error deleting document: ', error);
      toast({
        variant: 'destructive',
        title: text.common.error,
        description: listConfig.deleteError,
      });
    }
    setIsDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const handleEditOpen = (item: Transaction) => {
    if (onEditItem) {
      onEditItem(item);
    } else {
      setTransactionToEdit(item);
    }
  };

  const totalPages = Math.ceil(transactions.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentItems = transactions.slice(startIndex, endIndex);

  const goToPage = (pageNumber: number) => setCurrentPage(pageNumber);
  const goToNextPage = () => setCurrentPage((prev) => (prev < totalPages ? prev + 1 : prev));
  const goToPreviousPage = () => setCurrentPage((prev) => (prev > 1 ? prev - 1 : prev));

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="item-1" className="border-b-0">
          <AccordionTrigger className="bg-card border rounded-lg shadow-sm px-6 py-4 w-full text-lg font-semibold flex justify-between items-center hover:no-underline">
            {listConfig.title}
          </AccordionTrigger>
          <AccordionContent>
            <Card className="rounded-lg border shadow-sm">
              <CardContent className="p-0">
                {transactions.length === 0 ? (
                  <div className="text-center text-muted-foreground py-10">
                    <p>{listConfig.noItems}</p>
                    {listConfig.clickToAdd && <p>{listConfig.clickToAdd}</p>}
                  </div>
                ) : (
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        {listConfig.columns.map(col => (
                           <TableHead key={col.key} className={cn("h-10 px-2 text-left align-middle font-medium text-muted-foreground text-xs uppercase", col.className)}>
                             {col.label}
                           </TableHead>
                        ))}
                        <TableHead className="h-10 px-2 align-middle font-medium text-muted-foreground text-xs uppercase text-center">
                          {text.common.options}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentItems.map((item, index) => (
                        <TableRow
                          key={item.id}
                          className={cn('hover:bg-muted/50', index % 2 === 0 ? 'bg-muted/25' : '')}
                        >
                          {listConfig.columns.map(col => (
                            <TableCell key={col.key} className={cn("py-2 px-2 align-middle font-medium", col.className)}>
                              {col.render(item)}
                            </TableCell>
                          ))}
                          <TableCell className="py-2 px-2 align-middle text-center">
                            {(listConfig.options.showEdit || listConfig.options.showDelete) && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0 rounded-full data-[state=open]:bg-primary/10">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {listConfig.options.showEdit && (
                                    <DropdownMenuItem onSelect={() => handleEditOpen(item)}>
                                      <div className="flex items-center justify-center bg-secondary rounded-full h-6 w-6 mr-2">
                                        <Pencil className="h-3 w-3 text-secondary-foreground" />
                                      </div>
                                      <span>{text.common.rename}</span>
                                    </DropdownMenuItem>
                                  )}
                                  {listConfig.options.showDelete && (
                                    <DropdownMenuItem onSelect={() => { setItemToDelete(item); setIsDeleteDialogOpen(true); }}>
                                      <div className="flex items-center justify-center bg-secondary rounded-full h-6 w-6 mr-2">
                                        <Trash2 className="h-3 w-3 text-secondary-foreground" />
                                      </div>
                                      <span>{text.common.delete}</span>
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
              {totalPages > 1 && (
                <CardFooter className="flex justify-center py-4 border-t">
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" onClick={goToPreviousPage} disabled={currentPage === 1}>
                      {text.common.previous}
                    </Button>
                    {pageNumbers.map((page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? 'default' : 'outline'}
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() => goToPage(page)}
                      >
                        {page}
                      </Button>
                    ))}
                    <Button variant="outline" size="sm" onClick={goToNextPage} disabled={currentPage === totalPages}>
                      {text.common.next}
                    </Button>
                  </div>
                </CardFooter>
              )}
            </Card>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{listConfig.deleteConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{listConfig.deleteConfirmDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel> {text.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => itemToDelete && handleDelete(itemToDelete.id!)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {text.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
