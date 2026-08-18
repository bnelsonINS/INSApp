"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "../../../src/lib/supabase-admin";
import { createSupabaseServerClient } from "../../../src/lib/supabase-server";

function cleanString(value: FormDataEntryValue | null) {
  return String(value || "").trim();
}

function getUserId(formData: FormData) {
  return cleanString(formData.get("user_id")) || cleanString(formData.get("id"));
}

function userPage(userId: string, kind?: "access_success" | "access_error", message?: string) {
  if (!kind || !message) return `/dashboard/users/${userId}`;
  return `/dashboard/users/${userId}?${kind}=${encodeURIComponent(message)}`;
}

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

async function getAuthUserOrNull(userId: string) {
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);

  if (!error && data?.user) {
    return data.user;
  }

  if (error) {
    const message = error.message.toLowerCase();

    if (message.includes("user not found") || message.includes("not found")) {
      return null;
    }

    throw new Error(error.message);
  }

  return null;
}

async function getSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }

  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const host = forwardedHost || requestHeaders.get("host");
  const forwardedProto = requestHeaders.get("x-forwarded-proto");

  if (!host) {
    throw new Error(
      "Unable to determine the site URL. Set NEXT_PUBLIC_SITE_URL in Vercel."
    );
  }

  const protocol =
    forwardedProto || (host.includes("localhost") ? "http" : "https");

  return `${protocol}://${host}`;
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

  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
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
    // Avoid leaving a second orphan, this time on the Auth side.
    await supabaseAdmin.auth.admin.deleteUser(userId);
    throw new Error(profileError.message);
  }

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

  revalidatePath("/dashboard/users");
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

  const authUser = await getAuthUserOrNull(userId);

  if (authUser) {
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
      redirect(userPage(userId, "access_error", authError.message));
    }
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
    redirect(userPage(userId, "access_error", profileError.message));
  }

  revalidatePath("/dashboard/users");
  revalidatePath(`/dashboard/users/${userId}`);

  if (!authUser) {
    redirect(
      userPage(
        userId,
        "access_success",
        "Profile saved. This legacy profile still has no Supabase Auth login account."
      )
    );
  }

  redirect(userPage(userId, "access_success", "Profile saved successfully."));
}

export async function disableUser(formData: FormData) {
  const adminUser = await requireAdmin();
  const userId = getUserId(formData);

  if (!userId) {
    throw new Error("Missing user ID.");
  }

  if (userId === adminUser.id) {
    redirect(
      userPage(
        userId,
        "access_error",
        "You cannot disable your own administrator account."
      )
    );
  }

  const authUser = await getAuthUserOrNull(userId);

  if (!authUser) {
    redirect(
      userPage(
        userId,
        "access_error",
        "This profile has no Supabase Auth account, so there is no login account to disable."
      )
    );
  }

  const { error: authError } =
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      ban_duration: "876000h",
    });

  if (authError) {
    redirect(userPage(userId, "access_error", authError.message));
  }

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({ is_active: false })
    .eq("id", userId);

  if (profileError) {
    // Try to put Auth back the way it was if the profile update fails.
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      ban_duration: "none",
    });

    redirect(userPage(userId, "access_error", profileError.message));
  }

  revalidatePath("/dashboard/users");
  revalidatePath(`/dashboard/users/${userId}`);
  redirect(userPage(userId, "access_success", "User access has been disabled."));
}

export async function reactivateUser(formData: FormData) {
  await requireAdmin();

  const userId = getUserId(formData);

  if (!userId) {
    throw new Error("Missing user ID.");
  }

  const authUser = await getAuthUserOrNull(userId);

  if (!authUser) {
    redirect(
      userPage(
        userId,
        "access_error",
        "This profile has no Supabase Auth account, so it cannot be reactivated for login."
      )
    );
  }

  const { error: authError } =
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      ban_duration: "none",
    });

  if (authError) {
    redirect(userPage(userId, "access_error", authError.message));
  }

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({ is_active: true })
    .eq("id", userId);

  if (profileError) {
    redirect(userPage(userId, "access_error", profileError.message));
  }

  revalidatePath("/dashboard/users");
  revalidatePath(`/dashboard/users/${userId}`);
  redirect(userPage(userId, "access_success", "User access has been reactivated."));
}

export async function sendPasswordReset(formData: FormData) {
  await requireAdmin();

  const userId = getUserId(formData);

  if (!userId) {
    throw new Error("Missing user ID.");
  }

  const authUser = await getAuthUserOrNull(userId);

  if (!authUser) {
    redirect(
      userPage(
        userId,
        "access_error",
        "Password reset cannot be sent because this profile has no Supabase Auth account."
      )
    );
  }

  const email = authUser.email?.trim().toLowerCase();

  if (!email) {
    redirect(
      userPage(
        userId,
        "access_error",
        "This Auth account does not have an email address."
      )
    );
  }

  const siteUrl = await getSiteUrl();

  const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/reset-password`,
  });

  if (error) {
    redirect(userPage(userId, "access_error", error.message));
  }

  revalidatePath(`/dashboard/users/${userId}`);
  redirect(
    userPage(
      userId,
      "access_success",
      `Password reset email sent to ${email}.`
    )
  );
}

export async function setTemporaryPassword(formData: FormData) {
  await requireAdmin();

  const userId = getUserId(formData);
  const password = String(formData.get("temporary_password") || "");

  if (!userId) {
    throw new Error("Missing user ID.");
  }

  if (password.length < 8) {
    redirect(
      userPage(
        userId,
        "access_error",
        "Temporary password must be at least 8 characters."
      )
    );
  }

  const authUser = await getAuthUserOrNull(userId);

  if (!authUser) {
    redirect(
      userPage(
        userId,
        "access_error",
        "Temporary password cannot be set because this profile has no Supabase Auth account."
      )
    );
  }

  const { error } =
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      password,
    });

  if (error) {
    redirect(userPage(userId, "access_error", error.message));
  }

  revalidatePath(`/dashboard/users/${userId}`);
  redirect(
    userPage(userId, "access_success", "Temporary password set successfully.")
  );
}

/**
 * This stays as a deactivation operation rather than a destructive hard delete.
 * The repo does not contain the live database FK/cascade rules needed to prove
 * that deleting auth.users is safe for orders, credentials, assignments, etc.
 */
export async function deleteUser(formData: FormData) {
  const adminUser = await requireAdmin();
  const userId = getUserId(formData);

  if (!userId) {
    throw new Error("Missing user ID.");
  }

  if (userId === adminUser.id) {
    redirect(
      userPage(
        userId,
        "access_error",
        "You cannot disable/delete your own administrator account."
      )
    );
  }

  const authUser = await getAuthUserOrNull(userId);

  if (authUser) {
    const { error: authError } =
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        ban_duration: "876000h",
      });

    if (authError) {
      redirect(userPage(userId, "access_error", authError.message));
    }
  }

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({ is_active: false })
    .eq("id", userId);

  if (profileError) {
    redirect(userPage(userId, "access_error", profileError.message));
  }

  revalidatePath("/dashboard/users");
  revalidatePath(`/dashboard/users/${userId}`);
  redirect(
    userPage(
      userId,
      "access_success",
      authUser
        ? "User has been disabled."
        : "Legacy profile has been marked inactive. It did not have an Auth login account."
    )
  );
}
