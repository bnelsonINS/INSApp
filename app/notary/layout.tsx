import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../src/lib/supabase-server";
import LogoutButton from "../components/logout-button";
import NotaryMobileMenu from "./notary-mobile-menu";
import NotaryOnboardingTour from "../components/notary-onboarding-tour";
import Image from "next/image";

export default async function NotaryLayout({
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
    .select(
      "email, role, is_active, has_seen_onboarding, company_name, logo_url"
    )
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "notary" || !profile.is_active) {
    redirect("/login");
  }

  const navItems = [
    { label: "Dashboard", href: "/notary/dashboard", tour: "tour-dashboard" },
    { label: "Credentials", href: "/notary/credentials", tour: "tour-credentials" },
    { label: "Profile", href: "/notary/profile", tour: "tour-profile" },
    { label: "Coverage Areas", href: "/notary/coverage", tour: "tour-coverage" },
    { label: "Assignments", href: "/notary/assignments", tour: "tour-assignments" },
    { label: "Earnings", href: "/notary/earnings", tour: "tour-earnings" },
    { label: "Terms", href: "/notary/terms" },
    { label: "Privacy", href: "/notary/privacy" },
  ];

  return (
    <div className="min-h-screen bg-slate-100">
      <NotaryOnboardingTour hasSeenOnboarding={profile.has_seen_onboarding} />

      <header className="border-b bg-white px-4 py-4 md:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            {profile.logo_url ? (
              <Image
  src={profile.logo_url}
  alt="Company logo"
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
              <p className="truncate font-semibold text-slate-950">
                {profile.company_name || "Indiana Notary Solutions"}
              </p>
              <p className="mt-1 truncate text-sm text-slate-600">
                {profile.email}
              </p>
            </div>
          </div>

          <LogoutButton />
        </div>

        <div className="mt-4">
          <NotaryMobileMenu navItems={navItems} />
        </div>
      </header>

      <div className="flex">
        <aside className="hidden min-h-[calc(100vh-4rem)] w-64 border-r bg-white p-4 md:block">
          <nav className="space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                data-tour={item.tour}
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