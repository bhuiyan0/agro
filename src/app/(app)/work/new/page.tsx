"use client";

import { WorkLogForm } from "@/components/work-log-form";
import { NoActiveProject, useHasActiveProject } from "@/components/pickers";
import { PageHeader } from "@/components/ui";

export default function NewWorkLogPage() {
  const hasProject = useHasActiveProject();
  return (
    <main>
      <PageHeader title="নতুন কাজের রিপোর্ট" />
      {hasProject ? <WorkLogForm /> : <NoActiveProject />}
    </main>
  );
}
