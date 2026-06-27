import Link from "next/link";
import CustomerForm from "./customer-form";

export default function NewProCustomerPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-blue-700">
              INS Pro
            </p>
            <h1 className="text-3xl font-black text-slate-950">
              New Customer
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Save company details, contacts, defaults, and instructions.
            </p>
          </div>

          <Link
            href="/notary/pro/customers"
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-center text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            Back to Customers
          </Link>
        </div>

        <CustomerForm />
      </div>
    </main>
  );
}