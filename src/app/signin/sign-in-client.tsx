"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

const HAUSFARBEN = [
  "#D22630",
  "#ED8B00",
  "#FFD100",
  "#84BD00",
  "#008EAA",
  "#00677F",
  "#A50050",
];

const STYLES = `
  *, *::before, *::after { box-sizing: border-box; }

  .bu-page {
    --font-sans: var(--font-barlow, "Barlow Semi Condensed", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif);
    --t-bg:           #FAF8F3;
    --t-surface:      #ffffff;
    --t-text:         #000000;
    --t-muted:        #6B6B6B;
    --t-border:       #E6E6E6;
    --t-border-strong:#000000;
    --t-logo-bg:      #000000;
    --t-logo-fg:      #ffffff;
    --t-hdr-bg:       #ffffff;
    --t-ftr-bg:       #ffffff;
    --t-accent:       #D22630;
    min-height: 100vh;
    display: grid;
    grid-template-rows: auto 1fr auto;
    background: var(--t-bg);
    color: var(--t-text);
    font-family: var(--font-sans);
    transition: background 200ms, color 200ms;
  }
  .bu-page.dark {
    --t-bg:           #0F0F0F;
    --t-surface:      #1F1F1F;
    --t-text:         #F0EDE8;
    --t-muted:        #888888;
    --t-border:       #2E2E2E;
    --t-border-strong:#555555;
    --t-logo-bg:      #F0EDE8;
    --t-logo-fg:      #0F0F0F;
    --t-hdr-bg:       #1A1A1A;
    --t-ftr-bg:       #1A1A1A;
  }

  /* Header */
  .bu-hdr {
    display: flex;
    align-items: stretch;
    justify-content: space-between;
    border-bottom: 1px solid var(--t-border-strong);
    background: var(--t-hdr-bg);
    transition: background 200ms;
  }
  .bu-hdr-brand { display: flex; align-items: stretch; }
  .bu-hdr-logo {
    background: var(--t-logo-bg);
    color: var(--t-logo-fg);
    padding: 14px 24px;
    font-weight: 700;
    font-size: 13px;
    line-height: 1.1;
    transition: background 200ms, color 200ms;
    white-space: nowrap;
  }
  .bu-hdr-title {
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 0 20px;
  }
  .bu-hdr-title .t { font-size: 15px; font-weight: 700; }
  .bu-hdr-title .s { font-size: 11px; color: var(--t-muted); margin-top: 1px; }
  .bu-hdr-actions { display: flex; align-items: stretch; }
  .bu-dark-btn {
    background: var(--t-hdr-bg);
    border: none;
    border-left: 1px solid var(--t-border);
    font-family: inherit;
    cursor: pointer;
    color: var(--t-text);
    transition: background 200ms, color 200ms;
    display: flex;
    align-items: center;
    padding: 0 14px;
  }
  .bu-dark-btn.active {
    background: var(--t-text);
    color: var(--t-surface);
  }
  .bu-dark-btn svg { display: block; }

  /* Stage */
  .bu-stage {
    position: relative;
    max-width: 1280px;
    margin: 0 auto;
    padding: 64px;
    display: grid;
    grid-template-columns: 1fr 520px;
    gap: 80px;
    align-items: center;
  }

  /* Hero */
  .bu-hero { display: flex; flex-direction: column; }
  .bu-eyebrow {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: .08em;
    color: var(--t-text);
    text-transform: uppercase;
    margin: 0;
  }
  .bu-rule {
    height: 2px;
    background: var(--t-text);
    margin: 14px 0 24px;
    width: 72px;
    transition: background 200ms;
    border: none;
  }
  .bu-display {
    font-size: clamp(80px, 11vw, 168px);
    font-weight: 800;
    line-height: .85;
    letter-spacing: -.035em;
    color: var(--t-text);
    margin: 0;
  }
  .bu-display .accent { display: block; }
  .bu-lede {
    font-size: 18px;
    line-height: 1.4;
    max-width: 34ch;
    margin-top: 24px;
    color: var(--t-text);
  }
  .bu-primitives {
    display: flex;
    gap: 20px;
    align-items: flex-end;
    margin-top: 32px;
  }
  .bu-circle { width: 44px; height: 44px; background: #00677F; border-radius: 50%; }
  .bu-square { width: 44px; height: 44px; background: #D22630; }

  /* Form card */
  .bu-card {
    background: var(--t-surface);
    border: 1px solid var(--t-border-strong);
    padding: 40px;
    align-self: center;
    transition: background 200ms, border-color 200ms;
  }
  .bu-form-eyebrow {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: .08em;
    text-transform: uppercase;
    color: var(--t-muted);
    margin: 0 0 8px;
  }
  .bu-form-title {
    font-size: 36px;
    font-weight: 700;
    line-height: 1;
    letter-spacing: -.01em;
    margin: 0 0 28px;
    color: var(--t-text);
  }
  .bu-field { margin-bottom: 18px; }
  .bu-field label {
    display: block;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: .08em;
    text-transform: uppercase;
    color: var(--t-muted);
    margin-bottom: 6px;
  }
  .bu-field input {
    width: 100%;
    padding: 14px;
    border: 1px solid var(--t-border-strong);
    border-radius: 0;
    font-family: inherit;
    font-size: 15px;
    background: var(--t-surface);
    color: var(--t-text);
    outline: none;
    transition: background 200ms, border-color 200ms, color 200ms;
  }
  .bu-field input:focus-visible {
    outline: 3px solid var(--t-picked, #D22630);
    outline-offset: 2px;
  }
  .bu-submit {
    width: 100%;
    padding: 16px 20px;
    background: var(--t-text);
    color: var(--t-surface);
    border: none;
    font-family: inherit;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    margin-top: 12px;
    transition: background 200ms, color 200ms;
    letter-spacing: .02em;
  }
  .bu-submit:hover:not(:disabled) {
    background: var(--t-picked, #D22630);
    color: #fff;
  }
  .bu-submit:disabled { opacity: .6; cursor: not-allowed; }
  .bu-submit:focus-visible {
    outline: 3px solid var(--t-picked, #D22630);
    outline-offset: 2px;
  }
  .bu-alt-links {
    margin-top: 18px;
    padding-top: 18px;
    border-top: 1px solid var(--t-border);
    display: flex;
    justify-content: space-between;
    font-size: 13px;
  }
  .bu-alt-links a { text-decoration: none; color: var(--t-muted); }
  .bu-err {
    padding: 10px 12px;
    border: 1px solid var(--t-accent);
    border-left: 4px solid var(--t-accent);
    color: var(--t-text);
    font-size: 13px;
    margin-bottom: 16px;
    background: var(--t-surface);
  }

  /* Footer */
  .bu-ftr {
    display: flex;
    gap: 24px;
    font-size: 12px;
    color: var(--t-muted);
    padding: 16px 64px;
    border-top: 1px solid var(--t-border);
    background: var(--t-ftr-bg);
    transition: background 200ms;
  }
  .bu-ftr a { color: var(--t-muted); text-decoration: none; }
  .bu-ftr .spacer { flex: 1; }

  /* Responsive */
  @media (max-width: 960px) {
    .bu-stage {
      grid-template-columns: 1fr;
      padding: 32px 24px;
      gap: 40px;
    }
    .bu-card { align-self: stretch; }
    .bu-hdr-logo { padding: 12px 16px; font-size: 12px; }
    .bu-ftr { padding: 16px 24px; flex-wrap: wrap; }
  }
`;

