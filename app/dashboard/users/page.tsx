import Link from "next/link";
import { createSupabaseServerClient } from "../../../src/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type UserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  is_active: boolean | null;
  created_at: string | null;
};

function formatDate(date: string | null) {
  if (!date) return "—";

  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function roleBadge(role: string | null) {
  if (role === "admin") return "bg-purple-100 text-purple-800";
  if (role === "notary") return "bg-blue-100 text-blue-800";
  if (role === "client") return "bg-amber-100 text-amber-800";

  return "bg-slate-100 text-slate-700";
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams?: Promise<{
    q?: string;
    role?: string;
    status?: string;
  }>;
}) {
  const params = await searchParams;

  const search = params?.q?.trim() ?? "";
  const role = params?.role?.trim() ?? "";
  const status = params?.status?.trim() ?? "";

  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("profiles")
    .select("id, full_name, email, role, is_active, created_at")
    .order("created_at", { ascending: false });

  if (role) {
    query = query.eq("role", role);
  }

  if (status === "active") {
    query = query.eq("is_active", true);
  }

  if (status === "inactive") {
    query = query.eq("is_active", false);
  }

  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,email.ilike.%${search}%,role.ilike.%${search}%`
    );
  }

  const { data } = await query;
  const users = (data ?? []) as UserRow[];

  const adminCount = users.filter((user) => user.role === "admin").length;
  const notaryCount = users.filter((user) => user.role === "notary").length;
  const clientCount = users.filter((user) => user.role === "client").length;
  const activeCount = users.filter((user) => user.is_active).length;

  return (
    <main className="space-y-6 p-4 sm:p-6">
      <section className="rounded-2xl bg-slate-950 p-6 text-white shadow">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm text-slate-300">Admin User Management</p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Users</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">
              Manage platform users, roles, and account access.
            </p>
          </div>

          <Link
            href="/dashboard/users/new"
            className="rounded-xl bg-white px-5 py-3 text-center text-sm font-bold text-slate-950 hover:bg-slate-100"
          >
            + New User
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

        <div className="rounded-2xl border border-purple-100 bg-purple-50 p-5 shadow-sm">
          <p className="text-sm font-semibold text-purple-700">Admins</p>
          <p className="mt-2 text-4xl font-bold text-purple-950">
            {adminCount}
          </p>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 shadow-sm">
          <p className="text-sm font-semibold text-blue-700">Notaries</p>
          <p className="mt-2 text-4xl font-bold text-blue-950">
            {notaryCount}
          </p>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 shadow-sm">
  <p className="text-sm font-semibold text-amber-700">Clients</p>
  <p className="mt-2 text-4xl font-bold text-amber-950">
    {clientCount}
  </p>
</div>

        <div className="rounded-2xl border border-green-100 bg-green-50 p-5 shadow-sm">
          <p className="text-sm font-semibold text-green-700">Active Users</p>
          <p className="mt-2 text-4xl font-bold text-green-950">
            {activeCount}
          </p>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">Find Users</h2>
        <p className="text-sm text-slate-500">
          Search by name, email, or role.
        </p>

        <form
          method="get"
          className="mt-4 grid gap-3 md:grid-cols-[1.5fr_1fr_1fr_auto_auto]"
        >
          <input
            name="q"
            defaultValue={search}
            placeholder="Search users"
            className="rounded-xl border p-3"
          />

          <select
            name="role"
            defaultValue={role}
            className="rounded-xl border p-3"
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="notary">Notary</option>
            <option value="client">Client</option>
          </select>

          <select
            name="status"
            defaultValue={status}
            className="rounded-xl border p-3"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <button className="rounded-xl bg-slate-950 px-5 py-3 font-bold text-white hover:bg-slate-800">
            Filter
          </button>

          <Link
            href="/dashboard/users"
            className="rounded-xl border px-5 py-3 text-center font-bold hover:bg-slate-50"
          >
            Reset
          </Link>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 p-5">
          <h2 className="text-xl font-bold text-slate-950">User Directory</h2>
          <p className="text-sm text-slate-500">
            Review user accounts and edit access levels.
          </p>
        </div>

        {!users.length ? (
          <div className="p-8 text-sm text-slate-500">No users found.</div>
        ) : (
          <>
            <div className="grid gap-4 p-4 md:hidden">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="rounded-2xl border bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-950">
                        {user.full_name || "Unnamed User"}
                      </p>
                      <p className="mt-1 break-all text-sm text-slate-500">
                        {user.email || "—"}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        user.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {user.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${roleBadge(
                        user.role
                      )}`}
                    >
                      {user.role || "Unknown"}
                    </span>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      Created {formatDate(user.created_at)}
                    </span>
                  </div>

                  <Link
                    href={`/dashboard/users/${user.id}`}
                    className="mt-4 block rounded-xl bg-slate-950 px-4 py-2 text-center text-sm font-bold text-white hover:bg-slate-800"
                  >
                    View / Edit
                  </Link>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="p-4">Name</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Created</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-t hover:bg-slate-50">
                      <td className="p-4 font-semibold text-slate-950">
                        {user.full_name || "—"}
                      </td>

                      <td className="p-4 text-slate-600">
                        {user.email || "—"}
                      </td>

                      <td className="p-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${roleBadge(
                            user.role
                          )}`}
                        >
                          {user.role || "Unknown"}
                        </span>
                      </td>

                      <td className="p-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            user.is_active
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {user.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="p-4 text-slate-600">
                        {formatDate(user.created_at)}
                      </td>

                      <td className="p-4 text-right">
                        <Link
                          href={`/dashboard/users/${user.id}`}
                          className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
                        >
                          View / Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </main>
  );
}