"use client";

import { useState } from "react";
import UploadSubmitButton from "../../../../components/UploadSubmitButton";

type Signer = {
  name: string;
  phone: string;
  email: string;
};

type PropertyAddress = {
  street: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
};

export default function NewClientOrderPage() {
  const [signers, setSigners] = useState<Signer[]>([
    { name: "", phone: "", email: "" },
  ]);

  const [propertyAddresses, setPropertyAddresses] = useState<PropertyAddress[]>(
    []
  );

  const inputClass =
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#0B1F4D] focus:ring-4 focus:ring-blue-100";

  const sectionTitleClass = "text-xl font-bold text-slate-900";
  const sectionNoteClass = "mt-1 text-sm text-slate-500";

  function addSigner() {
    setSigners((current) => [
      ...current,
      { name: "", phone: "", email: "" },
    ]);
  }

  function removeSigner(index: number) {
    setSigners((current) =>
      current.filter((_, signerIndex) => signerIndex !== index)
    );
  }

  function updateSigner(index: number, field: keyof Signer, value: string) {
    setSigners((current) =>
      current.map((signer, signerIndex) =>
        signerIndex === index ? { ...signer, [field]: value } : signer
      )
    );
  }

  function addPropertyAddress() {
  setPropertyAddresses((current) => {
    if (current.length >= 1) return current;

    return [
      {
        street: "",
        address2: "",
        city: "",
        state: "IN",
        zip: "",
      },
    ];
  });
}

  function removePropertyAddress(index: number) {
    setPropertyAddresses((current) =>
      current.filter((_, addressIndex) => addressIndex !== index)
    );
  }

  function updatePropertyAddress(
    index: number,
    field: keyof PropertyAddress,
    value: string
  ) {
    setPropertyAddresses((current) =>
      current.map((address, addressIndex) =>
        addressIndex === index ? { ...address, [field]: value } : address
      )
    );
  }

  const mainSignerName = signers[0]?.name.trim() || "";
  const [mainSignerFirstName = "", ...mainSignerLastNameParts] =
    mainSignerName.split(" ");
  const mainSignerLastName = mainSignerLastNameParts.join(" ");

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
        <input
          type="hidden"
          name="property_addresses"
          value={JSON.stringify(propertyAddresses)}
        />

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
              onClick={addPropertyAddress}
              className="text-sm font-bold text-[#0B1F4D] transition hover:text-blue-950 hover:underline"
            >
              + Add property address
            </button>

            {propertyAddresses.length > 0 && (
              <div className="space-y-5 pt-2">
                {propertyAddresses.map((address, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <div className="mb-5 flex items-center justify-between gap-4">
                      <h3 className="text-lg font-bold text-slate-900">
                        Property Address {index + 1}
                      </h3>

                      <button
                        type="button"
                        onClick={() => removePropertyAddress(index)}
                        className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-red-700"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-slate-700">
                          Street Address
                        </label>

                        <input
                          value={address.street}
                          onChange={(event) =>
                            updatePropertyAddress(
                              index,
                              "street",
                              event.target.value
                            )
                          }
                          className={inputClass}
                          placeholder="Street address"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-semibold text-slate-700">
                          Address Line 2
                        </label>

                        <input
                          value={address.address2}
                          onChange={(event) =>
                            updatePropertyAddress(
                              index,
                              "address2",
                              event.target.value
                            )
                          }
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
                            value={address.city}
                            onChange={(event) =>
                              updatePropertyAddress(
                                index,
                                "city",
                                event.target.value
                              )
                            }
                            className={inputClass}
                            placeholder="City"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-sm font-semibold text-slate-700">
                            State
                          </label>

                          <input
                            value={address.state}
                            onChange={(event) =>
                              updatePropertyAddress(
                                index,
                                "state",
                                event.target.value
                              )
                            }
                            className={inputClass}
                            placeholder="IN"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-sm font-semibold text-slate-700">
                            ZIP
                          </label>

                          <input
                            value={address.zip}
                            onChange={(event) =>
                              updatePropertyAddress(
                                index,
                                "zip",
                                event.target.value
                              )
                            }
                            className={inputClass}
                            placeholder="ZIP"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-start">
            <div>
              <h2 className={sectionTitleClass}>Signer / Borrower</h2>

              <p className={sectionNoteClass}>
                Add all signers who will be part of this appointment.
              </p>
            </div>

            <button
              type="button"
              onClick={addSigner}
              className="rounded-xl bg-[#0B1F4D] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-950"
            >
              + Add Signer
            </button>
          </div>

          <input
            type="hidden"
            name="signer_first_name"
            value={mainSignerFirstName}
          />
          <input
            type="hidden"
            name="signer_last_name"
            value={mainSignerLastName}
          />
          <input
            type="hidden"
            name="signer_phone"
            value={signers[0]?.phone || ""}
          />
          <input
            type="hidden"
            name="signer_email"
            value={signers[0]?.email || ""}
          />

          <div className="mt-5 space-y-5">
            {signers.map((signer, index) => (
              <div
                key={index}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
              >
                <div className="mb-5 flex items-center justify-between gap-4">
                  <h3 className="text-lg font-bold text-slate-900">
                    Signer {index + 1}
                  </h3>

                  {signers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSigner(index)}
                      className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-red-700"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">
                      Signer Name
                    </label>

                    <input
                      name="signer_names[]"
                      value={signer.name}
                      onChange={(event) =>
                        updateSigner(index, "name", event.target.value)
                      }
                      className={inputClass}
                      placeholder="John Smith"
                      required={index === 0}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">
                      Signer Phone
                    </label>

                    <input
                      name="signer_phones[]"
                      value={signer.phone}
                      onChange={(event) =>
                        updateSigner(index, "phone", event.target.value)
                      }
                      className={inputClass}
                      placeholder="(555) 555-5555"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">
                      Signer Email
                    </label>

                    <input
                      name="signer_emails[]"
                      type="email"
                      value={signer.email}
                      onChange={(event) =>
                        updateSigner(index, "email", event.target.value)
                      }
                      className={inputClass}
                      placeholder="signer@example.com"
                    />
                  </div>
                </div>
              </div>
            ))}

            <label className="flex gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-medium text-slate-700">
              <input type="hidden" name="send_confirmation" value="on" />

              <input
                type="checkbox"
                defaultChecked
                disabled
                aria-readonly="true"
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0B1F4D]"
              />

              <span>
                Send a confirmation and provide basic access to order details.
              </span>
            </label>
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

            <UploadSubmitButton
              loadingText="Creating order..."
              className="rounded-xl bg-[#0B1F4D] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-950"
            >
              Create Order
            </UploadSubmitButton>
          </div>
        </section>
      </form>
    </div>
  );
}