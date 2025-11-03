
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
import { EmergencyReserveEntry } from '@/lib/types';
import { format } from 'date-fns';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
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

export default function EmergencyReservePage() {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const [entries, setEntries] = useState<EmergencyReserveEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] =
    useState<EmergencyReserveEntry | null>(null);
  const { toast } = useToast();

  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, 'emergencyReserveEntries'),
      where('userId', '==', user.uid),
      where('profile', '==', activeProfile),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const entriesData: EmergencyReserveEntry[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.date) {
            entriesData.push({
              id: doc.id,
              ...data,
            } as EmergencyReserveEntry);
          }
        });
        setEntries(entriesData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching reserve entries: ', error);
        setLoading(false);
        toast({
          variant: 'destructive',
          title: text.common.error,
          description: 'Falha ao buscar lançamentos da reserva.',
        });
      }
    );

    return () => unsubscribe();
  }, [user, activeProfile, toast]);

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'emergencyReserveEntries', id));
      toast({
        title: text.common.success,
        description: 'Lançamento da reserva excluído.',
      });
    } catch (error) {
      console.error('Error deleting document: ', error);
      toast({
        variant: 'destructive',
        title: text.common.error,
        description: 'Falha ao excluir lançamento da reserva.',
      });
    }
    setEntryToDelete(null);
  };

  const totalPages = Math.ceil(entries.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentEntries = entries.slice(startIndex, endIndex);

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
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 lg:pt-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{text.sidebar.emergencyReserve}</h1>
        {/* Placeholder for Add button */}
      </div>

       <Card className="rounded-lg border shadow-sm">
        <CardHeader>
            <CardTitle>Histórico de Contribuições</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {entries.length === 0 ? (
            <div className="text-center text-muted-foreground py-10">
              <p>Nenhuma contribuição registrada.</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
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
                {currentEntries.map((entry, index) => (
                  <TableRow
                    key={entry.id}
                    className={cn(
                      'hover:bg-muted/50',
                      index % 2 === 0 ? 'bg-muted/25' : ''
                    )}
                  >
                    <TableCell className="font-medium py-2 px-2 align-middle">
                      {entry.description || 'Contribuição'}
                    </TableCell>
                    <TableCell className="py-2 px-2 align-middle text-sm text-muted-foreground">
                      {format(entry.date.toDate(), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell className="text-right py-2 px-2 align-middle font-semibold text-green-600">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(entry.amount)}
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
                              setEntryToDelete(entry);
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

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Excluir lançamento da reserva?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente esta contribuição.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel> {text.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                entryToDelete && handleDelete(entryToDelete.id!)
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {text.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
