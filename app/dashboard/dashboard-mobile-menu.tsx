"use client";

import Link from "next/link";
import { useState } from "react";

type NavItem = {
  label: string;
  href: string;
};

export default function DashboardMobileMenu({
  navItems,
}: {
  navItems: NavItem[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
      >
        {open ? "Close Menu" : "Menu"}
      </button>

      {open && (
        <nav className="mt-3 space-y-2 rounded-xl border bg-white p-3 shadow">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}