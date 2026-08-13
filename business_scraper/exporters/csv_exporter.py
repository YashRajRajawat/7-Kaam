import csv
import os
from typing import List, Dict
from models.business import BusinessData

class CSVExporter:
    def __init__(self, file_path: str):
        self.file_path = file_path
        self.headers_written = os.path.exists(file_path)

    def export(self, data: List[BusinessData]):
        if not data:
            return

        # Get headers from the first Pydantic model
        headers = list(data[0].model_dump().keys())

        with open(self.file_path, 'a', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=headers)
            
            if not self.headers_written:
                writer.writeheader()
                self.headers_written = True
                
            for item in data:
                # Convert list to string for CSV
                row_dict = item.model_dump()
                row_dict['services'] = ", ".join(row_dict['services']) if row_dict['services'] else ""
                writer.writerow(row_dict)
