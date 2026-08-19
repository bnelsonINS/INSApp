"use client";

import { useEffect, useRef, useState } from "react";
import {
  BrowserMultiFormatReader,
  BrowserCodeReader,
  IScannerControls,
} from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";

type ParsedLicense = {
  fullName?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  idNumber?: string;
  issuedBy?: string;
  issueDate?: string;
  expirationDate?: string;
};

function normalizeDate(value?: string) {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 8) return "";

  // AAMVA dates are normally MMDDYYYY.
  const month = digits.slice(0, 2);
  const day = digits.slice(2, 4);
  const year = digits.slice(4, 8);

  const m = Number(month);
  const d = Number(day);
  const y = Number(year);

  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900) return "";
  return `${year}-${month}-${day}`;
}

function clean(value?: string) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim();
}

function titleCase(value?: string) {
  return clean(value)
    .toLowerCase()
    .replace(/\b([a-z])/g, (letter) => letter.toUpperCase());
}

function normalizeAamvaRaw(raw: string) {
  return raw
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u001e/g, "\n")
    .replace(/\u001d/g, "\n");
}

function parseAamvaElements(raw: string) {
  const normalized = normalizeAamvaRaw(raw);

  // PDF417 AAMVA payloads normally contain one data element per line.
  // Some decoders leave subfile/header text attached to the first element,
  // so we locate known 3-character element IDs without treating capital
  // letters inside the value as new fields.
  const knownCodes = [
    "DCA","DCB","DCD","DBA","DCS","DAC","DAD","DBD","DBB","DBC","DAY",
    "DAU","DAG","DAI","DAJ","DAK","DAQ","DCF","DCG","DDE","DDF","DDG",
    "DAH","DAZ","DCI","DCJ","DCK","DBN","DBG","DBS",
  ];

  const result: Record<string, string> = {};

  for (const line of normalized.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // A line can contain AAMVA/header bytes before the first field.
    const positions = knownCodes
      .map((code) => ({ code, index: trimmed.indexOf(code) }))
      .filter((item) => item.index >= 0)
      .sort((a, b) => a.index - b.index);

    if (!positions.length) continue;

    for (let i = 0; i < positions.length; i++) {
      const current = positions[i];
      const next = positions[i + 1];
      const valueStart = current.index + 3;
      const valueEnd = next ? next.index : trimmed.length;
      const value = clean(trimmed.slice(valueStart, valueEnd));
      if (value && !result[current.code]) result[current.code] = value;
    }
  }

  // Fallback for payloads where the decoder returns fields without line
  // separators. Known AAMVA codes are safe boundaries; arbitrary uppercase
  // letters are not.
  if (Object.keys(result).length < 4) {
    const matches = [...normalized.matchAll(
      /(DCA|DCB|DCD|DBA|DCS|DAC|DAD|DBD|DBB|DBC|DAY|DAU|DAG|DAI|DAJ|DAK|DAQ|DCF|DCG|DDE|DDF|DDG|DAH|DAZ|DCI|DCJ|DCK|DBN|DBG|DBS)/g,
    )];

    for (let i = 0; i < matches.length; i++) {
      const current = matches[i];
      const next = matches[i + 1];
      const code = current[1];
      const valueStart = (current.index ?? 0) + code.length;
      const valueEnd = next?.index ?? normalized.length;
      const value = clean(normalized.slice(valueStart, valueEnd));
      if (value && !result[code]) result[code] = value;
    }
  }

  return result;
}

function normalizeZip(value?: string) {
  const digits = clean(value).replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length >= 9 && digits.slice(5, 9) === "0000") return digits.slice(0, 5);
  if (digits.length >= 9) return `${digits.slice(0, 5)}-${digits.slice(5, 9)}`;
  return digits.slice(0, 5);
}

function parseAamva(raw: string): ParsedLicense {
  const data = parseAamvaElements(raw);

  const first = data.DAC;
  const middle = data.DAD;
  const last = data.DCS;
  const suffix = data.DCU;

  const fullName = [first, middle, last, suffix]
    .map(titleCase)
    .filter(Boolean)
    .join(" ");

  const state = clean(data.DAJ).toUpperCase();
  const country = clean(data.DCG).toUpperCase();

  return {
    fullName,
    address: titleCase(data.DAG),
    city: titleCase(data.DAI),
    state,
    zip: normalizeZip(data.DAK),
    idNumber: clean(data.DAQ),
    issuedBy:
      state === "IN"
        ? "Indiana BMV"
        : state || country || "",
    issueDate: normalizeDate(data.DBD),
    expirationDate: normalizeDate(data.DBA),
  };
}

