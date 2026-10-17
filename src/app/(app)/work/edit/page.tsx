"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { localDb } from "@/client/local-db";
import { useLiveQuery } from "@/client/use-live-query";
import { WorkLogForm } from "@/components/work-log-form";
import { ErrorBox, PageHeader } from "@/components/ui";

// The id is a query parameter rather than a path segment, so this stays one
// static page that the service worker can serve offline for any entry.
export default function EditWorkLogPage() {
  return (
    <main>
      <PageHeader title="কাজের রিপোর্ট বদলান" />
      <Suspense fallback={<p className="px-4 text-muted">লোড হচ্ছে...</p>}>
        <EditWorkLog />
      </Suspense>
    </main>
  );
}

function EditWorkLog() {
  const id = useSearchParams().get("id") ?? "";
  // Read once: later sync updates must not reset what the user is typing.
  const found = useLiveQuery(async () => ({ row: await localDb.workLogs.get(id) }), [id]);
  if (!found) return <p className="px-4 text-muted">লোড হচ্ছে...</p>;
  if (!found.row || found.row.deletedAt) {
    return (
      <div className="px-4">
        <ErrorBox message="খুঁজে পাওয়া যায়নি।" />
      </div>
    );
  }
  return <WorkLogForm key={found.row.id} existing={found.row} />;
}
