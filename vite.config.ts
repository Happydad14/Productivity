import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execFileSync } from 'node:child_process'

// ----------------------------------------------------
// EDIT HISTORY (baked in at build time)
// ----------------------------------------------------
// The header ticker shows when the app itself was last changed and which
// model made the change. That history lives in git, so it is read here at
// build time and injected as a constant — no runtime API call, which keeps
// the ticker working offline.

type AppEdit = {
  hash: string
  date: string
  subject: string
  model: string | null
  author: string
}

// %x1f / %x1e make git emit these control characters itself, which keeps the
// separators out of the argument string entirely.
const FIELD = '\x1f'
const RECORD = '\x1e'
const MAX_EDITS = 12

// Commits made by Claude carry a `Co-authored-by: Claude <model> <email>`
// trailer; an explicit `Model:` trailer wins if one is present. Anything
// without either is treated as a human edit and falls back to the author.
const parseModel = (body: string): string | null => {
  const explicit = /^\s*model:\s*(.+?)\s*$/im.exec(body)
  if (explicit) return explicit[1]
  for (const match of body.matchAll(/^\s*co-authored-by:\s*([^<\n]+?)\s*(?:<|$)/gim)) {
    const name = match[1].trim()
    if (/^claude\b/i.test(name)) return name
  }
  return null
}

const readGitEdits = (): AppEdit[] => {
  const format = ['%H', '%cI', '%an', '%s', '%b'].join('%x1f') + '%x1e'
  const raw = execFileSync('git', ['log', '--no-merges', '-n', String(MAX_EDITS), `--pretty=format:${format}`], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  })
  return raw
    .split(RECORD)
    .map(record => record.trim())
    .filter(Boolean)
    .map(record => {
      const [hash, date, author, subject, body = ''] = record.split(FIELD)
      return { hash: hash.slice(0, 7), date, author, subject, model: parseModel(body) }
    })
    .filter(edit => edit.hash && edit.date && edit.subject)
}

// Vercel builds from a shallow clone; if `git log` is unavailable for any
// reason, fall back to the single commit Vercel exposes through the
// environment, and finally to the build timestamp so the ticker is never
// empty on a deployed build.
const collectEdits = (buildTime: string): AppEdit[] => {
  try {
    const edits = readGitEdits()
    if (edits.length) return edits
  } catch {
    /* no git available — fall through */
  }

  const sha = process.env.VERCEL_GIT_COMMIT_SHA
  if (sha) {
    const message = process.env.VERCEL_GIT_COMMIT_MESSAGE || 'Deployed'
    const [subject, ...bodyLines] = message.split('\n')
    return [
      {
        hash: sha.slice(0, 7),
        date: buildTime,
        subject,
        author: process.env.VERCEL_GIT_COMMIT_AUTHOR_NAME || 'unknown',
        model: parseModel(bodyLines.join('\n')),
      },
    ]
  }

  return [{ hash: 'local', date: buildTime, subject: 'Local build', author: 'local', model: null }]
}

// https://vite.dev/config/
export default defineConfig(() => {
  const buildTime = new Date().toISOString()
  return {
    plugins: [react()],
    define: {
      __APP_EDITS__: JSON.stringify(collectEdits(buildTime)),
      __BUILD_TIME__: JSON.stringify(buildTime),
    },
  }
})
