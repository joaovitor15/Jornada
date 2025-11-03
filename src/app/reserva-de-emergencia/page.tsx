
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
             <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground">
                Futuro espaço para mais detalhes ou gráficos da reserva.
              </p>
            </div>
          </div>
          <div className="lg:col-span-1 space-y-6">
            {loading ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">
                        Total na Reserva
                      </CardTitle>
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
            )}
          </div>
        </div>
      </div>
      <AddReserveEntryForm
        isOpen={isReserveFormOpen}
        onOpenChange={setIsReserveFormOpen}
      />
    </>
  );
}
