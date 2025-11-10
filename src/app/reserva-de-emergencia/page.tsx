
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import ReserveAnalysisTabs from '@/components/reserva-de-emergencia/reserve-analysis-tabs';
import { useEmergencyReserve } from '@/hooks/use-emergency-reserve';
import { useTags } from '@/hooks/use-tags';

export default function ReservaDeEmergenciaPage() {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const [isReserveFormOpen, setIsReserveFormOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();
  const { hierarchicalTags } = useTags();

  const {
    loading,
    totalProtegido,
    totalReservaEmergencia,
    totalReservaProgramada,
    tagTotals,
  } = useEmergencyReserve();


  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const handleDiceRoll = () => {
    toast({
      title: 'Em breve!',
      description: 'A funcionalidade de sorteio será reimplementada com o novo sistema de tags.',
    });
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);

  const getIconForTag = (tag: string) => {
    const parentTag = hierarchicalTags.find(pt => pt.children.some(child => child.name === tag));
    if (parentTag?.name === 'Reserva de Emergência') {
      return <Shield className="h-6 w-6 text-green-500" />;
    }
    if (parentTag?.name === 'Reserva Programada') {
      return <CalendarCheck2 className="h-6 w-6 text-purple-500" />;
    }
    return <Banknote className="h-6 w-6 text-gray-500" />;
  };
  
  const getTagParentName = (tag: string) => {
     const parentTag = hierarchicalTags.find(pt => pt.children.some(child => child.name === tag));
     return parentTag?.name || 'Categoria Desconhecida';
  }
  
   const getTagColor = (tag: string) => {
     const parentTag = hierarchicalTags.find(pt => pt.children.some(child => child.name === tag));
     if (parentTag?.name === 'Reserva de Emergência') {
      return 'bg-green-100 dark:bg-green-900/50';
    }
    if (parentTag?.name === 'Reserva Programada') {
      return 'bg-purple-100 dark:bg-purple-900/50';
    }
    return 'bg-gray-100 dark:bg-gray-900/50';
  }


  return (
    <>
      <div className="p-4 md:p-6 lg:p-8 lg:pt-4 h-full flex flex-col">
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
                disabled
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
                  <CardTitle className="text-lg">Reserva de Emergência</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
                      <Shield className="h-6 w-6 text-green-500" />
                    </div>
                    <span className="text-2xl font-bold">
                      {formatCurrency(totalReservaEmergencia)}
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Reserva Programada</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/50">
                      <CalendarCheck2 className="h-6 w-6 text-purple-500" />
                    </div>
                    <span className="text-2xl font-bold">
                      {formatCurrency(totalReservaProgramada)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {tagTotals.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tagTotals.map((sub) => (
                  <Card key={sub.name}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{sub.name}</CardTitle>
                      <CardDescription>{getTagParentName(sub.name)}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4">
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-full ${getTagColor(sub.name)}`}
                        >
                          {getIconForTag(sub.name)}
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

            <ReserveAnalysisTabs />

          </div>
        )}
      </div>

      <AddReserveEntryForm
        isOpen={isReserveFormOpen}
        onOpenChange={setIsReserveFormOpen}
      />
    </>
  );
}
