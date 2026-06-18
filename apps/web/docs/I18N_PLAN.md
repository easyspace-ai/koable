# Doable Web i18n Plan

## Library

**next-intl** (v4+) — first-class App Router support, Server Components, ICU messages, and cookie-based locale without mandatory URL prefixes.

Alternatives considered: `react-i18next` (heavier client setup), Next.js built-in routing i18n (Pages Router–oriented, forces `/en/...` URLs).

## Locale strategy

| Layer | Mechanism |
|-------|-----------|
| **Persistence** | `localStorage` key `doable_locale` (user choice) |
| **SSR / middleware** | Same-name cookie `doable_locale` synced from localStorage via inline bootstrap script |
| **First visit** | `Accept-Language` → `zh-CN` if Chinese preferred, else `en` |
| **URL prefix** | **Not used initially** — existing routes (`/dashboard`, `/login`, …) unchanged. Optional `[locale]` segment can be added in Phase 4. |

## File structure

```
apps/web/
├── messages/
│   ├── en.json          # English strings (namespaced)
│   └── zh-CN.json       # Simplified Chinese
├── src/i18n/
│   ├── config.ts        # Locales, labels, negotiation helpers
│   ├── request.ts       # next-intl getRequestConfig (reads cookie / Accept-Language)
│   └── locale-middleware.ts
├── src/components/
│   └── language-switcher.tsx
└── docs/I18N_PLAN.md    # this file
```

Message namespaces: `common`, `auth`, `dashboard`, `editor`, `settings`, `admin`, …

## Migration phases

### Phase 0 — Foundation (this PR) ✅

- [x] Install `next-intl`, wire plugin + `getRequestConfig`
- [x] `messages/en.json` + `messages/zh-CN.json` with `common` + `auth`
- [x] Root `NextIntlClientProvider` in `app/layout.tsx`
- [x] Middleware locale cookie + Accept-Language negotiation
- [x] `LanguageSwitcher` in dashboard sidebar user menu
- [x] Reference migration: **login page** (`auth` namespace)

### Phase 1 — Auth & onboarding

- [ ] Signup, forgot-password, reset-password, setup wizard
- [ ] Auth layout footer / legal links

### Phase 2 — Dashboard shell

- [ ] Sidebar nav labels, dialogs (create workspace/folder)
- [ ] Dashboard home, project list, templates, discover
- [ ] Settings, billing, usage, workspace settings

### Phase 3 — Secondary surfaces

- [ ] Marketplace, runtime, admin panels
- [ ] Legal pages (terms, privacy)
- [ ] Error / empty states, toasts

### Phase 4 — Editor (deferred)

- [ ] Editor chrome (tabs, panels, toolbars) — **not** full 7500-line page in one pass
- [ ] Split by module: sidebar, code panel, preview, AI chat

### Phase 5 — Optional URL prefix

- [ ] `[locale]` segment + `next-intl` routing if SEO/shareable localized URLs are needed

## How to add translations (for agents)

1. **Add keys** to both `messages/en.json` and `messages/zh-CN.json` under the appropriate namespace.
2. **Server Components**: `import { getTranslations } from "next-intl/server"` then `const t = await getTranslations("namespace")`.
3. **Client Components**: `"use client"` + `import { useTranslations } from "next-intl"` then `const t = useTranslations("namespace")`.
4. **ICU placeholders**: `"greeting": "Hello, {name}!"` → `t("greeting", { name })`.
5. **Nested keys**: `t("oauthErrors.missing_tokens")` or `useTranslations("auth.oauthErrors")`.
6. After adding keys, run `pnpm --filter @doable/web type-check`.

Do **not** hardcode user-visible strings in new UI; always add to message files.

## Modules remaining TODO

| Module | Path | Priority |
|--------|------|----------|
| Editor | `src/app/editor/**`, `src/modules/editor/**` | Phase 4 |
| Dashboard | `src/app/(dashboard)/**`, `src/components/dashboard/**` | Phase 2 |
| Settings / billing | `src/modules/settings/**`, billing pages | Phase 2–3 |
| Admin | `src/app/(dashboard)/admin/**` | Phase 3 |
| Marketplace | `src/app/marketplace/**` | Phase 3 |
| API error messages | Server-returned strings | Separate backend i18n effort |

## Blockers / notes

- **SSR vs localStorage**: Cookie must mirror `localStorage`; bootstrap script in root layout handles sync on load.
- **Middleware merge**: Auth gating and locale cookie share one `middleware.ts`; locale runs on all non-static routes.
- **Backend errors**: API error strings are still English until API i18n is scoped separately.
- **Cloudflare / standalone**: Message JSON is bundled via dynamic import in `request.ts`; no runtime filesystem reads.
