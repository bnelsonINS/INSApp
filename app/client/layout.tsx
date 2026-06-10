import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../src/lib/supabase-server";
import LogoutButton from "../components/logout-button";
import ClientMobileMenu from "../components/client-mobile-menu";
import NavLinkWithSpinner from "../components/NavLinkWithSpinner";

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
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-4 shadow-sm md:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            {profile.logo_url ? (
              <Image
                src={profile.logo_url}
                alt="Company Logo"
                width={48}
                height={48}
                className="h-12 w-12 rounded-xl border border-slate-200 bg-white object-contain shadow-sm"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0B1F4D] text-sm font-bold text-white shadow-sm">
                INS
              </div>
            )}

            <div className="min-w-0">
              <p className="truncate text-lg font-bold text-[#0B1F4D]">
                {profile.company_name ||
                  profile.full_name ||
                  "Indiana Notary Solutions"}
              </p>

              <p className="mt-1 truncate text-sm text-slate-500">
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
        <aside className="hidden min-h-[calc(100vh-81px)] w-72 shrink-0 border-r border-slate-200 bg-white p-4 md:block">
          <div className="rounded-2xl bg-slate-50 p-3">
            <nav className="space-y-2">
              {navItems.map((item) => (
  <NavLinkWithSpinner
    key={item.href}
    href={item.href}
  >
    {item.label}
  </NavLinkWithSpinner>
))}
            </nav>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Client Access
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