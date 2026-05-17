"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const DEMO_USERS = {
  applicant: {
    email: "demo.applicant@finki.ukim.edu.mk",
    password: "Demo@Finki2026",
    redirect: "/applicant",
    label: "Демо најава (Апликант)",
    sublabel: "Вонреден Професор · Марија Петровска",
  },
  council: {
    email: "demo.council@finki.ukim.edu.mk",
    password: "Demo@Finki2026",
    redirect: "/review",
    label: "Демо најава (Совет)",
    sublabel: "Претседател на Научен совет · Илија Николовски",
  },
  deanery: {
    email: "demo.dekanat@finki.ukim.edu.mk",
    password: "Demo@Finki2026",
    redirect: "/review",
    label: "Демо најава (Деканат)",
    sublabel: "Декан · Александар Ристески",
  },
  accountant: {
    email: "demo.accountant@finki.ukim.edu.mk",
    password: "Demo@Finki2026",
    redirect: "/accounting",
    label: "Демо најава (Сметководство)",
    sublabel: "Сметководител · Снежана Јованова",
  },
  archive: {
    email: "demo.archive@finki.ukim.edu.mk",
    password: "Demo@Finki2026",
    redirect: "/archive",
    label: "Демо најава (Архива)",
    sublabel: "Архивар · Бранко Стојановски",
  },
  hr: {
    email: "demo.hr@finki.ukim.edu.mk",
    password: "Demo@Finki2026",
    redirect: "/hr",
    label: "Демо најава (Човечки ресурси)",
    sublabel: "Раководител на ЧР · Марко Димитриевски",
  },
} as const;

// Role-card visual metadata
const ROLE_DOT: Record<string, string> = {
  applicant:  "bg-blue-500",
  council:    "bg-amber-500",
  deanery:    "bg-violet-500",
  accountant: "bg-emerald-500",
  archive:    "bg-slate-400",
  hr:         "bg-teal-500",
};

const ROLE_TEXT: Record<string, string> = {
  applicant:  "text-blue-600",
  council:    "text-amber-600",
  deanery:    "text-violet-600",
  accountant: "text-emerald-600",
  archive:    "text-slate-500",
  hr:         "text-teal-600",
};

const ROLE_SHORT: Record<string, string> = {
  applicant:  "Апликант",
  council:    "Научен совет",
  deanery:    "Деканат",
  accountant: "Сметководство",
  archive:    "Архива",
  hr:         "Чов. ресурси",
};

