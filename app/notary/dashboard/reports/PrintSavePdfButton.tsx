"use client";

export default function PrintSavePdfButton() {
  function handlePrint() {
    window.focus();
    window.print();
  }

  return (
    <button
      id="ins-print-now"
      type="button"
      onClick={handlePrint}
      className="rounded-xl bg-white px-4 py-2 text-sm font-black text-[#0B1F4D] hover:bg-slate-100"
    >
      Print / Save PDF
    </button>
  );
}
