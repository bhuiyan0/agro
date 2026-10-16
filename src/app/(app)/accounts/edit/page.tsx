"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { TransactionForm } from "@/components/transaction-form";
import { ErrorBox, PageHeader } from "@/components/ui";
import type { Transaction } from "@/lib/api-client";
import { useFetch } from "@/lib/use-fetch";

// The id is a query parameter rather than a path segment, so the page stays
// static and can be cached for offline use in milestone 3.
export default function EditTransactionPage() {
  return (
    <main>
      <PageHeader title="হিসাব বদলান" />
      <Suspense fallback={<p className="px-4 text-muted">লোড হচ্ছে...</p>}>
        <EditTransaction />
      </Suspense>
    </main>
  );
}

function EditTransaction() {
  const id = useSearchParams().get("id");
  const { data, error } = useFetch<{ transaction: Transaction }>(id ? `/api/transactions/${id}` : null);
  if (!id || error)
    return (
      <div className="px-4">
        <ErrorBox message={error ?? "খুঁজে পাওয়া যায়নি।"} />
      </div>
    );
  if (!data) return <p className="px-4 text-muted">লোড হচ্ছে...</p>;
  return <TransactionForm existing={data.transaction} />;
}
