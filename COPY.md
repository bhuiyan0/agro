# Bengali copy review

Every Bengali text the app shows, grouped by screen. Each text is listed once, under the first screen it appears on. `N` stands for a number, `৳ X` for an amount, `[মাস]` for a month name, `[নাম]` for a project name and `[কারণ]` for the error reason that follows.

How to review: tick a line when it reads well. When it does not, write the better wording after it, for example `- [ ] এখনো সিঙ্ক হয়নি → আপনার পছন্দের লেখা`, and send the file back.

## Questions for the reviewer

1. **Tab names.** The bottom bar has "কাজ" (work reports) and "রিপোর্ট" (money reports), while the work screen is titled "কাজের রিপোর্ট". Is that clear, or should the money tab be called something like "হিসাবের সারাংশ"?
2. **English loanwords.** The app uses প্রজেক্ট, সিঙ্ক, এন্ট্রি, আর্কাইভ, রিপোর্ট, লগইন, পাসওয়ার্ড, ম্যানেজার and সার্ভার. Keep them, or use Bengali words (for example প্রকল্প for প্রজেক্ট)?
3. **"সংখ্যা দেখানো"** is the heading of the digits setting. Is "সংখ্যার ধরন" better?
4. **"লাভ" / "ক্ষতি"** for a month's income minus expense. Is "লাভ" right for a small surplus, or is "উদ্বৃত্ত" / "জমা" more natural?

## Login

- [ ] গ্রিন হিল
- [ ] বাগানের হিসাব ও কাজের রিপোর্ট
- [ ] ফোন নম্বর
- [ ] ০১XXXXXXXXX
- [ ] পাসওয়ার্ড
- [ ] অপেক্ষা করুন...
- [ ] লগইন

## App name and install

- [ ] বাগানের দৈনিক হিসাব ও কাজের রিপোর্ট

## Bottom bar and loading

- [ ] হোম
- [ ] হিসাব
- [ ] কাজ
- [ ] রিপোর্ট
- [ ] সেটিংস
- [ ] আবার চেষ্টা করুন
- [ ] লোড হচ্ছে...

## Home

- [ ] স্বাগতম,
- [ ] আজকের সারসংক্ষেপ
- [ ] আজ খরচ
- [ ] আজ আয়
- [ ] কাজের রিপোর্ট
- [ ] [মাস]: পুরো রিপোর্ট দেখুন
- [ ] এই মাস ·
- [ ] রিপোর্ট ›
- [ ] খরচ
- [ ] আয়
- [ ] ক্ষতি
- [ ] লাভ
- [ ] নতুন হিসাব
- [ ] নতুন কাজের রিপোর্ট

## Sync status and notices

