import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const fromEmail =
  process.env.RESEND_FROM_EMAIL ||
  "Indiana Notary Solutions <no-reply@indiananotarysolutions.com>";

const logoUrl =
  "https://img1.wsimg.com/isteam/ip/5d0c76c0-7737-4179-b443-5371edbb7539/blob.png/:/rs=w:500,h:500,cg:true/qt=q:95";

function getBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://indiananotarysolutions.com"
  ).replace(/\/$/, "");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function emailHeader(subtitle: string) {
  return `
    <div style="background:#ffffff;padding:36px 28px 30px;text-align:center;border-bottom:6px solid #0b1f4d;">
      <img
        src="${logoUrl}"
        alt="Indiana Notary Solutions"
        width="155"
        style="display:block;margin:0 auto 22px;width:155px;height:auto;border:0;"
      />

      <h1 style="color:#0b1f4d;margin:0;font-size:34px;line-height:1.2;font-weight:800;">
        Indiana Notary Solutions
      </h1>

      <p style="color:#334155;margin:14px 0 0;font-size:18px;line-height:1.5;font-weight:600;">
        ${subtitle}
      </p>
    </div>
  `;
}

function dashboardButton(url: string) {
  return `
    <div style="text-align:center;margin:34px 0;">
      <a 
        href="${url}" 
        style="background:#0b1f4d;color:#ffffff;text-decoration:none;padding:14px 26px;border-radius:10px;font-weight:bold;display:inline-block;"
      >
        Go To My Dashboard
      </a>
    </div>
  `;
}

export async function sendNotaryWelcomeEmail({
  to,
  fullName,
}: {
  to: string;
  fullName: string;
}) {
  const safeName = escapeHtml(fullName);
  const dashboardUrl = `${getBaseUrl()}/notary/dashboard`;

  return resend.emails.send({
    from: fromEmail,
    to,
    subject: "Welcome to Indiana Notary Solutions",
    html: `
      <div style="font-family:Arial,sans-serif;background:#f1f5f9;padding:30px;">
        <div style="max-width:650px;margin:auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;">
          ${emailHeader("Connecting Indiana notaries with signing opportunities")}

          <div style="padding:34px;color:#0f172a;font-size:15px;line-height:1.6;">
            <p>Hi <strong>${safeName}</strong>,</p>

            <p>Welcome to <strong>Indiana Notary Solutions</strong>. We’re excited to have you join our network of professional notaries and signing agents serving clients throughout Indiana.</p>

            <p>Our platform helps connect qualified notaries with signing opportunities while giving you tools to manage your profile, credentials, coverage area, assignments, messages, and payments in one place.</p>

            <div style="background:#eff6ff;border-left:5px solid #0b1f4d;padding:18px;border-radius:10px;margin:26px 0;">
              <h2 style="margin-top:0;color:#0b1f4d;font-size:22px;">How It Works</h2>
              <ol style="margin-bottom:0;padding-left:22px;">
                <li>We receive signing requests from clients.</li>
                <li>We match assignments with qualified notaries in the service area.</li>
                <li>You receive assignment opportunities by email, SMS, or dashboard notification.</li>
                <li>You accept the assignment and complete the signing.</li>
                <li>Documents are returned and payment is processed according to title company terms.</li>
              </ol>
            </div>

            <h2 style="font-size:22px;">What To Do Next</h2>

            <p><strong>1. Complete Your Profile</strong><br />Verify your contact information, address, phone number, and account details.</p>

            <p><strong>2. Upload Your Credentials</strong><br />Upload your notary commission, background screening, E&amp;O insurance, certification, and other required documents.</p>

            <p><strong>3. Set Your Coverage Area</strong><br />Add the counties, zip codes, and travel preferences where you are available for assignments.</p>

            ${dashboardButton(dashboardUrl)}
          </div>
        </div>
      </div>
    `,
  });
}

