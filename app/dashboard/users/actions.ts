"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "../../../src/lib/supabase-admin";

function cleanString(value: FormDataEntryValue | null) {
  return String(value || "").trim();
}

export async function createUser(formData: FormData) {
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

  redirect("/dashboard/users");
}

export async function updateUserProfile(formData: FormData) {
  const userId =
    cleanString(formData.get("user_id")) || cleanString(formData.get("id"));

  const fullName = cleanString(formData.get("full_name"));
  const email = cleanString(formData.get("email")).toLowerCase();
  const role = cleanString(formData.get("role"));
  const approvalStatus =
    cleanString(formData.get("approval_status")) || "ready_for_review";

  if (!userId || !role) {
    throw new Error("User ID and role are required.");
  }

  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
    userId,
    {
      user_metadata: {
        full_name: fullName,
      },
      app_metadata: {
        role,
      },
    }
  );

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
  const userId = cleanString(formData.get("user_id"));

  if (!userId) throw new Error("Missing user ID.");

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ is_active: false })
    .eq("id", userId);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/users");
  revalidatePath(`/dashboard/users/${userId}`);
}

export async function reactivateUser(formData: FormData) {
  const userId = cleanString(formData.get("user_id"));

  if (!userId) throw new Error("Missing user ID.");

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ is_active: true })
    .eq("id", userId);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/users");
  revalidatePath(`/dashboard/users/${userId}`);
}

export async function sendPasswordReset(formData: FormData) {
  const email = cleanString(formData.get("email")).toLowerCase();
  const userId = cleanString(formData.get("user_id"));

  if (!email) throw new Error("Missing email.");

  const { error } = await supabaseAdmin.auth.admin.generateLink({
    type: "recovery",
    email,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/users/${userId}`);
}

export async function setTemporaryPassword(formData: FormData) {
  const userId = cleanString(formData.get("user_id"));
  const password = String(formData.get("temporary_password") || "");

  if (!userId || !password) {
    throw new Error("User ID and password are required.");
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/users/${userId}`);
}

export async function deleteUser(formData: FormData) {
  const userId = cleanString(formData.get("user_id"));

  if (!userId) throw new Error("Missing user ID.");

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({ is_active: false })
    .eq("id", userId);

  if (profileError) throw new Error(profileError.message);

  revalidatePath("/dashboard/users");
  revalidatePath(`/dashboard/users/${userId}`);
}