'use client';

import { useEffect, useState, useMemo } from 'react';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Expense, Income } from '@/lib/types';
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

type Transaction = Expense | Income;

interface TransactionListProps {
  type: 'expense' | 'income';
  transactions: Transaction[];
  loading: boolean;
}

export default function TransactionList({
  type,
  transactions,
  loading,
}: TransactionListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Transaction | null>(null);
  const { toast } = useToast();
  const { setTransactionToEdit } = useAddTransactionModal();

  const ITEMS_PER_PAGE = 10;
  
  // Reset page to 1 when transactions change (e.g., profile switch)
  useEffect(() => {
    setCurrentPage(1);
  }, [transactions]);

  const listTexts = useMemo(() => {
    return {
      expense: {
        title: text.lists.expenses,
        collectionName: 'expenses',
        noItems: text.expensesList.noExpenses,
        clickToAdd: text.expensesList.clickToAdd,
        deleteSuccess: text.expensesList.deleteSuccess,
        deleteError: text.expensesList.deleteError,
        deleteConfirmTitle: text.expensesList.deleteConfirmTitle,
        deleteConfirmDescription: text.expensesList.deleteConfirmDescription,
      },
      income: {
        title: text.lists.income,
        collectionName: 'incomes',
        noItems: text.incomesList.noIncomes,
        clickToAdd: text.incomesList.clickToAdd,
        deleteSuccess: text.incomesList.deleteSuccess,
        deleteError: text.incomesList.deleteError,
        deleteConfirmTitle: text.incomesList.deleteConfirmTitle,
        deleteConfirmDescription: text.incomesList.deleteConfirmDescription,
      },
    }[type];
  }, [type]);


  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, listTexts.collectionName, id));
      toast({
        title: text.common.success,
        description: listTexts.deleteSuccess,
      });
    } catch (error) {
      console.error('Error deleting document: ', error);
      toast({
        variant: 'destructive',
        title: text.common.error,
        description: listTexts.deleteError,
      });
    }
    setIsDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const handleEditOpen = (item: Transaction) => {
    setTransactionToEdit(item);
  };

  const totalPages = Math.ceil(transactions.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentItems = transactions.slice(startIndex, endIndex);

  const goToPage = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const goToNextPage = () => {
    setCurrentPage((prev) => (prev < totalPages ? prev + 1 : prev));
  };

  const goToPreviousPage = () => {
    setCurrentPage((prev) => (prev > 1 ? prev - 1 : prev));
  };

  const pageNumbers = [];
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }

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
            {listTexts.title}
          </AccordionTrigger>
          <AccordionContent>
            <Card className="rounded-lg border shadow-sm">
              <CardContent className="p-0">
                {transactions.length === 0 ? (
                  <div className="text-center text-muted-foreground py-10">
                    <p>{listTexts.noItems}</p>
                    <p>{listTexts.clickToAdd}</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="h-10 px-2 text-left align-middle font-medium text-muted-foreground text-xs uppercase">
                          Tags
                        </TableHead>
                        <TableHead className="h-10 px-2 text-left align-middle font-medium text-muted-foreground text-xs uppercase">
                          {text.common.description}
                        </TableHead>
                        {type === 'expense' && (
                          <TableHead className="h-10 px-2 text-left align-middle font-medium text-muted-foreground text-xs uppercase">
                            {text.common.paymentMethod}
                          </TableHead>
                        )}
                        <TableHead className="h-10 px-2 text-left align-middle font-medium text-muted-foreground text-xs uppercase">
                          {text.common.date}
                        </TableHead>
                        <TableHead className="h-10 px-2 align-middle font-medium text-muted-foreground text-xs uppercase text-right">
                          {text.common.amount}
                        </TableHead>
                        <TableHead className="h-10 px-2 align-middle font-medium text-muted-foreground text-xs uppercase text-center">
                          {text.common.options}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentItems.map((item, index) => {
                        const isCardPayment = type === 'expense' && (item as Expense).paymentMethod.startsWith('Cartão: ');
                        const cardName = isCardPayment ? (item as Expense).paymentMethod.replace('Cartão: ', '') : null;

                        return (
                          <TableRow
                            key={item.id}
                            className={cn(
                              'hover:bg-muted/50',
                              index % 2 === 0 ? 'bg-muted/25' : ''
                            )}
                          >
                            <TableCell className="py-2 px-2 align-middle">
                              <div className="flex flex-wrap gap-1">
                                {item.tags?.filter(tag => !tag.startsWith('planId:')).map((tag) => (
                                  <Badge key={tag} variant="secondary">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium py-2 px-2 align-middle">
                              {item.description || '-'}
                            </TableCell>
                            {type === 'expense' && (
                              <TableCell className="py-2 px-2 align-middle">
                                <Badge variant={cardName ? 'default' : 'outline'}>
                                    {cardName || (item as Expense).paymentMethod}
                                </Badge>
                              </TableCell>
                            )}
                            <TableCell className="py-2 px-2 align-middle text-sm text-muted-foreground">
                              {item.date ? format(item.date.toDate(), 'dd/MM/yyyy') : '-'}
                            </TableCell>
                            <TableCell className={`text-right py-2 px-2 align-middle ${type === 'income' ? 'text-green-600' : ''}`}>
                              {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              }).format(item.amount)}
                            </TableCell>
                            <TableCell className="py-2 px-2 align-middle text-center">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    className="h-8 w-8 p-0 rounded-full data-[state=open]:bg-primary/10"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onSelect={() => handleEditOpen(item)}
                                  >
                                    <div className="flex items-center justify-center bg-secondary rounded-full h-6 w-6 mr-2">
                                      <Pencil className="h-3 w-3 text-secondary-foreground" />
                                    </div>
                                    <span>{text.common.rename}</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onSelect={() => {
                                      setItemToDelete(item);
                                      setIsDeleteDialogOpen(true);
                                    }}
                                  >
                                    <div className="flex items-center justify-center bg-secondary rounded-full h-6 w-6 mr-2">
                                      <Trash2 className="h-3 w-3 text-secondary-foreground" />
                                    </div>
                                    <span>{text.common.delete}</span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
              {totalPages > 1 && (
                <CardFooter className="flex justify-center py-4 border-t">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToPreviousPage}
                      disabled={currentPage === 1}
                    >
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToNextPage}
                      disabled={currentPage === totalPages}
                    >
                      {text.common.next}
                    </Button>
                  </div>
                </CardFooter>
              )}
            </Card>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {listTexts.deleteConfirmTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {listTexts.deleteConfirmDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel> {text.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                itemToDelete && handleDelete(itemToDelete.id!)
              }
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
