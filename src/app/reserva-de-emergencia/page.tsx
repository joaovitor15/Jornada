
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, PiggyBank, Shield } from 'lucide-react';
import { text } from '@/lib/strings';
import AddReserveEntryForm from '@/components/reserva-de-emergencia/add-reserve-entry-form';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { EmergencyReserveEntry } from '@/lib/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function ReservaDeEmergenciaPage() {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const [isReserveFormOpen, setIsReserveFormOpen] = useState(false);
  const [totalReserve, setTotalReserve] = useState(0);
  const [loading, setLoading] = useState(true);

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

  return (
    <>
      <div className="p-4 md:p-6 lg:p-8 lg:pt-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">
            {text.sidebar.emergencyReserve}
          </h1>
          <Button
            onClick={() => setIsReserveFormOpen(true)}
            size="sm"
            variant="outline"
          >
            <Shield className="mr-2 h-4 w-4" />
            Adicionar Reserva
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : totalReserve > 0 ? (
          <div className="mb-8 max-w-md mx-auto">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total na Reserva
                </CardTitle>
                <PiggyBank className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(totalReserve)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Valor total guardado neste perfil.
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">
              Use o botão acima para adicionar uma nova contribuição à sua
              reserva.
            </p>
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
