import Link from "next/link";
import { createUser } from "../actions";

export default function NewUserPage() {
  return (
    <div>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold">Create User</h1>
          <p className="mt-2 text-slate-600">
            Add a new admin, notary, or client account.
          </p>
        </div>

        <Link
          href="/dashboard/users"
          className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow hover:bg-slate-50"
        >
          Back to Users
        </Link>
      </div>

      <form
        action={createUser}
        className="mt-8 max-w-xl rounded-xl bg-white p-6 shadow"
      >
        <div className="space-y-5">
          <div>
            <label className="text-sm font-medium">Full Name</label>
            <input
              name="full_name"
              className="mt-1 w-full rounded-lg border p-3"
              type="text"
              placeholder="Jane Smith"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              name="email"
              className="mt-1 w-full rounded-lg border p-3"
              type="email"
              placeholder="jane@example.com"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium">Temporary Password</label>
            <input
              name="password"
              className="mt-1 w-full rounded-lg border p-3"
              type="password"
              placeholder="Temporary password"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium">Role</label>
            <select
              name="role"
              className="mt-1 w-full rounded-lg border p-3"
              defaultValue="client"
              required
            >
              <option value="admin">Admin</option>
              <option value="notary">Notary</option>
              <option value="client">Client</option>
            </select>
          </div>

          <label className="flex items-center gap-3 text-sm">
            <input
              name="is_active"
              type="checkbox"
              defaultChecked
              className="h-4 w-4"
            />
            Active user
          </label>

          <button
            type="submit"
            className="w-full rounded-lg bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-700"
          >
            Create User
          </button>
        </div>
      </form>
    </div>
  );
}