import Image from "next/image";
import NavLinkWithSpinner from "../components/NavLinkWithSpinner";import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../src/lib/supabase-server";
import LogoutButton from "../components/logout-button";
import NotaryMobileMenu from "./notary-mobile-menu";
import NotaryOnboardingTour from "../components/notary-onboarding-tour";

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
    .select("email, role, is_active, has_seen_onboarding, logo_url")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "notary" || !profile.is_active) {
    redirect("/login");
  }

  const { data: notaryProfile } = await supabase
    .from("notary_profiles")
    .select("first_name, last_name, business_name")
    .eq("user_id", user.id)
    .maybeSingle();

  const firstLastName = [
    notaryProfile?.first_name,
    notaryProfile?.last_name,
  ]
    .filter(Boolean)
    .join(" ");

  const displayName =
    notaryProfile?.business_name || firstLastName || profile.email;

  const navItems = [
    { label: "Dashboard", href: "/notary/dashboard", tour: "tour-dashboard" },
    {
      label: "Credentials",
      href: "/notary/credentials",
      tour: "tour-credentials",
    },
    { label: "Profile", href: "/notary/profile", tour: "tour-profile" },
    {
      label: "Coverage Areas",
      href: "/notary/coverage",
      tour: "tour-coverage",
    },
    {
      label: "Assignments",
      href: "/notary/assignments",
      tour: "tour-assignments",
    },
    { label: "Earnings", href: "/notary/earnings", tour: "tour-earnings" },
    { label: "Terms", href: "/notary/terms" },
    { label: "Privacy", href: "/notary/privacy" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <NotaryOnboardingTour hasSeenOnboarding={profile.has_seen_onboarding} />

      <header className="border-b border-slate-200 bg-white px-4 py-4 md:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            {profile.logo_url ? (
              <Image
                src={profile.logo_url}
                alt="Company logo"
                width={110}
                height={110}
                className="rounded-xl border border-slate-200 object-contain"
              />
            ) : (
              <div className="flex h-[60px] w-[60px] items-center justify-center rounded-xl bg-[#0B1F4D] text-sm font-bold text-white">
                INS
              </div>
            )}

            <div className="min-w-0">
              <p className="truncate text-lg font-bold text-slate-950">
                {displayName}
              </p>
              <p className="mt-1 truncate text-sm font-medium text-slate-500">
                Notary Portal
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
        <aside className="hidden min-h-[calc(100vh-5rem)] w-64 shrink-0 border-r border-slate-200 bg-white md:block">
          <div className="p-4">
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="px-3 text-xs font-bold uppercase tracking-wide text-slate-400">
                Notary Portal
              </p>

              <nav className="mt-3 space-y-1">
                {navItems.map((item) => (
  <div key={item.href} data-tour={item.tour}>
    <NavLinkWithSpinner href={item.href}>
      <div className="flex w-full items-center justify-between">
        <span>{item.label}</span>

        <span className="h-1.5 w-1.5 rounded-full bg-slate-300 opacity-0 transition group-hover:opacity-100" />
      </div>
    </NavLinkWithSpinner>
  </div>
))}
              </nav>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Status
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                Account Active
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Manage assignments, credentials, coverage, and earnings.
              </p>
            </div>
          </div>
        </aside>

        <main className="w-full flex-1 overflow-x-auto">{children}</main>
      </div>
    </div>
  );
}