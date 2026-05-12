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
    <header style={{ marginBottom: 24 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 40,
          alignItems: "end",
        }}
      >
        <div>
          <div className="bf-eyebrow">{eyebrow}</div>
          <div className="bf-rule" style={{ margin: "12px 0 20px" }} />
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(40px, 5vw, 72px)",
              fontWeight: 800,
              lineHeight: 0.9,
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
                color: "var(--muted-strong)",
              }}
            >
              {description}
            </p>
          )}
        </div>

        {children ? (
          <div className="bf-action-row">{children}</div>
        ) : null}
      </div>
    </header>
  );
}
