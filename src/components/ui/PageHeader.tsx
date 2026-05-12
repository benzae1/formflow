export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <header style={{ marginBottom: 40 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 40,
          alignItems: "end",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: ".12em",
              textTransform: "uppercase",
              color: "var(--ink)",
            }}
          >
            {eyebrow}
          </div>
          <div
            style={{
              height: 2,
              background: "var(--ink)",
              margin: "12px 0 20px",
              width: 64,
            }}
          />
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(40px, 5vw, 72px)",
              fontWeight: 800,
              lineHeight: 0.9,
              letterSpacing: "-.03em",
              color: "var(--ink)",
            }}
          >
            {title}
            <span style={{ color: "var(--accent)" }}>.</span>
          </h1>
          {description && (
            <p
              style={{
                fontSize: 15,
                lineHeight: 1.4,
                maxWidth: "44ch",
                marginTop: 16,
                color: "var(--muted)",
              }}
            >
              {description}
            </p>
          )}
        </div>

        {children ? (
          <div style={{ display: "flex", gap: 0 }}>{children}</div>
        ) : null}
      </div>
    </header>
  );
}
