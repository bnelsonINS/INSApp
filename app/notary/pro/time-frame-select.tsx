"use client";

import { useRouter, useSearchParams } from "next/navigation";

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

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("timeframe", value);

    if (!params.get("filter")) {
      params.set("filter", "upcoming");
    }

    router.push(`/notary/pro?${params.toString()}`);
  }

  return (
    <select
      value={selectedTimeFrame}
      onChange={(event) => handleChange(event.target.value)}
      className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700"
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
  );
}