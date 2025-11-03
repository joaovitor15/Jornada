'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Shield } from 'lucide-react';
import { text } from '@/lib/strings';
import AddReserveEntryForm from '@/components/reserva-de-emergencia/add-reserve-entry-form';

export default function ReservaDeEmergenciaPage() {
  const [isReserveFormOpen, setIsReserveFormOpen] = useState(false);

  return (
    <>
      <div className="p-4 md:p-6 lg:p-8 lg:pt-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{text.sidebar.emergencyReserve}</h1>
          <Button
            onClick={() => setIsReserveFormOpen(true)}
            size="sm"
            variant="outline"
          >
            <Shield className="mr-2 h-4 w-4" />
            Adicionar Reserva
          </Button>
        </div>
        <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
           <p className="text-muted-foreground">
            Use o botão acima para adicionar uma nova contribuição à sua reserva.
          </p>
        </div>
      </div>
      <AddReserveEntryForm
        isOpen={isReserveFormOpen}
        onOpenChange={setIsReserveFormOpen}
      />
    </>
  );
}