export async function sendClientWelcomeEmail({
  to,
  fullName,
  businessName,
}: {
  to: string;
  fullName: string;
  businessName?: string;
}) {
  const safeName = escapeHtml(fullName);
  const safeBusinessName = businessName ? escapeHtml(businessName) : "";
  const dashboardUrl = `${getBaseUrl()}/client/dashboard`;

  return resend.emails.send({
    from: fromEmail,
    to,
    subject: "Welcome to Indiana Notary Solutions",
    html: `
      <div style="font-family:Arial,sans-serif;background:#f1f5f9;padding:30px;">
        <div style="max-width:650px;margin:auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;">
          ${emailHeader("Professional notary and signing support throughout Indiana")}

          <div style="padding:34px;color:#0f172a;font-size:15px;line-height:1.6;">
            <p>Hi <strong>${safeName}</strong>,</p>

            <p>
              Thank you for creating an account with <strong>Indiana Notary Solutions</strong>${
                safeBusinessName
                  ? ` on behalf of <strong>${safeBusinessName}</strong>`
                  : ""
              }.
            </p>

            <p>We help title companies, lenders, attorneys, real estate professionals, and businesses coordinate reliable notary and signing services throughout Indiana.</p>

            <div style="background:#eff6ff;border-left:5px solid #0b1f4d;padding:18px;border-radius:10px;margin:26px 0;">
              <h2 style="margin-top:0;color:#0b1f4d;font-size:22px;">What You Can Use INS For</h2>
              <ul style="line-height:1.7;margin-bottom:0;padding-left:22px;">
                <li>Request mobile notary services.</li>
                <li>Coordinate loan signing appointments.</li>
                <li>Track order progress from assignment to completion.</li>
                <li>Communicate with our team about signing details.</li>
                <li>Work with qualified notaries across Indiana.</li>
              </ul>
            </div>

            ${dashboardButton(dashboardUrl)}
          </div>
        </div>
      </div>
    `,
  });
}

export async function sendCredentialApprovedEmail({
  to,
  fullName,
  credentialType,
}: {
  to: string;
  fullName: string;
  credentialType: string;
}) {
  const safeName = escapeHtml(fullName);
  const safeCredentialType = escapeHtml(credentialType);
  const dashboardUrl = `${getBaseUrl()}/notary/credentials`;

  return resend.emails.send({
    from: fromEmail,
    to,
    subject: "Credential Approved",
    html: `
      <div style="font-family:Arial,sans-serif;background:#f1f5f9;padding:30px;">
        <div style="max-width:650px;margin:auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;">
          ${emailHeader("Credential Approved")}

          <div style="padding:34px;color:#0f172a;font-size:15px;line-height:1.6;">
            <p>Hi <strong>${safeName}</strong>,</p>

            <p>Your <strong>${safeCredentialType}</strong> credential has been approved.</p>

            ${dashboardButton(dashboardUrl)}
          </div>
        </div>
      </div>
    `,
  });
}

export async function sendCredentialRejectedEmail({
  to,
  fullName,
  credentialType,
  rejectionReason,
}: {
  to: string;
  fullName: string;
  credentialType: string;
  rejectionReason: string;
}) {
  const safeName = escapeHtml(fullName);
  const safeCredentialType = escapeHtml(credentialType);
  const safeReason = escapeHtml(rejectionReason);
  const dashboardUrl = `${getBaseUrl()}/notary/credentials`;

  return resend.emails.send({
    from: fromEmail,
    to,
    subject: "Credential Needs Attention",
    html: `
      <div style="font-family:Arial,sans-serif;background:#f1f5f9;padding:30px;">
        <div style="max-width:650px;margin:auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;">
          ${emailHeader("Credential Needs Attention")}

          <div style="padding:34px;color:#0f172a;font-size:15px;line-height:1.6;">
            <p>Hi <strong>${safeName}</strong>,</p>

            <p>Your <strong>${safeCredentialType}</strong> credential was not approved.</p>

            <div style="background:#fef2f2;border-left:5px solid #dc2626;padding:18px;border-radius:10px;margin:26px 0;color:#991b1b;">
              <strong>Reason:</strong><br />
              ${safeReason}
            </div>

            <p>Please update or replace the credential from your dashboard.</p>

            ${dashboardButton(dashboardUrl)}
          </div>
        </div>
      </div>
    `,
  });
}