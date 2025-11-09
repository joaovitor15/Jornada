
'use client';

import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { useAuth } from './use-auth';
import { useProfile } from './use-profile';
import { type EmergencyReserveEntry } from '@/lib/types';
// import { reserveCategories } from '@/lib/categories';

interface SubcategoryTotal {
  name: string;
  mainCategory: string;
  total: number;
}

export function useEmergencyReserve() {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const [entries, setEntries] = useState<EmergencyReserveEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !activeProfile) {
      setLoading(false);
      setEntries([]);
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
        const entriesData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as EmergencyReserveEntry[];
        setEntries(entriesData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching reserve entries: ', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, activeProfile]);

  const {
    totalProtegido,
    totalReserva,
    totalProgramado,
    subcategoryTotals,
  } = useMemo(() => {
    let totalGeral = 0;
    let totalCatReserva = 0;
    let totalCatProgramado = 0;
    const subTotals: { [key: string]: number } = {};

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
    // Object.entries(reserveCategories).forEach(([main, subs]) => {
    //   subs.forEach((sub) => subcategoryToMainMap.set(sub, main));
    // });

    const populatedSubTotals: SubcategoryTotal[] = Object.entries(subTotals)
      .map(([name, total]) => ({
        name,
        mainCategory: subcategoryToMainMap.get(name) || 'Desconhecida',
        total,
      }))
      .filter((sub) => sub.total > 0)
      .sort((a, b) => {
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
        return b.total - a.total;
      });

    return {
      totalProtegido: totalGeral,
      totalReserva: totalCatReserva,
      totalProgramado: totalCatProgramado,
      subcategoryTotals: populatedSubTotals,
    };
  }, [entries]);

  return {
    loading,
    entries,
    totalProtegido,
    totalReserva,
    totalProgramado,
    subcategoryTotals,
  };
}
