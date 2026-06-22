import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const fromEmail =
  process.env.RESEND_FROM_EMAIL ||
  "Indiana Notary Solutions <no-reply@indiananotarysolutions.com>";

const logoUrl =
  "https://img1.wsimg.com/isteam/ip/5d0c76c0-7737-4179-b443-5371edbb7539/blob.png/:/rs=w:180,h:180,cg:true,m/cr=w:180,h:180/qt=q:95";

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
    <div style="
      background:linear-gradient(135deg,#08142f,#0b1f4d,#08142f);
      padding:40px 32px;
      text-align:center;
    ">
      
      <img
        src="${logoUrl}"
        alt="Indiana Notary Solutions"
        width="170"
        style="
          display:block;
          margin:0 auto 24px auto;
          width:170px;
          height:auto;
          border:0;
        "
      />

      <h1 style="
        color:#ffffff;
        margin:0;
        font-size:42px;
        line-height:1.15;
        font-weight:800;
      ">
        Welcome to Indiana Notary Solutions
      </h1>

      <p style="
        color:#dbeafe;
        margin:18px 0 0;
        font-size:20px;
        line-height:1.5;
      ">
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
        style="background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 26px;border-radius:10px;font-weight:bold;display:inline-block;"
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

            <div style="background:#eff6ff;border-left:5px solid #2563eb;padding:18px;border-radius:10px;margin:26px 0;">
              <h2 style="margin-top:0;color:#1e3a8a;font-size:22px;">How It Works</h2>
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

            <p>Need help getting started?</p>

            <p>
              <strong>Email:</strong> support@indiananotarysolutions.com<br />
              <strong>Phone:</strong> (317) 123-4567
            </p>
          </div>

          <div style="background:#f8fafc;padding:22px;text-align:center;border-top:1px solid #e2e8f0;">
            <p style="font-size:13px;color:#64748b;margin:0;">Indiana Notary Solutions, LLC</p>
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

            <div style="background:#eff6ff;border-left:5px solid #2563eb;padding:18px;border-radius:10px;margin:26px 0;">
              <h2 style="margin-top:0;color:#1e3a8a;font-size:22px;">What You Can Use INS For</h2>
              <ul style="line-height:1.7;margin-bottom:0;padding-left:22px;">
                <li>Request mobile notary services.</li>
                <li>Coordinate loan signing appointments.</li>
                <li>Track order progress from assignment to completion.</li>
                <li>Communicate with our team about signing details.</li>
                <li>Work with qualified notaries across Indiana.</li>
              </ul>
            </div>

            <h2 style="font-size:22px;">What Happens Next</h2>

            <p><strong>1. Access Your Client Dashboard</strong><br />Your dashboard is where your company will manage signing requests, order activity, and communication with Indiana Notary Solutions.</p>

            <p><strong>2. Submit or Coordinate Orders</strong><br />As the platform expands, you’ll be able to submit signing requests, upload documents, and track status updates directly from your account.</p>

            <p><strong>3. Stay Updated</strong><br />We’ll keep you informed as orders move through assignment, confirmation, signing, document return, and completion.</p>

            ${dashboardButton(dashboardUrl)}

            <p>Need help getting started?</p>

            <p>
              <strong>Email:</strong> support@indiananotarysolutions.com<br />
              <strong>Phone:</strong> (317) 123-4567
            </p>
          </div>

          <div style="background:#f8fafc;padding:22px;text-align:center;border-top:1px solid #e2e8f0;">
            <p style="font-size:13px;color:#64748b;margin:0;">Indiana Notary Solutions, LLC</p>
            <p style="font-size:12px;color:#94a3b8;margin:6px 0 0;">
              Professional Mobile Notary and Signing Services Throughout Indiana
            </p>
          </div>
        </div>
      </div>
    `,
  });
}