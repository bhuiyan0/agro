"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { WorkLogForm } from "@/components/work-log-form";
import { ErrorBox, PageHeader } from "@/components/ui";
import type { WorkLog } from "@/lib/api-client";
import { useFetch } from "@/lib/use-fetch";

// The id is a query parameter rather than a path segment, so the page stays
// static and can be cached for offline use in milestone 3.
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
  const id = useSearchParams().get("id");
  const { data, error } = useFetch<{ workLog: WorkLog }>(id ? `/api/work-logs/${id}` : null);
  if (!id || error)
    return (
      <div className="px-4">
        <ErrorBox message={error ?? "খুঁজে পাওয়া যায়নি।"} />
      </div>
    );
  if (!data) return <p className="px-4 text-muted">লোড হচ্ছে...</p>;
  return <WorkLogForm existing={data.workLog} />;
}
