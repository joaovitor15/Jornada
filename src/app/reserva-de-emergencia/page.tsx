
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, PiggyBank, Shield, Dices } from 'lucide-react';
import { text } from '@/lib/strings';
import AddReserveEntryForm from '@/components/reserva-de-emergencia/add-reserve-entry-form';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { EmergencyReserveEntry } from '@/lib/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { reserveCategories } from '@/lib/categories';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

const diceFormSchema = z.object({
  amount: z.coerce
    .number({
      required_error: text.addExpenseForm.validation.amountRequired,
    })
    .positive({ message: text.addExpenseForm.validation.amountPositive }),
  date: z.date({ required_error: 'A data é obrigatória.' }),
});

export default function ReservaDeEmergenciaPage() {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const [isReserveFormOpen, setIsReserveFormOpen] = useState(false);
  const [totalReserve, setTotalReserve] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showDiceResult, setShowDiceResult] = useState(false);
  const [diceResult, setDiceResult] = useState({ main: '', sub: '' });
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof diceFormSchema>>({
    resolver: zodResolver(diceFormSchema),
  });

  const {
    handleSubmit,
    control,
    reset: resetDiceForm,
    formState: { isSubmitting },
  } = form;

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!user || !activeProfile) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, 'emergencyReserveEntries'),
      where('userId', '==', user.uid),
      where('profile', '==', activeProfile)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      let total = 0;
      querySnapshot.forEach((doc) => {
        const entry = doc.data() as Omit<EmergencyReserveEntry, 'id'>;
        total += entry.amount;
      });
      setTotalReserve(total);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, activeProfile]);

  const subcategoryToMainCategoryMap = useMemo(() => {
    const map: { [key: string]: string } = {};
    for (const mainCategory in reserveCategories) {
      for (const subcategory of reserveCategories[mainCategory]) {
        map[subcategory] = mainCategory;
      }
    }
    return map;
  }, []);

  const handleDiceRoll = () => {
    const allSubcategories = Object.values(reserveCategories).flat();
    const randomIndex = Math.floor(Math.random() * allSubcategories.length);
    const randomSub = allSubcategories[randomIndex];
    const randomMain = subcategoryToMainCategoryMap[randomSub];
    setDiceResult({ main: randomMain, sub: randomSub });
    resetDiceForm({
      amount: undefined,
      date: new Date(),
    });
    setShowDiceResult(true);
  };

  const onDiceSubmit = async (values: z.infer<typeof diceFormSchema>) => {
    if (!user || !activeProfile) {
      toast({
        variant: 'destructive',
        title: text.common.error,
        description: text.addExpenseForm.notLoggedIn,
      });
      return;
    }

    try {
      await addDoc(collection(db, 'emergencyReserveEntries'), {
        userId: user.uid,
        profile: activeProfile,
        description: `Contribuição para ${diceResult.sub}`,
        amount: values.amount,
        date: Timestamp.fromDate(values.date),
        location: '', // User will have to fill this in later if needed
        mainCategory: diceResult.main,
        subcategory: diceResult.sub,
      });

      toast({
        title: text.common.success,
        description: text.emergencyReserve.addSuccess,
      });
      setShowDiceResult(false);
    } catch (error) {
      console.error('Error writing document from dice roll:', error);
      toast({
        variant: 'destructive',
        title: text.common.error,
        description: text.emergencyReserve.addError,
      });
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">
          {text.sidebar.emergencyReserve}
        </h1>
        {isClient && (
          <Button
            variant="outline"
            size="icon"
            className="rounded-full"
            onClick={handleDiceRoll}
          >
            <Dices className="h-5 w-5" />
            <span className="sr-only">Sortear Subcategoria</span>
          </Button>
        )}
        <Button onClick={() => setIsReserveFormOpen(true)} size="sm">
          <Shield className="mr-2 h-4 w-4" />
          Nova Movimentação
        </Button>
      </div>

      <div className="w-80">
        {loading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : totalReserve > 0 ? (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">Total na Reserva</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50">
                  <PiggyBank className="h-6 w-6 text-blue-500" />
                </div>
                <span className="text-2xl font-bold">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(totalReserve)}
                </span>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <AddReserveEntryForm
        isOpen={isReserveFormOpen}
        onOpenChange={setIsReserveFormOpen}
      />

      <AlertDialog open={showDiceResult} onOpenChange={setShowDiceResult}>
        <AlertDialogContent>
          <Form {...form}>
            <form onSubmit={handleSubmit(onDiceSubmit)}>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <Dices className="h-6 w-6" />
                  Resultado do Sorteio
                </AlertDialogTitle>
                <AlertDialogDescription className="text-center text-lg font-bold text-primary py-4">
                  {diceResult.sub}
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="space-y-4 py-4">
                <FormField
                  control={control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{text.emergencyReserve.amountLabel}</FormLabel>
                      <FormControl>
                        <CurrencyInput
                          placeholder={text.addExpenseForm.amountPlaceholder}
                          disabled={isSubmitting}
                          value={field.value}
                          onValueChange={(values) => {
                            field.onChange(values?.floatValue);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>{text.emergencyReserve.dateLabel}</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={'outline'}
                              className="w-full pl-3 text-left font-normal"
                            >
                              {field.value ? (
                                format(field.value, 'PPP', { locale: ptBR })
                              ) : (
                                <span>Escolha uma data</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date('1900-01-01')
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel
                  type="button"
                  onClick={() => setShowDiceResult(false)}
                >
                  Cancelar
                </AlertDialogCancel>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Adicionar
                </Button>
              </AlertDialogFooter>
            </form>
          </Form>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
