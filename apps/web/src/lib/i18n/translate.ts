import type { MessageTree, TranslationParams } from "./types";

export function translate(
  messages: MessageTree,
  key: string,
  params?: TranslationParams,
): string {
  const parts = key.split(".");
  let current: string | MessageTree | undefined = messages;

  for (const part of parts) {
    if (typeof current !== "object" || current === null) {
      return key;
    }
    current = current[part];
  }

  if (typeof current !== "string") {
    return key;
  }

  if (!params) {
    return current;
  }

  return current.replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = params[name];
    return value === undefined ? `{${name}}` : String(value);
  });
}
