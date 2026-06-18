export type Locale = "en" | "zh-CN";

export type MessageNamespace = "admin" | "editor";

export type MessageTree = {
  [key: string]: string | MessageTree;
};

export type TranslationParams = Record<string, string | number>;
