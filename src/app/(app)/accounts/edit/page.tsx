"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { localDb } from "@/client/local-db";
import { useLiveQuery } from "@/client/use-live-query";
import { TransactionForm } from "@/components/transaction-form";
import { ErrorBox, PageHeader } from "@/components/ui";

// The id is a query parameter rather than a path segment, so this stays one
// static page that the service worker can serve offline for any entry.
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
  const id = useSearchParams().get("id") ?? "";
  // Read once: later sync updates must not reset what the user is typing.
  const found = useLiveQuery(async () => ({ row: await localDb.transactions.get(id) }), [id]);
  if (!found) return <p className="px-4 text-muted">লোড হচ্ছে...</p>;
  if (!found.row || found.row.deletedAt) {
    return (
      <div className="px-4">
        <ErrorBox message="খুঁজে পাওয়া যায়নি।" />
      </div>
    );
  }
  return <TransactionForm key={found.row.id} existing={found.row} />;
}
