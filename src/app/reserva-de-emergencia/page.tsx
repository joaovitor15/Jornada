
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  PiggyBank,
  Shield,
  Dices,
  Banknote,
  CalendarCheck2,
} from 'lucide-react';
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
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { reserveCategories, emergencyReserveLocations } from '@/lib/categories';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const diceFormSchema = z.object({
  amount: z.coerce
    .number({
      required_error: text.addExpenseForm.validation.amountRequired,
    })
    .positive({ message: text.addExpenseForm.validation.amountPositive }),
  date: z.date({ required_error: 'A data é obrigatória.' }),
  location: z.string().min(1, 'Por favor, selecione um local.'),
});

interface SubcategoryTotal {
  name: string;
  mainCategory: string;
  total: number;
}

export default function ReservaDeEmergenciaPage() {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const [isReserveFormOpen, setIsReserveFormOpen] = useState(false);
  const [totalProtegido, setTotalProtegido] = useState(0);
  const [totalReserva, setTotalReserva] = useState(0);
  const [totalProgramado, setTotalProgramado] = useState(0);
  const [subcategoryTotals, setSubcategoryTotals] = useState<
    SubcategoryTotal[]
  >([]);
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
      let totalGeral = 0;
      let totalCatReserva = 0;
      let totalCatProgramado = 0;
      const subTotals: { [key: string]: number } = {};

      const entries = querySnapshot.docs.map(
        (doc) => doc.data() as Omit<EmergencyReserveEntry, 'id'>
      );

      entries.forEach((entry) => {
        totalGeral += entry.amount;

        if (entry.mainCategory === 'Reserva de Emergencia') {
          totalCatReserva += entry.amount;
        } else if (entry.mainCategory === 'Reserva Programada') {
          totalCatProgramado += entry.amount;
        }

        if (entry.subcategory) {
          subTotals[entry.subcategory] =
            (subTotals[entry.subcategory] || 0) + entry.amount;
        }
      });

      const subcategoryToMainMap = new Map<string, string>();
      Object.entries(reserveCategories).forEach(([main, subs]) => {
        subs.forEach((sub) => subcategoryToMainMap.set(sub, main));
      });

      const populatedSubTotals: SubcategoryTotal[] = Object.entries(subTotals)
        .map(([name, total]) => ({
          name,
          mainCategory: subcategoryToMainMap.get(name) || 'Desconhecida',
          total,
        }))
        .filter((sub) => sub.total > 0)
        .sort((a, b) => {
          // Prioritize 'Reserva de Emergencia'
          if (
            a.mainCategory === 'Reserva de Emergencia' &&
            b.mainCategory !== 'Reserva de Emergencia'
          ) {
            return -1;
          }
          if (
            a.mainCategory !== 'Reserva de Emergencia' &&
            b.mainCategory === 'Reserva de Emergencia'
          ) {
            return 1;
          }
          // Then sort by total descending
          return b.total - a.total;
        });

      setTotalProtegido(totalGeral);
      setTotalReserva(totalCatReserva);
      setTotalProgramado(totalCatProgramado);
      setSubcategoryTotals(populatedSubTotals);
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
      location: '',
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
        location: values.location,
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

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);

  const getIconForCategory = (mainCategory: string) => {
    switch (mainCategory) {
      case 'Reserva de Emergencia':
        return <Shield className="h-6 w-6 text-green-500" />;
      case 'Reserva Programada':
        return <CalendarCheck2 className="h-6 w-6 text-purple-500" />;
      default:
        return <Banknote className="h-6 w-6 text-gray-500" />;
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">
          {text.sidebar.emergencyReserve}
        </h1>
        <div className="flex items-center gap-2">
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
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Total Protegido</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50">
                    <PiggyBank className="h-6 w-6 text-blue-500" />
                  </div>
                  <span className="text-2xl font-bold">
                    {formatCurrency(totalProtegido)}
                  </span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Reserva</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
                    <Shield className="h-6 w-6 text-green-500" />
                  </div>
                  <span className="text-2xl font-bold">
                    {formatCurrency(totalReserva)}
                  </span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Programado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/50">
                    <CalendarCheck2 className="h-6 w-6 text-purple-500" />
                  </div>
                  <span className="text-2xl font-bold">
                    {formatCurrency(totalProgramado)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {subcategoryTotals.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subcategoryTotals.map((sub) => (
                <Card key={sub.name}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{sub.name}</CardTitle>
                    <CardDescription>{sub.mainCategory}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-full ${
                          sub.mainCategory === 'Reserva de Emergencia'
                            ? 'bg-green-100 dark:bg-green-900/50'
                            : 'bg-purple-100 dark:bg-purple-900/50'
                        }`}
                      >
                        {getIconForCategory(sub.mainCategory)}
                      </div>
                      <span className="text-2xl font-bold">
                        {formatCurrency(sub.total)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

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
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Local</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isSubmitting}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o local" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {emergencyReserveLocations.map((location) => (
                            <SelectItem key={location} value={location}>
                              {location}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
