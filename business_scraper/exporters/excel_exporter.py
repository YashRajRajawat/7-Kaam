import pandas as pd
import os
from typing import List
from models.business import BusinessData

class ExcelExporter:
    def __init__(self, file_path: str):
        self.file_path = file_path

    def export(self, data: List[BusinessData]):
        if not data:
            return

        df_new = pd.DataFrame([item.model_dump() for item in data])
        # Convert lists to comma-separated strings for Excel
        if 'services' in df_new.columns:
            df_new['services'] = df_new['services'].apply(lambda x: ", ".join(x) if isinstance(x, list) else x)

        if os.path.exists(self.file_path):
            try:
                df_existing = pd.read_excel(self.file_path)
                df_combined = pd.concat([df_existing, df_new], ignore_index=True)
                # Drop exact duplicates if any
                df_combined.drop_duplicates(inplace=True)
                df_combined.to_excel(self.file_path, index=False)
            except Exception as e:
                print(f"Error appending to Excel: {e}")
                # Fallback to saving as a new file if appending fails
                df_new.to_excel(self.file_path.replace('.xlsx', '_recovery.xlsx'), index=False)
        else:
            df_new.to_excel(self.file_path, index=False)
