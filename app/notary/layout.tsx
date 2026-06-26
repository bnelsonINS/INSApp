import Image from "next/image";
import { redirect } from "next/navigation";
import NavLinkWithSpinner from "../components/NavLinkWithSpinner";
import { createSupabaseServerClient } from "../../src/lib/supabase-server";
import LogoutButton from "../components/logout-button";
import NotaryMobileMenu from "./notary-mobile-menu";
import NotaryOnboardingTour from "../components/notary-onboarding-tour";

function NavIcon({ type }: { type: string }) {
  const className = "h-5 w-5 shrink-0";

  if (type === "dashboard") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 11.5 12 4l9 7.5M5 10v10h14V10M9 20v-6h6v6" />
      </svg>
    );
  }

  if (type === "pro") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 19V9m5 10V5m5 14v-7m5 7V8" />
      </svg>
    );
  }

  if (type === "credentials") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-5" />
      </svg>
    );
  }

  if (type === "profile") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 7.5a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.25a7.5 7.5 0 0 1 15 0" />
      </svg>
    );
  }

  if (type === "coverage") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-5.25 7-12a7 7 0 1 0-14 0c0 6.75 7 12 7 12Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
      </svg>
    );
  }

  if (type === "assignments") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 4h8m-8 4h8M7 3h10a2 2 0 0 1 2 2v15H5V5a2 2 0 0 1 2-2Z" />
      </svg>
    );
  }

  if (type === "earnings") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.5 8.5H11a1.5 1.5 0 0 0 0 3h2a1.5 1.5 0 0 1 0 3H9.5M12 7v10" />
      </svg>
    );
  }

  if (type === "terms") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 3h7l4 4v14H7V3Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M14 3v5h5M9 13h6M9 17h6" />
      </svg>
    );
  }

  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 10V8a5 5 0 0 1 10 0v2M6 10h12v11H6V10Z" />
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

  const navItems = [
    {
      label: "Dashboard",
      href: "/notary/dashboard",
      tour: "tour-dashboard",
      icon: "dashboard",
    },
    {
      label: "INS Pro",
      href: "/notary/pro",
      tour: "tour-ins-pro",
      icon: "pro",
    },
    {
      label: "Credentials",
      href: "/notary/credentials",
      tour: "tour-credentials",
      icon: "credentials",
    },
    {
      label: "Profile",
      href: "/notary/profile",
      tour: "tour-profile",
      icon: "profile",
    },
    {
      label: "Coverage Areas",
      href: "/notary/coverage",
      tour: "tour-coverage",
      icon: "coverage",
    },
    {
      label: "Assignments",
      href: "/notary/assignments",
      tour: "tour-assignments",
      icon: "assignments",
    },
    {
      label: "Earnings",
      href: "/notary/earnings",
      tour: "tour-earnings",
      icon: "earnings",
    },
    { label: "Terms", href: "/notary/terms", icon: "terms" },
    { label: "Privacy", href: "/notary/privacy", icon: "privacy" },
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
        <aside className="hidden min-h-[calc(100vh-5rem)] w-72 shrink-0 border-r border-slate-200 bg-white md:block">
          <div className="flex min-h-[calc(100vh-5rem)] flex-col p-4">
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="px-3 text-xs font-bold uppercase tracking-wide text-slate-400">
                Notary Portal
              </p>

              <nav className="mt-4 space-y-2">
                {navItems.map((item) => (
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

            <div className="mt-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
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