import { db } from "@/lib/db";
import { Resend } from "resend";

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
      await resend.emails.send({
        from: "FormFlow <notifications@example.com>",
        to: user.email,
        subject: input.title,
        html: `
          <p>${input.body}</p>
          ${
            input.linkUrl
              ? `<p><a href="${input.linkUrl}">Open in FormFlow</a></p>`
              : ""
          }
        `,
      });
    } catch (error) {
      console.error("Failed to send email notification.", error);
    }
  }
}
