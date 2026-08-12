import yaml

from utils.paths import resolve_config_path, resolve_output_dir


def load_config(config_path: str = "config.yaml") -> dict:
    """
    Load the YAML configuration file and normalise it.

    The returned dict always has:
      - output_dir  : an absolute path that exists on disk
      - search      : dict with city / areas / categories
      - scraper     : dict with runtime options
    so callers never have to guard against missing sections.
    """
    path = resolve_config_path(config_path)
    if not path.exists():
        raise FileNotFoundError(f"Configuration file not found at {path}")

    with open(path, "r", encoding="utf-8") as f:
        config = yaml.safe_load(f) or {}

    if not isinstance(config, dict):
        raise ValueError(f"Configuration file {path} must contain a YAML mapping.")

    # Normalise the sections the rest of the code indexes into directly.
    config.setdefault("search", {})
    config.setdefault("scraper", {})
    if not isinstance(config["search"], dict):
        config["search"] = {}
    if not isinstance(config["scraper"], dict):
        config["scraper"] = {}
    config["scraper"].setdefault("filters", {})

    # Resolve output_dir (env override > config > repo default) and create it.
    config["output_dir"] = str(resolve_output_dir(config.get("output_dir")))
    config["config_path"] = str(path)

    return config
