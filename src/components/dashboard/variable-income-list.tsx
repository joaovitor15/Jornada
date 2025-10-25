'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export default function VariableIncomeList() {
  return (
    <Accordion
      type="single"
      collapsible
      defaultValue="item-1"
      className="w-full"
    >
      <AccordionItem value="item-1" className="border-b-0">
        <AccordionTrigger className="bg-card border rounded-lg shadow-sm px-6 py-4 w-full text-lg font-semibold flex justify-between items-center hover:no-underline">
          Renda Variável
        </AccordionTrigger>
        <AccordionContent>
          <Card className="rounded-lg border shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="h-10 px-2 text-left align-middle font-medium text-muted-foreground text-xs uppercase">
                      Descrição
                    </TableHead>
                    <TableHead className="h-10 px-2 text-left align-middle font-medium text-muted-foreground text-xs uppercase">
                      Data
                    </TableHead>
                    <TableHead className="h-10 px-2 text-left align-middle font-medium text-muted-foreground text-xs uppercase">
                      Categoria
                    </TableHead>
                    <TableHead className="h-10 px-2 align-middle font-medium text-muted-foreground text-xs uppercase text-right">
                      Valor
                    </TableHead>
                    <TableHead className="h-10 px-2 align-middle font-medium text-muted-foreground text-xs uppercase text-center">
                      Opções
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                      <p>Nenhuma renda variável registrada ainda.</p>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
