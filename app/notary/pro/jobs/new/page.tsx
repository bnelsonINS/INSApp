import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../../../src/lib/supabase-server";
import JobForm from "./job-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function NewProJobPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: choices } = await supabase
    .from("pro_job_choice_options")
    .select("id, category, value")
    .eq("notary_id", user.id)
    .order("category", { ascending: true })
    .order("value", { ascending: true });

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-blue-700">
              INS Pro
            </p>
            <h1 className="text-3xl font-black text-slate-950">
              Add Non-INS Signing
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Track outside work without mixing it into INS assignments.
            </p>
          </div>

          <Link
            href="/notary/pro/jobs"
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-center text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            Back to Jobs
          </Link>
        </div>

        <JobForm choices={choices ?? []} />
      </div>
    </main>
  );
}