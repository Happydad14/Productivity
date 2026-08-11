// When the app itself was last changed, injected by vite.config.ts at build
// time (see the `define` block there). Bundled as a plain constant so the
// header tagline renders with no network call — it works offline like the
// rest of the app.

export type LastEdit = {
  /** ISO 8601 timestamp of when the change landed. */
  date: string;
  /** Commit subject line. */
  subject: string;
  /** Model that made the edit, or null for a human commit. */
  model: string | null;
};

declare const __LAST_EDIT__: LastEdit;

// The `typeof` guard covers the dev-server-without-define edge case; Vite
// replaces the identifier textually, so this compares a real value.
export const LAST_EDIT: LastEdit | null =
  typeof __LAST_EDIT__ === 'undefined' ? null : __LAST_EDIT__;
