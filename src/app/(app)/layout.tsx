import { AppShell } from "@/components/app-shell";

// Every screen except login. The shell checks the session and loads the
// user and their projects once.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return <AppShell>{children}</AppShell>;
}
