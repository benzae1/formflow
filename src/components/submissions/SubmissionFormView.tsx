type SchemaComponent = {
  key?: string;
  label?: string;
  components?: SchemaComponent[];
  columns?: Array<{ components?: SchemaComponent[] }>;
};

function collectLabels(components?: SchemaComponent[], labels: Record<string, string> = {}) {
  if (!components) return labels;

  for (const component of components) {
    if (component.key) {
      labels[component.key] = component.label ?? component.key;
    }

    if (component.components) {
      collectLabels(component.components, labels);
    }

    if (component.columns) {
      for (const column of component.columns) {
        collectLabels(column.components, labels);
      }
    }
  }

  return labels;
}

function renderValue(value: unknown) {
  if (value === null || value === undefined) {
    return <span className="text-[var(--muted)]">Restricted or not provided</span>;
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  return (
    <pre className="overflow-x-auto whitespace-pre-wrap bg-[var(--canvas)] px-3 py-3 text-xs leading-6 text-[var(--ink)]">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export function SubmissionFormView({
  schema,
  data,
}: {
  schema: Record<string, unknown>;
  data: Record<string, unknown>;
}) {
  const labels = collectLabels(
    Array.isArray(schema.components)
      ? (schema.components as SchemaComponent[])
      : undefined,
  );

  const entries = Object.entries(data);

  if (entries.length === 0) {
    return (
      <div className=" border border-dashed border-[var(--line)] bg-white px-4 py-8 text-center text-sm text-[var(--muted)]">
        No response data has been stored yet.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {entries.map(([key, value]) => (
        <article
          key={key}
          className=" border border-[var(--line)] bg-white px-4 py-4"
        >
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
            {labels[key] ?? key}
          </p>
          <div className="mt-3 text-sm leading-7 text-[var(--ink)]">
            {renderValue(value)}
          </div>
        </article>
      ))}
    </div>
  );
}
