#!/usr/bin/env node
/**
 * One-off generator for settings/integrations/environments/marketplace/skills message files.
 * Run: node scripts/generate-module-i18n.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const messagesDir = path.join(__dirname, "../messages");

const enEditor = JSON.parse(
  fs.readFileSync(path.join(messagesDir, "en.editor.json"), "utf8"),
);
const zhEditor = JSON.parse(
  fs.readFileSync(path.join(messagesDir, "zh-CN.editor.json"), "utf8"),
);

function write(name, data) {
  fs.writeFileSync(
    path.join(messagesDir, name),
    JSON.stringify(data, null, 2) + "\n",
  );
  console.log("wrote", name);
}

// ─── settings ───────────────────────────────────────────────

const enSettings = {
  tabs: {
    general: "General",
    database: "Database",
    integrations: "Integrations",
    mcp: "MCP Servers",
    skills: "Skills & Rules",
    context: "Knowledge",
    doableAi: "Doable AI",
    security: "Security",
    domain: "Custom Domain",
    environments: "Environments",
    danger: "Danger Zone",
  },
  shell: {
    errors: { failedLoadProject: "Failed to load project" },
    notFound: {
      title: "Project not found",
      description:
        "The project may have been deleted or you don't have access.",
    },
    skillsTab: {
      title: "Skills & Rules",
      description:
        "Manage reusable skills and rules that shape how the AI works across your workspace.",
    },
  },
  general: {
    projectDetails: {
      title: "Project Details",
      nameLabel: "Project Name",
      namePlaceholder: "My Project",
      descriptionLabel: "Description",
      descriptionPlaceholder: "A brief description of your project",
      visibilityLabel: "Visibility",
      public: { label: "Public", description: "Anyone can view" },
      private: { label: "Private", description: "Only you can access" },
      unsavedChanges: "You have unsaved changes",
      saveChanges: "Save Changes",
      saving: "Saving...",
    },
    toasts: { saved: "Project settings saved", saveFailed: "Failed to save" },
    projectInfo: {
      title: "Project Information",
      description: "Read-only metadata about your project.",
      projectId: "Project ID",
      created: "Created",
      lastUpdated: "Last Updated",
      projectUrl: "Project URL",
      status: "Status",
      visibility: "Visibility",
    },
  },
  integrationsTab: {
    title: "Integrations",
    description:
      "Connect third-party services and AI tools to extend your project.",
    githubSync: {
      title: "GitHub Sync",
      description: "Push and pull code changes to keep your project in sync.",
    },
  },
  github: {
    loading: "Loading GitHub settings...",
    title: "GitHub Integration",
    description:
      "Connect your project to GitHub for version control and collaboration.",
    notConnected: {
      title: "Not connected to GitHub",
      description:
        "Connect to push and pull code, track changes, and collaborate.",
      hint: "Use the GitHub button in the editor toolbar to connect this project.",
    },
    connectedRepo: "Connected Repository",
    branch: "Branch: {branch}",
    lastSynced: "Last synced: {date}",
    push: {
      title: "Push to GitHub",
      placeholder: "Commit message...",
      button: "Push",
      pushing: "Pushing...",
    },
    pull: {
      title: "Pull from GitHub",
      description:
        "Download the latest changes from the remote repository.",
      button: "Pull",
      pulling: "Pulling...",
    },
    forcePush: "Force Push (overwrite remote)",
    recentHistory: "Recent Sync History",
    disconnect: {
      title: "Disconnect Repository",
      description: "Removes the connection. Your code will not be deleted.",
      button: "Disconnect",
    },
    toasts: {
      pushed: "Pushed {filesChanged} files ({sha})",
      pulled: "Pulled {filesChanged} files",
      disconnected: "Disconnected from GitHub",
    },
    errors: {
      requestFailed: "Request failed",
      pushFailed: "Push failed",
      pullFailed: "Pull failed",
      disconnectFailed: "Disconnect failed",
    },
  },
  database: enEditor.settings.database,
  mcp: {
    panel: {
      title: "MCP Servers",
      description:
        "Connect Model Context Protocol servers to give your AI assistant access to external tools and data.",
      refreshTitle: "Refresh",
      addServer: "Add MCP Server",
      stats: {
        configured:
          "{count, plural, one {# server configured} other {# servers configured}}",
        active: "{count} active",
      },
      loading: "Loading MCP servers...",
      empty: {
        title: "No MCP servers configured",
        description:
          "MCP servers let your AI assistant use external tools like databases, APIs, file systems, and more.",
        addFirst: "Add Your First Server",
      },
    },
    transport: {
      streamableHttp: {
        label: "HTTP (Streamable)",
        description:
          "Connect to an HTTP-based MCP server with streaming support",
      },
      httpSse: {
        label: "Server-Sent Events (SSE)",
        description: "Connect via HTTP with Server-Sent Events",
      },
      stdio: {
        label: "Built-in App",
        description: "Server-managed local process",
      },
    },
    addForm: {
      title: "Add MCP Server",
      transportType: "Transport Type",
      serverUrl: "Server URL *",
      serverUrlPlaceholder: "https://mcp.example.com/v1",
      discover: "Discover",
      discoverTitle: "Discover server capabilities",
      command: "Command *",
      commandPlaceholder:
        "npx -y @modelcontextprotocol/server-filesystem",
      arguments: "Arguments (comma-separated)",
      argumentsPlaceholder: "/path/to/dir, --verbose",
      name: "Name *",
      namePlaceholder: "My MCP Server",
      autoDetected: "Auto-detected: {name}",
      description: "Description",
      descriptionPlaceholder: "What does this server provide?",
      authentication: "Authentication",
      authNone: "None",
      authApiKey: "API Key",
      authBearerToken: "Bearer Token",
      authOAuthToken: "OAuth Token",
      serverRequires: "Server requires: {authType}",
      bearerToken: "Bearer Token",
      bearerTokenPlaceholder: "Token sent as Authorization: Bearer ...",
      headerName: "Header Name",
      headerNamePlaceholder: "X-API-Key (default)",
      apiKey: "API Key",
      apiKeyPlaceholder: "Sent as the header value",
      oauth: {
        available: "OAuth authorization available",
        authorizationServer: "Authorization server: {issuer}",
        connected: "Connected successfully! You can close this form.",
        connect: "Connect with OAuth",
        waiting: "Waiting for authorization...",
        accessToken: "Access Token",
        accessTokenPlaceholder: "OAuth access token (manual entry)",
        manualHint:
          'Enter an access token manually, or enter the server URL above and click Discover to find the OAuth flow.',
        clientId: "Client ID (optional)",
        clientIdPlaceholder: "Client ID if required by the server",
        clientIdHint:
          "Some OAuth servers require a client ID. Leave empty if the server supports public clients.",
      },
      envVars: {
        label: "Environment Variables",
        add: "Add",
        emptyHint: "Optional. Passed to the stdio process via its environment.",
        keyPlaceholder: "KEY",
        valuePlaceholder: "value",
      },
      cancel: "Cancel",
      done: "Done",
      addServer: "Add Server",
      errors: {
        validUrl: "Enter a valid URL to discover",
        nameRequired: "Name is required",
        urlRequired: "Server URL is required for HTTP transports",
        commandRequired: "Command is required for stdio transport",
        addFailed: "Failed to add server",
        oauthMetadataMissing:
          "OAuth metadata not available. Enter the server URL and run discovery first.",
        popupBlocked:
          "Popup was blocked. Please allow popups for this site and try again.",
        oauthFailed: "OAuth connection failed",
        oauthStartFailed: "Failed to start OAuth flow",
      },
    },
    discovery: {
      notDetected: {
        title: "Server not auto-detected",
        fallback:
          "You can still add it manually — fill in the details below.",
      },
      discovered: {
        title: "Server discovered",
        viaServerCard: " via Server Card",
        viaMcpProbe: " via MCP handshake",
        name: "Name:",
        homepage: "Homepage",
        tools: "Tools",
        resources: "Resources",
        prompts: "Prompts",
        toolsAvailable: "{count} tools available:",
        moreTools: "+{count} more",
        requiresAuth: "⚠ This server requires {authType} authentication",
        oauthEndpointFound:
          '🔗 OAuth endpoint discovered — use the "Connect with OAuth" button below to authorize',
        oauthManualFallback:
          "OAuth metadata could not be auto-discovered. You can enter an access token manually below.",
      },
    },
    connectorCard: {
      fields: {
        transport: "Transport",
        url: "URL",
        command: "Command",
        args: "Args",
        auth: "Auth",
        scope: "Scope",
      },
      tools: "Tools ({count})",
      testConnection: "Test Connection",
      deactivate: "Deactivate",
      activate: "Activate",
      delete: "Delete",
      confirmDelete: "Confirm Delete",
      testInitiated: "Connection test initiated",
      testFailed: "Connection failed",
    },
    errors: { loadFailed: "Failed to load MCP servers" },
  },
  skillsRules: {
    panel: { retry: "Retry", loadFailed: "Failed to load skills & rules" },
    skills: {
      title: "Skills",
      description:
        "Skills teach the AI specific capabilities or knowledge. They are included in the AI's context when working on your projects.",
      add: "Add Skill",
      empty: "No skills yet. Add one to teach the AI new capabilities.",
    },
    rules: {
      title: "Rules",
      description:
        "Rules define constraints and conventions the AI must follow. File patterns control which files a rule applies to.",
      add: "Add Rule",
      empty: "No rules yet. Add one to set constraints for the AI.",
    },
    inlineEdit: { empty: "Empty", clickToEdit: "Click to edit" },
    skillCard: {
      contentPlaceholder: "Skill content...",
      delete: "Delete",
      deleteConfirm: "Delete this skill?",
      cancel: "Cancel",
    },
    createSkill: {
      title: "New Skill",
      nameLabel: "Name",
      namePlaceholder: "e.g. React Best Practices",
      contentLabel: "Content",
      contentPlaceholder: "Describe what this skill teaches the AI...",
      cancel: "Cancel",
      create: "Create",
    },
    ruleCard: {
      noFilePatterns: "No file patterns",
      noFilePatternsAllFiles: "No file patterns — applies to all files",
      filePatterns: "File Patterns",
      edit: "Edit",
      cancel: "Cancel",
      content: "Content",
      contentPlaceholder: "Rule content...",
      patternsPlaceholder: "*.tsx, *.ts, src/**/*.js",
      delete: "Delete",
      deleteConfirm: "Delete this rule?",
    },
    createRule: {
      title: "New Rule",
      nameLabel: "Name",
      namePlaceholder: "e.g. TypeScript Conventions",
      filePatternsLabel: "File Patterns",
      filePatternsOptional: "(comma-separated, optional)",
      filePatternsPlaceholder: "*.tsx, *.ts, src/**/*.js",
      contentLabel: "Content",
      contentPlaceholder: "Describe the rule the AI should follow...",
      cancel: "Cancel",
      create: "Create",
    },
  },
  context: {
    title: "Knowledge (.doable/)",
    description:
      "Knowledge files guide the AI's behavior when editing your project. Each file serves a different purpose.",
    budget: {
      summary: "{files} files, {tokens} tokens",
      used: "{percent}% of budget used",
    },
    fileEmpty: "Empty -- click to edit",
    characters: "{count} characters",
    refresh: "Refresh",
    toasts: {
      loadFailed: "Failed to load context files",
      saved: "Saved {filename}",
      saveFailed: "Failed to save",
    },
    editor: {
      unsaved: "Unsaved",
      chars: "{count} chars",
      save: "Save",
      saving: "Saving...",
      placeholder: "Start writing...",
      lastUpdated: "Last updated: {date}",
      shortcut: "Ctrl+S to save",
    },
  },
  doableAi: {
    errors: {
      loadFailed: "Failed to load AI settings",
      saveFailed: "Save failed.",
      eraseConfirm: 'Type "ERASE" exactly to confirm.',
      eraseFailed: "Erase failed.",
    },
    toasts: {
      saved: "Doable AI settings saved.",
      erased:
        "Erased {deleted} rows across {tables} table(s). Mode: {mode}.",
    },
    masterToggle: {
      title: "Doable AI for this project",
      description:
        "When disabled, /__doable/ai/* returns 503 AI_DISABLED_FOR_PROJECT. Useful for paused projects or quota lockouts.",
      enabled: "Enabled",
      disabled: "Disabled",
    },
    thinkingVisibility: {
      title: "Thinking content visibility",
      description:
        "How reasoning blocks (<think>, <reasoning>, <plan>…) are rendered in the generated chatbot UI.",
      auto: {
        label: "Auto (collapsed)",
        description:
          "Render inside a 💭 Thinking disclosure, collapsed by default.",
      },
      alwaysShow: {
        label: "Always show",
        description: "Render reasoning inline above the answer.",
      },
      hide: {
        label: "Hide entirely",
        description:
          "Strip <think> blocks server-side. The app never sees them.",
      },
    },
    systemPrompt: {
      title: "System prompt override",
      description:
        "Prepended to every runtime chat call. Visible to the model only — never echoed to the client. Up to 4 KB.",
      placeholder: "e.g. You always answer in haiku.",
      charCount:
        "{current} / {max} chars ({percent}%) — extra content beyond the cap is truncated client-side.",
      reset: "Reset to default",
    },
    chatModel: {
      title: "Chat model override",
      description:
        "Overrides the workspace-resolved chat model for runtime chat in this project's generated app.",
    },
    embeddingModel: {
      title: "Embedding model override (destructive)",
      description:
        "Changing the embedding model permanently erases all existing embeddings for this project because pgvector column dimensions are fixed per model.",
      current: "Current: {model}",
      currentDefault: "(workspace/platform default)",
      hint: "Click below to walk through the destructive confirmation.",
      changeButton: "Change embedding model…",
    },
    usage: {
      title: "Runtime token usage",
      description:
        "Aggregates of ai_usage_log rows for this project, grouped by mode.",
      periods: {
        today: "Today",
        "7d": "7d",
        "30d": "30d",
        all: "All time",
      },
      refresh: "Refresh",
      csv: "CSV",
      totalTokens: "Total tokens",
      requests: "Requests",
      estimatedCost: "Estimated cost",
      pricingNotConfigured: "Pricing not configured",
      table: {
        mode: "Mode",
        prompt: "Prompt",
        completion: "Completion",
        total: "Total",
        requests: "Requests",
      },
      noUsageYet: "No usage yet.",
      topModels: "Top models",
      modelStats: "{requests} req · {tokens} tok",
      noData: "No usage data.",
    },
    saveBar: {
      unsaved: "Unsaved changes",
      discard: "Discard",
      save: "Save",
    },
    eraseModal: {
      title: "Erase embeddings for this project?",
      description:
        "Changing the embedding model will permanently DELETE all existing embedding rows for this project (current model: {model}, {rows} rows across {tables} table(s)).",
      tableRows: "{table} — {rows} rows",
      newModelLabel: "New embedding model",
      newModelPlaceholder: "e.g. text-embedding-3-small or gemini-embedding-001",
      confirmLabel: "Type ERASE to confirm",
      confirmPlaceholder: "ERASE",
      cancel: "Cancel",
      confirm: "Erase embeddings & switch model",
    },
  },
  chatModelPicker: {
    inheritDefault: "Inherit workspace default ({model})",
    inheritDefaultNoModel: "Inherit workspace default",
    inheritDescription:
      "Use the model configured in AI Settings for this workspace.",
    overrideTitle: "Override for this project",
    overrideDescription:
      "Pick a provider and model from your workspace catalog.",
    loadingProviders: "Loading providers…",
    providerSource: "Provider source",
    githubCopilot: "GitHub Copilot",
    customProvider: "Custom provider",
    account: "Account",
    serverDefault: "Server default",
    model: "Model",
    loadingModels: "Loading models…",
    selectModel: "Select a model…",
    provider: "Provider",
    selectProvider: "Select a provider…",
    noProviders:
      "No workspace providers configured. Add one in AI Settings.",
    aiSettingsLink: "AI Settings",
    refreshTitle: "Refresh model list",
    refresh: "Refresh",
    noModelsDiscovered:
      "No models discovered yet. Click Refresh or check the provider in AI Settings.",
    selectProviderFirst: "Select a provider first.",
    currentOverride:
      "Current saved override: {model} — pick a model above to update it.",
    visionSuffix: " [vision]",
    toolsSuffix: " [tools]",
  },
  security: {
    apiKeys: {
      title: "API Keys",
      description:
        "Manage authentication keys for published apps. Auto-provisioned on first publish with tool-scoping and origin-binding.",
      saveKeyWarning: "Save this key — it won't be shown again",
      dismiss: "Dismiss",
      empty:
        "No API keys yet. Keys are auto-provisioned on first publish, or you can create one manually below.",
      toolsAllowed:
        "{count, plural, one {# tool allowed} other {# tools allowed}}",
      allTools: "All tools",
      anyOrigin: "Any origin",
      created: "Created {date}",
      lastUsed: "Last used {date}",
      revokeTitle: "Revoke key",
      createClientKey: "Create Client Key",
      createServerKey: "Create Server Key",
      explanation: {
        clientKeys:
          "Client keys (dpk_c_*): For browser apps. Origin-bound, lower rate limits (600/min).",
        serverKeys:
          "Server keys (dpk_s_*): For backend apps. No origin check, higher rate limits (1200/min).",
        autoProvisioned:
          "Auto-provisioned: When you publish, a client key is automatically created and scoped to exactly the MCP tools your app uses.",
      },
      toasts: {
        loadFailed: "Failed to load API keys",
        created:
          "API key created — copy it now, it won't be shown again",
        createFailed: "Failed to create key",
        revoked: "Key revoked",
        revokeFailed: "Failed to revoke key",
      },
      manualKeyLabel: "Manual {tier} key",
    },
    rateLimiting: {
      title: "Rate Limiting",
      description:
        "Control how many MCP tool calls and integration requests this project can make per minute.",
      modeLabel: "Rate Limit Mode",
      systemDefault: {
        label: "System Default",
        description:
          "600 calls/min for preview, 1200 calls/min for published apps with API keys",
      },
      custom: {
        label: "Custom Limit",
        description:
          "Set a specific calls-per-minute limit for this project",
        unit: "calls / minute",
      },
      unlimited: {
        label: "Unlimited (No Rate Limiting)",
        description:
          "Disable rate limiting entirely. Use with caution — external MCP servers may still apply their own limits.",
      },
      saveChanges: "Save Changes",
      toasts: {
        loadFailed: "Failed to load rate limit settings",
        saved: "Rate limiting settings saved",
        saveFailed: "Failed to save",
      },
    },
  },
  rateLimitingTab: {
    title: "MCP & Integration Rate Limiting",
    description:
      "Control how many MCP tool calls and integration requests this project can make per minute. Applies to all modes: preview, standalone, and published.",
    howItWorks: {
      title: "How it works",
      description: "Understanding the rate limiting architecture",
      paragraph1:
        "Rate limiting applies to all MCP tool calls and integration actions made by this project, regardless of how the app is accessed (editor preview, standalone URL, or published site).",
      paragraph2:
        "All requests flow through a single endpoint: /__doable/connector-proxy/mcp/:toolName",
      bullets: {
        previewAuth:
          "Preview & standalone: authenticated via short-lived JWT (15 min)",
        publishedAuth:
          "Published apps: authenticated via project API key (dpk_*)",
        sharedLimit:
          "Rate limit is shared across all auth modes for this project",
      },
    },
  },
  domain: {
    default: {
      title: "Default Domain",
      description:
        "Your project is always accessible at its .doable.me subdomain.",
      urlLabel: "Default URL",
      visit: "Visit",
    },
    custom: {
      title: "Custom Domain",
      description: "Serve your published site from your own domain name.",
      proFeature: {
        title: "Pro+ Feature",
        description:
          "Custom domains are available on the Pro plan and above. Upgrade your workspace to connect your own domain.",
        upgrade: "Upgrade to Pro",
      },
      placeholder: "app.example.com",
      addDomain: "Add Domain",
      empty:
        "No custom domains configured. Add one above to get started.",
      visit: "Visit",
      verify: "Verify",
      copyTargetTitle: "Copy target",
      configureDns: {
        title: "Configure DNS",
        description:
          "Add this CNAME record in your Cloudflare DNS dashboard with the proxy (orange cloud) enabled.",
        type: "Type",
        name: "Name",
        target: "Target",
        hint: "Your domain must be on Cloudflare DNS (free). The CNAME must be proxied (orange cloud ON). After adding the record, click Verify above.",
      },
      active: {
        title: "Domain Active — SSL and routing configured via Cloudflare",
        description:
          "HTTPS certificate managed by Cloudflare. Auto-renews.",
      },
    },
    status: {
      waitingForDns: "Waiting for DNS",
      verifying: "Verifying",
      sslProvisioning: "SSL Provisioning",
      active: "Active",
      failed: "Failed",
      removing: "Removing",
    },
    toasts: {
      added: "Domain {domain} added. Configure your DNS records below.",
      addFailed: "Failed to add domain",
      active: "{domain} is now active!",
      verificationFailed: "Verification failed",
      verifyFailed: "Verification check failed",
      removed: "Domain removed",
      removeFailed: "Failed to remove domain",
    },
  },
  environmentsTab: {
    projectEnvironment: {
      title: "Project Environment",
      description:
        "Override the workspace default environment for this project. The AI will use this environment's skills, rules, knowledge, and connectors.",
      noEnvironments:
        "No environments in this workspace yet. Create one from the Environments panel.",
      useDefault: "Use workspace default",
      overrideActive:
        "This project uses a custom environment override. The workspace default is bypassed.",
      inheritingDefault:
        "Inheriting from workspace default. Select an environment above to override.",
    },
    presets: {
      title: "Environment Presets",
      description:
        "Reusable bundles of skills, instructions, MCPs, and integrations applied to this workspace.",
      emptyTitle: "No environment presets",
      emptyDescription:
        "Create environment presets from the editor's Environments panel.",
    },
    deployment: {
      title: "Deployment",
      description: "Deployment environments for publishing your project.",
      production: {
        name: "Production",
        description: "Live site accessible to all visitors",
      },
      preview: {
        name: "Preview",
        description: "Test changes before publishing to production",
      },
      statusActive: "active",
      lastDeployed: "Last deployed: {date}",
      visit: "Visit",
    },
  },
  danger: {
    transfer: {
      title: "Transfer Project",
      description:
        "Transfer this project to another workspace. The project will be moved along with all its files, settings, and deployment history.",
      emailLabel: "Destination workspace owner email",
      emailPlaceholder: "owner@example.com",
      button: "Transfer Project",
      toast:
        "Transfer request sent. The recipient will receive an email to accept.",
    },
    delete: {
      title: "Delete Project",
      description:
        "Permanently delete this project and all its deployments, files, and data. This action cannot be undone.",
      button: "Delete This Project",
      confirmTitle: "Are you absolutely sure?",
      confirmDescription:
        "This will permanently delete {projectName} and all associated data. Type the project name below to confirm.",
      confirmLabel: "Type {projectName} to confirm",
      deleting: "Deleting...",
      confirmButton: "I understand, delete this project",
      cancel: "Cancel",
    },
    toasts: {
      deleted: "Project deleted successfully",
      deleteFailed: "Failed to delete project",
    },
  },
};

