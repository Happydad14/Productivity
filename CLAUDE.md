# Claude Code Instructions

## Auto-deploy after changes

After completing any code changes, always run:

```
git add .
git commit -m "<brief description of what changed>"
git push
```

This triggers an automatic Vercel redeploy. Do not wait for the user to ask — commit and push immediately after finishing the changes.

Include a model trailer on the commit so the header's last-edit tagline can
attribute the change (it reads `git log` at build time):

```
Co-authored-by: Claude <model name> <noreply@anthropic.com>
```

## Project info

- **Stack**: React 19 + Vite + TypeScript + Tailwind CSS
- **Hosting**: Vercel (auto-deploys from `main` branch) — live at https://productivity-jade.vercel.app/
- **GitHub**: https://github.com/Happydad14/Productivity
- **Theme**: Dark glassmorphism dashboard

## Key files

- `src/index.css` — all glassmorphism CSS, task item styles, scorecard row styles
- `src/components/TabDailyDashboard.tsx` — main dashboard tab
- `public/sw.js` — service worker powering offline mode (never cache `/api/*`)
- `vite.config.ts` — bakes the last git edit into the build for the tagline
