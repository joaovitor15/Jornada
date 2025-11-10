
'use client';

import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { useAuth } from './use-auth';
import { useProfile } from './use-profile';
import { type EmergencyReserveEntry } from '@/lib/types';
import { useTags } from './use-tags';

interface TagTotal {
  name: string;
  total: number;
}

export function useEmergencyReserve() {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const { hierarchicalTags } = useTags();
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
    totalReservaEmergencia,
    totalReservaProgramada,
    tagTotals,
  } = useMemo(() => {
    let totalGeral = 0;
    const tagSubTotals: { [key: string]: number } = {};

    const emergenciaTag = hierarchicalTags.find(t => t.name === 'Reserva de Emergência');
    const programadaTag = hierarchicalTags.find(t => t.name === 'Reserva Programada');

    const emergenciaChildNames = emergenciaTag?.children.map(c => c.name) || [];
    const programadaChildNames = programadaTag?.children.map(c => c.name) || [];

    entries.forEach((entry) => {
      totalGeral += entry.amount;
      if (entry.tags && entry.tags.length > 0) {
        entry.tags.forEach(tag => {
            tagSubTotals[tag] = (tagSubTotals[tag] || 0) + entry.amount;
        });
      }
    });

    const totalEmergencia = Object.entries(tagSubTotals)
        .filter(([tagName]) => emergenciaChildNames.includes(tagName))
        .reduce((acc, [, total]) => acc + total, 0);

    const totalProgramada = Object.entries(tagSubTotals)
        .filter(([tagName]) => programadaChildNames.includes(tagName))
        .reduce((acc, [, total]) => acc + total, 0);


    const populatedSubTotals: TagTotal[] = Object.entries(tagSubTotals)
      .map(([name, total]) => ({
        name,
        total,
      }))
      .filter((sub) => sub.total > 0)
      .sort((a, b) => b.total - a.total);

    return {
      totalProtegido: totalGeral,
      totalReservaEmergencia: totalEmergencia,
      totalReservaProgramada: totalProgramada,
      tagTotals: populatedSubTotals,
    };
  }, [entries, hierarchicalTags]);

  return {
    loading,
    entries,
    totalProtegido,
    totalReservaEmergencia,
    totalReservaProgramada,
    tagTotals,
  };
}
