"""
Main CLI Orchestrator
---------------------
Entry point for the Local Business Data Collection Pipeline.

Usage:
  python main.py                          # runs all sites, all areas/categories
  python main.py --site justdial          # JustDial only
  python main.py --site google_maps       # Google Maps only
  python main.py --merge-csv              # merge all site CSVs into one master file
  python main.py --config my_config.yaml  # use a custom config file
"""

import argparse
import os
import sys
import glob
import pandas as pd

# Ensure the project root is always in Python's path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from utils.config import load_config
from utils.logger import setup_logger
from utils.state_manager import StateManager
from scraper.justdial import JustDialScraper
from scraper.google_maps import GoogleMapsScraper


def merge_all_csvs(output_dir: str, logger) -> None:
    """
    Merge every *.csv inside output_dir into a single master CSV:
        all_businesses.csv
    Deduplicates by (business_name, phone_number, address) before saving.
    """
    pattern = os.path.join(output_dir, "*.csv")
    files = [f for f in glob.glob(pattern) if "all_businesses" not in f]

    if not files:
        logger.warning("[Merge] No CSV files found to merge.")
        return

    logger.info(f"[Merge] Merging {len(files)} CSV files → all_businesses.csv")
    dfs = []
    for f in files:
        try:
            df = pd.read_csv(f, dtype=str)
            if df.empty:
                continue
            dfs.append(df)
            logger.debug(f"[Merge]   + {os.path.basename(f)} ({len(df)} rows)")
        except Exception as e:
            logger.warning(f"[Merge] Skipped {f}: {e}")

    if not dfs:
        logger.error("[Merge] No data could be read.")
        return

    combined = pd.concat(dfs, ignore_index=True)

    # Deduplication — only on columns that actually exist, so a CSV written by
    # an older schema version can still be merged instead of raising KeyError.
    before = len(combined)
    subset = [c for c in ("business_name", "phone_number", "address") if c in combined.columns]
    if subset:
        combined.drop_duplicates(subset=subset, keep="first", inplace=True)
    if "source_url" in combined.columns:
        combined.drop_duplicates(subset=["source_url"], keep="first", inplace=True)
    after = len(combined)

    out_csv   = os.path.join(output_dir, "all_businesses.csv")
    out_excel = os.path.join(output_dir, "all_businesses.xlsx")
    try:
        combined.to_csv(out_csv, index=False, encoding="utf-8")
        combined.to_excel(out_excel, index=False)
    except PermissionError as e:
        # Typically the .xlsx is open in Excel — the CSV still saved.
        logger.warning(f"[Merge] Could not write master file (file in use?): {e}")
        return

    logger.info(
        f"[Merge] ✔ Master file saved: {out_csv} "
        f"({after} unique records, {before - after} duplicates removed)"
    )


def _split_list(value):
    """Parse a comma-separated CLI value into a clean list of strings."""
    if not value:
        return []
    return [part.strip() for part in str(value).split(",") if part.strip()]


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Local Business Data Collection Pipeline — Bangalore",
        formatter_class=argparse.RawTextHelpFormatter,
    )
    parser.add_argument(
        "--config",
        type=str,
        default="config.yaml",
        help="Path to the YAML configuration file (default: config.yaml)",
    )
    parser.add_argument(
        "--site",
        type=str,
        choices=["justdial", "google_maps", "all"],
        default="all",
        help=(
            "Which site to scrape:\n"
            "  justdial     — JustDial only\n"
            "  google_maps  — Google Maps only\n"
            "  all          — both (default)"
        ),
    )
    parser.add_argument(
        "--merge-csv",
        action="store_true",
        help="After scraping, merge all output CSVs into a single all_businesses.csv",
    )
    parser.add_argument(
        "--area",
        type=str,
        default=None,
        help="Restrict scraping to specific areas. Comma-separated, e.g. 'Jayanagar,HSR Layout'",
    )
    parser.add_argument(
        "--category",
        type=str,
        default=None,
        help="Restrict scraping to specific categories. Comma-separated, e.g. 'Electrician,Plumber'",
    )
    parser.add_argument(
        "--city",
        type=str,
        default=None,
        help="Override the city from the config (e.g. 'Bangalore')",
    )
    parser.add_argument(
        "--headless",
        dest="headless",
        action="store_true",
        default=None,
        help="Run the browser without a visible window (required for server-side runs)",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default=None,
        help="Override where CSV/Excel/JSON output is written",
    )
    args = parser.parse_args()

    # ── Setup ────────────────────────────────────────────────────────────
    try:
        config = load_config(args.config)
    except (FileNotFoundError, ValueError) as exc:
        # A bad config is user error, not a crash — report it plainly.
        print(f"Configuration error: {exc}", file=sys.stderr)
        sys.exit(2)

    logger = setup_logger()
    logger.info("═" * 60)
    logger.info("  Local Business Data Collection Pipeline")
    logger.info("═" * 60)

    if args.output_dir:
        from utils.paths import resolve_output_dir
        config["output_dir"] = str(resolve_output_dir(args.output_dir))
    if args.headless is not None:
        config["scraper"]["headless"] = args.headless

    output_dir          = config["output_dir"]
    checkpoint_interval = config["scraper"].get("checkpoint_interval", 10)
    search_cfg          = config["search"]
    city                = args.city or search_cfg.get("city", "Bangalore")

    # CLI overrides for area and category (comma-separated), else the config.
    areas      = _split_list(args.area)     or search_cfg.get("areas") or []
    categories = _split_list(args.category) or search_cfg.get("categories") or []

    # Validate user input up front rather than silently scraping nothing.
    if not areas:
        logger.error("No areas to scrape. Pass --area 'Jayanagar' or set search.areas in the config.")
        sys.exit(2)
    if not categories:
        logger.error("No categories to scrape. Pass --category 'Electrician' or set search.categories in the config.")
        sys.exit(2)

    target_sites = config["scraper"].get("target_sites") or ["google_maps"]
    if args.site != "all":
        target_sites = [args.site]

    logger.info(f"  City       : {city}")
    logger.info(f"  Areas      : {areas}")
    logger.info(f"  Categories : {categories}")
    logger.info(f"  Target sites: {target_sites}")
    logger.info(f"  Output dir : {output_dir}")
    logger.info("═" * 60)

    # ── Scrape ───────────────────────────────────────────────────────────
    for site in target_sites:
        logger.info(f"\n▶ Starting scraper: {site.upper()}")

        state_manager = StateManager(
            output_dir=output_dir,
            base_filename=f"{site}_businesses",
            checkpoint_interval=checkpoint_interval,
        )

        if site == "justdial":
            scraper = JustDialScraper(config, state_manager)
        elif site == "google_maps":
            scraper = GoogleMapsScraper(config, state_manager)
        else:
            logger.warning(f"Unknown site '{site}', skipping.")
            continue

        # Override city/areas/categories on the config so scraper.run() sees them
        config["search"]["city"]       = city
        config["search"]["areas"]      = areas
        config["search"]["categories"] = categories

        try:
            scraper.run()
        except Exception as exc:
            # One failing site must not abort the remaining sites or the merge.
            logger.error(f"▶ Scraper {site.upper()} aborted: {exc}", exc_info=True)
        logger.info(f"▶ Finished scraper: {site.upper()}")

    # ── Merge CSV ────────────────────────────────────────────────────────
    if args.merge_csv or config["scraper"].get("auto_merge_csv", True):
        merge_all_csvs(output_dir, logger)

    logger.info("\n✔ Pipeline finished. Data saved to: " + output_dir)


if __name__ == "__main__":
    main()
