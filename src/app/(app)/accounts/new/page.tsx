"use client";

import { TransactionForm } from "@/components/transaction-form";
import { PageHeader } from "@/components/ui";

export default function NewTransactionPage() {
  return (
    <main>
      <PageHeader title="নতুন হিসাব" />
      <TransactionForm />
    </main>
  );
}
