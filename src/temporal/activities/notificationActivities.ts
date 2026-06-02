import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { Resend } from "resend";

const emailDeliveryEnabled =
  Boolean(process.env.RESEND_API_KEY) &&
  process.env.DISABLE_EMAIL_DELIVERY !== "true";
const emailFromAddress = process.env.EMAIL_FROM_ADDRESS?.trim() ?? "";

if (emailDeliveryEnabled && !emailFromAddress) {
  throw new Error("EMAIL_FROM_ADDRESS must be configured when email delivery is enabled.");
}

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function sendNotification(input: {
  userId: string;
  type: string;
  title: string;
  body: string;
  linkUrl?: string;
  email?: boolean;
}) {
  const user = await db.user.findUnique({
    where: { id: input.userId },
  });

  await db.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      linkUrl: input.linkUrl,
    },
  });

  const canSendEmail =
    input.email &&
    user?.email &&
    resend &&
    process.env.DISABLE_EMAIL_DELIVERY !== "true";

  if (canSendEmail) {
    try {
      const linkUrl = toAbsoluteAppUrl(input.linkUrl);
      await resend.emails.send({
        from: emailFromAddress,
        to: user.email,
        subject: input.title,
        html: `
          <p>${escapeHtml(input.body)}</p>
          ${
            linkUrl
              ? `<p><a href="${escapeHtml(linkUrl)}">Open in FormFlow</a></p>`
              : ""
          }
        `,
      });
    } catch (error) {
      logger.error({ err: error }, "Failed to send email notification");
    }
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toAbsoluteAppUrl(linkUrl?: string) {
  if (!linkUrl) {
    return null;
  }

  const appUrl = process.env.NEXTAUTH_URL?.trim() || process.env.APP_URL?.trim();
  if (!appUrl) {
    return linkUrl.startsWith("/") ? linkUrl : null;
  }

  return new URL(linkUrl, appUrl).toString();
}
