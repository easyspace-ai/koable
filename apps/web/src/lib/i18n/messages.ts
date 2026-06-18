import enAdmin from "../../../messages/en.admin.json";
import zhAdmin from "../../../messages/zh-CN.admin.json";
import enEditor from "../../../messages/en.editor.json";
import zhEditor from "../../../messages/zh-CN.editor.json";
import type { Locale, MessageNamespace, MessageTree } from "./types";

const catalogs: Record<Locale, Record<MessageNamespace, MessageTree>> = {
  en: {
    admin: enAdmin as MessageTree,
    editor: enEditor as MessageTree,
  },
  "zh-CN": {
    admin: zhAdmin as MessageTree,
    editor: zhEditor as MessageTree,
  },
};

export function getMessages(namespace: MessageNamespace, locale: Locale): MessageTree {
  return catalogs[locale][namespace];
}
