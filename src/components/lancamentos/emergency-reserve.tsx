
'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';
import { text } from '@/lib/strings';

export default function EmergencyReserve() {
  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="item-1" className="border-b-0">
        <AccordionTrigger className="bg-card border rounded-lg shadow-sm px-6 py-4 w-full text-lg font-semibold flex justify-between items-center hover:no-underline">
          {text.sidebar.emergencyReserve}
        </AccordionTrigger>
        <AccordionContent>
          <Card className="rounded-lg border shadow-sm">
            <CardContent className="p-0">
              <div className="text-center text-muted-foreground py-10">
                <p>{text.common.comingSoon}</p>
              </div>
            </CardContent>
          </Card>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
