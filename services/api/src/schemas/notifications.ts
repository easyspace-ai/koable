import { z } from "zod";

export const notificationsListQuerySchema = z.object({
  workspaceId: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  unreadOnly: z.enum(["true", "false", "1", "0"]).optional(),
});

export const notificationItemSchema = z.object({
  id: z.string().uuid(),
  kind: z.string(),
  title: z.string(),
  body: z.string().nullable(),
  link: z.string().nullable(),
  isRead: z.boolean(),
  createdAt: z.string(),
});

export type NotificationsListQuery = z.infer<typeof notificationsListQuerySchema>;
