# Dashboard & Auth i18n Migration Checklist

Prepared for next-intl integration (parallel work). Translation keys live in:

- `messages/en.dashboard.json` (English source)
- `messages/zh-CN.dashboard.json` (Simplified Chinese)

## Integration notes

1. **Namespace**: Load both files under the `dashboard` namespace (filename convention). Example:
   ```tsx
   const t = useTranslations("dashboard");
   t("common.cancel"); // → "Cancel" / "取消"
   ```
2. **Client components**: `useTranslations()` from `next-intl`.
3. **Server components** (if any added later): `getTranslations()`.
4. **ICU params**: Keys with `{name}`, `{count}`, etc. use `t("key", { name, count })`.
5. **Auth routes**: Login/signup live at `src/app/(auth)/login/` and `src/app/(auth)/signup/` (not `src/app/login/`).

## Key inventory

| Section | Approx. keys |
|---------|-------------|
| `common` | 22 |
| `auth.login` | 28 |
| `auth.signup` | 30 |
| `sidebar` | 7 |
| `dashboard.*` | 95+ |
| `setup.*` | 45+ |
| `billing.*` | 22 |
| `workspace.*` | 55+ |
| **Total** | **~300** |

---

## Priority 1 — Navigation & dashboard project list

### `src/app/(dashboard)/dashboard/page.tsx`

| Line | English | Key |
|------|---------|-----|
| 98 | `Home` | `common.home` |
| 102 | `Starred` / `Created by me` / `Shared with me` | `dashboard.breadcrumb.*` |
| 106 | `Starred Projects` / `My Projects` / `Shared Projects` | `dashboard.breadcrumb.*` |
| 116 | `Retry` | `common.retry` |
| 129 | `New project` | `dashboard.newProject` |
| 158 | `Loading projects...` | `dashboard.loading.projects` |
| 194–204 | `Name` / `Status` / `Updated` | `dashboard.table.*` |
| 237 | `Loading templates...` | `dashboard.loading.templates` |
| 251 | `No templates available.` | `dashboard.empty.noTemplates` |
| 267–270 | Empty state titles | `dashboard.empty.*` |
| 273–275 | Empty state descriptions | `dashboard.empty.*` |
| 279 | `Import from GitHub` | `dashboard.empty.importFromGitHub` |
| 284 | `Clear all filters` | `dashboard.empty.clearAllFilters` |
| 299 | `Loading...` / `Load more` | `common.loading` / `dashboard.pagination.loadMore` |
| 303–304 | Showing X of Y projects | `dashboard.pagination.showing` |

### `src/app/(dashboard)/dashboard/dashboard-toolbar.tsx`

| Line | English | Key |
|------|---------|-----|
| 37–39 | Tab labels | `dashboard.toolbar.recentlyViewed` etc. |
| 73 | `Browse all` | `dashboard.toolbar.browseAll` |
| 87 | `Search projects...` | `dashboard.toolbar.searchPlaceholder` |
| 107–121 | Status filter labels | `dashboard.toolbar.*` |
| 138 | `Starred` | `dashboard.toolbar.starred` |
| 150/159 | Grid/List view titles | `dashboard.toolbar.gridView` / `listView` |
| 171 | `{n} selected` | `dashboard.toolbar.selected` |
| 177–197 | Bulk actions | `dashboard.toolbar.*` / `common.*` |

### `src/app/(dashboard)/dashboard/dashboard-dialogs.tsx`

| Line | English | Key |
|------|---------|-----|
| 67–74 | Delete dialog | `dashboard.dialogs.deleteProject*` / `common.*` |
| 83–90 | Bulk delete | `dashboard.dialogs.deleteProjects*` |
| 99–112 | Rename dialog | `dashboard.dialogs.renameProject` / `common.*` |
| 121–141 | Move to folder | `dashboard.dialogs.moveToFolder*` |

### `src/app/(dashboard)/dashboard/dashboard-context-menu.tsx`

| Line | English | Key |
|------|---------|-----|
| 44–60 | All menu items | `dashboard.contextMenu.*` / `common.*` |

### `src/app/(dashboard)/dashboard/dashboard-constants.ts`

| Line | English | Key |
|------|---------|-----|
| 14–20 | `GREETINGS` array | `dashboard.greetings.*` (use `t.raw` or map) |
| 54–70 | `STATUS_STYLES.*.label` | `dashboard.toolbar.*` |
| 73–84 | `DASHBOARD_SUGGESTIONS` | `dashboard.suggestions` (array) |
| 110–115 | `formatRelativeTime` | `dashboard.time.*` |
| 118–124 | `formatDate` | Use `Intl.DateTimeFormat(locale)` |

### `src/app/(dashboard)/dashboard/dashboard-hooks.ts`

