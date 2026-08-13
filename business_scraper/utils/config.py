import yaml
import os
from pathlib import Path

def load_config(config_path: str = "config.yaml") -> dict:
    """Loads the YAML configuration file."""
    if not os.path.exists(config_path):
        raise FileNotFoundError(f"Configuration file not found at {config_path}")
        
    with open(config_path, "r") as f:
        config = yaml.safe_load(f)
        
    # Ensure output directory exists
    output_dir = Path(config.get("output_dir", "./output"))
    output_dir.mkdir(parents=True, exist_ok=True)
    
    return config
