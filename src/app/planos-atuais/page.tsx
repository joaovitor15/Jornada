'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { text } from "@/lib/strings";
import { PlusCircle } from "lucide-react";

export default function PlanosAtuaisPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 lg:pt-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{text.sidebar.currentPlans}</h1>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          {text.plans.newPlan}
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Gerencie seus Planos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-10">
            <p>{text.common.comingSoon}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