export default function SignInClient() {
  const [uid, setUid] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [dark, setDark] = useState(false);
  const [accentColor] = useState(
    () => HAUSFARBEN[Math.floor(Math.random() * HAUSFARBEN.length)],
  );
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const year = new Date().getFullYear();

  useEffect(() => {
    setDark(localStorage.getItem("bf-dark") === "1");
  }, []);

  function toggleDark() {
    const next = !dark;
    setDark(next);
    localStorage.setItem("bf-dark", next ? "1" : "0");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const result = await signIn("credentials", {
      uid,
      email: uid,
      password,
      redirect: false,
      callbackUrl,
    });

    setPending(false);

    if (!result?.ok) {
      setError("Invalid username or password. Please try again.");
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  const cssVars = {
    "--t-picked": accentColor,
  } as React.CSSProperties;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div className={`bu-page${dark ? " dark" : ""}`} style={cssVars}>

        {/* Header */}
        <header className="bu-hdr">
          <div className="bu-hdr-brand">
            <div className="bu-hdr-logo">
              Bauhaus-Universität<br />Weimar
            </div>
            <div className="bu-hdr-title">
              <div className="t">Bauhaus Forms</div>
              <div className="s">University Communications</div>
            </div>
          </div>
          <div className="bu-hdr-actions">
            <button
              className={`bu-dark-btn${dark ? " active" : ""}`}
              aria-label="Dark mode"
              title="Dark mode"
              onClick={toggleDark}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
              </svg>
            </button>
          </div>
        </header>

        {/* Stage */}
        <main className="bu-stage">
          {/* Left: typographic hero */}
          <div className="bu-hero">
            <div>
              <p className="bu-eyebrow">{year} · Sign in</p>
              <hr className="bu-rule" />
              <p className="bu-display">
                <span>Sign</span>
                <span className="accent" style={{ color: accentColor }}>in.</span>
              </p>
              <p className="bu-lede">
                »Bauhaus Forms« — Workflow system of the Bauhaus-Universität Weimar.
              </p>
            </div>
            <div className="bu-primitives">
              <div className="bu-circle" />
              <div className="bu-square" />
              <svg width="44" height="44" viewBox="0 0 40 40">
                <polygon points="20,2 38,36 2,36" fill="#FFD100" />
              </svg>
            </div>
          </div>

          {/* Right: form card */}
          <form className="bu-card" onSubmit={handleSubmit}>
            <p className="bu-form-eyebrow">Authentication · LDAP</p>
            <h1 className="bu-form-title">Access</h1>

            {error && <div className="bu-err">{error}</div>}

            <div className="bu-field">
              <label htmlFor="uid">Username</label>
              <input
                id="uid"
                type="text"
                value={uid}
                onChange={(e) => setUid(e.target.value)}
                placeholder="max.mustermann"
                autoComplete="username"
                autoFocus
                required
              />
            </div>
            <div className="bu-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            <button type="submit" className="bu-submit" disabled={pending}>
              {pending ? "Signing in…" : "Sign in →"}
            </button>

            <div className="bu-alt-links">
              <a href="#">Help</a>
            </div>
          </form>
        </main>

        {/* Footer */}
        <footer className="bu-ftr">
          <span>Bauhaus-Universität Weimar · University Communications</span>
          <span className="spacer" />
          <a href="#">Imprint</a>
          <a href="#">Privacy</a>
          <a href="#">Accessibility</a>
        </footer>

      </div>
    </>
  );
}
