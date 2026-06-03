"use client";

import { supabase } from "../../src/lib/supabase";

export default function LogoutButton() {
  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.assign("/login");
  }

  return (
    <button
      onClick={handleLogout}
      className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
      type="button"
    >
      Logout
    </button>
  );
}