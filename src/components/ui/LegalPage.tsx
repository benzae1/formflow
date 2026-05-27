import Link from "next/link";
import { PageHeader } from "./PageHeader";

type Section = {
  title: string;
  body: string[];
};

export function LegalPage({
  eyebrow,
  title,
  description,
  sections,
  backHref,
  backLabel,
}: {
  eyebrow: string;
  title: string;
  description: string;
  sections: Section[];
  backHref: string;
  backLabel: string;
}) {
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
      <PageHeader eyebrow={eyebrow} title={title} description={description}>
        <Link href={backHref} className="bf-btn">
          {backLabel}
        </Link>
      </PageHeader>

      <section className="bf-panel p-6">
        <div className="bf-legal-stack">
          {sections.map((section) => (
            <article key={section.title}>
              <h2 className="text-[24px] font-extrabold leading-none">{section.title}</h2>
              <div className="mt-4 flex flex-col gap-3">
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="bf-copy m-0">
                    {paragraph}
                  </p>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