- [ ] এখনো সিঙ্ক হয়নি
- [ ] এইমাত্র সিঙ্ক হয়েছে
- [ ] N মিনিট আগে সিঙ্ক হয়েছে
- [ ] N ঘণ্টা আগে সিঙ্ক হয়েছে
- [ ] N দিন আগে সিঙ্ক হয়েছে
- [ ] আবার লগইন করুন। এন্ট্রিগুলো ফোনে রাখা আছে।
- [ ] সিঙ্ক হচ্ছে...
- [ ] : null; if (!state.online) return { tone: "warn", text: ["ইন্টারনেট নেই", waiting].filter(Boolean).join(" · ") }; if (state.problem === "network") return { tone: "warn", text: [waiting, "আবার চেষ্টা হবে"].filter(Boolean).join(" · ") }; if (waiting) return { tone: "warn", text: waiting }; return { tone: "ok", text: lastSyncLabel(lastSync) }; } const TONES: Record<string, string> = { ok: "text-primary", muted: "text-muted", warn: "text-amber-800", danger: "text-danger", }; export function SyncBar() { const state = useSyncState(); const pending = usePendingCount(); const meta = useLiveQuery( async () => ({ lastSync: await getMeta("lastSync"), notices: await getMeta("notices") }), [], ); const summary = syncSummary(state, pending, meta?.lastSync); const notices = meta?.notices ?? []; return ( <div className="flex flex-col gap-2 px-4 pt-2"> {state.problem === "auth" ? ( <Link href="/login" className="rounded-lg border-2 border-danger px-4 py-3 text-center font-semibold text-danger" > {summary.text} লগইন করতে এখানে চাপুন। </Link> ) : ( <button type="button" onClick={() => void syncNow()} aria-live="polite" className={
- [ ] } className="font-semibold text-amber-900"> {n.code === "ROW_DELETED" ? "একটি এন্ট্রি অন্য ফোনে মুছে ফেলা হয়েছে, তাই এই ফোনের বদলটি রাখা যায়নি।" :
- [ ] বুঝেছি
- [ ] সিঙ্ক হয়নি:
- [ ] পাঠানো বাকি

## Project, month and date pickers

- [ ] সব প্রজেক্ট
- [ ] [নাম] (আর্কাইভ)
- [ ] প্রজেক্ট
- [ ] আগের মাস
- [ ] পরের মাস
- [ ] তারিখ
- [ ] আজ
- [ ] গতকাল
- [ ] বদলান
- [ ] তারিখ বেছে নিন
- [ ] কোনো চালু প্রজেক্ট নেই, তাই নতুন এন্ট্রি যোগ করা যাবে না।
- [ ] সেটিংস থেকে একটি প্রজেক্ট তৈরি করুন।
- [ ] মালিককে আপনাকে একটি প্রজেক্টে যোগ করতে বলুন।

## Accounts list

- [ ] + নতুন
- [ ] ধরন
- [ ] সব
- [ ] মোট খরচ
- [ ] মোট আয়
- [ ] এই মাসে কোনো হিসাব নেই।
- [ ] হিসাব বদলান
- [ ] খুঁজে পাওয়া যায়নি।

## Account entry form

- [ ] ; function defaultCategory(type: TxnTypeName): string { const last = readLocal(lastCategoryKey(type)); return last && categoriesFor(type).includes(last) ? last : categoriesFor(type)[0]; } export function TransactionForm({ existing }: { existing?: LocalTransaction }) { const router = useRouter(); const { me } = useApp(); const defaultProject = useDefaultProject(LAST_PROJECT); const [id] = useState(() => existing?.id ?? crypto.randomUUID()); const [type, setType] = useState<TxnTypeName>(existing?.type ?? "EXPENSE"); const [category, setCategory] = useState(() => existing?.category ?? defaultCategory("EXPENSE")); const [amount, setAmount] = useState(existing ? withDigits(String(Number(existing.amount))) : ""); const [date, setDate] = useState(existing?.date ?? todayIso()); const [projectId, setProjectId] = useState(existing?.projectId ?? defaultProject); const [note, setNote] = useState(existing?.note ?? ""); const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false); function changeType(next: TxnTypeName) { setType(next); if (!categoriesFor(next).includes(category)) setCategory(defaultCategory(next)); } async function onSubmit(event: FormEvent) { event.preventDefault(); const parsed = TransactionFields.safeParse({ projectId, type, category, amount: toAsciiDigits(amount).replace(/,/g, ""), note, date, }); if (!parsed.success) { const field = parsed.error.issues[0]?.path[0]; setError( field === "amount" ? "টাকার পরিমাণ ঠিক নেই।" : field === "projectId" ? "একটি প্রজেক্ট বেছে নিন।" : errorMessage("VALIDATION_FAILED"), ); return; } setBusy(true); setError(null); await saveEntry("transaction", id, parsed.data, me.user.id); setBusy(false); writeLocal(lastCategoryKey(type), category); writeLocal(LAST_PROJECT, projectId); router.push("/accounts"); } async function onDelete() { if (!confirm("এই হিসাবটি মুছে ফেলবেন?")) return; setBusy(true); await deleteEntry("transaction", id, me.user.id); router.push("/accounts"); } async function onDiscard() { if (!confirm("এই বদলটি বাতিল করবেন? সার্ভারে যা আছে সেটিই থাকবে।")) return; await discardLocal("transaction", id); router.push("/accounts"); } return ( <form onSubmit={onSubmit} className="flex flex-col gap-5 px-4 pb-6"> <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="ধরন"> {( [ ["EXPENSE", "খরচ"], ["INCOME", "আয়"], ] as const ).map(([value, label]) => ( <button key={value} type="button" role="radio" aria-checked={type === value} onClick={() => changeType(value)} className={
- [ ] } > {label} </button> ))} </div> <Field label="টাকার পরিমাণ (৳)"> <input inputMode="decimal" autoComplete="off" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={withDigits("০")} className={
- [ ] } /> </Field> <div className="flex flex-col gap-2"> <span className="font-semibold">খাত</span> <Chips label="খাত" options={categoriesFor(type).map((c) => ({ value: c, label: c }))} value={category} onChange={setCategory} /> </div> <div className="flex flex-col gap-2"> <span className="font-semibold">তারিখ</span> <DateField value={date} onChange={setDate} /> </div> <div className="flex flex-col gap-2"> <span className="font-semibold">প্রজেক্ট</span> <ProjectField value={projectId} onChange={setProjectId} /> </div> <Field label="নোট (ইচ্ছা হলে)"> <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} className={inputClass} /> </Field> {existing?._error && ( <ErrorBox message={
- [ ] সংরক্ষণ করুন
- [ ] মুছে ফেলুন
- [ ] বদল বাতিল করুন

## Work reports list

- [ ] কাজের ধরন
- [ ] এই মাসে কোনো কাজের রিপোর্ট নেই।
- [ ] N জন
- [ ] N ঘণ্টা
- [ ] কাজের রিপোর্ট বদলান

## Work report form

- [ ] শ্রমিকের সংখ্যা ঠিক নেই।
- [ ] ঘণ্টা ঠিক নেই।
- [ ] একটি প্রজেক্ট বেছে নিন।
- [ ] এই কাজের রিপোর্টটি মুছে ফেলবেন?
- [ ] এই বদলটি বাতিল করবেন? সার্ভারে যা আছে সেটিই থাকবে।
- [ ] শ্রমিক (জন)
- [ ] ঘণ্টা
- [ ] নোট (ইচ্ছা হলে)
- [ ] সার্ভার এই এন্ট্রিটি নেয়নি: [কারণ] ঠিক করে আবার সংরক্ষণ করুন, অথবা বাতিল করুন।

## Reports

- [ ] )); const sum = totals(monthRows); const months = Array.from({ length: TREND_MONTHS }, (_, i) => shiftMonth(month, i - (TREND_MONTHS - 1))); const trend = byMonth(rows ?? [], months).reverse(); const trendMax = Math.max(1, ...trend.flatMap((m) => [m.expense, m.income])); const projectLines = byProject( monthRows, me.projects.map((p) => p.id), ).filter((p) => p.expense || p.income); const projectName = new Map(me.projects.map((p) => [p.id, p.name])); const empty = countable(monthRows).length === 0; return ( <main className="flex flex-col gap-4 pb-6"> <PageHeader title="রিপোর্ট" /> <ProjectSelector /> <div className="px-4"> <MonthPicker value={month} onChange={setMonth} /> </div> {!rows ? ( <p className="px-4 text-muted">লোড হচ্ছে...</p> ) : ( <> <section aria-label="মাসের মোট" className="mx-4 flex flex-col gap-3 rounded-lg border-2 border-border p-4" > <Bar label="খরচ" value={sum.expense} max={Math.max(sum.expense, sum.income, 1)} tone="bg-danger" /> <Bar label="আয়" value={sum.income} max={Math.max(sum.expense, sum.income, 1)} tone="bg-primary" /> <div className="flex items-center justify-between border-t-2 border-border pt-3"> <span className="font-semibold">{sum.balance >= 0 ? "লাভ" : "ক্ষতি"}</span> <span className={
- [ ] }> {formatBalance(sum.balance)} </span> </div> </section> {empty ? ( <div className="px-4"> <EmptyState>{formatMonth(month)} মাসে কোনো হিসাব নেই।</EmptyState> </div> ) : ( <> <Categories title="খরচের খাত" lines={byCategory(monthRows, "EXPENSE")} tone="bg-danger" /> <Categories title="আয়ের খাত" lines={byCategory(monthRows, "INCOME")} tone="bg-primary" /> {selected === "all" && projectLines.length > 0 && ( <section className="mx-4 flex flex-col gap-2"> <h2 className="text-lg font-bold">প্রজেক্ট অনুযায়ী</h2> <ul className="flex flex-col gap-2"> {projectLines.map((p) => ( <li key={p.projectId} className="rounded-lg border-2 border-border px-4 py-3"> <p className="font-semibold">{projectName.get(p.projectId)}</p> <p className="flex flex-wrap justify-between gap-x-4 text-sm"> <span className="text-danger">খরচ {formatAmount(p.expense)}</span> <span className="text-primary">আয় {formatAmount(p.income)}</span> <span className="font-semibold">{formatBalance(p.balance)}</span> </p> </li> ))} </ul> </section> )} </> )} <section className="mx-4 flex flex-col gap-2"> <h2 className="text-lg font-bold">গত ছয় মাস</h2> <ul className="flex flex-col gap-3"> {trend.map((m) => ( <li key={m.month} className="flex flex-col gap-1 rounded-lg border-2 border-border px-4 py-3"> <span className="flex justify-between font-semibold"> <span>{formatMonth(m.month)}</span> <span className={m.balance >= 0 ? "text-primary" : "text-danger"}> {formatBalance(m.balance)} </span> </span> <MiniBar value={m.expense} max={trendMax} tone="bg-danger" label={

## Settings

- [ ] লগআউট করতে ইন্টারনেট লাগবে।
- [ ] মালিক
- [ ] ম্যানেজার
- [ ] সিঙ্ক
- [ ] এখনই সিঙ্ক করুন
- [ ] সংখ্যা দেখানো
- [ ] label="সংখ্যা দেখানো" options=
- [ ] বাংলা ১২৩
- [ ] ইংরেজি 123
- [ ] অ্যাপ ইনস্টল করুন
- [ ] ব্যবহারকারী
- [ ] লগআউট

## Settings: projects (owner)

- [ ] কোনো ম্যানেজার নেই।
- [ ] + নতুন প্রজেক্ট
- [ ] প্রজেক্টের নাম
- [ ] তৈরি করুন
- [ ] বাতিল
- [ ] চালু
- [ ] আর্কাইভ
- [ ] নাম
- [ ] সংরক্ষণ হয়েছে।
- [ ] প্রজেক্টটি আর্কাইভ করবেন? পুরনো হিসাব দেখা যাবে, নতুন কিছু যোগ করা যাবে না।
- [ ] আর্কাইভ করুন
- [ ] আবার চালু করুন

## Settings: users (owner)

- [ ] নাম, সঠিক ফোন নম্বর এবং কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড দিন।
- [ ] + নতুন ব্যবহারকারী
- [ ] পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)
- [ ] ভূমিকা
- [ ] যোগ করুন
- [ ] পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।
- [ ] (আপনি)
- [ ] নতুন পাসওয়ার্ড (বদলাতে চাইলে)

## Categories and work types

- [ ] মজুরি
- [ ] সার
- [ ] ওষুধ/স্প্রে
- [ ] বীজ/চারা
- [ ] পরিবহন
- [ ] সেচ
- [ ] যন্ত্রপাতি
- [ ] অন্যান্য
- [ ] বিক্রি
- [ ] আগাছা পরিষ্কার
- [ ] সার দেওয়া
- [ ] স্প্রে
- [ ] সংগ্রহ
- [ ] ছাঁটাই

## Error messages

- [ ] অনুরোধটি ঠিক নেই। আবার চেষ্টা করুন।
- [ ] তথ্যগুলো ঠিকমতো পূরণ করুন।
- [ ] ফোন নম্বর বা পাসওয়ার্ড ভুল।
- [ ] বারবার ভুল পাসওয়ার্ড দেওয়া হয়েছে। ১৫ মিনিট পরে আবার চেষ্টা করুন।
- [ ] আবার লগইন করুন।
- [ ] এই কাজের অনুমতি আপনার নেই।
- [ ] এই এন্ট্রিটি অন্য প্রজেক্টে আছে।
- [ ] এই এন্ট্রিটি মুছে ফেলা হয়েছে।
- [ ] এই প্রজেক্টটি আর্কাইভ করা। এখানে নতুন কিছু যোগ বা বদল করা যাবে না।
- [ ] এই ফোন নম্বরে আগেই একজন ব্যবহারকারী আছেন।
- [ ] অন্তত একজন মালিক থাকতে হবে।
- [ ] ইন্টারনেট সংযোগ নেই। সংযোগ পেলে আবার চেষ্টা করুন।
- [ ] কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।
