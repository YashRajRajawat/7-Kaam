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

        # In-memory buffer and deduplication keys.
        # URLs and phone numbers are tracked separately so a phone number can
        # never accidentally collide with a URL in one flat set.
        self.buffer: List[BusinessData] = []
        self.seen_urls: Set[str] = set()
        self.seen_phones: Set[str] = set()

        # Load existing keys to support resume-after-interruption
        self._load_existing_keys()

    @property
    def seen(self) -> Set[str]:
        """All known dedup keys — retained for backwards compatibility."""
        return self.seen_urls | self.seen_phones

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
        if business.source_url and business.source_url in self.seen_urls:
            return True
        if business.phone_number and business.phone_number in self.seen_phones:
            return True
        return False

    def _register_keys(self, business: BusinessData) -> None:
        if business.source_url:
            self.seen_urls.add(business.source_url)
        if business.phone_number:
            self.seen_phones.add(business.phone_number)

    def _load_existing_keys(self) -> None:
        """
        Load the keys of already-collected records so an interrupted run can be
        resumed without re-collecting (or duplicating) anything.

        Both the JSON and the CSV are read: the JSON is what the backend serves
        to the dashboard, so it is authoritative, but the CSV is checked too in
        case only that file survived.
        """
        existing = 0
        existing += self._load_keys_from_json()
        existing += self._load_keys_from_csv()

        if existing:
            self.logger.info(
                f"[StateManager] Resumed: {len(self.seen_urls)} known URLs and "
                f"{len(self.seen_phones)} known phones from {existing} existing records."
            )

    def _load_keys_from_json(self) -> int:
        if not os.path.exists(self.json_path):
            return 0
        try:
            import json
            with open(self.json_path, "r", encoding="utf-8") as f:
                records = json.load(f)
            if not isinstance(records, list):
                return 0
            count = 0
            for row in records:
                if not isinstance(row, dict):
                    continue
                self._register_raw(row.get("source_url"), row.get("phone_number"))
                count += 1
            return count
        except Exception as exc:
            self.logger.warning(f"[StateManager] Could not read existing JSON: {exc}")
            return 0

    def _load_keys_from_csv(self) -> int:
        if not os.path.exists(self.csv_path):
            return 0
        try:
            import csv
            with open(self.csv_path, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                count = 0
                for row in reader:
                    self._register_raw(row.get("source_url"), row.get("phone_number"))
                    count += 1
            return count
        except Exception as exc:
            self.logger.warning(f"[StateManager] Could not read existing CSV: {exc}")
            return 0

    def _register_raw(self, url, phone) -> None:
        if url and str(url).strip():
            self.seen_urls.add(str(url).strip())
        if phone and str(phone).strip():
            self.seen_phones.add(str(phone).strip())
