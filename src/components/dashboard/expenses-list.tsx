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
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
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
} from "@/components/ui/alert-dialog"
import { useToast } from '@/hooks/use-toast';

export default function ExpensesList() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      setExpenses([]);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, 'expenses'),
      where('userId', '==', user.uid),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const expensesData: Expense[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        expensesData.push({
          id: doc.id,
          ...data,
          date: data.date,
        } as Expense);
      });
      setExpenses(expensesData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching expenses: ", error);
      setLoading(false);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not fetch expenses.",
      });
    });

    return () => unsubscribe();
  }, [user, toast]);
  
  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "expenses", id));
      toast({
        title: "Success",
        description: "Expense deleted.",
      });
    } catch (error) {
      console.error("Error deleting document: ", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not delete expense.",
      });
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
            <p>You haven't added any expenses yet.</p>
            <p>Click "Add Expense" to start your journey!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expense History</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((expense) => (
              <TableRow key={expense.id}>
                <TableCell>{format(expense.date.toDate(), 'MMM d, yyyy')}</TableCell>
                <TableCell className="font-medium">{expense.description}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{expense.category}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
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
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete this expense
                          from our servers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(expense.id!)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Delete
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
