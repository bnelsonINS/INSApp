// app/notary/assignments/[id]/CloseDetailsButton.tsx

"use client";

export default function CloseDetailsButton() {
  return (
    <button
      type="button"
      onClick={(event) => {
        const details = event.currentTarget.closest("details");
        if (details) details.removeAttribute("open");
      }}
      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
    >
      Cancel
    </button>
  );
}