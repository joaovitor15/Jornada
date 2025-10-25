'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  doc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import { Expense } from '@/lib/types';
import { format } from 'date-fns';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';
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
import AddExpenseForm from './add-expense-form';
import { cn } from '@/lib/utils';

export default function ExpensesList() {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
  const { toast } = useToast();

  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, 'expenses'),
      where('userId', '==', user.uid),
      where('profile', '==', activeProfile),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const expensesData: Expense[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.date) {
            expensesData.push({
              id: doc.id,
              ...data,
              date: data.date,
            } as Expense);
          }
        });
        setExpenses(expensesData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching expenses: ', error);
        setLoading(false);
        toast({
          variant: 'destructive',
          title: text.common.error,
          description: text.expensesList.fetchError,
        });
      }
    );

    return () => unsubscribe();
  }, [user, activeProfile, toast]);

  const handleDelete = async (id: string) => {
    const originalExpenses = [...expenses];
    setExpenses((prevExpenses) =>
      prevExpenses.filter((expense) => expense.id !== id)
    );

    try {
      await deleteDoc(doc(db, 'expenses', id));
      toast({
        title: text.common.success,
        description: text.expensesList.deleteSuccess,
      });
    } catch (error) {
      console.error('Error deleting document: ', error);
      toast({
        variant: 'destructive',
        title: text.common.error,
        description: text.expensesList.deleteError,
      });
      setExpenses(originalExpenses);
    }
    setExpenseToDelete(null);
  };
  
  const handleEditOpen = (expense: Expense) => {
    setExpenseToEdit(expense);
    setIsEditFormOpen(true);
  };

  const handleEditFormClose = (isOpen: boolean) => {
    setIsEditFormOpen(isOpen);
    if (!isOpen) {
      setExpenseToEdit(null);
    }
  };

  const totalPages = Math.ceil(expenses.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentExpenses = expenses.slice(startIndex, endIndex);

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
    <Accordion type="single" collapsible defaultValue="item-1" className="w-full">
      <AccordionItem value="item-1">
        <AccordionTrigger className="text-xl font-bold">
          Despesas
        </AccordionTrigger>
        <AccordionContent>
          <Card className="border-0 shadow-none">
            <CardContent className="p-0">
              {expenses.length === 0 ? (
                <div className="text-center text-muted-foreground py-10">
                  <p>{text.expensesList.noExpenses}</p>
                  <p>{text.expensesList.clickToAdd}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{text.common.mainCategory}</TableHead>
                      <TableHead>{text.common.subcategory}</TableHead>
                      <TableHead>{text.common.description}</TableHead>
                      <TableHead>{text.common.date}</TableHead>
                      <TableHead>{text.common.paymentMethod}</TableHead>
                      <TableHead className="text-right">{text.common.amount}</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentExpenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell className="py-2 px-4">
                          <Badge variant="secondary">{expense.mainCategory}</Badge>
                        </TableCell>
                        <TableCell className="py-2 px-4">
                          <Badge variant="secondary">{expense.subcategory}</Badge>
                        </TableCell>
                        <TableCell className="font-medium py-2 px-4">
                          {expense.description}
                        </TableCell>
                        <TableCell className="py-2 px-4">
                          {format(expense.date.toDate(), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell className="py-2 px-4">
                          <Badge variant="outline">{expense.paymentMethod}</Badge>
                        </TableCell>
                        <TableCell className="text-right py-2 px-4">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(expense.amount)}
                        </TableCell>
                        <TableCell className="py-2 px-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0 rounded-full data-[state=open]:bg-primary/10">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => handleEditOpen(expense)}>
                                <div className="flex items-center justify-center bg-secondary rounded-full h-6 w-6 mr-2">
                                  <Pencil className="h-3 w-3 text-secondary-foreground" />
                                </div>
                                <span>Renomear</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => {
                                  setExpenseToDelete(expense);
                                  setIsDeleteDialogOpen(true);
                                }}
                                className="text-destructive focus:bg-destructive focus:text-destructive-foreground group"
                              >
                                <div className="flex items-center justify-center bg-destructive/10 rounded-full h-6 w-6 mr-2 group-focus:bg-destructive">
                                  <Trash2 className="h-3 w-3 text-destructive group-focus:text-destructive-foreground" />
                                </div>
                                <span>Excluir</span>
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
              <CardFooter className="flex justify-center py-4">
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                  >
                    Anterior
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
                    Próximo
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
            <AlertDialogTitle>
              {text.expensesList.deleteConfirmTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {text.expensesList.deleteConfirmDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel> {text.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => expenseToDelete && handleDelete(expenseToDelete.id!)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {text.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {expenseToEdit && (
        <AddExpenseForm
          isOpen={isEditFormOpen}
          onOpenChange={handleEditFormClose}
          expenseToEdit={expenseToEdit}
        />
      )}
    </>
  );
}
