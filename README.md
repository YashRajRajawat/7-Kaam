# 7 Kaam — Unified Platform

AI-assisted skill certification for blue-collar workers, plus a local business data
collection pipeline that feeds the admin dashboard.

This tree is the single, unified project — the platform (`7kaam/`), the video assessment
engine (`Video_processing/`), and the business scraper (`business_scraper/`) all live here.

The workspace previously held a second folder, `DashanYash 7-Kaam/`. It was a clean clone
of the same repository at the same commit, with no unique files, no uncommitted work and
no unique commits, so it was removed once everything was verified to be present here.

---

## Layout

```
7-Kaam/
├── 7kaam/
│   ├── backend/          Express + Prisma API              → http://localhost:8000
│   ├── dashboard/        Next.js 14 admin dashboard        → http://localhost:3000
│   ├── user_app/
│   │   ├── flutter_sample_1/   Worker mobile app (Flutter)
│   │   └── customer_app/       Customer mobile app (Flutter)
│   └── START_7KAAM.bat   Launches backend + dashboard + both Flutter apps
├── business_scraper/     Playwright scraper (Google Maps / JustDial)
├── Data_Scraped/         Scraper output — the business directory's storage
└── Video_processing/     AI video assessment engine (Python, 153 tests)
```

## Business data flow

The scraper and the dashboard share one directory, so collected businesses show up
in the UI on their own:

```
User fills in the Collect Data form on /businesses
  → POST /api/v1/businesses/scrape
  → backend spawns business_scraper/main.py (one run at a time)
  → scraper writes Data_Scraped/google_maps_businesses.{json,csv,xlsx},
    checkpointing every 10 records and skipping duplicates
  → businessStore notices the file changed (name + size + mtime fingerprint)
    and reloads, normalising and de-duplicating the records
  → GET /api/v1/businesses serves them
  → the Businesses page and the Overview page render them
```

Because `Data_Scraped/` is the storage layer, everything collected survives a restart:
the dashboard loads it again on the next launch with no extra step.

**Where the data lives.** `Data_Scraped/` by default. Override with the
`SCRAPED_DATA_DIR` environment variable on the backend, or `SCRAPER_OUTPUT_DIR` /
`output_dir` in `business_scraper/config.yaml` for the scraper. All three resolve to
the same place unless you deliberately change one.

---

## Setup

### 1. Backend

```bash
cd 7kaam/backend
npm install
cp .env.example .env   # then fill in DATABASE_URL, JWT secrets, Supabase keys
npx prisma generate
npm run dev
```

Run the backend test suite with:

```bash
npm test --prefix 7kaam/backend
```

### 2. Dashboard

```bash
cd 7kaam/dashboard
npm install
npm run dev
```

Sign in at http://localhost:3000 with `admin@7kaam.in` / `Admin@7kaam`.

### 3. Business scraper

```bash
cd business_scraper
python -m venv venv
venv/Scripts/pip install -r requirements.txt
venv/Scripts/python -m playwright install chromium
```

The backend finds this venv automatically. Set `SCRAPER_PYTHON` in the backend `.env`
only if your interpreter lives somewhere else.

Run it standalone if you prefer:

```bash
cd business_scraper
venv/Scripts/python main.py --area "Jayanagar,HSR Layout" --category "Electrician,Plumber" --headless
```

`--area` and `--category` accept comma-separated lists. Omit them to use the areas and
categories in `config.yaml`. `python main.py --help` lists every flag.

### 4. Video processing engine (optional)

```bash
cd Video_processing
python -m venv .venv
.venv/Scripts/pip install -e .
.venv/Scripts/python -m pytest
```

### Everything at once (Windows)

```bash
7kaam/START_7KAAM.bat
```

---

## Businesses API

All endpoints require an admin bearer token (`SUPER_ADMIN`, `CITY_ADMIN`, or `REVIEWER`).

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/businesses` | Paginated list. Query: `search`, `category`, `city`, `area`, `status`, `hasPhone`, `hasWebsite`, `minRating`, `sort`, `page`, `limit` |
| `GET` | `/api/v1/businesses/:id` | One business |
| `GET` | `/api/v1/businesses/stats` | Totals, top categories/areas, average rating |
| `GET` | `/api/v1/businesses/filters` | Distinct categories / cities / areas for the dropdowns |
| `POST` | `/api/v1/businesses/refresh` | Force a re-read from disk |
| `POST` | `/api/v1/businesses/scrape` | Start a run. Body: `{ city, areas[], categories[], site, headless }` |
| `GET` | `/api/v1/businesses/scrape/status` | Live status and log tail |
| `POST` | `/api/v1/businesses/scrape/stop` | Stop the running scrape |

`search` matches every whitespace-separated term against the record's combined text,
so `carpenter jayanagar` finds carpenters located in Jayanagar.

---

## Notes

- Only one scrape runs at a time; a second request returns `409`. The scraper drives a
  real browser and appends to shared files, so concurrent runs would corrupt output.
  If a run's process dies without reporting back, the next request reconciles the job
  against the real process state instead of staying wedged on "running".
- Duplicates are removed twice over: the scraper skips records whose `source_url` or
  phone number it has already collected (including across restarts), and the backend
  de-duplicates again on read.
- A missing `Data_Scraped/` directory, a corrupt JSON file, or a malformed record all
  degrade to "fewer records" plus a warning in the API response — never a crash. A
  corrupt file is renamed `.corrupt` rather than overwritten.
- Progress tracking belongs to the page, not the scrape dialog, so closing the dialog
  during a run does not stop the updates. A run in progress is shown as a banner on
  the Businesses page and a "Collecting…" chip on the Overview page, and the lists
  refresh themselves when it ends.
- Stopping a run is not a failure. It is reported as `stopped`, the records already
  checkpointed are kept, and the browser process tree is terminated so no orphaned
  Chromium is left behind.
