
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
      <div className="flex flex-col">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">
              {text.sidebar.emergencyReserve}
            </h1>
            <Button
              onClick={() => setIsReserveFormOpen(true)}
              size="sm"
              className="mt-4"
            >
              <Shield className="mr-2 h-4 w-4" />
              Nova Movimentação
            </Button>
          </div>

          <div className="w-80">
            {loading ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : totalReserve > 0 && (
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
