
'use client';

import { useEffect, useState } from 'react';
import {
  doc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import { Income } from '@/lib/types';
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
import { useTransactions } from '@/hooks/use-transactions';

export default function IncomeList() {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const { incomes, loading } = useTransactions(activeProfile);
  const [currentPage, setCurrentPage] = useState(1);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [incomeToDelete, setIncomeToDelete] = useState<Income | null>(null);
  const { toast } = useToast();
  const { setTransactionToEdit } = useAddTransactionModal();

  const ITEMS_PER_PAGE = 10;
  
  useEffect(() => {
    setCurrentPage(1);
  }, [activeProfile]);


  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'incomes', id));
      toast({
        title: text.common.success,
        description: text.incomesList.deleteSuccess,
      });
    } catch (error) {
      console.error('Error deleting document: ', error);
      toast({
        variant: 'destructive',
        title: text.common.error,
        description: text.incomesList.deleteError,
      });
    }
    setIncomeToDelete(null);
  };
  
  const handleEditOpen = (income: Income) => {
    setTransactionToEdit(income);
  };

  const totalPages = Math.ceil(incomes.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentIncomes = incomes.slice(startIndex, endIndex);

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
            {text.lists.income}
          </AccordionTrigger>
          <AccordionContent>
            <Card className="rounded-lg border shadow-sm">
              <CardContent className="p-0">
                {incomes.length === 0 ? (
                  <div className="text-center text-muted-foreground py-10">
                    <p>{text.incomesList.noIncomes}</p>
                    <p>{text.incomesList.clickToAdd}</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="h-10 px-2 text-left align-middle font-medium text-muted-foreground text-xs uppercase">
                          {text.common.mainCategory}
                        </TableHead>
                        <TableHead className="h-10 px-2 text-left align-middle font-medium text-muted-foreground text-xs uppercase">
                          {text.common.subcategory}
                        </TableHead>
                        <TableHead className="h-10 px-2 text-left align-middle font-medium text-muted-foreground text-xs uppercase">
                          {text.common.description}
                        </TableHead>
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
                      {currentIncomes.map((income, index) => (
                        <TableRow
                          key={income.id}
                          className={cn(
                            'hover:bg-muted/50',
                            index % 2 === 0 ? 'bg-muted/25' : ''
                          )}
                        >
                          <TableCell className="py-2 px-2 align-middle">
                            <span className="text-muted-foreground text-sm">
                              {income.mainCategory}
                            </span>
                          </TableCell>
                          <TableCell className="py-2 px-2 align-middle">
                            <span className="text-muted-foreground text-sm">
                              {income.subcategory}
                            </span>
                          </TableCell>
                          <TableCell className="font-medium py-2 px-2 align-middle">
                            {income.description || '-'}
                          </TableCell>
                          <TableCell className="py-2 px-2 align-middle text-sm text-muted-foreground">
                            {format(income.date.toDate(), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell className="text-right py-2 px-2 align-middle">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            }).format(income.amount)}
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
                                  onSelect={() => handleEditOpen(income)}
                                >
                                  <div className="flex items-center justify-center bg-secondary rounded-full h-6 w-6 mr-2">
                                    <Pencil className="h-3 w-3 text-secondary-foreground" />
                                  </div>
                                  <span>{text.common.rename}</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onSelect={() => {
                                    setIncomeToDelete(income);
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
                      ))}
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
              {text.incomesList.deleteConfirmTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {text.incomesList.deleteConfirmDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel> {text.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                incomeToDelete && handleDelete(incomeToDelete.id!)
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
