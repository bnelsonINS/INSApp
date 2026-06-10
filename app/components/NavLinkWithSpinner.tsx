"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Props = {
  href: string;
  children: React.ReactNode;
};

export default function NavLinkWithSpinner({ href, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const isActive = pathname === href;

  useEffect(() => {
    setLoading(false);
  }, [pathname]);

  return (
    <button
      type="button"
      disabled={loading || isActive}
      onClick={() => {
        if (isActive) return;

        setLoading(true);
        router.push(href);
      }}
      className={`group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition hover:bg-white hover:text-[#0B1F4D] hover:shadow-sm ${
        isActive ? "bg-white text-[#0B1F4D] shadow-sm" : "text-slate-700"
      }`}
    >
      <span>{children}</span>

      {loading && (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-[#0B1F4D]" />
      )}
    </button>
  );
}