const zhSettings = {
  tabs: {
    general: "常规",
    database: "数据库",
    integrations: "集成",
    mcp: "MCP 服务器",
    skills: "技能与规则",
    context: "知识库",
    doableAi: "Doable AI",
    security: "安全",
    domain: "自定义域名",
    environments: "环境",
    danger: "危险操作",
  },
  shell: {
    errors: { failedLoadProject: "加载项目失败" },
    notFound: {
      title: "未找到项目",
      description: "项目可能已被删除，或您没有访问权限。",
    },
    skillsTab: {
      title: "技能与规则",
      description: "管理可复用的技能和规则，塑造 AI 在您工作区中的工作方式。",
    },
  },
  general: {
    projectDetails: {
      title: "项目详情",
      nameLabel: "项目名称",
      namePlaceholder: "我的项目",
      descriptionLabel: "描述",
      descriptionPlaceholder: "项目的简要描述",
      visibilityLabel: "可见性",
      public: { label: "公开", description: "任何人可查看" },
      private: { label: "私有", description: "仅您可访问" },
      unsavedChanges: "您有未保存的更改",
      saveChanges: "保存更改",
      saving: "保存中...",
    },
    toasts: { saved: "项目设置已保存", saveFailed: "保存失败" },
    projectInfo: {
      title: "项目信息",
      description: "关于您项目的只读元数据。",
      projectId: "项目 ID",
      created: "创建时间",
      lastUpdated: "最后更新",
      projectUrl: "项目 URL",
      status: "状态",
      visibility: "可见性",
    },
  },
  integrationsTab: {
    title: "集成",
    description: "连接第三方服务和 AI 工具以扩展您的项目。",
    githubSync: {
      title: "GitHub 同步",
      description: "推送和拉取代码变更以保持项目同步。",
    },
  },
  github: {
    loading: "正在加载 GitHub 设置...",
    title: "GitHub 集成",
    description: "将项目连接到 GitHub 以进行版本控制和协作。",
    notConnected: {
      title: "未连接到 GitHub",
      description: "连接后可推送和拉取代码、跟踪变更并协作。",
      hint: "使用编辑器工具栏中的 GitHub 按钮连接此项目。",
    },
    connectedRepo: "已连接的仓库",
    branch: "分支：{branch}",
    lastSynced: "上次同步：{date}",
    push: {
      title: "推送到 GitHub",
      placeholder: "提交信息...",
      button: "推送",
      pushing: "推送中...",
    },
    pull: {
      title: "从 GitHub 拉取",
      description: "从远程仓库下载最新变更。",
      button: "拉取",
      pulling: "拉取中...",
    },
    forcePush: "强制推送（覆盖远程）",
    recentHistory: "最近同步历史",
    disconnect: {
      title: "断开仓库连接",
      description: "移除连接。您的代码不会被删除。",
      button: "断开连接",
    },
    toasts: {
      pushed: "已推送 {filesChanged} 个文件（{sha}）",
      pulled: "已拉取 {filesChanged} 个文件",
      disconnected: "已断开 GitHub 连接",
    },
    errors: {
      requestFailed: "请求失败",
      pushFailed: "推送失败",
      pullFailed: "拉取失败",
      disconnectFailed: "断开连接失败",
    },
  },
  database: zhEditor.settings.database,
  mcp: {
    panel: {
      title: "MCP 服务器",
      description:
        "连接 Model Context Protocol 服务器，让 AI 助手访问外部工具和数据。",
      refreshTitle: "刷新",
      addServer: "添加 MCP 服务器",
      stats: {
        configured:
          "{count, plural, one {已配置 # 个服务器} other {已配置 # 个服务器}}",
        active: "{count} 个活跃",
      },
      loading: "正在加载 MCP 服务器...",
      empty: {
        title: "未配置 MCP 服务器",
        description:
          "MCP 服务器让 AI 助手使用数据库、API、文件系统等外部工具。",
        addFirst: "添加第一个服务器",
      },
    },
    transport: {
      streamableHttp: {
        label: "HTTP（流式）",
        description: "连接支持流式传输的 HTTP MCP 服务器",
      },
      httpSse: {
        label: "Server-Sent Events (SSE)",
        description: "通过 HTTP 和 Server-Sent Events 连接",
      },
      stdio: {
        label: "内置应用",
        description: "服务器管理的本地进程",
      },
    },
    addForm: {
      title: "添加 MCP 服务器",
      transportType: "传输类型",
      serverUrl: "服务器 URL *",
      serverUrlPlaceholder: "https://mcp.example.com/v1",
      discover: "发现",
      discoverTitle: "发现服务器能力",
      command: "命令 *",
      commandPlaceholder:
        "npx -y @modelcontextprotocol/server-filesystem",
      arguments: "参数（逗号分隔）",
      argumentsPlaceholder: "/path/to/dir, --verbose",
      name: "名称 *",
      namePlaceholder: "我的 MCP 服务器",
      autoDetected: "自动检测：{name}",
      description: "描述",
      descriptionPlaceholder: "此服务器提供什么？",
      authentication: "身份验证",
      authNone: "无",
      authApiKey: "API 密钥",
      authBearerToken: "Bearer 令牌",
      authOAuthToken: "OAuth 令牌",
      serverRequires: "服务器需要：{authType}",
      bearerToken: "Bearer 令牌",
      bearerTokenPlaceholder: "作为 Authorization: Bearer ... 发送的令牌",
      headerName: "请求头名称",
      headerNamePlaceholder: "X-API-Key（默认）",
      apiKey: "API 密钥",
      apiKeyPlaceholder: "作为请求头值发送",
      oauth: {
        available: "OAuth 授权可用",
        authorizationServer: "授权服务器：{issuer}",
        connected: "连接成功！您可以关闭此表单。",
        connect: "使用 OAuth 连接",
        waiting: "等待授权...",
        accessToken: "访问令牌",
        accessTokenPlaceholder: "OAuth 访问令牌（手动输入）",
        manualHint:
          "手动输入访问令牌，或在上方输入服务器 URL 并点击发现以找到 OAuth 流程。",
        clientId: "客户端 ID（可选）",
        clientIdPlaceholder: "服务器要求的客户端 ID",
        clientIdHint:
          "部分 OAuth 服务器需要客户端 ID。若服务器支持公共客户端，可留空。",
      },
      envVars: {
        label: "环境变量",
        add: "添加",
        emptyHint: "可选。通过环境传递给 stdio 进程。",
        keyPlaceholder: "KEY",
        valuePlaceholder: "value",
      },
      cancel: "取消",
      done: "完成",
      addServer: "添加服务器",
      errors: {
        validUrl: "请输入有效的 URL 以发现",
        nameRequired: "名称为必填项",
        urlRequired: "HTTP 传输需要服务器 URL",
        commandRequired: "stdio 传输需要命令",
        addFailed: "添加服务器失败",
        oauthMetadataMissing:
          "OAuth 元数据不可用。请输入服务器 URL 并先运行发现。",
        popupBlocked: "弹窗被阻止。请允许此网站的弹窗后重试。",
        oauthFailed: "OAuth 连接失败",
        oauthStartFailed: "启动 OAuth 流程失败",
      },
    },
    discovery: {
      notDetected: {
        title: "未能自动检测服务器",
        fallback: "您仍可手动添加 — 请填写以下详情。",
      },
      discovered: {
        title: "已发现服务器",
        viaServerCard: "（通过 Server Card）",
        viaMcpProbe: "（通过 MCP 握手）",
        name: "名称：",
        homepage: "主页",
        tools: "工具",
        resources: "资源",
        prompts: "提示",
        toolsAvailable: "可用 {count} 个工具：",
        moreTools: "还有 {count} 个",
        requiresAuth: "⚠ 此服务器需要 {authType} 身份验证",
        oauthEndpointFound:
          "🔗 已发现 OAuth 端点 — 使用下方「使用 OAuth 连接」按钮授权",
        oauthManualFallback:
          "无法自动发现 OAuth 元数据。您可以在下方手动输入访问令牌。",
      },
    },
    connectorCard: {
      fields: {
        transport: "传输",
        url: "URL",
        command: "命令",
        args: "参数",
        auth: "认证",
        scope: "范围",
      },
      tools: "工具（{count}）",
      testConnection: "测试连接",
      deactivate: "停用",
      activate: "启用",
      delete: "删除",
      confirmDelete: "确认删除",
      testInitiated: "连接测试已启动",
      testFailed: "连接失败",
    },
    errors: { loadFailed: "加载 MCP 服务器失败" },
  },
  skillsRules: {
    panel: { retry: "重试", loadFailed: "加载技能与规则失败" },
    skills: {
      title: "技能",
      description:
        "技能教会 AI 特定能力或知识。在处理项目时会包含在 AI 上下文中。",
      add: "添加技能",
      empty: "暂无技能。添加一个以教会 AI 新能力。",
    },
    rules: {
      title: "规则",
      description:
        "规则定义 AI 必须遵循的约束和约定。文件模式控制规则适用的文件。",
      add: "添加规则",
      empty: "暂无规则。添加一个以设置 AI 约束。",
    },
    inlineEdit: { empty: "空", clickToEdit: "点击编辑" },
    skillCard: {
      contentPlaceholder: "技能内容...",
      delete: "删除",
      deleteConfirm: "删除此技能？",
      cancel: "取消",
    },
    createSkill: {
      title: "新技能",
      nameLabel: "名称",
      namePlaceholder: "例如：React 最佳实践",
      contentLabel: "内容",
      contentPlaceholder: "描述此技能教会 AI 什么...",
      cancel: "取消",
      create: "创建",
    },
    ruleCard: {
      noFilePatterns: "无文件模式",
      noFilePatternsAllFiles: "无文件模式 — 适用于所有文件",
      filePatterns: "文件模式",
      edit: "编辑",
      cancel: "取消",
      content: "内容",
      contentPlaceholder: "规则内容...",
      patternsPlaceholder: "*.tsx, *.ts, src/**/*.js",
      delete: "删除",
      deleteConfirm: "删除此规则？",
    },
    createRule: {
      title: "新规则",
      nameLabel: "名称",
      namePlaceholder: "例如：TypeScript 约定",
      filePatternsLabel: "文件模式",
      filePatternsOptional: "（逗号分隔，可选）",
      filePatternsPlaceholder: "*.tsx, *.ts, src/**/*.js",
      contentLabel: "内容",
      contentPlaceholder: "描述 AI 应遵循的规则...",
      cancel: "取消",
      create: "创建",
    },
  },
  context: {
    title: "知识库 (.doable/)",
    description:
      "知识文件指导 AI 编辑项目时的行为。每个文件有不同的用途。",
    budget: {
      summary: "{files} 个文件，{tokens} 个 token",
      used: "已使用 {percent}% 预算",
    },
    fileEmpty: "空 — 点击编辑",
    characters: "{count} 个字符",
    refresh: "刷新",
    toasts: {
      loadFailed: "加载上下文文件失败",
      saved: "已保存 {filename}",
      saveFailed: "保存失败",
    },
    editor: {
      unsaved: "未保存",
      chars: "{count} 字符",
      save: "保存",
      saving: "保存中...",
      placeholder: "开始编写...",
      lastUpdated: "最后更新：{date}",
      shortcut: "Ctrl+S 保存",
    },
  },
  doableAi: {
    errors: {
      loadFailed: "加载 AI 设置失败",
      saveFailed: "保存失败。",
      eraseConfirm: '请准确输入 "ERASE" 以确认。',
      eraseFailed: "擦除失败。",
    },
    toasts: {
      saved: "Doable AI 设置已保存。",
      erased: "已擦除 {tables} 个表中的 {deleted} 行。模式：{mode}。",
    },
    masterToggle: {
      title: "此项目的 Doable AI",
      description:
        "禁用时，/__doable/ai/* 返回 503 AI_DISABLED_FOR_PROJECT。适用于暂停的项目或配额锁定。",
      enabled: "已启用",
      disabled: "已禁用",
    },
    thinkingVisibility: {
      title: "思考内容可见性",
      description:
        "推理块（<think>、<reasoning>、<plan>…）在生成的聊天 UI 中的渲染方式。",
      auto: {
        label: "自动（折叠）",
        description: "在 💭 思考 折叠面板中渲染，默认折叠。",
      },
      alwaysShow: {
        label: "始终显示",
        description: "在答案上方内联渲染推理内容。",
      },
      hide: {
        label: "完全隐藏",
        description:
          "在服务端剥离 <think> 块。应用永远不会看到它们。",
      },
    },
    systemPrompt: {
      title: "系统提示词覆盖",
      description:
        "前置到每次运行时聊天调用。仅模型可见 — 不会回显给客户端。最多 4 KB。",
      placeholder: "例如：你总是用俳句回答。",
      charCount:
        "{current} / {max} 字符（{percent}%）— 超出上限的内容将在客户端截断。",
      reset: "重置为默认",
    },
    chatModel: {
      title: "聊天模型覆盖",
      description:
        "覆盖此项目生成应用中运行时聊天的工作区解析聊天模型。",
    },
    embeddingModel: {
      title: "嵌入模型覆盖（破坏性）",
      description:
        "更改嵌入模型会永久擦除此项目的所有现有嵌入，因为 pgvector 列维度按模型固定。",
      current: "当前：{model}",
      currentDefault: "（工作区/平台默认）",
      hint: "点击下方进行破坏性确认流程。",
      changeButton: "更改嵌入模型…",
    },
    usage: {
      title: "运行时 token 用量",
      description: "此项目 ai_usage_log 行的聚合，按模式分组。",
      periods: {
        today: "今天",
        "7d": "7 天",
        "30d": "30 天",
        all: "全部",
      },
      refresh: "刷新",
      csv: "CSV",
      totalTokens: "总 token",
      requests: "请求数",
      estimatedCost: "预估费用",
      pricingNotConfigured: "未配置定价",
      table: {
        mode: "模式",
        prompt: "提示",
        completion: "补全",
        total: "总计",
        requests: "请求",
      },
      noUsageYet: "暂无用量。",
      topModels: "热门模型",
      modelStats: "{requests} 次请求 · {tokens} token",
      noData: "无用量数据。",
    },
    saveBar: {
      unsaved: "未保存的更改",
      discard: "放弃",
      save: "保存",
    },
    eraseModal: {
      title: "擦除此项目的嵌入？",
      description:
        "更改嵌入模型将永久删除此项目的所有现有嵌入行（当前模型：{model}，{tables} 个表共 {rows} 行）。",
      tableRows: "{table} — {rows} 行",
      newModelLabel: "新嵌入模型",
      newModelPlaceholder: "例如 text-embedding-3-small 或 gemini-embedding-001",
      confirmLabel: "输入 ERASE 以确认",
      confirmPlaceholder: "ERASE",
      cancel: "取消",
      confirm: "擦除嵌入并切换模型",
    },
  },
  chatModelPicker: {
    inheritDefault: "继承工作区默认（{model}）",
    inheritDefaultNoModel: "继承工作区默认",
    inheritDescription: "使用 AI 设置中为此工作区配置的模型。",
    overrideTitle: "为此项目覆盖",
    overrideDescription: "从工作区目录中选择提供商和模型。",
    loadingProviders: "正在加载提供商…",
    providerSource: "提供商来源",
    githubCopilot: "GitHub Copilot",
    customProvider: "自定义提供商",
    account: "账户",
    serverDefault: "服务器默认",
    model: "模型",
    loadingModels: "正在加载模型…",
    selectModel: "选择模型…",
    provider: "提供商",
    selectProvider: "选择提供商…",
    noProviders: "未配置工作区提供商。请在 AI 设置中添加。",
    aiSettingsLink: "AI 设置",
    refreshTitle: "刷新模型列表",
    refresh: "刷新",
    noModelsDiscovered:
      "尚未发现模型。点击刷新或在 AI 设置中检查提供商。",
    selectProviderFirst: "请先选择提供商。",
    currentOverride: "当前保存的覆盖：{model} — 在上方选择模型以更新。",
    visionSuffix: " [视觉]",
    toolsSuffix: " [工具]",
  },
  security: {
    apiKeys: {
      title: "API 密钥",
      description:
        "管理已发布应用的认证密钥。首次发布时自动配置，带工具范围和来源绑定。",
      saveKeyWarning: "请保存此密钥 — 不会再次显示",
      dismiss: "关闭",
      empty:
        "暂无 API 密钥。首次发布时自动配置，或在下方手动创建。",
      toolsAllowed:
        "{count, plural, one {允许 # 个工具} other {允许 # 个工具}}",
      allTools: "所有工具",
      anyOrigin: "任意来源",
      created: "创建于 {date}",
      lastUsed: "最后使用 {date}",
      revokeTitle: "撤销密钥",
      createClientKey: "创建客户端密钥",
      createServerKey: "创建服务端密钥",
      explanation: {
        clientKeys:
          "客户端密钥 (dpk_c_*)：用于浏览器应用。绑定来源，较低速率限制（600/分钟）。",
        serverKeys:
          "服务端密钥 (dpk_s_*)：用于后端应用。无来源检查，较高速率限制（1200/分钟）。",
        autoProvisioned:
          "自动配置：发布时自动创建客户端密钥，范围精确到应用使用的 MCP 工具。",
      },
      toasts: {
        loadFailed: "加载 API 密钥失败",
        created: "API 密钥已创建 — 请立即复制，不会再次显示",
        createFailed: "创建密钥失败",
        revoked: "密钥已撤销",
        revokeFailed: "撤销密钥失败",
      },
      manualKeyLabel: "手动 {tier} 密钥",
    },
    rateLimiting: {
      title: "速率限制",
      description: "控制此项目每分钟可发起的 MCP 工具调用和集成请求数。",
      modeLabel: "速率限制模式",
      systemDefault: {
        label: "系统默认",
        description:
          "预览 600 次/分钟，带 API 密钥的已发布应用 1200 次/分钟",
      },
      custom: {
        label: "自定义限制",
        description: "为此项目设置特定的每分钟调用次数",
        unit: "次/分钟",
      },
      unlimited: {
        label: "无限制（不限速）",
        description:
          "完全禁用速率限制。请谨慎使用 — 外部 MCP 服务器可能仍有自己的限制。",
      },
      saveChanges: "保存更改",
      toasts: {
        loadFailed: "加载速率限制设置失败",
        saved: "速率限制设置已保存",
        saveFailed: "保存失败",
      },
    },
  },
  rateLimitingTab: {
    title: "MCP 与集成速率限制",
    description:
      "控制此项目每分钟可发起的 MCP 工具调用和集成请求数。适用于所有模式：预览、独立和已发布。",
    howItWorks: {
      title: "工作原理",
      description: "了解速率限制架构",
      paragraph1:
        "速率限制适用于此项目的所有 MCP 工具调用和集成操作，无论通过何种方式访问（编辑器预览、独立 URL 或已发布站点）。",
      paragraph2:
        "所有请求通过单一端点：/__doable/connector-proxy/mcp/:toolName",
      bullets: {
        previewAuth: "预览和独立：通过短期 JWT（15 分钟）认证",
        publishedAuth: "已发布应用：通过项目 API 密钥 (dpk_*) 认证",
        sharedLimit: "此项目的速率限制在所有认证模式间共享",
      },
    },
  },
  domain: {
    default: {
      title: "默认域名",
      description: "您的项目始终可通过 .doable.me 子域名访问。",
      urlLabel: "默认 URL",
      visit: "访问",
    },
    custom: {
      title: "自定义域名",
      description: "使用您自己的域名提供已发布站点。",
      proFeature: {
        title: "Pro+ 功能",
        description:
          "自定义域名在 Pro 计划及以上可用。升级工作区以连接您自己的域名。",
        upgrade: "升级到 Pro",
      },
      placeholder: "app.example.com",
      addDomain: "添加域名",
      empty: "未配置自定义域名。在上方添加一个以开始。",
      visit: "访问",
      verify: "验证",
      copyTargetTitle: "复制目标",
      configureDns: {
        title: "配置 DNS",
        description:
          "在 Cloudflare DNS 控制台中添加此 CNAME 记录，并启用代理（橙色云）。",
        type: "类型",
        name: "名称",
        target: "目标",
        hint: "您的域名必须在 Cloudflare DNS 上（免费）。CNAME 必须启用代理（橙色云开启）。添加记录后，点击上方验证。",
      },
      active: {
        title: "域名已激活 — SSL 和路由已通过 Cloudflare 配置",
        description: "HTTPS 证书由 Cloudflare 管理。自动续期。",
      },
    },
    status: {
      waitingForDns: "等待 DNS",
      verifying: "验证中",
      sslProvisioning: "SSL 配置中",
      active: "已激活",
      failed: "失败",
      removing: "移除中",
    },
    toasts: {
      added: "域名 {domain} 已添加。请在下方配置 DNS 记录。",
      addFailed: "添加域名失败",
      active: "{domain} 现已激活！",
      verificationFailed: "验证失败",
      verifyFailed: "验证检查失败",
      removed: "域名已移除",
      removeFailed: "移除域名失败",
    },
  },
  environmentsTab: {
    projectEnvironment: {
      title: "项目环境",
      description:
        "覆盖此项目的工作区默认环境。AI 将使用此环境的技能、规则、知识和连接器。",
      noEnvironments: "此工作区尚无环境。请从环境面板创建一个。",
      useDefault: "使用工作区默认",
      overrideActive: "此项目使用自定义环境覆盖。工作区默认已被绕过。",
      inheritingDefault: "继承工作区默认。在上方选择环境以覆盖。",
    },
    presets: {
      title: "环境预设",
      description: "应用于工作区的可复用技能、指令、MCP 和集成包。",
      emptyTitle: "无环境预设",
      emptyDescription: "从编辑器的环境面板创建环境预设。",
    },
    deployment: {
      title: "部署",
      description: "用于发布项目的部署环境。",
      production: {
        name: "生产",
        description: "所有访客可访问的线上站点",
      },
      preview: {
        name: "预览",
        description: "发布到生产前测试变更",
      },
      statusActive: "活跃",
      lastDeployed: "最后部署：{date}",
      visit: "访问",
    },
  },
  danger: {
    transfer: {
      title: "转移项目",
      description:
        "将此项目转移到另一个工作区。项目及其所有文件、设置和部署历史将一并移动。",
      emailLabel: "目标工作区所有者邮箱",
      emailPlaceholder: "owner@example.com",
      button: "转移项目",
      toast: "转移请求已发送。接收者将收到邮件以接受。",
    },
    delete: {
      title: "删除项目",
      description:
        "永久删除此项目及其所有部署、文件和数据。此操作不可撤销。",
      button: "删除此项目",
      confirmTitle: "您确定吗？",
      confirmDescription:
        "这将永久删除 {projectName} 及所有关联数据。请在下方输入项目名称以确认。",
      confirmLabel: "输入 {projectName} 以确认",
      deleting: "删除中...",
      confirmButton: "我理解，删除此项目",
      cancel: "取消",
    },
    toasts: {
      deleted: "项目已成功删除",
      deleteFailed: "删除项目失败",
    },
  },
};

