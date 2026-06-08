"use client";

export default function ApproveCloseButton() {
  return (
    <button
      type="submit"
      onClick={(event) => {
        const confirmed = confirm(
          "Are you sure you want to approve and close this file? This will mark the order as Closed."
        );

        if (!confirmed) {
          event.preventDefault();
        }
      }}
      className="rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-green-700"
    >
      ✓ Approve & Close
    </button>
  );
}