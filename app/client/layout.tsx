import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../src/lib/supabase-server";
import LogoutButton from "../components/logout-button";

const navItems = [
  { label: "Dashboard", href: "/client/dashboard" },
  { label: "Orders", href: "/client/dashboard/orders" },
  { label: "New Order", href: "/client/dashboard/orders/new" },
  { label: "Messages", href: "/client/dashboard/messages" },
  { label: "Billing", href: "/client/dashboard/billing" },
];

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name, role, is_active")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "client" || !profile.is_active) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">
        {/* Desktop sidebar */}
        <aside className="hidden w-64 shrink-0 border-r border-slate-300 bg-white md:block">
          <div className="border-b border-slate-300 p-5">
            <p className="font-bold text-slate-950">
              Indiana Notary Solutions
            </p>
            <p className="mt-2 text-sm text-slate-600">{profile.email}</p>
          </div>

          <nav className="space-y-2 p-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-950"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 flex-1">
          {/* Mobile header */}
          <header className="border-b border-slate-300 bg-white md:hidden">
            <div className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate font-bold text-slate-950">
                  Indiana Notary Solutions
                </p>
                <p className="truncate text-sm text-slate-600">
                  {profile.email}
                </p>
              </div>

              <LogoutButton />
            </div>

            <details className="border-t border-slate-200 p-4">
              <summary className="inline-flex cursor-pointer rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
                Menu
              </summary>

              <nav className="mt-4 grid gap-2">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </details>
          </header>

          {/* Desktop top bar */}
          <header className="hidden border-b border-slate-300 bg-white px-6 py-4 md:flex md:items-center md:justify-between">
            <div>
              <p className="text-sm text-slate-500">Client Portal</p>
              <p className="font-semibold text-slate-900">
                {profile.full_name || profile.email}
              </p>
            </div>

            <LogoutButton />
          </header>

          <main className="p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}