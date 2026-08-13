import logging
import sys
import io
from rich.logging import RichHandler
from rich.console import Console


def setup_logger(name: str = "scraper_logger", level: int = logging.INFO) -> logging.Logger:
    """
    Sets up a logger with Rich formatting for the terminal and plain text for the log file.
    Forces UTF-8 output to prevent cp1252 UnicodeEncodeError on Windows.
    """
    logger = logging.getLogger(name)
    if logger.handlers:
        return logger  # already configured

    logger.setLevel(level)

    # --- Terminal handler (Rich, forced UTF-8) ---
    # Wrap stdout in a UTF-8 stream to avoid cp1252 issues on Windows
    utf8_stdout = io.TextIOWrapper(
        sys.stdout.buffer, encoding="utf-8", errors="replace", line_buffering=True
    ) if hasattr(sys.stdout, "buffer") else sys.stdout

    rich_console = Console(file=utf8_stdout, highlight=False)
    rich_handler = RichHandler(console=rich_console, rich_tracebacks=True, markup=False)
    rich_handler.setLevel(level)
    logger.addHandler(rich_handler)

    # --- File handler (always UTF-8, full debug) ---
    file_handler = logging.FileHandler("scraper.log", encoding="utf-8")
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(
        logging.Formatter("%(asctime)s | %(levelname)-8s | %(message)s")
    )
    logger.addHandler(file_handler)

    return logger
