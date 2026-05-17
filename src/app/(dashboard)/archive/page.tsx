import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

type UserRole = Database["public"]["Enums"]["user_role"];

export const metadata = { title: "Архива — STGS" };

const ARCHIVE_ROLES: UserRole[] = ["archive", "it_admin"];

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !ARCHIVE_ROLES.includes(profile.role as UserRole)) {
    redirect("/applicant");
  }

  const q = searchParams.q?.trim() ?? "";

  let query = supabase
    .from("applications")
    .select(
      "id, conference_name, conference_location, travel_start_date, travel_end_date, approved_amount, archive_number, updated_at, applicant_id"
    )
    .eq("status", "closed")
    .order("updated_at", { ascending: false });

  if (q) {
    query = query.or(
      `archive_number.ilike.%${q}%,conference_name.ilike.%${q}%`
    );
  }

  const { data: applications } = await query;

  const applicantIds = Array.from(
    new Set((applications ?? []).map((a) => a.applicant_id))
  );
  const { data: applicantProfiles } = applicantIds.length
    ? await supabase
        .from("profiles")
        .select("id, first_name, last_name, title")
        .in("id", applicantIds)
    : { data: [] };

  const profileMap = Object.fromEntries(
    (applicantProfiles ?? []).map((p) => [p.id, p])
  );

  // Filter by applicant name if search matches
  const filtered = q
    ? (applications ?? []).filter((app) => {
        const p = profileMap[app.applicant_id];
        const fullName = p ? `${p.first_name} ${p.last_name}`.toLowerCase() : "";
        const qLow = q.toLowerCase();
        return (
          (app.archive_number ?? "").toLowerCase().includes(qLow) ||
          app.conference_name.toLowerCase().includes(qLow) ||
          fullName.includes(qLow)
        );
      })
    : (applications ?? []);

  return (
    <div className="p-8 max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Архива</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Затворени апликации со доделен архивски број
        </p>
      </div>

      {/* Search */}
      <form method="get" className="flex gap-3">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Пребарај по архивски број, конференција или апликант…"
          className="flex-1 px-3 py-2 border border-input rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Пребарај
        </button>
        {q && (
          <a
            href="/archive"
            className="px-4 py-2 border border-border rounded-md text-sm text-muted-foreground hover:bg-accent transition-colors"
          >
            Исчисти
          </a>
        )}
      </form>

      {filtered.length === 0 ? (
        <div className="border border-border rounded-lg bg-card p-12 text-center">
          <p className="text-muted-foreground text-sm">
            {q ? `Нема резултати за „${q}".` : "Нема затворени апликации во архивата."}
          </p>
        </div>
      ) : (
        <div className="border border-border rounded-lg bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 font-medium whitespace-nowrap">
                  Архивски број
                </th>
                <th className="text-left px-4 py-3 font-medium">Апликант</th>
                <th className="text-left px-4 py-3 font-medium">Конференција</th>
                <th className="text-left px-4 py-3 font-medium whitespace-nowrap">
                  Датуми на патување
                </th>
                <th className="text-right px-4 py-3 font-medium whitespace-nowrap">
                  Одобрено (МКД)
                </th>
                <th className="text-left px-4 py-3 font-medium whitespace-nowrap">
                  Затворена
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((app) => {
                const p = profileMap[app.applicant_id];
                return (
                  <tr
                    key={app.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-semibold tracking-wide text-primary">
                        {app.archive_number ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">
                        {p ? `${p.first_name} ${p.last_name}` : "—"}
                      </p>
                      {p?.title && (
                        <p className="text-xs text-muted-foreground">{p.title}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{app.conference_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {app.conference_location}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {app.travel_start_date} → {app.travel_end_date}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {Number(app.approved_amount ?? 0).toLocaleString("mk-MK")}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(app.updated_at).toLocaleDateString("mk-MK")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-border bg-muted/20 text-xs text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "запис" : "записи"}
            {q ? ` за „${q}"` : " вкупно"}
          </div>
        </div>
      )}
    </div>
  );
}
