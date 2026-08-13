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
            dfs.append(df)
            logger.debug(f"[Merge]   + {os.path.basename(f)} ({len(df)} rows)")
        except Exception as e:
            logger.warning(f"[Merge] Skipped {f}: {e}")

    if not dfs:
        logger.error("[Merge] No data could be read.")
        return

    combined = pd.concat(dfs, ignore_index=True)

    # Deduplication — prefer records with more filled columns
    before = len(combined)
    combined.drop_duplicates(
        subset=["business_name", "phone_number", "address"],
        keep="first",
        inplace=True,
    )
    combined.drop_duplicates(subset=["source_url"], keep="first", inplace=True)
    after = len(combined)

    out_csv   = os.path.join(output_dir, "all_businesses.csv")
    out_excel = os.path.join(output_dir, "all_businesses.xlsx")
    combined.to_csv(out_csv, index=False, encoding="utf-8")
    combined.to_excel(out_excel, index=False)

    logger.info(
        f"[Merge] ✔ Master file saved: {out_csv} "
        f"({after} unique records, {before - after} duplicates removed)"
    )


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
        help="Restrict scraping to a single area (must match config exactly, e.g. 'Jayanagar')",
    )
    parser.add_argument(
        "--category",
        type=str,
        default=None,
        help="Restrict scraping to a single category (e.g. 'Electrician')",
    )
    args = parser.parse_args()

    # ── Setup ────────────────────────────────────────────────────────────
    config = load_config(args.config)
    logger = setup_logger()
    logger.info("═" * 60)
    logger.info("  Local Business Data Collection Pipeline")
    logger.info("═" * 60)

    output_dir        = config.get("output_dir", "./output")
    checkpoint_interval = config.get("scraper", {}).get("checkpoint_interval", 10)
    search_cfg        = config.get("search", {})
    city              = search_cfg.get("city", "Bangalore")

    # Allow CLI overrides for area and category
    areas      = [args.area]      if args.area      else search_cfg.get("areas", [])
    categories = [args.category]  if args.category  else search_cfg.get("categories", [])

    target_sites = config.get("scraper", {}).get("target_sites", ["justdial"])
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

        # Override areas/categories on the config so scraper.run() sees them
        config["search"]["areas"]      = areas
        config["search"]["categories"] = categories

        scraper.run()
        logger.info(f"▶ Finished scraper: {site.upper()}")

    # ── Merge CSV ────────────────────────────────────────────────────────
    if args.merge_csv or config.get("scraper", {}).get("auto_merge_csv", True):
        merge_all_csvs(output_dir, logger)

    logger.info("\n✔ Pipeline finished. Data saved to: " + output_dir)


if __name__ == "__main__":
    main()
