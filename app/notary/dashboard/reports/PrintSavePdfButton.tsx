"use client";

import { KeyboardEvent, PointerEvent, useCallback, useEffect, useRef } from "react";

export default function PrintSavePdfButton() {
  const lastPrintAtRef = useRef(0);

  const runPrint = useCallback(() => {
    const now = Date.now();

    // Prevent double firing from pointer + click events on the same press.
    if (now - lastPrintAtRef.current < 700) return;
    lastPrintAtRef.current = now;

    try {
      window.focus();
      window.print();
    } catch (error) {
      console.error("INS Pro print failed:", error);
      alert("Print failed to open. Use Ctrl+P / Cmd+P as a fallback.");
    }
  }, []);

  useEffect(() => {
    const button = document.getElementById("ins-print-now");
    if (!button) return;

    const nativeHandler = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      runPrint();
    };

    button.addEventListener("click", nativeHandler, true);

    return () => {
      button.removeEventListener("click", nativeHandler, true);
    };
  }, [runPrint]);

  function handlePointerUp(event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    runPrint();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.stopPropagation();
    runPrint();
  }

  return (
    <button
      id="ins-print-now"
      type="button"
      onPointerUp={handlePointerUp}
      onKeyDown={handleKeyDown}
      className="rounded-xl bg-white px-4 py-2 text-sm font-black text-[#0B1F4D] hover:bg-slate-100"
    >
      Print / Save PDF
    </button>
  );
} //
