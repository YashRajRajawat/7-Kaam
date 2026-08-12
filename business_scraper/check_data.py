"""
Quick data-quality report for the most recent scrape.

Usage:
  python check_data.py                      # reads <repo>/Data_Scraped
  python check_data.py path/to/file.csv     # reads a specific CSV
"""

import os
import sys

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

import pandas as pd

from utils.paths import resolve_output_dir

DEFAULT_FILENAME = "google_maps_businesses.csv"


def resolve_csv_path() -> str:
    if len(sys.argv) > 1:
        return sys.argv[1]
    return os.path.join(str(resolve_output_dir()), DEFAULT_FILENAME)


def main() -> None:
    csv_path = resolve_csv_path()
    if not os.path.exists(csv_path):
        print(f"No scraped data found at: {csv_path}")
        print("Run `python main.py` first, or pass a CSV path as an argument.")
        sys.exit(1)

    df = pd.read_csv(csv_path, dtype={"phone_number": str})
    if df.empty:
        print(f"{csv_path} exists but contains no records.")
        return

    def filled(col: str) -> str:
        if col not in df.columns:
            return "n/a"
        return f"{df[col].notna().sum()}/{len(df)}"

    print("=" * 60)
    print(f"  File:              {csv_path}")
    print(f"  Total Records:     {len(df)}")
    print(f"  Phone populated:   {filled('phone_number')}")
    print(f"  Address populated: {filled('address')}")
    print(f"  Rating populated:  {filled('rating')}")
    print(f"  Website populated: {filled('website')}")
    print(f"  Lat/Lng:           {filled('latitude')}")
    print(f"  Open Now:          {filled('open_now')}")
    print(f"  Hours:             {filled('opening_hours')}")
    print("=" * 60)
    print()

    cols = [c for c in ("business_name", "phone_number", "rating", "business_status") if c in df.columns]
    pd.set_option("display.max_colwidth", 45)
    pd.set_option("display.width", 140)
    print(df[cols].head(50).to_string(index=True))
    print()
    print("Sample addresses:")
    for i, row in df.head(5).iterrows():
        print(f"  [{i}] {str(row.get('business_name'))[:35]:35s} | {str(row.get('address'))[:60]}")


if __name__ == "__main__":
    main()
