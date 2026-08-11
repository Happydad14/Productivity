import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execFileSync } from 'node:child_process'

// ----------------------------------------------------
// LAST EDIT (baked in at build time)
// ----------------------------------------------------
// The header tagline shows when the app itself was last changed and which
// model made the change. That lives in git, so it is read here at build time
// and injected as a constant — no runtime API call, which keeps the tagline
// working offline.

type LastEdit = {
  date: string
  subject: string
  /** Model that made the edit, or null for a human commit. */
  model: string | null
}

// %x1f makes git emit the separator itself, which keeps a control character
// out of the argument string entirely.
const FIELD = '\x1f'

// Commits made by Claude carry a `Co-authored-by: Claude <model> <email>`
// trailer; an explicit `Model:` trailer wins if one is present. A commit with
// neither was a human edit — deliberately left unattributed rather than
// naming the git author.
const parseModel = (body: string): string | null => {
  const explicit = /^\s*model:\s*(.+?)\s*$/im.exec(body)
  if (explicit) return explicit[1]
  for (const match of body.matchAll(/^\s*co-authored-by:\s*([^<\n]+?)\s*(?:<|$)/gim)) {
    const name = match[1].trim()
    if (/^claude\b/i.test(name)) return name
  }
  return null
}

const readGitEdit = (): LastEdit | null => {
  const format = ['%cI', '%s', '%b'].join('%x1f')
  const raw = execFileSync('git', ['log', '--no-merges', '-n', '1', `--pretty=format:${format}`], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  })
  const [date, subject, body = ''] = raw.split(FIELD)
  if (!date || !subject) return null
  return { date, subject, model: parseModel(body) }
}

// Vercel builds from a shallow clone; if `git log` is unavailable for any
// reason, fall back to the commit Vercel exposes through the environment, and
// finally to the build timestamp so the tagline is never empty on a deploy.
const collectLastEdit = (buildTime: string): LastEdit => {
  try {
    const edit = readGitEdit()
    if (edit) return edit
  } catch {
    /* no git available — fall through */
  }

  const message = process.env.VERCEL_GIT_COMMIT_MESSAGE
  if (message) {
    const [subject, ...bodyLines] = message.split('\n')
    return { date: buildTime, subject, model: parseModel(bodyLines.join('\n')) }
  }

  return { date: buildTime, subject: 'Build', model: null }
}

// https://vite.dev/config/
export default defineConfig(() => {
  const buildTime = new Date().toISOString()
  return {
    plugins: [react()],
    define: {
      __LAST_EDIT__: JSON.stringify(collectLastEdit(buildTime)),
    },
  }
})
