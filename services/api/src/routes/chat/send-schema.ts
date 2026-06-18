import { z } from "zod";
import type { ByokProviderConfig } from "../../ai/providers/copilot.js";

export const PROVIDER_BACKED_MODEL_SOURCES = new Set([
  "user_preference",
  "workspace_default",
  "platform_default",
  "admin_override",
]);

export const sendMessageSchema = z.object({
  content: z
    .string()
    .max(100_000)
    .transform((s) => s.trim())
    .refine((s) => s.length >= 1, {
      message: "content must be non-empty after trim",
    }),
  displayContent: z.string().max(4_000).optional(),
  mode: z.enum(["agent", "plan", "visual-edit", "chat"]).default("agent"),
  model: z.string().optional(),
  provider: z
    .object({
      type: z.enum(["openai", "azure", "anthropic"]).optional(),
      baseUrl: z.string(),
      apiKey: z.string().optional(),
    })
    .optional(),
  providerId: z.string().uuid().optional(),
  copilotAccountId: z.string().uuid().optional(),
  attachments: z
    .array(
      z.object({
        type: z.string(),
        data: z.string(),
        name: z.string(),
      }),
    )
    .max(5)
    .optional(),
  projectFiles: z.array(z.string().max(500)).max(10).optional(),
  createIfMissing: z.boolean().optional().default(false),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export function assertModelHasProvider(
  resolvedModel: string | undefined,
  resolvedProvider: ByokProviderConfig | undefined,
  modelSource: string,
): void {
  if (
    resolvedModel &&
    !resolvedProvider &&
    PROVIDER_BACKED_MODEL_SOURCES.has(modelSource)
  ) {
    throw new Error(
      `No AI provider configured for the selected model "${resolvedModel}". Open AI Settings and pick a model from a connected provider.`,
    );
  }
}
