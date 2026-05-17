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
} as const;

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
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 p-8 border border-border rounded-lg bg-card shadow-sm">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold">STGS — ФИНКИ</h1>
          <p className="text-sm text-muted-foreground">
            Систем за управување со научни грантови
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium">
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
              className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium">
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
              className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <button
            type="submit"
            disabled={anyLoading}
            className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Најавување..." : "Најави се"}
          </button>
        </form>

        {/* Demo login section */}
        <div className="space-y-3">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground tracking-wide">
                Демо пристап
              </span>
            </div>
          </div>

          {(["applicant", "council", "deanery"] as const).map((key) => {
            const user = DEMO_USERS[key];
            const isThis = demoLoading === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleDemoLogin(key)}
                disabled={anyLoading}
                className="w-full flex flex-col items-center gap-0.5 py-3 px-4 border-2 border-primary/30 rounded-md hover:border-primary hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors group"
              >
                <span className="text-sm font-semibold text-primary group-hover:text-primary">
                  {isThis ? "Најавување..." : user.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {user.sublabel}
                </span>
              </button>
            );
          })}
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Најавата е преку iKnow SSO на ФИНКИ
        </p>
      </div>
    </div>
  );
}
