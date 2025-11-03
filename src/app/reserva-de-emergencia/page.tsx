'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { text } from '@/lib/strings';

export default function EmergencyReservePage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 lg:pt-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{text.sidebar.emergencyReserve}</h1>
      </div>
      <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
        <AccordionItem value="item-1" className="border-b-0">
          <AccordionTrigger className="bg-card border rounded-lg shadow-sm px-6 py-4 w-full text-lg font-semibold flex justify-between items-center hover:no-underline">
            {text.sidebar.emergencyReserve}
          </AccordionTrigger>
          <AccordionContent>
            <div className="text-center text-muted-foreground py-10">
              {text.common.comingSoon}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
