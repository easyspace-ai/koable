/**
 * RFC 4122 UUID shape (any version, any variant). Validate at route
 * boundaries so malformed ids get a clean 400 instead of Postgres
 * `invalid input syntax for type uuid` surfacing as 500.
 */
export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** @deprecated Use UUID_REGEX — kept for callers that imported UUID_RE */
export const UUID_RE = UUID_REGEX;

export function isUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}
