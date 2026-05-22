# Spicy Data Dashboard

A public research dashboard modeled on Porter & Co. “Spicy Data” — six flagship macro/credit charts plus a **live ticker lookup**.

**Live repo:** [github.com/joshhop21/Spicy-Data-Dashboard](https://github.com/joshhop21/Spicy-Data-Dashboard)

---

## What this project does

| Piece | How it works |
|--------|----------------|
| **6 chart tiles** | Data lives in `data/*.json`. The site reads those files when it builds. |
| **Nightly refresh** | GitHub Actions runs Python scripts, updates JSON, and pushes to GitHub. |
| **Ticker search** | You type a symbol → the site calls `/api/quote` → live price from Yahoo Finance. |
| **Hosting** | Vercel builds and hosts the site for free when you push to GitHub. |

---

## Step-by-step setup (never done this before? start here)

### Step 1 — Install Node.js (required for the website)

1. Open [https://nodejs.org](https://nodejs.org)
2. Download the **LTS** version (green button).
3. Run the installer — click **Next** through the defaults.
4. **Close and reopen** PowerShell or Cursor terminal so `node` and `npm` work.

**Check it worked:**

```powershell
node -v
npm -v
```

You should see version numbers (for example `v22.x` and `10.x`).

---

### Step 2 — Install Python packages (required for chart data scripts)

You already have Python. In PowerShell:

```powershell
cd "C:\Users\joshu\OneDrive\Desktop\Spicy Data Dashboard"
python -m pip install -r scripts/requirements.txt
```

---

### Step 3 — Run the site on your computer

```powershell
cd "C:\Users\joshu\OneDrive\Desktop\Spicy Data Dashboard"
npm install
```

Copy the example env file (for local FRED use later):

```powershell
copy .env.example .env.local
```

Edit `.env.local` in Notepad and paste your **FRED API key** (optional for now; needed when we wire FRED charts).

Start the dev server:

```powershell
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

- You should see **6 tiles** and a **ticker search** box.
- **BTC Price vs. Hash Rate** has chart data (sample data until live APIs succeed).
- Other tiles say “Data pending” until their fetch scripts are added.

---

### Step 4 — Refresh chart JSON locally (optional)

```powershell
python scripts/fetch_all.py
```

If Yahoo/blockchain APIs are rate-limited, the BTC script falls back to sample data automatically.

---

### Step 5 — Install Git (required to push to GitHub)

1. Open [https://git-scm.com/download/win](https://git-scm.com/download/win)
2. Run the installer (defaults are fine).
3. **Close and reopen** your terminal.

**Check:**

```powershell
git --version
```

---

### Step 6 — Put your code on GitHub

**Only do this once** when the folder is not yet connected to GitHub.

```powershell
cd "C:\Users\joshu\OneDrive\Desktop\Spicy Data Dashboard"
git init
git add .
git commit -m "Initial Spicy Data Dashboard scaffold"
git branch -M main
git remote add origin https://github.com/joshhop21/Spicy-Data-Dashboard.git
git push -u origin main
```

If Git asks you to sign in, use the browser window or a [Personal Access Token](https://github.com/settings/tokens) as your password.

**Already pushed before?** Use:

```powershell
git add .
git commit -m "Describe your change"
git push
```

---

### Step 7 — Add your FRED API key to GitHub (for nightly data)

1. Open [https://github.com/joshhop21/Spicy-Data-Dashboard/settings/secrets/actions](https://github.com/joshhop21/Spicy-Data-Dashboard/settings/secrets/actions)
2. Click **New repository secret**
3. Name: `FRED_API_KEY`
4. Value: your FRED key (use a **new** key if you ever pasted one in chat)
5. Click **Add secret**

---

### Step 8 — Deploy on Vercel (free public URL)

1. Sign up at [https://vercel.com](https://vercel.com) (use “Continue with GitHub”).
2. Click **Add New… → Project**.
3. Import **Spicy-Data-Dashboard**.
4. Leave defaults (Framework: Next.js) → **Deploy**.
5. Wait ~2 minutes. Vercel gives you a URL like `https://spicy-data-dashboard.vercel.app`.

**Optional:** Project Settings → Environment Variables → add `FRED_API_KEY` (same as GitHub).

Every `git push` to `main` redeploys the site automatically.

---

### Step 9 — Turn on nightly data refresh

The file `.github/workflows/refresh-data.yml` is already included.

1. On GitHub, open the **Actions** tab.
2. If prompted, click **I understand my workflows, go ahead and enable them**.
3. Click **Refresh chart data** → **Run workflow** to test manually.
4. After it runs, check that `data/` files were updated in a new commit.

Schedule: every day at **6:15 AM UTC**.

---

## Project structure (quick map)

```text
app/
  page.tsx              ← Home grid + ticker search
  charts/[slug]/page.tsx ← Detail page per chart
  api/quote/route.ts    ← Live ticker price
components/             ← Tiles, charts, header
data/*.json             ← Chart data (committed to git)
scripts/                ← Python fetchers for GitHub Actions
.github/workflows/      ← Nightly cron job
```

---

## Phase 1 status

| Chart | Data script | Status |
|--------|-------------|--------|
| BTC Price vs. Hash Rate | `fetch_btc_hash_rate.py` | Working (live or sample fallback) |
| Marty’s Distressed | — | Placeholder tile |
| CDCI | `fetch_cdci.py` | Live on GitHub Actions; sample fallback locally if Yahoo rate-limits |
| Berkshire ROE | `fetch_berkshire_roe.py` | Rolling 10y BVPS % change (BRK-B) |
| Inflation vs 70s | `fetch_inflation_70s.py` | FRED CPI YoY overlay |
| Gold Fair Value | — | Placeholder |

---

## Adding a new chart later

1. Add a fetch script in `scripts/`.
2. Write `data/your-slug.json`.
3. Register the slug in `lib/tiles.ts` and `lib/loadChartData.ts`.
4. Add the script name to `scripts/fetch_all.py`.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `npx` / `npm` not found | Install Node.js (Step 1), restart terminal |
| Ticker search fails | Try a common symbol (`AAPL`). Deploy to Vercel — some networks block Yahoo locally |
| yfinance rate limit | Wait and re-run, or rely on GitHub Actions + sample fallback |
| Git push rejected | Run `git pull --rebase origin main` then push again |

---

## Security

- Never commit `.env.local` or API keys.
- Rotate any key that was shared in chat or screenshots.