write("en.settings.json", enSettings);
write("zh-CN.settings.json", zhSettings);

// ─── integrations, environments, marketplace, skills ────────
// (continued in part 2 due to size — load from external JSON blobs)

const enIntegrations = JSON.parse(
  fs.readFileSync(path.join(__dirname, "i18n-data/en.integrations.json"), "utf8"),
);
const zhIntegrations = JSON.parse(
  fs.readFileSync(path.join(__dirname, "i18n-data/zh-CN.integrations.json"), "utf8"),
);
const enEnvironments = JSON.parse(
  fs.readFileSync(path.join(__dirname, "i18n-data/en.environments.json"), "utf8"),
);
const zhEnvironments = JSON.parse(
  fs.readFileSync(path.join(__dirname, "i18n-data/zh-CN.environments.json"), "utf8"),
);
const enMarketplace = JSON.parse(
  fs.readFileSync(path.join(__dirname, "i18n-data/en.marketplace.json"), "utf8"),
);
const zhMarketplace = JSON.parse(
  fs.readFileSync(path.join(__dirname, "i18n-data/zh-CN.marketplace.json"), "utf8"),
);
const enSkills = JSON.parse(
  fs.readFileSync(path.join(__dirname, "i18n-data/en.skills.json"), "utf8"),
);
const zhSkills = JSON.parse(
  fs.readFileSync(path.join(__dirname, "i18n-data/zh-CN.skills.json"), "utf8"),
);

write("en.integrations.json", enIntegrations);
write("zh-CN.integrations.json", zhIntegrations);
write("en.environments.json", enEnvironments);
write("zh-CN.environments.json", zhEnvironments);
write("en.marketplace.json", enMarketplace);
write("zh-CN.marketplace.json", zhMarketplace);
write("en.skills.json", enSkills);
write("zh-CN.skills.json", zhSkills);

console.log("done");
