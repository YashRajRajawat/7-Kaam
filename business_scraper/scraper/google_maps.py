"""
Google Maps Production Scraper
--------------------------------
Scrapes Google Maps business listings for categories in specific areas of Bangalore.

Google Maps structure (verified 2025-2026):
  Search results panel  : div[role="feed"]
  Each result item      : div[role="feed"] > div > div > a  (aria-label = business name)

Strategy:
  We use the list view (left panel) to collect Name + basic info quickly.
  Then we click each result card to open the detail panel and extract the full
  rich data (phone, website, hours, address, rating, etc.) from the side panel.

WARNING:
  Google Maps actively detects bots. This scraper uses a non-headless browser
  with a real user-agent, slowed-down interactions, and randomised wait times
  to reduce detection risk. Use responsibly and in accordance with applicable laws.
"""

import re
import time
import random
import urllib.parse
from typing import Optional, List

from playwright.sync_api import Page, TimeoutError as PlaywrightTimeout

from scraper.base import BaseScraper
from models.business import BusinessData


class GoogleMapsScraper(BaseScraper):
    """
    Production-grade Google Maps scraper.
    Clicks each result to extract full business details from the side panel.
    """

    MAPS_BASE = "https://www.google.com/maps/search/"
    MAX_SCROLL_ROUNDS = 15

    # ------------------------------------------------------------------ #
    # Public entry point                                                   #
    # ------------------------------------------------------------------ #

    def scrape_category_in_area(self, category: str, area: str, city: str) -> None:
        page = self.new_stealth_page()  # stealth applied
        query = f"{category} in {area}, {city}"
        self.logger.info(f"[GoogleMaps] ▶  Searching: {query}")

        try:
            url = self.MAPS_BASE + urllib.parse.quote(query)
            self._safe_goto(page, url)
            self._accept_cookies(page)
            self._scroll_results_panel(page)
            count = self._extract_all_results(page, category, area, city)
            self.logger.info(f"[GoogleMaps] ✔  Collected {count} businesses for: {query}")
        except Exception as exc:
            self.logger.error(f"[GoogleMaps] ✘  Failed '{query}': {exc}", exc_info=True)
        finally:
            page.close()

    # ------------------------------------------------------------------ #
    # Navigation helpers                                                   #
    # ------------------------------------------------------------------ #

    def _safe_goto(self, page: Page, url: str, retries: int = 3) -> None:
        """
        Navigate with retries. Uses 'domcontentloaded' because Google Maps never
        reaches 'networkidle' — it fires continuous background XHR requests.
        After navigation we wait up to 8 s for either the results feed or the
        map canvas to appear, confirming the page rendered successfully.
        """
        timeout_ms = self.config.get("scraper", {}).get("timeout_ms", 30000)
        for attempt in range(1, retries + 1):
            try:
                self.logger.debug(f"[GoogleMaps] Navigating → {url} (attempt {attempt})")
                # domcontentloaded fires much sooner; maps SPA renders via JS after that
                page.goto(url, wait_until="domcontentloaded", timeout=timeout_ms)
                # Wait for either the results feed or the map element
                try:
                    page.wait_for_selector(
                        'div[role="feed"], div#map, canvas',
                        timeout=8000
                    )
                except PlaywrightTimeout:
                    pass  # Continue even if these aren't found; extractors handle empty state
                return
            except PlaywrightTimeout:
                self.logger.warning(f"[GoogleMaps] Timeout attempt {attempt}/{retries}")
                if attempt == retries:
                    raise

    def _accept_cookies(self, page: Page) -> None:
        """Accept Google's cookie consent popup if present."""
        try:
            for btn_text in ["Accept all", "Reject all", "I agree", "Accept"]:
                btn = page.get_by_role("button", name=btn_text)
                if btn.is_visible(timeout=2000):
                    btn.click()
                    page.wait_for_timeout(800)
                    return
        except Exception:
            pass

    # ------------------------------------------------------------------ #
    # Scroll the results panel                                             #
    # ------------------------------------------------------------------ #

    def _scroll_results_panel(self, page: Page) -> None:
        """
        Scroll the left-side results feed to load all businesses.
        Google Maps lazy-loads more cards as you scroll.
        """
        self.logger.info("[GoogleMaps] Scrolling results panel to load all listings…")
        try:
            feed = page.locator('div[role="feed"]')
            feed.wait_for(timeout=10000)
        except PlaywrightTimeout:
            self.logger.warning("[GoogleMaps] Results feed not found; proceeding with visible cards.")
            return

        prev_count = 0
        stable_rounds = 0

        for i in range(self.MAX_SCROLL_ROUNDS):
            # Scroll within the feed panel
            feed.evaluate("el => el.scrollBy(0, 3000)")
            page.wait_for_timeout(random.randint(1200, 2000))

            # Check if we hit "You've reached the end of the list"
            try:
                end_text = page.locator('div:has-text("You\'ve reached the end")').first
                if end_text.is_visible(timeout=300):
                    self.logger.info("[GoogleMaps] Reached end of results list.")
                    break
            except Exception:
                pass

            current = page.locator('div[role="feed"] a[href*="maps/place"]').count()
            self.logger.debug(f"[GoogleMaps] Cards in panel: {current}")

            if current == prev_count:
                stable_rounds += 1
                if stable_rounds >= 3:
                    self.logger.info(f"[GoogleMaps] Stable at {current} cards. Done scrolling.")
                    break
            else:
                stable_rounds = 0
            prev_count = current

    # ------------------------------------------------------------------ #
    # Extraction                                                           #
    # ------------------------------------------------------------------ #

    def _extract_all_results(
        self, page: Page, category: str, area: str, city: str
    ) -> int:
        """
        Each result in the feed is an <a> with href containing 'maps/place'.
        We collect all their href URLs first (snapshot), then visit each.
        """
        links = page.locator('div[role="feed"] a[href*="maps/place"]')
        total = links.count()
        self.logger.info(f"[GoogleMaps] Found {total} result links. Extracting details…")

        # Snapshot all URLs so navigation doesn't invalidate the locator
        urls: List[str] = []
        for i in range(total):
            try:
                href = links.nth(i).get_attribute("href")
                if href and href not in urls:
                    urls.append(href)
            except Exception:
                pass

        extracted = 0
        for idx, place_url in enumerate(urls):
            try:
                self.logger.debug(f"[GoogleMaps] Detail {idx + 1}/{len(urls)}: {place_url[:80]}…")
                business = self._extract_place_detail(page, place_url, category, area, city)
                if business is not None:
                    self.state_manager.add(business)
                    extracted += 1
                # Randomised delay between visits (reduces bot signature)
                page.wait_for_timeout(random.randint(800, 1600))
            except Exception as exc:
                self.logger.debug(f"[GoogleMaps] Detail #{idx} error: {exc}")

        return extracted

    def _extract_place_detail(
        self, page: Page, place_url: str, category: str, area: str, city: str
    ) -> Optional[BusinessData]:
        """
        Navigate to a Place detail page and extract all available fields.
        Google Maps detail panel layout (verified):
          Name        : h1 inside the main panel
          Address     : [data-item-id="address"] .Io6YTe
          Phone       : [data-item-id^="phone:tel"] .Io6YTe
          Website     : [data-item-id="authority"] a.lcr4fd (href)
          Rating      : span[aria-label*="stars"]
          Reviews     : span[aria-label*="reviews"]
          Hours       : [aria-label*="Hours"]  — text is the schedule summary
          Status      : span:has-text("Permanently closed")
          Category    : button.DkEaL
        """
        filters = self.config.get("scraper", {}).get("filters", {})

        self._safe_goto(page, place_url)

        # Wait for the detail panel to render
        try:
            page.wait_for_selector("h1, div.rogA2c", timeout=6000)
        except PlaywrightTimeout:
            pass

        # ── Business Status ─────────────────────────────────────────────
        try:
            perm_closed = page.locator('span:has-text("Permanently closed")').first
            if perm_closed.is_visible(timeout=1000):
                if filters.get("exclude_permanently_closed"):
                    return None
        except Exception:
            pass

        # ── Name ────────────────────────────────────────────────────────
        name = None
        for sel in ["h1.DUwDvf", "h1[class*='fontHeadlineLarge']", "h1"]:
            try:
                name = page.locator(sel).first.inner_text(timeout=3000).strip()
                if name:
                    break
            except Exception:
                pass
        if not name:
            return None

        # ── Address ─────────────────────────────────────────────────────
        address = self._detail_text(page, [
            "[data-item-id='address'] .Io6YTe",
            "[data-tooltip='Copy address'] .Io6YTe",
            "button[data-item-id='address']",
        ])

        # ── Phone ───────────────────────────────────────────────────────
        phone = self._detail_text(page, [
            "[data-item-id^='phone:tel'] .Io6YTe",
            "a[href^='tel:']",
        ])
        if phone:
            phone = re.sub(r"[^\d+]", "", phone)

        # ── Website ─────────────────────────────────────────────────────
        website = self._detail_attr(page, [
            "[data-item-id='authority'] a.lcr4fd",
            "a[data-item-id='authority']",
            "a[href][aria-label*='website' i]",
        ], "href")

        # ── Rating ──────────────────────────────────────────────────────
        rating: Optional[float] = None
        try:
            # Try aria-label first (e.g., "4.5 stars")
            rating_el = page.locator(
                "span[aria-label*='stars'], div.F7nice span[aria-label]"
            ).first
            rating_text = rating_el.get_attribute("aria-label", timeout=1000)
            if rating_text:
                m = re.search(r"([\d.]+)", rating_text)
                if m:
                    rating = float(m.group(1))
            # Fallback: read visible text from rating span
            if rating is None:
                for sel in ["div.F7nice > span:first-child", "span.ceNzKf", "div.MW4etd"]:
                    try:
                        rt = page.locator(sel).first.inner_text(timeout=500).strip()
                        if rt and re.match(r"^[\d.]+$", rt):
                            rating = float(rt)
                            break
                    except Exception:
                        pass
        except Exception:
            pass

        # ── Review Count ────────────────────────────────────────────────
        review_count: Optional[int] = None
        try:
            rc_text = page.locator(
                "span[aria-label*='reviews'], button[aria-label*='reviews']"
            ).first.get_attribute("aria-label", timeout=1000)
            if rc_text:
                m = re.search(r"([\d,]+)", rc_text)
                if m:
                    review_count = int(m.group(1).replace(",", ""))
        except Exception:
            pass

        # ── Category ────────────────────────────────────────────────────
        detected_category = self._detail_text(page, [
            "button.DkEaL",
            "span.YhemCb",
            "div[class*='category']",
        ]) or category

        # ── Opening Hours ────────────────────────────────────────────────
        hours_text = self._detail_text(page, [
            "div[aria-label*='Hours']",
            "[aria-label*='Opens'] span",
            "div.t39EBf",
        ])
        open_now: Optional[bool] = None
        if hours_text:
            hl = hours_text.lower()
            if "open now" in hl or "opens soon" in hl:
                open_now = True
            elif "closed" in hl:
                open_now = False

        # ── Description ─────────────────────────────────────────────────
        description = self._detail_text(page, [
            "div.WeS02d",
            "div[class*='description']",
        ])

        # ── Pincode from address ─────────────────────────────────────────
        pincode: Optional[str] = None
        if address:
            m = re.search(r"\b(\d{6})\b", address)
            if m:
                pincode = m.group(1)

        # ── Latitude / Longitude from final URL ──────────────────────────
        # Google Maps updates the URL to /@lat,lng,zoom after rendering
        final_url = page.url
        lat, lng = self._extract_latlng(final_url)
        if lat is None:  # fallback: try original place_url
            lat, lng = self._extract_latlng(place_url)

        # ── Status label ─────────────────────────────────────────────────
        status = "Operational"
        try:
            if page.locator('span:has-text("Permanently closed")').is_visible(timeout=300):
                status = "Permanently Closed"
        except Exception:
            pass

        # Inconsistency filter
        if filters.get("exclude_inconsistent_data"):
            if not phone and not address:
                self.logger.debug(f"[GoogleMaps] Skipped no-data: {name}")
                return None

        return BusinessData(
            business_name=name,
            business_category=detected_category,
            address=address,
            city=city,
            state="Karnataka",
            pincode=pincode,
            latitude=lat,
            longitude=lng,
            phone_number=phone,
            website=website,
            opening_hours=hours_text,
            open_now=open_now,
            rating=rating,
            review_count=review_count,
            description=description,
            business_status=status,
            source_url=final_url,  # use final URL which has /@lat,lng
        )

    # ------------------------------------------------------------------ #
    # Helpers                                                              #
    # ------------------------------------------------------------------ #

    def _detail_text(self, page: Page, selectors: List[str]) -> Optional[str]:
        for sel in selectors:
            try:
                text = page.locator(sel).first.inner_text(timeout=800).strip()
                if text:
                    return text
            except Exception:
                pass
        return None

    def _detail_attr(self, page: Page, selectors: List[str], attr: str) -> Optional[str]:
        for sel in selectors:
            try:
                val = page.locator(sel).first.get_attribute(attr, timeout=800)
                if val and val.strip():
                    return val.strip()
            except Exception:
                pass
        return None

    def _extract_latlng(self, url: str):
        """Extract lat/lng from a Google Maps URL like /@12.9716,77.5946,15z"""
        try:
            m = re.search(r"/@(-?[\d.]+),(-?[\d.]+)", url)
            if m:
                return float(m.group(1)), float(m.group(2))
        except Exception:
            pass
        return None, None
