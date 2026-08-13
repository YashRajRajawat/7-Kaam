"""
State Manager — checkpointing, deduplication, and multi-format export.
Saves to CSV, Excel, and JSON every N records (checkpoint_interval).
Also adds a JSON exporter so all three formats are always written.
"""

import os
import logging
from typing import List, Set

from models.business import BusinessData
from exporters.csv_exporter import CSVExporter
from exporters.excel_exporter import ExcelExporter
from exporters.json_exporter import JSONExporter


class StateManager:
    """
    Buffers extracted BusinessData records and periodically flushes them to:
      - CSV  (.csv)
      - Excel (.xlsx)
      - JSON (.json)

    Deduplication is performed using the source_url as the primary key,
    with phone_number as a secondary key.
    """

    def __init__(
        self,
        output_dir: str,
        base_filename: str,
        checkpoint_interval: int = 10,
    ) -> None:
        self.output_dir = output_dir
        self.checkpoint_interval = checkpoint_interval
        self.logger = logging.getLogger("scraper_logger")

        # Ensure the output directory exists
        os.makedirs(output_dir, exist_ok=True)

        # Output file paths
        self.csv_path   = os.path.join(output_dir, f"{base_filename}.csv")
        self.excel_path = os.path.join(output_dir, f"{base_filename}.xlsx")
        self.json_path  = os.path.join(output_dir, f"{base_filename}.json")

        # Exporters
        self.csv_exporter   = CSVExporter(self.csv_path)
        self.excel_exporter = ExcelExporter(self.excel_path)
        self.json_exporter  = JSONExporter(self.json_path)

        # In-memory buffer and deduplication set
        self.buffer: List[BusinessData] = []
        self.seen: Set[str] = set()

        # Load existing source_urls to support resume-after-interruption
        self._load_existing_keys()

    # ------------------------------------------------------------------ #
    # Public API                                                           #
    # ------------------------------------------------------------------ #

    def add(self, business: BusinessData) -> None:
        """Add a business to the buffer; flush when checkpoint is reached."""
        if self._is_duplicate(business):
            self.logger.debug(f"[StateManager] Duplicate skipped: {business.business_name}")
            return

        self.buffer.append(business)
        self._register_keys(business)

        if len(self.buffer) >= self.checkpoint_interval:
            self.flush()

    def flush(self) -> None:
        """Write all buffered records to every output format and clear buffer."""
        if not self.buffer:
            return

        self.logger.info(
            f"[StateManager] ✦ Checkpoint: saving {len(self.buffer)} records → "
            f"{os.path.basename(self.csv_path)}"
        )
        try:
            self.csv_exporter.export(self.buffer)
            self.excel_exporter.export(self.buffer)
            self.json_exporter.export(self.buffer)
            self.logger.info("[StateManager] ✔ Checkpoint saved (CSV + Excel + JSON).")
        except Exception as exc:
            self.logger.error(f"[StateManager] ✘ Checkpoint save failed: {exc}")
        finally:
            self.buffer.clear()

    # ------------------------------------------------------------------ #
    # Deduplication                                                        #
    # ------------------------------------------------------------------ #

    def _is_duplicate(self, business: BusinessData) -> bool:
        if business.source_url and business.source_url in self.seen:
            return True
        if business.phone_number and business.phone_number in self.seen:
            return True
        return False

    def _register_keys(self, business: BusinessData) -> None:
        if business.source_url:
            self.seen.add(business.source_url)
        if business.phone_number:
            self.seen.add(business.phone_number)

    def _load_existing_keys(self) -> None:
        """
        If a CSV already exists (from a previous run), load all source_urls
        and phone numbers into self.seen to avoid re-collecting them.
        """
        if not os.path.exists(self.csv_path):
            return
        try:
            import csv
            with open(self.csv_path, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                count = 0
                for row in reader:
                    url = row.get("source_url", "").strip()
                    phone = row.get("phone_number", "").strip()
                    if url:
                        self.seen.add(url)
                    if phone:
                        self.seen.add(phone)
                    count += 1
            self.logger.info(
                f"[StateManager] Resumed: loaded {len(self.seen)} known keys from "
                f"{os.path.basename(self.csv_path)} ({count} existing records)."
            )
        except Exception as exc:
            self.logger.warning(f"[StateManager] Could not load existing keys: {exc}")
