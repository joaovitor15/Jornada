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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '../ui/button';
import { Trash2, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { text } from '@/lib/strings';

export default function ExpensesList() {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

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
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <p>{text.expensesList.noExpenses}</p>
            <p>{text.expensesList.clickToAdd}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{text.expensesList.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{text.common.date}</TableHead>
              <TableHead>{text.common.description}</TableHead>
              <TableHead>{text.common.mainCategory}</TableHead>
              <TableHead>{text.common.subcategory}</TableHead>
              <TableHead>{text.common.paymentMethod}</TableHead>
              <TableHead className="text-right">{text.common.amount}</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((expense) => (
              <TableRow key={expense.id}>
                <TableCell>
                  {format(expense.date.toDate(), 'dd/MM/yyyy')}
                </TableCell>
                <TableCell className="font-medium">
                  {expense.description}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{expense.mainCategory}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{expense.subcategory}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{expense.paymentMethod}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(expense.amount)}
                </TableCell>
                <TableCell>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
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
                        <AlertDialogCancel>
                          {text.common.cancel}
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(expense.id!)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {text.common.delete}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
