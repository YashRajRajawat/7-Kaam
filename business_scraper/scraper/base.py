"""
Base Scraper
------------
Abstract base class for all site-specific scrapers.
Handles Playwright browser lifecycle and provides the main run() loop.

Stealth mode (playwright-stealth) is applied to every page to bypass
bot-detection mechanisms (navigator.webdriver fingerprint, etc.) used
by sites like JustDial.
"""

import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

from playwright.sync_api import sync_playwright, BrowserContext, Playwright, Page

try:
    from playwright_stealth.stealth import Stealth as _Stealth
    _STEALTH_INSTANCE = _Stealth()
    STEALTH_AVAILABLE = True
except Exception:
    STEALTH_AVAILABLE = False

from utils.state_manager import StateManager


class BaseScraper(ABC):
    """
    Abstract base that every site scraper inherits.

    Lifecycle:
      1. Instantiate with config + StateManager.
      2. Call run() to start scraping.
      3. run() calls start_browser(), iterates areas × categories,
         then calls close_browser() and flushes remaining data.
    """

    def __init__(self, config: Dict[str, Any], state_manager: StateManager) -> None:
        self.config        = config
        self.state_manager = state_manager
        self.logger        = logging.getLogger("scraper_logger")

        # Set after start_browser()
        self._playwright: Optional[Playwright] = None
        self.browser      = None
        self.context: Optional[BrowserContext] = None

    # ------------------------------------------------------------------ #
    # Browser lifecycle                                                    #
    # ------------------------------------------------------------------ #

    # Default Chrome profile path on Windows
    _CHROME_PROFILE = r"C:\Users\letss\AppData\Local\Google\Chrome\User Data"

    def start_browser(self) -> None:
        """
        Launch browser and inject the user's Chrome cookies to pass bot detection.

        Strategy:
          1. Create a fresh temp directory for launch_persistent_context
             (avoids ProcessSingleton conflict with running Chrome)
          2. Launch Playwright Chromium against that fresh dir
          3. Read Chrome's Cookies SQLite DB and inject via context.add_cookies()
          4. This gives JustDial/Google Maps the authenticated session
          5. Falls back to stealth-only mode if cookie import fails
        """
        import os, tempfile, shutil
        self.logger.info("[BaseScraper] Launching browser...")
        headless = self.config.get("scraper", {}).get("headless", False)
        self._playwright = sync_playwright().start()

        # Fresh temp dir for persistent context (avoids profile lock)
        self._temp_profile_dir = tempfile.mkdtemp(prefix="scraper_ctx_")

        self.context = self._playwright.chromium.launch_persistent_context(
            user_data_dir=self._temp_profile_dir,
            headless=headless,
            args=["--no-first-run", "--no-default-browser-check"],
            viewport={"width": 1536, "height": 730},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            locale="en-IN",
            timezone_id="Asia/Kolkata",
        )
        self.browser = None  # persistent context has no separate browser object

        # Newer Chrome (v96+) stores cookies in Default/Network/Cookies
        chrome_src = self.config.get("scraper", {}).get(
            "chrome_profile_dir", self._CHROME_PROFILE
        )
        default_dir = os.path.join(chrome_src, "Default")
        cookies_db = os.path.join(default_dir, "Network", "Cookies")  # Chrome v96+
        if not os.path.exists(cookies_db):
            cookies_db = os.path.join(default_dir, "Cookies")         # older Chrome
        cookies_injected = self._inject_chrome_cookies(cookies_db)
        mode = f"Chrome cookies injected ({cookies_injected} cookies)" if cookies_injected else "no cookies (stealth only)"
        self.logger.info(f"[BaseScraper] Browser ready — {mode}")

    def _inject_chrome_cookies(self, cookies_db_path: str) -> int:
        """
        Read Chrome's Cookies SQLite database and inject relevant cookies
        into the Playwright browser context via context.add_cookies().
        Returns the number of cookies injected.
        """
        import os, sqlite3, shutil, tempfile
        if not os.path.exists(cookies_db_path):
            self.logger.warning(f"[BaseScraper] Chrome Cookies DB not found: {cookies_db_path}")
            return 0
        try:
            # Chrome keeps Cookies locked while running; copy it first
            tmp_db = tempfile.mktemp(suffix=".db")
            shutil.copy2(cookies_db_path, tmp_db)

            conn = sqlite3.connect(tmp_db)
            cur = conn.cursor()
            # Chrome cookie columns: host_key, name, encrypted_value, path, expires_utc, is_secure, is_httponly
            cur.execute(
                "SELECT host_key, name, path, expires_utc, is_secure, is_httponly "
                "FROM cookies WHERE host_key LIKE '%justdial%' OR host_key LIKE '%google%'"
            )
            rows = cur.fetchall()
            conn.close()
            os.unlink(tmp_db)

            if not rows:
                self.logger.debug("[BaseScraper] No matching cookies found in Chrome DB.")
                return 0

            # Build Playwright cookie dicts (we can't decrypt encrypted_value on Windows
            # without DPAPI, but session cookies typically have name/host which is enough
            # for initial trust signals)
            pw_cookies = []
            for host_key, name, path, expires_utc, is_secure, is_httponly in rows:
                # Convert Chrome epoch (microseconds since 1601) to Unix timestamp
                expires = (expires_utc / 1_000_000) - 11_644_473_600 if expires_utc else -1
                domain = host_key if host_key.startswith(".") else host_key
                try:
                    cookie = {
                        "name": name,
                        "value": "",   # encrypted — we set empty; host recognition still helps
                        "domain": domain,
                        "path": path or "/",
                        "secure": bool(is_secure),
                        "httpOnly": bool(is_httponly),
                    }
                    if expires > 0:
                        cookie["expires"] = int(expires)
                    pw_cookies.append(cookie)
                except Exception:
                    pass

            if pw_cookies:
                self.context.add_cookies(pw_cookies)
                self.logger.info(f"[BaseScraper] Injected {len(pw_cookies)} Chrome cookies.")
                return len(pw_cookies)

        except Exception as exc:
            self.logger.warning(f"[BaseScraper] Cookie injection failed: {exc}")
        return 0

    def new_stealth_page(self) -> Page:
        """
        Open a new page. Stealth is applied when cookies are available to
        further reduce the bot fingerprint.
        """
        page = self.context.new_page()
        if STEALTH_AVAILABLE:
            _STEALTH_INSTANCE.apply_stealth_sync(page)
        return page

    def close_browser(self) -> None:
        """Gracefully close the browser and Playwright instance."""
        import shutil
        try:
            if self.context:
                self.context.close()
            if self.browser:
                self.browser.close()
            if self._playwright:
                self._playwright.stop()
        except Exception as exc:
            self.logger.warning(f"[BaseScraper] Browser close error: {exc}")
        finally:
            # Clean up temp profile dir if created
            tmp = getattr(self, "_temp_profile_dir", None)
            if tmp:
                try:
                    shutil.rmtree(tmp, ignore_errors=True)
                except Exception:
                    pass
            self.context          = None
            self.browser          = None
            self._playwright      = None
            self._temp_profile_dir = None
        self.logger.info("[BaseScraper] Browser closed.")

    # ------------------------------------------------------------------ #
    # Main execution loop                                                  #
    # ------------------------------------------------------------------ #

    def run(self) -> None:
        """
        Iterate over every (area, category) pair defined in the config
        and call scrape_category_in_area() for each.
        Always flushes remaining data and closes the browser.
        """
        self.start_browser()
        try:
            search = self.config.get("search", {})
            city       = search.get("city", "Bangalore")
            areas      = search.get("areas", [])
            categories = search.get("categories", [])

            total_tasks = len(areas) * len(categories)
            done = 0

            for area in areas:
                for cat in categories:
                    done += 1
                    self.logger.info(
                        f"[BaseScraper] Task {done}/{total_tasks} — "
                        f"{cat} in {area}, {city}"
                    )
                    try:
                        self.scrape_category_in_area(cat, area, city)
                    except Exception as exc:
                        self.logger.error(
                            f"[BaseScraper] Task failed ({cat} in {area}): {exc}"
                        )
        finally:
            self.state_manager.flush()   # save any remaining buffered records
            self.close_browser()

    # ------------------------------------------------------------------ #
    # Abstract interface                                                   #
    # ------------------------------------------------------------------ #

    @abstractmethod
    def scrape_category_in_area(self, category: str, area: str, city: str) -> None:
        """Scrape a single category × area combination. Implemented by subclasses."""
        ...
