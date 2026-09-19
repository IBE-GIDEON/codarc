# Connecting Codarc to GitHub

This is what lets Codarc actually send a change to your repo instead of just
showing it to you. Takes about 5 minutes. Do it once.

**Do not paste any of these secrets into a chat.** Put them straight into
`.env.local` yourself.

---

## 1. Make the app

Go to **https://github.com/settings/apps/new**

Fill in:

| Field | What to put |
|---|---|
| GitHub App name | `Codarc` (if taken, `Codarc Dev` or add your name) |
| Homepage URL | `https://YOUR-DOMAIN` |
| Callback URL | `https://YOUR-DOMAIN/api/github/callback` |

Replace `YOUR-DOMAIN` with your live address, e.g. `codarc.dev` or
`codarc.vercel.app`. **Deploy first so you know what it is.**

> You can add a second callback URL later (`http://localhost:3001/api/github/callback`)
> if you ever want to test on your laptop. GitHub allows up to 10.

Then:

- **Tick** "Request user authorization (OAuth) during installation"
- **Untick** "Active" under Webhook (we don't use webhooks)

## 2. Set what it's allowed to do

Scroll to **Repository permissions** and set exactly these three:

| Permission | Set to |
|---|---|
| Contents | Read and write |
| Pull requests | Read and write |
| Metadata | Read-only (it sets itself) |

Leave everything else alone. Under **Where can this app be installed**, pick
**Only on this account**.

Click **Create GitHub App**.

## 3. Collect four things

You're now on the app's settings page.

1. **App ID** — near the top, a number like `1234567`
2. **Client ID** — just below it, starts with `Iv23...`
3. **Client secret** — click *Generate a new client secret*, copy it now
   (GitHub only shows it once)
4. **Private key** — scroll to the bottom, click *Generate a private key*.
   A `.pem` file downloads.

## 4. Put them in `.env.local`

In the Codarc folder, open `.env.local` (make it if it isn't there) and add:

```
GITHUB_APP_ID=1234567
GITHUB_APP_CLIENT_ID=Iv23...
GITHUB_APP_CLIENT_SECRET=...
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----"
```

For the private key: open the `.pem` file in Notepad, copy everything, and
replace every line break with `\n` so it sits on one line inside the quotes.

> Easier option: put the `.pem` file in the Codarc folder and instead write
> `GITHUB_APP_PRIVATE_KEY_PATH=codarc.private-key.pem`. Codarc reads either.
> The folder already ignores `*.pem` so it can't get committed by accident.

## 5. Install it on a repo

Still in the app's settings, click **Install App** in the left sidebar, pick
your account, and choose **Only select repositories** — then pick the one you
want to try.

## 6. Add the keys to your host

Put the same four values into your hosting provider's environment variables
(on Vercel: Project → Settings → Environment Variables), along with:

```
ANTHROPIC_API_KEY=sk-ant-...
GITHUB_TOKEN=github_pat_...
```

Redeploy. Open a map, click a box, draft a change, and **Connect GitHub** will
work.

---

## Heads up on hosting

Reading a big repository takes 20–40 seconds. Vercel's free plan kills
functions at 10 seconds, so you need the **Pro** plan — or lower `MAX_FILES`
in `src/lib/analyze.ts` so it reads fewer files.
