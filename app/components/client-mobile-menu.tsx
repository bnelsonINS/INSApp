"use client";

import Link from "next/link";
import { useState } from "react";

type NavItem = {
  label: string;
  href: string;
};

export default function ClientMobileMenu({ navItems }: { navItems: NavItem[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-4 md:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        style={{
          display: "inline-flex",
          cursor: "pointer",
          borderRadius: "12px",
          backgroundColor: "#059669",
          padding: "8px 16px",
          fontSize: "14px",
          fontWeight: 700,
          color: "#ffffff",
        }}
      >
        Menu
      </button>

      {open && (
        <nav className="mt-4 grid gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}