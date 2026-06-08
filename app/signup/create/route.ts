import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../src/lib/supabase-admin";
import {
  sendNotaryWelcomeEmail,
  sendClientWelcomeEmail,
} from "../../../src/lib/email";

type Role = "notary" | "client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const firstName = String(body.firstName || "").trim();
    const lastName = String(body.lastName || "").trim();
    const businessName = String(body.businessName || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const role = String(body.role || "notary") as Role;

    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json(
        { error: "First name, last name, email, and password are required." },
        { status: 400 }
      );
    }

    if (!["notary", "client"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid account type." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const fullName = `${firstName} ${lastName}`.trim();

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          full_name: fullName,
          business_name: businessName,
          role,
        },
        app_metadata: {
          role,
        },
      });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || "Unable to create user." },
        { status: 400 }
      );
    }

    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: authData.user.id,
      email,
      role,
      full_name: fullName,
      is_active: true,
      approval_status: "approved",
    });

    if (role === "notary") {
  try {
    await sendNotaryWelcomeEmail({
      to: email,
      fullName,
    });
  } catch (emailError) {
    console.error("Notary welcome email failed:", emailError);
  }
}

if (role === "client") {
  try {
    await sendClientWelcomeEmail({
      to: email,
      fullName,
      businessName,
    });
  } catch (emailError) {
    console.error("Client welcome email failed:", emailError);
  }
}

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);

      return NextResponse.json(
        { error: profileError.message },
        { status: 400 }
      );
    }

    if (role === "notary") {
      try {
        await sendNotaryWelcomeEmail({
          to: email,
          fullName,
        });
      } catch (emailError) {
        console.error("Notary welcome email failed:", emailError);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Account created. You can now sign in.",
    });
  } catch (error) {
    console.error("Unexpected signup error:", error);

    return NextResponse.json(
      { error: "Unexpected signup error." },
      { status: 500 }
    );
  }
}