const FEATURES = [
  "12-статусен дигитален животен циклус",
  "Мулти-ниво одобрување со дигитален потпис",
  "OCR автоматска верификација на трошоци",
  "PostgreSQL RLS безбедносен модел",
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<keyof typeof DEMO_USERS | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/applicant");
      router.refresh();
    }
  }

  async function handleDemoLogin(key: keyof typeof DEMO_USERS) {
    setError(null);
    setDemoLoading(key);

    const { email, password, redirect } = DEMO_USERS[key];
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setDemoLoading(null);
    } else {
      router.push(redirect);
      router.refresh();
    }
  }

  const anyLoading = loading || demoLoading !== null;

  return (
    <div className="h-screen flex overflow-hidden">

      {/* ═══════════════════════════════════════════════════
          LEFT PANEL — dark brand side
      ═══════════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-[45%] relative flex-col justify-between p-12 overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950">

        {/* Organic glow blobs */}
        <div className="absolute -top-20 -left-20 w-[480px] h-[480px] rounded-full bg-indigo-600/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-violet-600/15 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-2/3 w-56 h-56 rounded-full bg-blue-400/10 blur-2xl pointer-events-none" />

        {/* Dot grid texture */}
        <div
          className="absolute inset-0 opacity-[0.045] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* Panel-wide shimmer sweep */}
        <div
          className="pointer-events-none absolute inset-0 animate-[shimmer_9s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/[0.04] to-transparent"
          aria-hidden="true"
        />

        {/* Giant STGS watermark */}
        <div className="absolute bottom-0 right-0 text-[168px] font-black leading-none tracking-tighter text-white/[0.04] select-none pointer-events-none">
          STGS
        </div>

        {/* ── Top: badge + title ── */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/10 border border-white/15 mb-10">
            <div className="w-5 h-5 rounded-md bg-indigo-400/80 flex items-center justify-center shrink-0">
              <span className="text-[8px] font-black text-white tracking-tight">ГН</span>
            </div>
            <span className="text-xs font-semibold text-white/75 tracking-wide">
              ФИНКИ — Универзитет „Св. Кирил и Методиј"
            </span>
          </div>

          {/* Title with its own shimmer */}
          <div className="relative overflow-hidden">
            <h1 className="text-[2.4rem] font-extrabold text-white leading-tight tracking-tight">
              Систем за управување
              <br />
              со грантови за
              <br />
              <span className="text-indigo-300">научни патувања</span>
            </h1>
            <div
              className="pointer-events-none absolute inset-0 animate-[shimmer_4.5s_ease-in-out_1.5s_infinite] bg-gradient-to-r from-transparent via-white/[0.13] to-transparent"
              aria-hidden="true"
            />
          </div>

          <div className="flex items-center gap-2.5 mt-5">
            <span className="font-mono text-sm font-black tracking-[0.35em] text-white/35">
              STGS
            </span>
            <span className="w-1 h-1 rounded-full bg-white/25" />
            <span className="text-sm text-white/35">v2026</span>
          </div>
        </div>

        {/* ── Middle: feature list ── */}
        <div className="relative z-10 space-y-3.5">
          {FEATURES.map((feature) => (
            <div key={feature} className="flex items-center gap-3.5">
              <div className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center shrink-0">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              </div>
              <span className="text-sm text-white/60">{feature}</span>
            </div>
          ))}
        </div>

        {/* ── Bottom: institution credits ── */}
        <div className="relative z-10 space-y-0.5">
          <p className="text-xs text-white/28 leading-relaxed">
            Факултет за компјутерски науки и инженерство
          </p>
          <p className="text-xs text-white/28">
            Универзитет „Св. Кирил и Методиј" — Скопје
          </p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          RIGHT PANEL — login interface
      ═══════════════════════════════════════════════════ */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-12 bg-background overflow-y-auto">
        <div className="w-full max-w-lg">

          {/* Mobile-only header (hidden on desktop where left panel shows) */}
          <div className="lg:hidden text-center mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
              ФИНКИ — УКИМ
            </p>
            <h1 className="text-xl font-bold">STGS</h1>
          </div>

          {/* ── Login form ── */}
          <div className="mb-7">
            <h2 className="text-2xl font-bold text-foreground tracking-tight">Најавете се</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Внесете ги вашите iKnow акредитиви
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 mb-8">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-semibold">
                Е-пошта
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={anyLoading}
                className="w-full px-4 py-2.5 border border-input rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 transition-shadow"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-semibold">
                Лозинка
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={anyLoading}
                className="w-full px-4 py-2.5 border border-input rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 transition-shadow"
              />
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={anyLoading}
              className="w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 transition-all shadow-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Најавување…
                </>
              ) : (
                "Најави се"
              )}
            </button>
          </form>

          {/* ── Demo section divider ── */}
          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-4 text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
                Пристап за презентација
              </span>
            </div>
          </div>

          {/* ── Demo account grid ── */}
          <div className="grid grid-cols-2 gap-3">
            {(
              ["applicant", "council", "deanery", "accountant", "archive", "hr"] as const
            ).map((key) => {
              const user = DEMO_USERS[key];
              const dotIdx = user.sublabel.indexOf(" · ");
              const title = dotIdx !== -1 ? user.sublabel.slice(0, dotIdx) : "";
              const name  = dotIdx !== -1 ? user.sublabel.slice(dotIdx + 3) : user.sublabel;
              const isThis = demoLoading === key;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleDemoLogin(key)}
                  disabled={anyLoading}
                  className="relative text-left p-4 rounded-xl border-2 border-border/70 bg-muted/20 hover:border-primary/40 hover:bg-primary/[0.04] hover:shadow-md active:scale-[0.97] transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {/* Role indicator row */}
                  <div className="flex items-center gap-2 mb-2.5">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${ROLE_DOT[key]}`}
                    />
                    <span
                      className={`text-[9px] font-extrabold uppercase tracking-[0.18em] ${ROLE_TEXT[key]}`}
                    >
                      {ROLE_SHORT[key]}
                    </span>
                  </div>

                  {/* Name */}
                  <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors leading-snug">
                    {name}
                  </p>

                  {/* Title/role description */}
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                    {title}
                  </p>

                  {/* Loading overlay */}
                  {isThis && (
                    <div className="absolute inset-0 rounded-[10px] bg-background/90 backdrop-blur-sm flex items-center justify-center">
                      <span className="flex items-center gap-2 text-xs font-semibold text-primary">
                        <span className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                        Најавување…
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground mt-6">
            Продукциска автентикација преку iKnow SSO на ФИНКИ
          </p>
        </div>
      </div>
    </div>
  );
}
