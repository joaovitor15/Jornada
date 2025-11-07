
'use client';

import { useEffect, useState, useMemo } from 'react';
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
import { BillPayment, Card as CardType } from '@/lib/types';
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
import { Trash2, Loader2, MoreHorizontal } from 'lucide-react';
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
import PayBillForm from './pay-bill-form';
import { Badge } from '../ui/badge';

export default function BillPaymentsList() {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const [payments, setPayments] = useState<BillPayment[]>([]);
  const [cards, setCards] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<BillPayment | null>(
    null
  );
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [paymentToEdit, setPaymentToEdit] = useState<BillPayment | null>(null);
  const { toast } = useToast();

  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    if (!user || !activeProfile) {
      setLoading(false);
      return () => {};
    }

    const cardsQuery = query(
      collection(db, 'cards'),
      where('userId', '==', user.uid),
      where('profile', '==', activeProfile)
    );

    const unsubscribeCards = onSnapshot(cardsQuery, (snapshot) => {
      const cardsMap = new Map<string, string>();
      snapshot.forEach((doc) => {
        const cardData = doc.data() as Omit<CardType, 'id'>;
        cardsMap.set(doc.id, cardData.name);
      });
      setCards(cardsMap);
    });

    const paymentsQuery = query(
      collection(db, 'billPayments'),
      where('userId', '==', user.uid),
      where('profile', '==', activeProfile),
      orderBy('date', 'desc')
    );

    const unsubscribePayments = onSnapshot(
      paymentsQuery,
      (querySnapshot) => {
        const paymentsData: BillPayment[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.date) {
            paymentsData.push({
              id: doc.id,
              ...data,
            } as BillPayment);
          }
        });
        setPayments(paymentsData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching bill payments: ', error);
        setLoading(false);
        toast({
          variant: 'destructive',
          title: text.common.error,
          description: text.billPaymentsList.fetchError,
        });
      }
    );

    return () => {
      unsubscribeCards();
      unsubscribePayments();
    };
  }, [user, activeProfile, toast]);

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'billPayments', id));
      toast({
        title: text.common.success,
        description: text.billPaymentsList.deleteSuccess,
      });
    } catch (error) {
      console.error('Error deleting document: ', error);
      toast({
        variant: 'destructive',
        title: text.common.error,
        description: text.billPaymentsList.deleteError,
      });
    }
    setPaymentToDelete(null);
  };

  const totalPages = Math.ceil(payments.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentPayments = payments.slice(startIndex, endIndex);

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
            {text.lists.billPayments}
          </AccordionTrigger>
          <AccordionContent>
            <Card className="rounded-lg border shadow-sm">
              <CardContent className="p-0">
                {payments.length === 0 ? (
                  <div className="text-center text-muted-foreground py-10">
                    <p>{text.billPaymentsList.noPayments}</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="h-10 px-2 text-left align-middle font-medium text-muted-foreground text-xs uppercase">
                          {text.payBillForm.cardLabel}
                        </TableHead>
                        <TableHead className="h-10 px-2 text-left align-middle font-medium text-muted-foreground text-xs uppercase">
                          TAGS
                        </TableHead>
                        <TableHead className="h-10 px-2 text-left align-middle font-medium text-muted-foreground text-xs uppercase">
                          {text.payBillForm.paymentDateLabel}
                        </TableHead>
                        <TableHead className="h-10 px-2 align-middle font-medium text-muted-foreground text-xs uppercase text-right">
                          {text.payBillForm.amountLabel}
                        </TableHead>
                        <TableHead className="h-10 px-2 align-middle font-medium text-muted-foreground text-xs uppercase text-center">
                          {text.common.options}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentPayments.map((payment, index) => (
                        <TableRow
                          key={payment.id}
                          className={cn(
                            'hover:bg-muted/50',
                            index % 2 === 0 ? 'bg-muted/25' : ''
                          )}
                        >
                          <TableCell className="py-2 px-2 align-middle font-medium">
                            {cards.get(payment.cardId) || 'Cartão não encontrado'}
                          </TableCell>
                           <TableCell className="py-2 px-2 align-middle">
                            <div className="flex flex-wrap gap-1">
                              {payment.tags?.map((tag) => (
                                <Badge key={tag} variant="secondary">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="py-2 px-2 align-middle text-sm text-muted-foreground">
                            {format(payment.date.toDate(), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell className={`text-right py-2 px-2 align-middle font-semibold ${payment.type === 'refund' ? 'text-green-500' : 'text-red-500'}`}>
                            {payment.type === 'refund' ? '+' : '-'}
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            }).format(payment.amount)}
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
                                  onSelect={() => {
                                    setPaymentToDelete(payment);
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
              {text.billPaymentsList.deleteConfirmTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {text.billPaymentsList.deleteConfirmDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel> {text.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                paymentToDelete && handleDelete(paymentToDelete.id!)
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
