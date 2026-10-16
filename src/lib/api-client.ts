// Thin fetch wrapper for the browser. Returns the error code instead of
// throwing, so screens can show a Bengali message for each case.
export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; code: string };

export async function api<T>(
  path: string,
  init?: { method?: string; body?: unknown },
): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: init?.method ?? "GET",
      headers: init?.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: init?.body === undefined ? undefined : JSON.stringify(init.body),
      credentials: "same-origin",
    });
  } catch {
    return { ok: false, status: 0, code: "NETWORK" };
  }
  const json = await response.json().catch(() => null);
  if (!response.ok) return { ok: false, status: response.status, code: json?.error?.code ?? "UNKNOWN" };
  return { ok: true, data: json as T };
}

export type Role = "OWNER" | "MANAGER";
export type Project = { id: string; name: string; isActive: boolean; role: Role };
export type Me = { user: { id: string; name: string; phone: string; role: Role }; projects: Project[] };

export type Transaction = {
  id: string;
  projectId: string;
  type: "EXPENSE" | "INCOME";
  category: string;
  amount: string;
  note: string | null;
  plotId: string | null;
  date: string;
  createdBy: string;
  updatedBy: string;
  updatedAt: string;
};

export type WorkLog = {
  id: string;
  projectId: string;
  workType: string;
  workers: number | null;
  hours: string | null;
  note: string | null;
  plotId: string | null;
  date: string;
  createdBy: string;
  updatedBy: string;
  updatedAt: string;
};

export type User = { id: string; name: string; phone: string; role: Role; createdAt: string };
export type Member = { id: string; name: string; phone: string; role: Role };
