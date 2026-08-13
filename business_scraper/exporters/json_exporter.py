import json
import os
from typing import List
from models.business import BusinessData


class JSONExporter:
    def __init__(self, file_path: str):
        self.file_path = file_path

    def export(self, data: List[BusinessData]):
        if not data:
            return

        new_records = [item.model_dump() for item in data]

        # Load existing data if file exists
        existing_records = []
        if os.path.exists(self.file_path):
            try:
                with open(self.file_path, "r", encoding="utf-8") as f:
                    existing_records = json.load(f)
            except (json.JSONDecodeError, IOError):
                existing_records = []

        combined = existing_records + new_records

        with open(self.file_path, "w", encoding="utf-8") as f:
            json.dump(combined, f, ensure_ascii=False, indent=2, default=str)
