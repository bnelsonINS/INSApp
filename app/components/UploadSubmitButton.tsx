"use client";

import { useState } from "react";

type UploadSubmitButtonProps = {
  children: React.ReactNode;
  loadingText?: string;
  className?: string;
};

export default function UploadSubmitButton({
  children,
  loadingText = "Uploading...",
  className = "",
}: UploadSubmitButtonProps) {
  const [loading, setLoading] = useState(false);

  return (
    <button
      type="submit"
      aria-disabled={loading}
      onClick={(event) => {
        const form = event.currentTarget.form;

        if (!form || !form.checkValidity()) {
          return;
        }

        window.setTimeout(() => {
          setLoading(true);
        }, 0);
      }}
      className={`${className} inline-flex items-center justify-center gap-2 ${
        loading ? "pointer-events-none cursor-not-allowed opacity-70" : ""
      }`}
    >
      {loading ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          <span>{loadingText}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}