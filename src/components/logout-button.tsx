"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground border border-transparent hover:border-destructive/40 hover:text-destructive hover:bg-destructive/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors group"
    >
      <LogOut
        size={15}
        className="shrink-0 transition-transform group-hover:-translate-x-0.5"
      />
      {loading ? "Одјавување..." : "Одјави се"}
    </button>
  );
}
