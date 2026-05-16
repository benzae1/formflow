import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function BreakGlassGate({
  action,
  backHref,
  dictionary,
}: {
  action: string;
  backHref: string;
  dictionary: Dictionary;
}) {
  const d = dictionary.submissions;

  return (
    <div className="bf-stack">
      <PageHeader
        eyebrow={d.breakGlassEyebrow}
        title={d.breakGlassTitle}
        description={d.breakGlassDescription}
      />

      <section className="bf-panel p-6 max-w-2xl">
        <form method="get" action={action}>
          <label className="block text-sm font-semibold text-[var(--ink)] mb-2">
            {d.breakGlassLabel}
          </label>
          <textarea
            name="reason"
            className="bf-textarea w-full"
            placeholder={d.breakGlassPlaceholder}
            minLength={10}
            required
            rows={4}
          />
          <div className="bf-action-row mt-4">
            <button type="submit" className="bf-btn bf-btn-primary">
              {d.breakGlassSubmit}
            </button>
            <Link href={backHref} className="bf-btn">
              {d.breakGlassCancel}
            </Link>
          </div>
        </form>
      </section>
    </div>
  );
}
