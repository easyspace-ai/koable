import { sql } from "../../db/index.js";

export async function assertToolCapableModel(
  providerId: string | undefined,
  modelId: string | undefined,
): Promise<void> {
  if (!providerId || !modelId) return;

  const [modelRow] = await sql<{ supports_tools: boolean }[]>`
    SELECT supports_tools
    FROM ai_provider_models
    WHERE provider_id = ${providerId} AND model_id = ${modelId}
    ORDER BY created_at DESC
    LIMIT 1
  `;
  if (modelRow && modelRow.supports_tools === false) {
    throw new Error(
      "Selected model does not support tool calling. Choose a model with tool calling enabled in AI Settings.",
    );
  }

  if (!modelRow) {
    const [providerRow] = await sql<{ supports_tools: boolean | null }[]>`
      SELECT supports_tools
      FROM ai_providers
      WHERE id = ${providerId}
      LIMIT 1
    `;
    if (providerRow?.supports_tools === false) {
      console.warn(
        `[Chat] Provider ${providerId} has supports_tools=false but no model-level row for model "${modelId}". Proceeding — model metadata may be missing.`,
      );
    }
  }
}
