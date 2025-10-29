'use client';

import PayBillForm from '@/components/faturas/pay-bill-form';
import { text } from '@/lib/strings';

export default function PayBillPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 lg:pt-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{text.payBillForm.title}</h1>
        <p className="text-muted-foreground">{text.payBillForm.description}</p>
      </div>
      <div className="max-w-xl mx-auto">
        <PayBillForm />
      </div>
    </div>
  );
}
