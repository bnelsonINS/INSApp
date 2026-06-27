import Image from "next/image";
import { redirect } from "next/navigation";
import NavLinkWithSpinner from "../components/NavLinkWithSpinner";
import { createSupabaseServerClient } from "../../src/lib/supabase-server";
import LogoutButton from "../components/logout-button";
import NotaryMobileMenu from "./notary-mobile-menu";
import NotaryOnboardingTour from "../components/notary-onboarding-tour";

function NavIcon({ type }: { type: string }) {
  const className = "h-5 w-5 shrink-0";

  const icons: Record<string, React.ReactNode> = {
    dashboard: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 11.5 12 4l9 7.5M5 10v10h14V10M9 20v-6h6v6" />
    ),
    assignments: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 4h8m-8 4h8M7 3h10a2 2 0 0 1 2 2v15H5V5a2 2 0 0 1 2-2Z" />
    ),
    clients: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM21 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    ),
    credentials: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z" />
    ),
    coverage: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-5.25 7-12a7 7 0 1 0-14 0c0 6.75 7 12 7 12Z" />
    ),
    profile: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 7.5a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.25a7.5 7.5 0 0 1 15 0" />
    ),
    earnings: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM14.5 8.5H11a1.5 1.5 0 0 0 0 3h2a1.5 1.5 0 0 1 0 3H9.5M12 7v10" />
    ),
    mileage: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 16h14l-1.5-5h-11L5 16Zm2 0v3m10-3v3M7 19h.01M17 19h.01M8 11l1-4h6l1 4" />
    ),
    journal: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 1 4 17.5v-12ZM8 7h8M8 11h8" />
    ),
    invoices: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 3h10v18l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2V3ZM9 8h6M9 12h6M9 16h3" />
    ),
    expenses: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16v10H4V7ZM4 11h16M8 15h.01M12 15h.01" />
    ),
    reports: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 19V9m5 10V5m5 14v-7m5 7V8" />
    ),
    terms: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 3h7l4 4v14H7V3ZM14 3v5h5M9 13h6M9 17h6" />
    ),
    privacy: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 10V8a5 5 0 0 1 10 0v2M6 10h12v11H6V10Z" />
    ),
  };

  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      {icons[type] ?? icons.dashboard}
    </svg>
  );
}

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

  const mainNavItems = [
    {
      label: "Dashboard",
      href: "/notary/pro",
      tour: "tour-dashboard",
      icon: "dashboard",
    },
    {
      label: "Assignments",
      href: "/notary/assignments",
      tour: "tour-assignments",
      icon: "assignments",
    },
    {
      label: "Clients",
      href: "/notary/pro/customers",
      tour: "tour-clients",
      icon: "clients",
    },
    {
      label: "Credentials",
      href: "/notary/credentials",
      tour: "tour-credentials",
      icon: "credentials",
    },
    {
      label: "Coverage Areas",
      href: "/notary/coverage",
      tour: "tour-coverage",
      icon: "coverage",
    },
    {
      label: "Profile",
      href: "/notary/profile",
      tour: "tour-profile",
      icon: "profile",
    },
    {
      label: "Earnings",
      href: "/notary/earnings",
      tour: "tour-earnings",
      icon: "earnings",
    },
  ];

  const businessNavItems = [
    { label: "Mileage", href: "/notary/pro?feature=mileage", icon: "mileage" },
    { label: "Journal", href: "/notary/pro?feature=journal", icon: "journal" },
    {
      label: "Invoices",
      href: "/notary/pro?feature=invoices",
      icon: "invoices",
    },
    {
      label: "Expenses",
      href: "/notary/pro?feature=expenses",
      icon: "expenses",
    },
    { label: "Reports", href: "/notary/pro?feature=reports", icon: "reports" },
  ];

  const settingsNavItems = [
    { label: "Terms", href: "/notary/terms", icon: "terms" },
    { label: "Privacy", href: "/notary/privacy", icon: "privacy" },
  ];

  const mobileNavItems = [
    ...mainNavItems,
    ...businessNavItems,
    ...settingsNavItems,
  ];

  function NavSection({
    title,
    items,
  }: {
    title: string;
    items: {
      label: string;
      href: string;
      tour?: string;
      icon: string;
    }[];
  }) {
    return (
      <div className="rounded-3xl bg-slate-50 p-4">
        <p className="px-3 text-xs font-bold uppercase tracking-wide text-slate-400">
          {title}
        </p>

        <nav className="mt-4 space-y-2">
          {items.map((item) => (
            <div key={item.href} data-tour={item.tour}>
              <NavLinkWithSpinner href={item.href}>
                <div className="flex w-full items-center gap-3">
                  <NavIcon type={item.icon} />
                  <span>{item.label}</span>
                </div>
              </NavLinkWithSpinner>
            </div>
          ))}
        </nav>
      </div>
    );
  }

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
          <NotaryMobileMenu navItems={mobileNavItems} />
        </div>
      </header>

      <div className="flex">
        <aside className="hidden min-h-[calc(100vh-5rem)] w-72 shrink-0 border-r border-slate-200 bg-white md:block">
          <div className="flex min-h-[calc(100vh-5rem)] flex-col gap-4 p-4">
            <NavSection title="Notary Portal" items={mainNavItems} />

            <NavSection title="Business Tools" items={businessNavItems} />

            <div className="mt-auto space-y-4">
              <NavSection title="Settings" items={settingsNavItems} />

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
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
          </div>
        </aside>

        <main className="w-full flex-1 overflow-x-auto">{children}</main>
      </div>
    </div>
  );
}