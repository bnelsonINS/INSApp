"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

type Props = {
  currentYear: number;
  selectedTimeFrame: string;
};

export default function TimeFrameSelect({
  currentYear,
  selectedTimeFrame,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [localValue, setLocalValue] = useState(selectedTimeFrame);

  function handleChange(value: string) {
    setLocalValue(value);

    const params = new URLSearchParams(searchParams.toString());
    params.set("timeframe", value);

    if (!params.get("filter")) {
      params.set("filter", "upcoming");
    }

    startTransition(() => {
      router.push(`/notary/pro?${params.toString()}`);
    });
  }

  return (
    <div className="relative inline-flex items-center gap-2">
      <select
        value={localValue}
        onChange={(event) => handleChange(event.target.value)}
        disabled={isPending}
        className="rounded-xl border border-slate-300 bg-white px-4 py-2 pr-10 text-sm font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        <option value="last-10-weeks">Last 10 Weeks</option>
        <option value="this-month">This Month</option>
        <option value="last-month">Last Month</option>
        <option value="this-week">This Week</option>
        <option value="last-week">Last Week</option>
        <option value={`${currentYear}`}>{currentYear}</option>
        <option value={`${currentYear - 1}`}>{currentYear - 1}</option>
        <option value="since-inception">Since Inception</option>
      </select>

      {isPending && (
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-[#0B1F4D]" />
      )}
    </div>
  );
}