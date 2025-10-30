
'use client';

import { text } from "@/lib/strings";

export default function InvestmentsPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 lg:pt-4">
      <h1 className="text-2xl font-bold">{text.sidebar.investments}</h1>
      <p className="text-muted-foreground">{text.common.comingSoon}</p>
    </div>
  );
}

    