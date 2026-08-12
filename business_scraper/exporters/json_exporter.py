import json
import os
import tempfile
from typing import List

from models.business import BusinessData


class JSONExporter:
    """
    Appends records to a JSON array file.

    The JSON file is what the 7 Kaam backend serves to the dashboard, so two
    properties matter here:

      * Deduplication — a record whose source_url is already on disk is not
        appended again. Without this, resuming an interrupted run (or scraping
        an overlapping area) silently duplicates rows in the UI.
      * Atomic writes — the file is written to a temp file and then moved into
        place, so a crash mid-checkpoint can never leave the backend reading a
        half-written, unparseable file.
    """

    def __init__(self, file_path: str):
        self.file_path = file_path

    def export(self, data: List[BusinessData]):
        if not data:
            return

        existing_records = self._read_existing()

        seen = {
            rec.get("source_url")
            for rec in existing_records
            if isinstance(rec, dict) and rec.get("source_url")
        }

        appended = []
        for item in data:
            record = item.model_dump()
            url = record.get("source_url")
            if url and url in seen:
                continue
            if url:
                seen.add(url)
            appended.append(record)

        if not appended:
            return

        self._write_atomic(existing_records + appended)

    # ------------------------------------------------------------------ #

    def _read_existing(self) -> list:
        """Read the current file, tolerating absence and corruption."""
        if not os.path.exists(self.file_path):
            return []
        try:
            with open(self.file_path, "r", encoding="utf-8") as f:
                records = json.load(f)
        except (json.JSONDecodeError, IOError, UnicodeDecodeError):
            # Corrupt or unreadable: preserve it for inspection rather than
            # overwriting the user's collected data without a trace.
            backup = self.file_path + ".corrupt"
            try:
                os.replace(self.file_path, backup)
            except OSError:
                pass
            return []

        return records if isinstance(records, list) else []

    def _write_atomic(self, records: list) -> None:
        directory = os.path.dirname(self.file_path) or "."
        os.makedirs(directory, exist_ok=True)

        fd, tmp_path = tempfile.mkstemp(dir=directory, suffix=".tmp")
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as f:
                json.dump(records, f, ensure_ascii=False, indent=2, default=str)
            os.replace(tmp_path, self.file_path)
        except Exception:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
            raise
