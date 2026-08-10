// Edit history for the header ticker, injected by vite.config.ts at build
// time (see the `define` block there). Bundled as a plain constant so the
// ticker renders with no network call — it works offline like the rest of
// the app.

export type AppEdit = {
  /** Short commit hash. */
  hash: string;
  /** ISO 8601 timestamp of when the change landed. */
  date: string;
  /** Commit subject line. */
  subject: string;
  /** Model that made the edit, or null when a human did. */
  model: string | null;
  /** Commit author — shown when no model made the edit. */
  author: string;
};

declare const __APP_EDITS__: AppEdit[];
declare const __BUILD_TIME__: string;

// The `typeof` guards cover the dev-server-without-define edge case; Vite
// replaces the identifiers textually, so these compare a real value.
export const APP_EDITS: AppEdit[] =
  typeof __APP_EDITS__ === 'undefined' ? [] : __APP_EDITS__;

export const BUILD_TIME: string =
  typeof __BUILD_TIME__ === 'undefined' ? '' : __BUILD_TIME__;