function setFormValue(
  form: HTMLFormElement,
  name: string,
  value?: string,
) {
  if (value === undefined || value === null || value === "") return;

  const element = form.elements.namedItem(name);

  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  ) {
    element.value = value;

    element.dispatchEvent(
      new Event("input", {
        bubbles: true,
      }),
    );

    element.dispatchEvent(
      new Event("change", {
        bubbles: true,
      }),
    );
  }
}

function fillJournalForm(button: HTMLButtonElement, data: ParsedLicense) {
  const form = button.closest("form");
  if (!form) throw new Error("The Journal form could not be found.");

  setFormValue(form, "signer_name", data.fullName);
  setFormValue(form, "id_verification_type", "Driver's License");
  setFormValue(form, "signer_address", data.address);
  setFormValue(form, "signer_city", data.city);
  setFormValue(form, "signer_state", data.state || "IN");
  setFormValue(form, "signer_zip", data.zip);
  setFormValue(form, "id_number", data.idNumber);
  setFormValue(form, "id_issued_by", data.issuedBy);
  setFormValue(form, "id_issued_date", data.issueDate);
  setFormValue(form, "id_expiration_date", data.expirationDate);

  const verified = form.elements.namedItem("id_verified");
  if (verified instanceof HTMLInputElement && verified.type === "checkbox") {
    verified.checked = true;
    verified.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

export default function DriversLicenseScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [starting, setStarting] = useState(false);

  function stopCamera() {
    controlsRef.current?.stop();
    controlsRef.current = null;

    const stream = videoRef.current?.srcObject;
    if (stream instanceof MediaStream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    if (videoRef.current) videoRef.current.srcObject = null;
  }

  function closeScanner() {
    stopCamera();
    setOpen(false);
    setStarting(false);
    setMessage("");
  }

  useEffect(() => {
    if (!open || !videoRef.current) return;

    let cancelled = false;

    async function start() {
      setStarting(true);
      setMessage("Starting rear camera…");

      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error(
            "Camera access is not available in this browser. Use Safari or Chrome over HTTPS.",
          );
        }

        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.PDF_417]);
        hints.set(DecodeHintType.TRY_HARDER, true);

        const reader = new BrowserMultiFormatReader(hints);

        const controls = await reader.decodeFromConstraints(
          {
            audio: false,
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
          },
          videoRef.current!,
          (result) => {
            if (!result || cancelled) return;

            try {
              const parsed = parseAamva(result.getText());

              if (!parsed.idNumber && !parsed.fullName) {
                setMessage(
                  "Barcode found, but the driver's-license data could not be read. Hold the barcode flat and try again.",
                );
                return;
              }

              if (buttonRef.current) {
                fillJournalForm(buttonRef.current, parsed);
              }

              stopCamera();
              setMessage("License scanned. Journal fields were filled in.");
              window.setTimeout(() => {
                setOpen(false);
                setMessage("");
              }, 800);
            } catch (error) {
              setMessage(
                error instanceof Error
                  ? error.message
                  : "The license barcode could not be processed.",
              );
            }
          },
        );

        if (cancelled) {
          controls.stop();
          return;
        }

        controlsRef.current = controls;
        setStarting(false);
        setMessage(
          "Point the rear camera at the PDF417 barcode on the back of the driver's license.",
        );
      } catch (error) {
        setStarting(false);
        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to start the camera. Check camera permission and try again.",
        );
      }
    }

    start();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
      >
        Scan Indiana Driver&apos;s License
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
              <div>
                <h3 className="text-lg font-black text-slate-950">
                  Scan Driver&apos;s License
                </h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Scan the large PDF417 barcode on the back of the license.
                </p>
              </div>
              <button
                type="button"
                onClick={closeScanner}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700"
              >
                Cancel
              </button>
            </div>

            <div className="bg-black p-3 sm:p-5">
              <div className="relative overflow-hidden rounded-2xl">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="aspect-[4/3] w-full bg-black object-cover"
                />
                <div className="pointer-events-none absolute inset-x-[6%] top-1/2 h-[38%] -translate-y-1/2 rounded-xl border-2 border-white/90" />
              </div>
            </div>

            <div className="p-5">
              <p className="text-sm font-bold text-slate-700">
                {starting ? "Opening camera…" : message}
              </p>
              <p className="mt-2 text-xs font-semibold text-slate-500">
                Keep the barcode flat, fill most of the box, and avoid glare.
                Camera access requires HTTPS and browser permission.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
