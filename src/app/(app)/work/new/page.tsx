"use client";

import { WorkLogForm } from "@/components/work-log-form";
import { PageHeader } from "@/components/ui";

export default function NewWorkLogPage() {
  return (
    <main>
      <PageHeader title="নতুন কাজের রিপোর্ট" />
      <WorkLogForm />
    </main>
  );
}
