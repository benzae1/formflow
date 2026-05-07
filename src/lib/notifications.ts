import { db } from "./db";

export async function createInAppNotification(input: {
  userId: string;
  type: string;
  title: string;
  body: string;
  linkUrl?: string;
}) {
  return db.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      linkUrl: input.linkUrl,
    },
  });
}
