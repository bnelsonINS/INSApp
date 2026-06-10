import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../src/lib/supabase-server";
import LogoutButton from "../components/logout-button";
import DashboardMobileMenu from "./dashboard-mobile-menu";
import NavLinkWithSpinner from "../components/NavLinkWithSpinner";

export default async function DashboardLayout({
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
    .select("email, role, is_active")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin" || !profile.is_active) {
    redirect("/login");
  }

  const navItems = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Users", href: "/dashboard/users" },
    { label: "Orders", href: "/dashboard/orders" },
    { label: "Financials", href: "/dashboard/financials" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-4 shadow-sm md:px-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-lg font-bold text-[#0B1F4D]">
              Indiana Notary Solutions
            </p>

            <p className="mt-1 truncate text-sm text-slate-500">
              {profile.email}
            </p>
          </div>

          <LogoutButton />
        </div>

        <div className="mt-4 md:hidden">
          <DashboardMobileMenu navItems={navItems} />
        </div>
      </header>

      <div className="flex">
        <aside className="hidden min-h-[calc(100vh-81px)] w-72 border-r border-slate-200 bg-white p-4 md:block">
          <div className="rounded-2xl bg-slate-50 p-3">
            <nav className="space-y-2">
              {navItems.map((item) => (
  <NavLinkWithSpinner key={item.href} href={item.href}>
    {item.label}
  </NavLinkWithSpinner>
))}
            </nav>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Admin Access
              </p>

              <p className="mt-2 text-sm font-medium text-slate-700">
                Signed in as
              </p>

              <p className="truncate text-sm text-slate-500">
                {profile.email}
              </p>
            </div>
          </div>
        </aside>

        <main className="w-full flex-1 overflow-x-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}