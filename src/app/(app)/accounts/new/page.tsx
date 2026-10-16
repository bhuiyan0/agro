"use client";

import { TransactionForm } from "@/components/transaction-form";
import { NoActiveProject, useHasActiveProject } from "@/components/pickers";
import { PageHeader } from "@/components/ui";

export default function NewTransactionPage() {
  const hasProject = useHasActiveProject();
  return (
    <main>
      <PageHeader title="নতুন হিসাব" />
      {hasProject ? <TransactionForm /> : <NoActiveProject />}
    </main>
  );
}
