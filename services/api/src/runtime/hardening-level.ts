/**
 * Single source of truth for DOABLE_HARDENING — read this in every jail
 * site (build, dev-server, runtime) so a `relaxed` or `off` setting in
 * dev/test disables jailing uniformly across all 3 layers.
 *
 * Levels:
 *   full     — vault.spawn with FS jail + cgroup + child-process limits
 *              (production default)
 *   relaxed  — vault.spawn with cgroup limits but no FS jail; legitimate
 *              dev workflows (debugger, profiler, ptrace) work
 *   off      — raw spawn, no jail at all (debug only)
 */
export type HardeningLevel = "full" | "relaxed" | "off";

export function getHardeningLevel(): HardeningLevel {
  const raw = (process.env.DOABLE_HARDENING ?? "full").toLowerCase();
  if (raw === "off" || raw === "relaxed" || raw === "full") return raw;
  return "full"; // unknown values fall back to safe default
}

/** Convenience: should the caller wrap its spawn with vault.spawn? */
export function shouldJail(): boolean {
  // Windows + macOS local dev: dovault's production isolation stack
  // (cgroups, bubblewrap, systemd hardening) is Linux-only. On Windows we
  // run raw. On macOS the default sandbox-exec (Seatbelt) profile aborts
  // Vite/Next dev servers immediately (SIGABRT, exit null) with no stderr,
  // leaving the editor stuck on "Preview failed to start". Real hardening
  // lives on Linux production hosts; local preview must use raw spawn.
  if (process.platform === "win32" || process.platform === "darwin") return false;
  return getHardeningLevel() !== "off";
}
