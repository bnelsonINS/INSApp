"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "../../../src/lib/supabase-admin";
import { createSupabaseServerClient } from "../../../src/lib/supabase-server";

function cleanString(value: FormDataEntryValue | null) {
  return String(value || "").trim();
}

function getUserId(formData: FormData) {
  return (
    cleanString(formData.get("user_id")) ||
    cleanString(formData.get("id"))
  );
}

/**
 * Server actions that use the service-role client must verify the caller.
 * The dashboard layout also protects the UI, but this protects the action itself.
 */
async function requireAdmin() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("You must be signed in to perform this action.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  if (
    profileError ||
    !profile ||
    profile.role !== "admin" ||
    !profile.is_active
  ) {
    throw new Error("Administrator access is required.");
  }

  return user;
}

async function getSiteUrl() {
  const requestHeaders = await headers();

  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const host = forwardedHost || requestHeaders.get("host");
  const forwardedProto = requestHeaders.get("x-forwarded-proto");

  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }

  if (host) {
    const protocol =
      forwardedProto || (host.includes("localhost") ? "http" : "https");

    return `${protocol}://${host}`;
  }

  throw new Error(
    "Unable to determine the site URL. Set NEXT_PUBLIC_SITE_URL in Vercel."
  );
}

export async function createUser(formData: FormData) {
  await requireAdmin();

  const fullName = cleanString(formData.get("full_name"));
  const email = cleanString(formData.get("email")).toLowerCase();
  const password = String(formData.get("password") || "");
  const role = cleanString(formData.get("role")) || "client";
  const isActive = formData.get("is_active") === "on";

  if (!email || !password || !role) {
    throw new Error("Email, password, and role are required.");
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
    },
    app_metadata: {
      role,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  const userId = data.user?.id;

  if (!userId) {
    throw new Error("User was created, but no user ID was returned.");
  }

  const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
    id: userId,
    full_name: fullName,
    email,
    role,
    is_active: isActive,
  });

  if (profileError) {
    throw new Error(profileError.message);
  }

  // If the admin creates the account as inactive, ban Auth too.
  if (!isActive) {
    const { error: banError } =
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        ban_duration: "876000h",
      });

    if (banError) {
      throw new Error(
        `User was created, but disabling Auth failed: ${banError.message}`
      );
    }
  }

  redirect("/dashboard/users");
}

export async function updateUserProfile(formData: FormData) {
  await requireAdmin();

  const userId = getUserId(formData);
  const fullName = cleanString(formData.get("full_name"));
  const email = cleanString(formData.get("email")).toLowerCase();
  const role = cleanString(formData.get("role"));
  const approvalStatus =
    cleanString(formData.get("approval_status")) || "ready_for_review";

  if (!userId || !role) {
    throw new Error("User ID and role are required.");
  }

  const authUpdate: {
    user_metadata: { full_name: string };
    app_metadata: { role: string };
    email?: string;
  } = {
    user_metadata: {
      full_name: fullName,
    },
    app_metadata: {
      role,
    },
  };

  if (email) {
    authUpdate.email = email;
  }

  const { error: authError } =
    await supabaseAdmin.auth.admin.updateUserById(userId, authUpdate);

  if (authError) {
    throw new Error(authError.message);
  }

  const updateData: {
    full_name: string;
    role: string;
    approval_status: string;
    email?: string;
  } = {
    full_name: fullName,
    role,
    approval_status: approvalStatus,
  };

  if (email) {
    updateData.email = email;
  }

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update(updateData)
    .eq("id", userId);

  if (profileError) {
    throw new Error(profileError.message);
  }

  revalidatePath("/dashboard/users");
  revalidatePath(`/dashboard/users/${userId}`);
}

export async function disableUser(formData: FormData) {
  const adminUser = await requireAdmin();
  const userId = getUserId(formData);

  if (!userId) {
    throw new Error("Missing user ID.");
  }

  if (userId === adminUser.id) {
    throw new Error("You cannot disable your own administrator account.");
  }

  // Disable the Supabase Auth account so new sign-ins fail.
  const { error: authError } =
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      ban_duration: "876000h",
    });

  if (authError) {
    throw new Error(authError.message);
  }

  // Also update the application profile. Your portal layouts already enforce this.
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({ is_active: false })
    .eq("id", userId);

  if (profileError) {
    // Try to undo the Auth ban if the profile update fails.
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      ban_duration: "none",
    });

    throw new Error(profileError.message);
  }

  revalidatePath("/dashboard/users");
  revalidatePath(`/dashboard/users/${userId}`);
}

export async function reactivateUser(formData: FormData) {
  await requireAdmin();

  const userId = getUserId(formData);

  if (!userId) {
    throw new Error("Missing user ID.");
  }

  // "none" is Supabase's supported value for lifting a user ban.
  const { error: authError } =
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      ban_duration: "none",
    });

  if (authError) {
    throw new Error(authError.message);
  }

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({ is_active: true })
    .eq("id", userId);

  if (profileError) {
    throw new Error(profileError.message);
  }

  revalidatePath("/dashboard/users");
  revalidatePath(`/dashboard/users/${userId}`);
}

export async function sendPasswordReset(formData: FormData) {
  await requireAdmin();

  const email = cleanString(formData.get("email")).toLowerCase();
  const userId = getUserId(formData);

  if (!email) {
    throw new Error("Missing email.");
  }

  const siteUrl = await getSiteUrl();

  // resetPasswordForEmail actually sends the recovery email.
  // admin.generateLink only generates a link for a custom mailer.
  const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/reset-password`,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (userId) {
    revalidatePath(`/dashboard/users/${userId}`);
  }
}

export async function setTemporaryPassword(formData: FormData) {
  await requireAdmin();

  const userId = getUserId(formData);
  const password = String(formData.get("temporary_password") || "");

  if (!userId) {
    throw new Error("Missing user ID.");
  }

  if (password.length < 8) {
    throw new Error("Temporary password must be at least 8 characters.");
  }

  const { error } =
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      password,
    });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/users/${userId}`);
}

/**
 * Left intentionally as a deactivate-style operation.
 *
 * The current repo does not include the live database FK/delete rules for
 * profiles, orders, assignments, credentials, documents, etc. Hard-deleting
 * auth.users without knowing those rules could destroy or orphan business data.
 * If you want true permanent deletion, verify the schema first and then replace
 * this with supabaseAdmin.auth.admin.deleteUser(...).
 */
export async function deleteUser(formData: FormData) {
  const adminUser = await requireAdmin();
  const userId = getUserId(formData);

  if (!userId) {
    throw new Error("Missing user ID.");
  }

  if (userId === adminUser.id) {
    throw new Error("You cannot delete/disable your own administrator account.");
  }

  const { error: authError } =
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      ban_duration: "876000h",
    });

  if (authError) {
    throw new Error(authError.message);
  }

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({ is_active: false })
    .eq("id", userId);

  if (profileError) {
    throw new Error(profileError.message);
  }

  revalidatePath("/dashboard/users");
  revalidatePath(`/dashboard/users/${userId}`);
}
