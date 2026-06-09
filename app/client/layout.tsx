import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../src/lib/supabase-server";
import LogoutButton from "../components/logout-button";
import ClientMobileMenu from "../components/client-mobile-menu";

const navItems = [
  { label: "Dashboard", href: "/client/dashboard" },
  { label: "Orders", href: "/client/dashboard/orders" },
  { label: "New Order", href: "/client/dashboard/orders/new" },
  { label: "Messages", href: "/client/dashboard/messages" },
  { label: "Billing", href: "/client/dashboard/billing" },
  { label: "Profile", href: "/client/profile" },
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
    .select("email, full_name, role, is_active, company_name, logo_url")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "client" || !profile.is_active) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white px-4 py-4 md:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            {profile.logo_url ? (
              <Image
                src={profile.logo_url}
                alt="Company Logo"
                width={48}
                height={48}
                className="rounded-xl border border-slate-200 object-contain"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">
                INS
              </div>
            )}

            <div className="min-w-0">
              <p className="truncate font-bold text-slate-950">
                {profile.company_name ||
                  profile.full_name ||
                  "Indiana Notary Solutions"}
              </p>

              <p className="mt-1 truncate text-sm text-slate-600">
                {profile.email}
              </p>
            </div>
          </div>

          <LogoutButton />
        </div>

        <div className="mt-4 md:hidden">
          <ClientMobileMenu navItems={navItems} />
        </div>
      </header>

      <div className="flex">
        <aside className="hidden min-h-[calc(100vh-5rem)] w-64 shrink-0 border-r border-slate-200 bg-white p-4 md:block">
          <nav className="space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-800"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="w-full flex-1 overflow-x-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}