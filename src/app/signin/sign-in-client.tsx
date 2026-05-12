"use client";

import { FormEvent, type CSSProperties, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { PrimitiveMark } from "@/components/ui/Bauhaus";

const ACCENT_COLOR = "#A50050";

const STYLES = `
  *, *::before, *::after { box-sizing: border-box; }

  .bu-page {
    --font-sans: var(--font-barlow, "Barlow Semi Condensed", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif);
    --t-bg: #FAF8F3;
    --t-surface: #ffffff;
    --t-text: #000000;
    --t-muted: #4B4B4B;
    --t-border: #000000;
    min-height: 100vh;
    display: grid;
    grid-template-rows: auto 1fr auto;
    background: var(--t-bg);
    color: var(--t-text);
    font-family: var(--font-sans);
  }
  .bu-hdr {
    display: flex;
    align-items: stretch;
    justify-content: space-between;
    border-bottom: 1px solid var(--t-border);
    background: var(--t-surface);
  }
  .bu-hdr-brand { display: flex; align-items: stretch; }
  .bu-hdr-logo {
    background: #000;
    color: #fff;
    padding: 14px 24px;
    font-weight: 700;
    font-size: 13px;
    line-height: 1.1;
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

  .bu-hero { display: flex; flex-direction: column; }
  .bu-eyebrow {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: .12em;
    color: var(--t-text);
    text-transform: uppercase;
    margin: 0;
  }
  .bu-rule {
    height: 2px;
    background: var(--t-text);
    margin: 14px 0 24px;
    width: 72px;
    border: none;
  }
  .bu-display {
    font-size: clamp(80px, 11vw, 168px);
    font-weight: 800;
    line-height: .85;
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

  .bu-card {
    background: var(--t-surface);
    border: 1px solid var(--t-border);
    padding: 40px;
    align-self: center;
  }
  .bu-form-eyebrow {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: .12em;
    text-transform: uppercase;
    color: var(--t-muted);
    margin: 0 0 8px;
  }
  .bu-form-title {
    font-size: 36px;
    font-weight: 800;
    line-height: 1;
    margin: 0 0 28px;
    color: var(--t-text);
  }
  .bu-field { margin-bottom: 18px; }
  .bu-field label {
    display: block;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: .12em;
    text-transform: uppercase;
    color: var(--t-muted);
    margin-bottom: 6px;
  }
  .bu-field input {
    width: 100%;
    padding: 14px;
    border: 1px solid var(--t-border);
    border-radius: 0;
    font-family: inherit;
    font-size: 15px;
    background: var(--t-surface);
    color: var(--t-text);
    outline: none;
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
    border: 1px solid var(--t-text);
    font-family: inherit;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    margin-top: 12px;
    letter-spacing: .08em;
    text-transform: uppercase;
  }
  .bu-submit:hover:not(:disabled) {
    background: var(--t-picked, #D22630);
    border-color: var(--t-picked, #D22630);
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
    border: 1px solid #D22630;
    border-left: 4px solid #D22630;
    color: var(--t-text);
    font-size: 13px;
    margin-bottom: 16px;
    background: var(--t-surface);
  }

  .bu-ftr {
    display: flex;
    gap: 24px;
    font-size: 12px;
    color: var(--t-muted);
    padding: 16px 64px;
    border-top: 1px solid var(--t-border);
    background: var(--t-surface);
  }
  .bu-ftr a { color: var(--t-muted); text-decoration: none; }
  .bu-ftr .spacer { flex: 1; }

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const year = new Date().getFullYear();
  const accentColor = useMemo(() => ACCENT_COLOR, []);

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
  } as CSSProperties;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div className="bu-page" style={cssVars}>
        <header className="bu-hdr">
          <div className="bu-hdr-brand">
            <div className="bu-hdr-logo">
              Bauhaus-Universitaet
              <br />
              Weimar
            </div>
            <div className="bu-hdr-title">
              <div className="t">Bauhaus Forms</div>
              <div className="s">University Communications</div>
            </div>
          </div>
        </header>

        <main className="bu-stage">
          <div className="bu-hero">
            <div>
              <p className="bu-eyebrow">{year} | Sign in</p>
              <hr className="bu-rule" />
              <p className="bu-display">
                <span>Sign</span>
                <span className="accent" style={{ color: accentColor }}>
                  in.
                </span>
              </p>
              <p className="bu-lede">Bauhaus Forms | Workflow system of the Bauhaus-Universitaet Weimar.</p>
            </div>
            <div className="bu-primitives">
              <PrimitiveMark shape="circle" color="var(--haus-teal)" size={44} />
              <PrimitiveMark shape="square" color="var(--haus-red)" size={44} />
              <PrimitiveMark shape="triangle" color="var(--haus-yellow)" size={44} />
            </div>
          </div>

          <form className="bu-card" onSubmit={handleSubmit}>
            <p className="bu-form-eyebrow">Authentication | LDAP</p>
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
                placeholder="........"
                autoComplete="current-password"
                required
              />
            </div>

            <button type="submit" className="bu-submit" disabled={pending}>
              {pending ? "Signing in..." : "Sign in"}
            </button>

            <div className="bu-alt-links">
              <a href="#">Help</a>
            </div>
          </form>
        </main>

        <footer className="bu-ftr">
          <span>Bauhaus-Universitaet Weimar | University Communications</span>
          <span className="spacer" />
          <a href="#">Imprint</a>
          <a href="#">Privacy</a>
          <a href="#">Accessibility</a>
        </footer>
      </div>
    </>
  );
}
