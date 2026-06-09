export default function NewClientOrderPage() {
  const inputClass =
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100";

  const sectionTitleClass = "text-xl font-bold text-slate-900";
  const sectionNoteClass = "mt-1 text-sm text-slate-500";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="overflow-hidden rounded-2xl bg-[#0B1F4D] text-white shadow-sm">
        <div className="p-6">
          <p className="text-sm font-semibold text-blue-100">Client Portal</p>

          <h1 className="mt-2 text-3xl font-bold">Create Order</h1>

          <p className="mt-3 max-w-2xl text-sm text-blue-100/90">
            Submit a new signing request to Indiana Notary Solutions. Enter the
            order details, appointment location, signer information, and any
            special instructions.
          </p>
        </div>
      </section>

      <form
        action="/client/dashboard/orders/new/create"
        method="POST"
        className="space-y-6"
      >
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="border-b border-slate-200 pb-4">
            <h2 className={sectionTitleClass}>Order Information</h2>

            <p className={sectionNoteClass}>
              Basic file details and instructions for the signing.
            </p>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Client
              </label>

              <select name="client_display" className={inputClass}>
                <option>Indiana Notary Solutions Client</option>
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Lender
                </label>

                <input
                  name="lender"
                  className={inputClass}
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  File #
                </label>

                <input
                  name="file_number"
                  className={inputClass}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Special Instructions
              </label>

              <textarea
                name="special_instructions"
                className={`${inputClass} min-h-28 resize-y`}
                placeholder="Special instructions to scheduler and/or notary. Example: Are funds due at closing?"
              />
            </div>

            <button
              type="button"
              className="text-sm font-bold text-[#0B1F4D] transition hover:text-blue-950 hover:underline"
            >
              + Add participants
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="border-b border-slate-200 pb-4">
            <h2 className={sectionTitleClass}>Location & Appointment</h2>

            <p className={sectionNoteClass}>
              Where and when the signing should take place.
            </p>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Street Address
              </label>

              <input
                name="signing_address"
                className={inputClass}
                placeholder="Street address"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Address Line 2
              </label>

              <input
                name="signing_address_2"
                className={inputClass}
                placeholder="Suite, apartment, office, building, etc."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-[1fr_120px_160px]">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  City
                </label>

                <input
                  name="signing_city"
                  className={inputClass}
                  placeholder="City"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  State
                </label>

                <input
                  name="signing_state"
                  className={inputClass}
                  placeholder="IN"
                  defaultValue="IN"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  ZIP
                </label>

                <input
                  name="signing_zip"
                  className={inputClass}
                  placeholder="ZIP"
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Date
                </label>

                <input
                  name="signing_date"
                  type="date"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Appointment Time
                </label>

                <input
                  name="signing_time"
                  type="time"
                  className={inputClass}
                />
              </div>
            </div>

            <button
              type="button"
              className="text-sm font-bold text-[#0B1F4D] transition hover:text-blue-950 hover:underline"
            >
              + Add property address
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="border-b border-slate-200 pb-4">
            <h2 className={sectionTitleClass}>Signer</h2>

            <p className={sectionNoteClass}>
              Main signer contact information for the appointment.
            </p>
          </div>

          <div className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  First Name
                </label>

                <input
                  name="signer_first_name"
                  className={inputClass}
                  placeholder="First Name"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Last Name
                </label>

                <input
                  name="signer_last_name"
                  className={inputClass}
                  placeholder="Last Name"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Cell Phone
              </label>

              <input
                name="signer_phone"
                className={inputClass}
                placeholder="Cell phone"
              />
            </div>

            <button
              type="button"
              className="text-sm font-bold text-[#0B1F4D] transition hover:text-blue-950 hover:underline"
            >
              + Add phone number
            </button>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Email Address
              </label>

              <input
                name="signer_email"
                type="email"
                className={inputClass}
                placeholder="Email address"
              />
            </div>

            <label className="flex gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-medium text-slate-700">
              <input
                name="send_confirmation"
                type="checkbox"
                defaultChecked
                className="mt-1 h-4 w-4 rounded border-slate-300 text-[#0B1F4D] focus:ring-[#0B1F4D]"
              />

              <span>
                Send a confirmation and provide basic access to order details.
              </span>
            </label>

            <button
              type="button"
              className="text-sm font-bold text-[#0B1F4D] transition hover:text-blue-950 hover:underline"
            >
              + Add signer
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Ready to submit?
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Review the order details before creating the signing request.
              </p>
            </div>

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
            >
              Create Order
            </button>
          </div>
        </section>
      </form>
    </div>
  );
}