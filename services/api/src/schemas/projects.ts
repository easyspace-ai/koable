import { z } from "zod";
import { SLUG_REGEX, SLUG_MIN_LENGTH, SLUG_MAX_LENGTH } from "@doable/shared";

/** Strip HTML/script tags from user-supplied names to prevent stored XSS */
export const safeProjectName = (s: string) => s.replace(/<[^>]*>/g, "").trim();

/** Accept snake_case + bare aliases for legacy clients (BUG-PWA-002, BUG-API-002). */
export function normalizeProjectCreateBody(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const r = raw as Record<string, unknown>;
  return {
    ...r,
    workspaceId: r.workspaceId ?? r.workspace_id,
    templateId: r.templateId ?? r.template_id,
    folderId: r.folderId ?? r.folder_id,
    frameworkId: r.frameworkId ?? r.framework_id ?? r.framework,
  };
}

export const createProjectSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(100)
    .transform(safeProjectName)
    .pipe(z.string().min(1, "Name cannot be empty after sanitization")),
  slug: z.string().min(SLUG_MIN_LENGTH).max(SLUG_MAX_LENGTH).regex(SLUG_REGEX).optional(),
  description: z.string().max(500).optional(),
  templateId: z.string().uuid().optional(),
  folderId: z.string().uuid().optional(),
  workspaceId: z.string().uuid().optional(),
  prompt: z.string().max(5000).optional(),
  frameworkId: z.string().max(50).optional(),
});

export const updateProjectSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(100)
    .transform(safeProjectName)
    .pipe(z.string().min(1))
    .optional(),
  description: z.string().max(500).optional(),
  status: z.enum(["creating", "draft", "published", "error"]).optional(),
  visibility: z.enum(["public", "private"]).optional(),
  folderId: z.string().uuid().nullable().optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
