# Putting RecruitAI online (Vercel)

The app is ready for Vercel: Postgres database, private Vercel Blob storage
for CVs, and a build that runs database migrations automatically on
production deploys. These steps need your own accounts, so they're done by
you in the browser. About 20–30 minutes.

## 1. Put the code on GitHub

1. Create a free account at <https://github.com> and a new **private**
   repository (e.g. `recruitai`).
2. Commit and push this `recruitai` folder to it. Secrets (`.env`), the local
   database, and uploaded CVs are already excluded by `.gitignore`.

## 2. Create the Vercel project

1. Sign up at <https://vercel.com> using **Continue with GitHub**.
2. **Add New → Project**, pick the `recruitai` repository.
3. **Root Directory → Edit → choose `recruitai`.** The app lives in that
   subfolder of the repo; without this the build fails ("No Next.js version
   detected"). Leave Build Command and Install Command on their defaults —
   the `vercel-build` script in `package.json` is picked up automatically.
4. Framework is detected as **Next.js**. Don't deploy yet if it offers —
   add storage and settings first (if it already deployed and failed, that's
   expected; continue below and redeploy at the end).

## 3. Add the database and file storage

In the project: **Storage** tab.

1. **Create Database → Neon (Postgres)** → connect it to the project for
   all environments. This adds `DATABASE_URL` and `DATABASE_URL_UNPOOLED`.
2. **Create → Blob** → connect it to the project. This adds
   `BLOB_READ_WRITE_TOKEN`. CVs are stored as *private* blobs.

## 4. Add the remaining settings

**Settings → Environment Variables**, for *Production* (and Preview):

| Name | Value |
| --- | --- |
| `AUTH_SECRET` | A new random secret — run `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` and paste the output. Don't reuse the one in your local `.env`. |
| `ANTHROPIC_API_KEY` | From <https://console.anthropic.com> → **API keys**. Powers CV scoring; without it every CV shows "Scoring failed – retry". |
| `APP_URL` | Your site address, e.g. `https://recruitai.com` (use the `*.vercel.app` address until you have a domain). Used for links in emails. |

## 5. Deploy

**Deployments → Redeploy** (or push to GitHub). The build creates the
database tables on the first production deploy. Then open the site, go to
`/signup`, and create the first company account.

## 5b. Upgrade existing scores

Candidates scored before the AI scorer keep their old keyword score and show a
"Rescore" link on their page. To rescore them all at once, run locally with the
production `DATABASE_URL` and `ANTHROPIC_API_KEY` in `.env`:

```
npm run rescore
```

## 6. Get a domain

Easiest: **Settings → Domains → Buy** in Vercel (it's connected
automatically). Or buy one at Namecheap/Cloudflare, add it under
**Settings → Domains**, and create the DNS records Vercel shows.
Afterwards, update `APP_URL` to the new address and redeploy.

## Before inviting real companies

- **Emails don't send yet.** Confirmations, status updates, rejection notes
  and messages are saved to the `OutboundEmail` table only. Connect an email
  provider (e.g. Resend) before real applicants rely on them. Applicants still
  see their status link on the confirmation page.
- **Error messages are hidden in production.** Next.js replaces errors from
  form actions with a generic message, so e.g. "you've already applied"
  shows as a generic error. Worth fixing before launch.
- **Privacy.** You'll be storing CVs (personal data). Add a privacy policy
  and know where data lives (the Neon and Blob region you chose).

## Working locally

Local development uses its own Postgres (`npx prisma dev`). After a
restart of your computer, run `npm run db:local` before `npm run dev`. The
old SQLite data is kept in `prisma/dev.db` and `.env.sqlite-backup`.
