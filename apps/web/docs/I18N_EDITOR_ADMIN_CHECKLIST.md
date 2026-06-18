# Editor & Admin i18n Checklist

Chinese (`zh-CN`) and English (`en`) translation namespaces for self-hosted operator UI and editor chrome.

## Infrastructure

| Item | Status | Notes |
|------|--------|-------|
| Message files | ✅ Done | `messages/en.admin.json`, `zh-CN.admin.json`, `en.editor.json`, `zh-CN.editor.json` |
| Minimal shim | ✅ Done | `src/lib/i18n/use-translation.ts` wraps `next-intl` `useTranslations('admin' \| 'editor')` |
| Full next-intl / layout provider | ✅ Done | `NextIntlClientProvider` in layout; namespaces merged in `src/i18n/request.ts` |

**Key counts:** 129 admin keys, 131 editor keys (per locale).

## Migration status

### Admin (`useTranslation('admin')`)

| Component | Status | Key prefix |
|-----------|--------|------------|
| `plan-limits-panel.tsx` | ✅ Wired | `planLimits.*`, `common.*` |
| `user-management-panel.tsx` | 🟡 Partial | Toolbar, table headers, bulk bar — `userManagement.*` |
| `user-management-panel.tsx` modals | ⏳ Keys only | `UserDetailModal`, `BulkAllocateModal` — see JSON |
| Other admin panels | ⏳ Keys only | email, DNS, MFA, trace, audit, etc. |

### Settings — Database tab (`useTranslation('editor')`)

| Component | Status | Key prefix |
|-----------|--------|------------|
| `database-tab.tsx` | ✅ Wired | `settings.database.*` (nav) |
| `overview-pane.tsx` | ✅ Wired | `settings.database.*` |
| `schema-pane.tsx` | ⏳ Keys only | `settings.database.schema*` |
| `rows-pane.tsx` | ⏳ Keys only | — |
| `queries-pane.tsx` | ⏳ Keys only | `settings.database.queries*` |
| `migrations-pane.tsx` | ⏳ Keys only | `settings.database.migrations*` |
| `danger-pane.tsx` | ⏳ Keys only | `settings.database.danger*` |

### Editor modules (`useTranslation('editor')`)

| Component | Status | Key prefix |
|-----------|--------|------------|
| `toolbar/editor-toolbar.tsx` | ✅ Wired | `toolbar.*` |
| `toolbar/deploy-button.tsx` | ✅ Wired | `deploy.*` |
| `toolbar/deploy-dialog*.tsx` | ⏳ Keys only | extend `deploy.*` |
| `sidebar/editor-sidebar.tsx` | ✅ Wired | `sidebar.*` |
| `sidebar/pages-tab.tsx` | ✅ Wired | `pages.*` |
| `sidebar/version-history.tsx` | 🟡 Partial | Header, filters, empty states |
| `sidebar/knowledge-tab*.tsx` | ⏳ Keys only | `knowledge.*` |
| `sidebar/file-tree*.tsx` | ⏳ Keys only | — |

### Editor `page.tsx` chrome

| Area | Status | Key prefix |
|------|--------|------------|
| Top bar (back, preview status, scaffold) | ✅ Wired | `chrome.backToDashboard`, `chrome.previewingLastSaved`, … |
| View tabs (History, Preview, Code) | ✅ Wired | `chrome.tab*` |
| Chat input (Ask Doable, modes, attach) | ✅ Wired | `chrome.askDoable`, `chrome.strategize`, … |
| Building overlay | ✅ Wired | `chrome.building*`, `chrome.settingUpWorkspace` |
| Publish/deploy dialog progress | ✅ Wired | `chrome.buildingProject`, `chrome.deploying` |
| Preview toolbar (device modes, fullscreen) | ⏳ Keys only | `chrome.desktop`, `chrome.tablet`, … |
| Settings rail tabs (Design, Cloud, …) | ⏳ Keys only | add `chrome.settingsTabs.*` |
| Chat stream / tool-call cards | ⏳ Skip | High churn; migrate in Phase 3 |
| Keyboard shortcuts modal | ⏳ Keys only | — |

## Top 30 editor chrome strings (zh-CN targets)

Priority strings for Chinese operators — all live under `chrome.*` in `zh-CN.editor.json`:

