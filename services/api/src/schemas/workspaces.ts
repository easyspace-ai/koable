import { z } from "zod";
import { SLUG_REGEX, SLUG_MIN_LENGTH, SLUG_MAX_LENGTH } from "@doable/shared";

/** Strip HTML/script tags from user-supplied names to prevent stored XSS */
export const safeWorkspaceName = (s: string) => s.replace(/<[^>]*>/g, "").trim();

export const createWorkspaceSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(100)
    .transform(safeWorkspaceName)
    .pipe(z.string().min(1, "Name cannot be empty after sanitization")),
  slug: z.string().min(SLUG_MIN_LENGTH).max(SLUG_MAX_LENGTH).regex(SLUG_REGEX),
  description: z.string().max(500).optional(),
  environmentId: z.string().uuid().optional(),
});

export const updateWorkspaceSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(100)
    .transform(safeWorkspaceName)
    .pipe(z.string().min(1))
    .optional(),
  description: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional(),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
