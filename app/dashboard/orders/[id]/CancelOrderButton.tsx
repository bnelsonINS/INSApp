"use client";

export default function CancelOrderButton({ orderId }: { orderId: string }) {
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this order?\n\nThis will notify the assigned notary and client."
    );

    if (!confirmed) {
      event.preventDefault();
    }
  }

  return (
    <form action={`/dashboard/orders/${orderId}/cancel`} method="POST" onSubmit={handleSubmit}>
      <button
        type="submit"
        className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700"
      >
        Cancel Order
      </button>
    </form>
  );
}