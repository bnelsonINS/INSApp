import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendNotaryWelcomeEmail({
  to,
  fullName,
}: {
  to: string;
  fullName: string;
}) {
  const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/notary/dashboard`;

  return resend.emails.send({
    from:
      process.env.RESEND_FROM_EMAIL ||
      "Indiana Notary Solutions <no-reply@indiananotarysolutions.com>",
    to,
    subject: "Welcome to Indiana Notary Solutions",
    html: `
      <div style="font-family:Arial,sans-serif;background:#f1f5f9;padding:30px;">
        <div style="max-width:650px;margin:auto;background:white;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;">
          <div style="background:#0f172a;padding:28px;text-align:center;">
            <img src="https://img1.wsimg.com/isteam/ip/5d0c76c0-7737-4179-b443-5371edbb7539/blob.png/:/rs=w:100,h:100,cg:true,m/cr=w:100,h:100/qt=q:95" alt="Indiana Notary Solutions" style="max-width:240px;height:auto;margin-bottom:14px;" />
            <h1 style="color:white;margin:0;">Welcome to Indiana Notary Solutions</h1>
            <p style="color:#cbd5e1;">Connecting Indiana notaries with signing opportunities</p>
          </div>

          <div style="padding:34px;color:#0f172a;">
            <p>Hi <strong>${fullName}</strong>,</p>

            <p>Welcome to <strong>Indiana Notary Solutions</strong>. We’re excited to have you join our network of professional notaries and signing agents serving clients throughout Indiana.</p>

            <p>Our platform helps connect qualified notaries with signing opportunities while giving you tools to manage your profile, credentials, coverage area, assignments, messages, and payments in one place.</p>

            <div style="background:#eff6ff;border-left:5px solid #2563eb;padding:18px;border-radius:10px;margin:26px 0;">
              <h2 style="margin-top:0;color:#1e3a8a;">How It Works</h2>
              <ol>
                <li>We receive signing requests from clients.</li>
                <li>We match assignments with qualified notaries in the service area.</li>
                <li>You receive assignment opportunities by email, SMS, or dashboard notification.</li>
                <li>You accept the assignment and complete the signing.</li>
                <li>Documents are returned and payment is processed according to title company terms.</li>
              </ol>
            </div>

            <h2>What To Do Next</h2>

            <p><strong>1. Complete Your Profile</strong><br />Verify your contact information, address, phone number, and account details.</p>

            <p><strong>2. Upload Your Credentials</strong><br />Upload your notary commission, background screening, E&O insurance, certification, and other required documents.</p>

            <p><strong>3. Set Your Coverage Area</strong><br />Add the counties, zip codes, and travel preferences where you are available for assignments.</p>

            <div style="text-align:center;margin:34px 0;">
              <a href="${dashboardUrl}" style="background:#2563eb;color:white;text-decoration:none;padding:14px 26px;border-radius:10px;font-weight:bold;display:inline-block;">
                Go To My Dashboard
              </a>
            </div>

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