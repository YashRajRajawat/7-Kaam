# Local Business Data Collection Pipeline

A production-quality Python pipeline that collects publicly available business information from **JustDial** and **Google Maps** for local businesses across Bangalore, and exports them to **Excel**, **CSV**, and **JSON**.

---

## Features

| Feature | Details |
|---|---|
| **Data Sources** | JustDial, Google Maps |
| **Search by** | City, Area, Pincode, Category |
| **Output formats** | Excel `.xlsx`, CSV `.csv`, JSON `.json` |
| **Checkpointing** | Saves every 10 records; resumes from last checkpoint |
| **Deduplication** | By source URL + phone number |
| **Filters** | Excludes permanently closed & incomplete businesses |
| **Progress** | Rich logging with task counters |
| **Retry** | 3 automatic retries on network timeout |
| **CLI** | Full command-line interface with `--site`, `--area`, `--category` |
| **Master merge** | `all_businesses.csv` automatically generated at end |

---

## Project Structure

```text
business_scraper/
├── config.yaml            ← All settings (areas, categories, output, filters)
├── main.py                ← CLI entry point
├── requirements.txt       ← Python dependencies
├── README.md              ← This file
├── scraper/
│   ├── base.py            ← Abstract base (browser lifecycle, run loop)
│   ├── justdial.py        ← JustDial scraper (verified selectors)
│   └── google_maps.py     ← Google Maps scraper (detail page extraction)
├── models/
│   └── business.py        ← Pydantic data model for all business fields
├── exporters/
│   ├── csv_exporter.py    ← Append-safe CSV export
│   ├── excel_exporter.py  ← Append-safe Excel export (pandas + openpyxl)
│   └── json_exporter.py   ← Append-safe JSON export
└── utils/
    ├── config.py          ← YAML config loader
    ├── logger.py          ← Rich-formatted terminal + file logging
    └── state_manager.py   ← Buffer, deduplication, checkpoint, resume
```

---

## Setup

### 1. Create and activate virtual environment

```powershell
# From the business_scraper/ directory
python -m venv venv
.\venv\Scripts\Activate.ps1
```

### 2. Install dependencies

```powershell
pip install -r requirements.txt
playwright install chromium
```

---

## Configuration (`config.yaml`)

Edit `config.yaml` to control what is scraped:

```yaml
output_dir: "c:/path/to/Data_Scraped"   # where output files are saved

search:
  city: "Bangalore"
  areas:
    - "Jayanagar"
    - "Indiranagar"
    # ... add more areas
  categories:
    - "Electrician"
    - "Plumber"
    # ... add more categories

scraper:
  target_sites:
    - "justdial"
    # - "google_maps"     # uncomment to enable
  checkpoint_interval: 10   # save every N records
  headless: false            # show browser window for debugging
  auto_merge_csv: true       # merge all CSVs into all_businesses.csv
  filters:
    exclude_permanently_closed: true
    exclude_inconsistent_data: true  # skip if no phone AND no address
```

---

## Usage

All commands must be run from the `business_scraper/` directory with the virtual environment activated.

### Run full pipeline (all sites, all areas, all categories)

```powershell
python main.py
```

### Run JustDial only

```powershell
python main.py --site justdial
```

### Run Google Maps only

```powershell
python main.py --site google_maps
```

### Scrape a single area

```powershell
python main.py --area "Jayanagar" --site justdial
```

### Scrape a single category in a single area

```powershell
python main.py --area "Indiranagar" --category "Plumber" --site justdial
```

### Merge all output CSVs manually

```powershell
python main.py --merge-csv
```

---

## Output Files

All files are saved to the path configured in `output_dir`:

| File | Description |
|---|---|
| `justdial_businesses.csv` | All JustDial data as CSV |
| `justdial_businesses.xlsx` | All JustDial data as Excel |
| `justdial_businesses.json` | All JustDial data as JSON |
| `google_maps_businesses.csv` | All Google Maps data |
| `all_businesses.csv` | **Master file** — all sources merged & deduplicated |
| `all_businesses.xlsx` | Master Excel file |

### Data Columns

| Column | Description |
|---|---|
| `business_name` | Business name |
| `business_category` | Search category used |
| `address` | Full address |
| `city` | City |
| `state` | State (Karnataka) |
| `pincode` | PIN code if available |
| `latitude` | GPS latitude |
| `longitude` | GPS longitude |
| `phone_number` | Primary phone number |
| `website` | Website URL |
| `email` | Email (if available) |
| `opening_hours` | Opening hours text |
| `open_now` | True/False/None |
| `rating` | Star rating (e.g. 4.5) |
| `review_count` | Number of reviews |
| `description` | Business description |
| `services` | Services offered (comma-separated) |
| `business_status` | Operational / Permanently Closed |
| `source_url` | Original URL scraped |
| `collected_timestamp` | ISO 8601 timestamp |

---

## Legal Notice

> JustDial and Google Maps **Terms of Service** prohibit automated scraping.
> This tool is intended for personal research and educational purposes only.
> Use responsibly, avoid high-frequency requests, and review the Terms of Service
> of each platform before use.