| Line | English | Key |
|------|---------|-----|
| 18 | Greeting template | `dashboard.greetings.withName` |
| 29–56 | Typing placeholder | `dashboard.suggestions[i]` + `dashboard.chatInput.defaultPlaceholder` |
| 56 | Fallback placeholder | `dashboard.chatInput.defaultPlaceholder` |

### `src/app/(dashboard)/dashboard/use-dashboard.ts`

| Line | English | Key |
|------|---------|-----|
| 135 | `Failed to load projects` | `dashboard.loadProjectsFailed` |
| 248 | `Creating project…` | `dashboard.creatingProject` |
| 263 | `Connecting to AI…` | `dashboard.connectingToAi` |
| 280 | Create failed | `dashboard.createProjectFailed` |
| 298–307 | Toast messages | `dashboard.toasts.*` |

### `src/modules/dashboard/components/sidebar.tsx`

| Line | English | Key |
|------|---------|-----|
| 116–193 | Section headers & empty states | `sidebar.*` |

---

## Priority 2 — Setup wizard

### `src/app/setup/WizardShell.tsx`

| Line | English | Key |
|------|---------|-----|
| 23–29 | `STEP_LABELS` | `setup.steps.*` |
| 113 | `Setup` | `setup.brandSetup` |
| 117 | `Step {n} of {total}` | `setup.stepOf` |

### `src/app/setup/steps/Step1Welcome.tsx`

All user-visible strings → `setup.welcome.*`

### `src/app/setup/steps/Step3SignInProviders.tsx`

| Line | English | Key |
|------|---------|-----|
| 30–73 | Provider config | `setup.signInProviders.providers.*` |
| 124–290 | UI chrome | `setup.signInProviders.*` / `common.*` |

### `src/app/setup/steps/Step4Integrations.tsx`

All user-visible strings → `setup.plansBilling.*` / `common.*`

### `src/app/setup/steps/StepCloudflare.tsx`

All user-visible strings → `setup.cloudflare.*` / `common.*`

### `src/app/setup/steps/Step2AIProvider.tsx` ⚠️ Phase 2

Large file (~1100 lines). Keys prepared for shell actions only; provider catalog names come from `@doable/shared` and should stay as product names. Migrate:

- Page title / description
- Search placeholder
- Back / Skip / Continue buttons
- Copilot panel labels
- Success/error toasts

Add keys under `setup.aiProvider.*` when migrating this file.

### `src/app/setup/steps/PlanDefaultsInline.tsx` ⚠️ Phase 2

Not yet extracted — add keys when sibling agent scopes admin/setup overlap.

---

## Priority 3 — Auth UI

### `src/app/(auth)/login/page.tsx`

| Line | English | Key |
|------|---------|-----|
| 13–20 | `OAUTH_ERROR_MESSAGES` | `auth.login.errors.*` |
| 134–143 | Rate limit / pending / generic | `auth.login.errors.*` |
| 182 | Verification failed | `auth.login.errors.verificationFailed` |
| 209–447 | All form UI | `auth.login.*` |

### `src/app/(auth)/signup/page.tsx`

| Line | English | Key |
|------|---------|-----|
| 61–79 | Validation errors | `auth.signup.*` |
| 142–436 | All form UI | `auth.signup.*` / `auth.login.*` (shared OAuth) |

### `src/app/(auth)/signup/signup-utils.ts`

| Line | English | Key |
|------|---------|-----|
| 13–16 | Strength labels | `auth.signup.strength.*` |
| 21–25 | Criteria labels | `auth.signup.criteria.*` |

Refactor to accept `t` or return keys instead of English labels.

---

## Priority 4 — Billing & credits

### `src/modules/billing/components/credit-display.tsx`

| Line | English | Key |
|------|---------|-----|
| 35 | `Unlimited` | `common.unlimited` |
| 62 | `{used} / {total} used` | `billing.credits.used` |
| 91 | No credit info | `billing.credits.noInfo` |
| 119–160 | Labels & stats | `billing.credits.*` |
| 191–194 | Toolbar indicator | `billing.credits.toolbar*` |

### `src/modules/billing/components/pricing-cards.tsx`

| Line | English | Key |
|------|---------|-----|
| 37–139 | All pricing UI | `billing.pricing.*` |

Note: `plan.name`, `plan.description`, `plan.features` come from API — translate server-side or add locale-aware plan catalog later.

---

## Priority 5 — Workspace settings

### `src/modules/workspace/components/workspace-settings.tsx`

| Line | English | Key |
|------|---------|-----|
| 99–103 | Tab labels | `workspace.tabs.*` |

### `src/modules/workspace/components/workspace-settings-general.tsx`

