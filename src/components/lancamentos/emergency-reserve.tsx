'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  addDoc,
  Timestamp,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import {
  EmergencyReserve,
  EmergencyReserveEntry,
} from '@/lib/types';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, Pencil, Save } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { text } from '@/lib/strings';
import { format } from 'date-fns';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export default function EmergencyReserve() {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const [reserve, setReserve] = useState<EmergencyReserve | null>(null);
  const [entries, setEntries] = useState<EmergencyReserveEntry[]>([]);
  const [totalSaved, setTotalSaved] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [newGoal, setNewGoal] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (!user || !activeProfile) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const reserveDocId = `${user.uid}_${activeProfile}`;
    const reserveRef = doc(db, 'emergencyReserves', reserveDocId);

    const unsubReserve = onSnapshot(reserveRef, (docSnap) => {
      if (docSnap.exists()) {
        setReserve(docSnap.data() as EmergencyReserve);
        setNewGoal((docSnap.data() as EmergencyReserve).goal);
      } else {
        setReserve({
          userId: user.uid,
          profile: activeProfile,
          goal: 0,
        });
        setNewGoal(0);
      }
    });

    const entriesQuery = query(
      collection(db, 'emergencyReserveEntries'),
      where('userId', '==', user.uid),
      where('profile', '==', activeProfile),
      orderBy('date', 'desc')
    );

    const unsubEntries = onSnapshot(entriesQuery, (querySnapshot) => {
      const entriesData = querySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as EmergencyReserveEntry)
      );
      setEntries(entriesData);

      const total = entriesData.reduce((sum, entry) => sum + entry.amount, 0);
      setTotalSaved(total);
      setLoading(false);
    });

    return () => {
      unsubReserve();
      unsubEntries();
    };
  }, [user, activeProfile]);

  const handleSaveGoal = async () => {
    if (!user || !activeProfile || newGoal < 0) return;

    const reserveDocId = `${user.uid}_${activeProfile}`;
    const reserveRef = doc(db, 'emergencyReserves', reserveDocId);

    try {
      await setDoc(reserveRef, {
        userId: user.uid,
        profile: activeProfile,
        goal: newGoal,
      });
      toast({ title: 'Sucesso', description: 'Meta da reserva atualizada.' });
      setIsEditingGoal(false);
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível salvar a meta.',
      });
    }
  };

  const progressPercentage =
    reserve && reserve.goal > 0 ? (totalSaved / reserve.goal) * 100 : 0;

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="item-1" className="border-b-0">
        <AccordionTrigger className="bg-card border rounded-lg shadow-sm px-6 py-4 w-full text-lg font-semibold flex justify-between items-center hover:no-underline">
          {text.sidebar.emergencyReserve}
        </AccordionTrigger>
        <AccordionContent>
          <Card className="rounded-lg border shadow-sm">
            <CardContent className="p-6 space-y-6">
              {loading ? (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-muted-foreground">Progresso</span>
                      <div className="flex items-center gap-2 font-semibold">
                        {formatCurrency(totalSaved)}
                        <span className="text-muted-foreground mx-1">/</span>
                        {isEditingGoal ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={newGoal}
                              onChange={(e) => setNewGoal(Number(e.target.value))}
                              className="h-8 w-32"
                              placeholder="Definir meta"
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={handleSaveGoal}
                              className="h-8 w-8"
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setIsEditingGoal(true)}
                            className="flex items-center gap-2 hover:bg-muted p-1 rounded-md"
                          >
                            {formatCurrency(reserve?.goal || 0)}
                            <Pencil className="h-3 w-3 text-muted-foreground" />
                          </button>
                        )}
                      </div>
                    </div>
                    <Progress value={progressPercentage} />
                    <p className="text-right text-xs text-muted-foreground mt-1">
                      {progressPercentage.toFixed(2)}% Concluído
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Contribuições</h4>
                    {entries.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Nenhuma contribuição registrada.</p>
                    ) : (
                       <div className="max-h-48 overflow-y-auto pr-2">
                        <ul className="space-y-2">
                          {entries.map((entry) => (
                            <li key={entry.id} className="flex justify-between items-center text-sm p-2 rounded-md bg-muted/50">
                              <span>
                                {entry.description || 'Contribuição'} - {format(entry.date.toDate(), 'dd/MM/yyyy')}
                              </span>
                              <span className="font-medium text-green-600">
                                + {formatCurrency(entry.amount)}
                              </span>
                            </li>
                          ))}
                        </ul>
                       </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
