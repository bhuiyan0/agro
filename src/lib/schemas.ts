// Request body schemas, shared by the API and the forms in the app.
import { z } from "zod";
import { categoriesFor, WORK_TYPES } from "@/lib/categories";
import { isIsoDate } from "@/lib/dates";

const IsoDate = z.string().refine(isIsoDate, "Expected a date as YYYY-MM-DD");
const Note = z
  .string()
  .trim()
  .max(500)
  .nullish()
  .transform((v) => v || null);

/** A positive amount with at most two decimals, up to 9 999 999 999.99. Sent as a string or number. */
const Amount = z
  .union([z.string(), z.number()])
  .transform((v) => String(v).trim())
  .refine((v) => /^\d{1,10}(\.\d{1,2})?$/.test(v) && Number(v) > 0, "Expected a positive amount");

const OptionalDecimal = (maxIntDigits: number) =>
  z
    .union([z.string(), z.number()])
    .nullish()
    .transform((v) => (v === null || v === undefined || v === "" ? null : String(v).trim()))
    .refine(
      (v) => v === null || new RegExp(`^\\d{1,${maxIntDigits}}(\\.\\d{1,2})?$`).test(v),
      "Expected a number with at most two decimals",
    );

export const TransactionFields = z
  .object({
    projectId: z.uuid(),
    type: z.enum(["EXPENSE", "INCOME"]),
    category: z.string(),
    amount: Amount,
    note: Note,
    plotId: z
      .uuid()
      .nullish()
      .transform((v) => v ?? null),
    date: IsoDate,
  })
  .refine((t) => categoriesFor(t.type).includes(t.category), {
    path: ["category"],
    message: "Unknown category for this type",
  });

export const TransactionCreate = z.intersection(z.object({ id: z.uuid() }), TransactionFields);
export type TransactionInput = z.infer<typeof TransactionFields>;

export const WorkLogFields = z.object({
  projectId: z.uuid(),
  workType: z.enum(WORK_TYPES),
  plotId: z
    .uuid()
    .nullish()
    .transform((v) => v ?? null),
  workers: z
    .number()
    .int()
    .min(0)
    .max(10_000)
    .nullish()
    .transform((v) => v ?? null),
  hours: OptionalDecimal(3),
  note: Note,
  date: IsoDate,
});

export const WorkLogCreate = z.intersection(z.object({ id: z.uuid() }), WorkLogFields);
export type WorkLogInput = z.infer<typeof WorkLogFields>;

export const ProjectCreate = z.object({
  name: z.string().trim().min(1).max(100),
  // Managers to add. Owners are always members of every project.
  memberIds: z.array(z.uuid()).default([]),
});

export const ProjectUpdate = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => v.name !== undefined || v.isActive !== undefined, "Nothing to update");

export const MembersUpdate = z.object({ userIds: z.array(z.uuid()) });

const Password = z.string().min(6).max(200);

export const UserCreate = z.object({
  name: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(1).max(32),
  password: Password,
  role: z.enum(["OWNER", "MANAGER"]),
  projectIds: z.array(z.uuid()).default([]),
});

export const UserUpdate = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    password: Password.optional(),
    role: z.enum(["OWNER", "MANAGER"]).optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), "Nothing to update");