All labels → `workspace.general.*` / `common.*`

### `src/modules/workspace/components/workspace-settings-danger.tsx`

All labels → `workspace.danger.*` / `common.*`

### `src/modules/workspace/components/members-page.tsx`

All labels → `workspace.members.*`

### `src/modules/workspace/components/members-dialogs.tsx`

All labels → `workspace.members.*` / `common.*`

### `src/modules/workspace/components/members-rows.tsx`

Toast/error strings → `workspace.members.*`

### `src/modules/workspace/components/members-components.tsx` ⚠️ Phase 2

Audit for any remaining hardcoded strings.

---

## Dashboard modules (secondary)

### `src/modules/dashboard/components/workspace-switcher.tsx`

→ `dashboard.workspaceSwitcher.*` / `common.*`

### `src/modules/dashboard/components/create-project-dialog.tsx`

→ `dashboard.createProject.*` / `common.*`

### `src/modules/dashboard/components/import-github-project-dialog.tsx`

→ `dashboard.importGitHub.*` / `common.*`

### `src/modules/dashboard/components/workspace-setup-wizard.tsx` ⚠️ Phase 2

Extract step titles, integration names, environment wizard copy to `dashboard.workspaceSetup.*`

### `src/app/(dashboard)/dashboard/dashboard-chat-input.tsx`

→ `dashboard.chatInput.*`

### `src/app/(dashboard)/dashboard/dashboard-project-card.tsx` / `dashboard-project-row.tsx`

Status badges use `STATUS_STYLES` — migrate via constants. Card menu duplicates context menu keys.

### `src/app/(dashboard)/dashboard/templates/page.tsx` ⚠️ Phase 2

In scope path; audit when migrating template gallery.

---

## Migration pattern (once next-intl is wired)

```tsx
"use client";
import { useTranslations } from "next-intl";

export function DashboardToolbar() {
  const t = useTranslations("dashboard");
  // ...
  return <button>{t("toolbar.recentlyViewed")}</button>;
}
```

For arrays (greetings, suggestions):

```tsx
const t = useTranslations("dashboard");
const greetings = [
  t("greetings.letsMakeItDoable"),
  t("greetings.whatsDoableToday"),
  // ...
];
```

For `formatRelativeTime`, pass locale from `useLocale()` and use translated unit strings.

---

## Remaining / out of scope

| Area | Reason |
|------|--------|
| Editor UI | Explicitly excluded |
| `@/components/templates/*` | Shared with editor; coordinate separately |
| `@/components/dashboard/sidebar` | Main app sidebar (outside `modules/dashboard`); may share `sidebar.*` keys |
| `@/modules/discover/share-dialog` | Used by project cards; not in scope |
| API error strings (`err.body.error`) | Backend i18n needed |
| Framework/template names from API | Product data, not UI chrome |
| `Step2AIProvider.tsx` provider catalog | From `@doable/shared`; keep English names or translate catalog separately |

---

## Verification

After migration:

```bash
cd apps/web && pnpm lint
```

Manually verify locale switch shows Chinese on: login, dashboard home, setup wizard, workspace settings, credit display.

---

## Migration status (Phase 2)

| File | Status |
|------|--------|
| `src/app/(auth)/login/page.tsx` | ✅ Done |
| `src/app/(dashboard)/dashboard/page.tsx` | ✅ Done |
| `src/app/(dashboard)/dashboard/dashboard-toolbar.tsx` | ✅ Done |
| `src/components/dashboard/sidebar.tsx` | ✅ Partial — nav labels (Search, Templates, etc.) and upgrade CTA still English |
| `src/modules/dashboard/components/sidebar.tsx` | ✅ Done |
| `src/app/setup/WizardShell.tsx` | ✅ Done |
| `src/app/setup/steps/Step1Welcome.tsx` | ✅ Done |
| `src/app/(dashboard)/dashboard/dashboard-dialogs.tsx` | ⬜ P1 remaining |
| `src/app/(dashboard)/dashboard/dashboard-context-menu.tsx` | ⬜ P1 remaining |
| `src/app/(dashboard)/dashboard/dashboard-constants.ts` | ⬜ P1 remaining |
| `src/app/(dashboard)/dashboard/dashboard-hooks.ts` | ⬜ P1 remaining |
| `src/app/(dashboard)/dashboard/use-dashboard.ts` | ⬜ P1 remaining |
| `src/app/setup/steps/Step3SignInProviders.tsx` | ⬜ P2 |
| `src/app/setup/steps/Step4Integrations.tsx` | ⬜ P2 |
| `src/app/setup/steps/StepCloudflare.tsx` | ⬜ P2 |
| `src/app/setup/steps/Step2AIProvider.tsx` | ⬜ P2 (shell only) |
