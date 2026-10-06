import { SALARY_CURRENCIES } from "@/lib/salary";

const inputClass =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400";

// Required salary inputs, shared by the new-job form and the legacy
// "add a salary range" prompt so both validate identically.
export default function SalaryFields({
  defaultMin,
  defaultMax,
  defaultCurrency = "USD",
}: {
  defaultMin?: number | null;
  defaultMax?: number | null;
  defaultCurrency?: string | null;
} = {}) {
  return (
    <div className="grid grid-cols-[1fr_1fr_110px] gap-3">
      <div>
        <label className="block text-xs font-medium text-zinc-600 mb-1">Minimum</label>
        <input name="salaryMin" type="number" min={1} step={1} required placeholder="90000" defaultValue={defaultMin ?? undefined} className={inputClass} />
      </div>
      <div>
        <label className="block text-xs font-medium text-zinc-600 mb-1">Maximum</label>
        <input name="salaryMax" type="number" min={1} step={1} required placeholder="120000" defaultValue={defaultMax ?? undefined} className={inputClass} />
      </div>
      <div>
        <label className="block text-xs font-medium text-zinc-600 mb-1">Currency</label>
        <select name="salaryCurrency" defaultValue={defaultCurrency ?? "USD"} className={`${inputClass} bg-white`}>
          {SALARY_CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
