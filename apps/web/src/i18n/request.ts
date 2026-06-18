import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  negotiateLocale,
  isLocale,
  type Locale,
} from "./config";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;

  let locale: Locale = DEFAULT_LOCALE;
  if (isLocale(cookieLocale)) {
    locale = cookieLocale;
  } else {
    const headerStore = await headers();
    locale = negotiateLocale(headerStore.get("accept-language"));
  }

  const [
    base,
    admin,
    editor,
    dashboard,
    settings,
    integrations,
    environments,
    marketplace,
    skills,
  ] = await Promise.all([
    import(`../../messages/${locale}.json`),
    import(`../../messages/${locale}.admin.json`),
    import(`../../messages/${locale}.editor.json`),
    import(`../../messages/${locale}.dashboard.json`),
    import(`../../messages/${locale}.settings.json`),
    import(`../../messages/${locale}.integrations.json`),
    import(`../../messages/${locale}.environments.json`),
    import(`../../messages/${locale}.marketplace.json`),
    import(`../../messages/${locale}.skills.json`),
  ]);

  return {
    locale,
    messages: {
      ...base.default,
      admin: admin.default,
      editor: editor.default,
      dashboard: dashboard.default,
      settings: settings.default,
      integrations: integrations.default,
      environments: environments.default,
      marketplace: marketplace.default,
      skills: skills.default,
    },
  };
});
