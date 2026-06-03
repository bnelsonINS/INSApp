import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../src/lib/supabase-server";
import LogoutButton from "../components/logout-button";
import DashboardMobileMenu from "./dashboard-mobile-menu";
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
    <div className="min-h-screen bg-slate-100">
      <header className="border-b bg-white px-4 py-4 md:px-8">
        <div className="flex items-center justify-between gap-4">
          <p className="font-semibold">Indiana Notary Solutions</p>
          <LogoutButton />
        </div>

        <p className="mt-2 truncate text-sm text-slate-600">{profile.email}</p>

        <div className="mt-4">
          <DashboardMobileMenu navItems={navItems} />
        </div>
      </header>

      <div className="flex">
        <aside className="hidden min-h-[calc(100vh-4rem)] w-64 border-r bg-white p-4 md:block">
          <nav className="space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="w-full flex-1 overflow-x-auto">{children}</main>
      </div>
    </div>
  );
}