| # | Key | English | 中文 |
|---|-----|---------|------|
| 1 | `chrome.askDoable` | Ask Doable... | 向 Doable 提问... |
| 2 | `chrome.building` | Building... | 构建中... |
| 3 | `chrome.buildingYourApp` | Building your app... | 正在构建你的应用... |
| 4 | `chrome.buildingFromPlan` | Building from plan... | 按计划构建中... |
| 5 | `chrome.buildingProject` | Building project... | 构建项目中... |
| 6 | `chrome.deploying` | Deploying... | 部署中... |
| 7 | `chrome.strategize` | Strategize | 规划 |
| 8 | `chrome.work` | Work | 工作 |
| 9 | `chrome.designView` | Design View | 设计视图 |
| 10 | `chrome.tabPreview` | Preview | 预览 |
| 11 | `chrome.tabCode` | Code | 代码 |
| 12 | `chrome.tabHistory` | History | 历史 |
| 13 | `chrome.backToDashboard` | Back to dashboard | 返回控制台 |
| 14 | `chrome.previewingLastSaved` | Previewing last saved version | 预览上次保存的版本 |
| 15 | `chrome.previewUnavailable` | Preview unavailable | 预览不可用 |
| 16 | `chrome.loadingLivePreview` | Loading Live Preview... | 加载实时预览中... |
| 17 | `chrome.gettingReady` | Getting ready... | 准备中... |
| 18 | `chrome.settingUpWorkspace` | Setting up workspace... | 正在设置工作区... |
| 19 | `chrome.stopGeneration` | Stop generation | 停止生成 |
| 20 | `chrome.voiceInput` | Voice input | 语音输入 |
| 21 | `chrome.attachFile` | Attach file (...) | 附加文件（...） |
| 22 | `chrome.deployToPublicUrl` | Deploy to a public URL | 部署到公开 URL |
| 23 | `chrome.desktop` | Desktop | 桌面 |
| 24 | `chrome.tablet` | Tablet (768px) | 平板 (768px) |
| 25 | `chrome.mobile` | Mobile (375px) | 手机 (375px) |
| 26 | `chrome.fullscreen` | Fullscreen | 全屏 |
| 27 | `chrome.refreshPreview` | Refresh preview | 刷新预览 |
| 28 | `chrome.takingLonger` | Taking longer than usual | 耗时比平时更长 |
| 29 | `chrome.preparingFiles` | Preparing files | 准备文件中 |
| 30 | `chrome.deployDialogHint` | This may take a moment... | 可能需要一点时间... |

## Phased plan — remaining `page.tsx` work

### Phase 1 — Done (this PR)
- Extract chrome strings to `en.editor.json` / `zh-CN.editor.json`
- Wire top bar, view tabs, chat input chrome, building overlay, publish progress (~40 replacements, &lt;200 lines in `page.tsx`)
- Wire standalone toolbar/sidebar modules

### Phase 2 — Settings rail & preview chrome (~150–250 lines)
- Settings side-rail tab labels (`Design`, `Cloud`, `Analytics`, …) — lines ~273–281
- Preview URL bar, device mode toggles, fullscreen — lines ~5349–5392
- Publish dialog static copy (env selector, success/error)
- `deploy-dialog-steps.tsx` strings

### Phase 3 — Chat & collaboration UI (~400+ lines, separate PRs)
- Tool-call collapse ("Show N earlier steps") — keep English grammar helpers separate
- Message actions (Good/Bad response, Copy)
- Collaborator/share dialogs
- Keyboard shortcuts overlay
- Do **not** monolith-refactor; one vertical slice per PR

### Phase 4 — Admin remainder
- User detail & bulk modals in `user-management-panel.tsx`
- `email-panel`, `dns-config-panel`, `mfa-panel`, trace/audit pages
- Integrate with global locale switcher when foundation adds it

## Usage

```tsx
import { useTranslation } from "@/lib/i18n";

function MyPanel() {
  const { t, locale } = useTranslation("admin");
  return <button>{t("common.save")}</button>;
}
```

Set locale: `import { setLocale } from "@/lib/i18n"; setLocale("zh-CN");`

## Replacing the shim

When next-intl (or project i18n foundation) lands:

1. Point `useTranslation` at the real provider (same signature).
2. Move JSON under the foundation's `messages/` layout if required.
3. Delete `src/lib/i18n/messages.ts` static imports if loader handles namespaces.
4. Keep dot-key paths unchanged to avoid re-touching migrated components.
