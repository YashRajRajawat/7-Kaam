"""
JustDial Production Scraper — v2 (Search-Box Strategy)
--------------------------------------------------------
Strategy change based on live diagnostics (2026-08-08):

PROBLEM: Direct URL navigation (https://www.justdial.com/Bangalore/Category-in-Area)
  - JustDial redirects to a citywide search (drops the area filter)
  - Page body is empty on first load → JS challenge / anti-bot detection

SOLUTION: Navigate to JustDial homepage, use the actual search UI:
  1. Set city via the location/city selector
  2. Type the category in the main search box
  3. Set locality/area in the "Near" input
  4. Press Search
  This mimics real user behavior and bypasses the JS challenge.

Phone extraction (verified from browser inspection 2026-08-08):
  - Click .callbutton on each result card
  - JustDial renders a modal overlay
  - The phone number appears in body text as a 10-digit Indian mobile number
  - Regex: [6-9]\\d{9}
"""

import re
import time
import random
from typing import Optional, List

from playwright.sync_api import Page, TimeoutError as PlaywrightTimeout

from scraper.base import BaseScraper
from models.business import BusinessData


class JustDialScraper(BaseScraper):
    BASE_URL = "https://www.justdial.com"
    MAX_SCROLL_ATTEMPTS = 20

    # ------------------------------------------------------------------ #
    # Public entry point                                                   #
    # ------------------------------------------------------------------ #

    def scrape_category_in_area(self, category: str, area: str, city: str) -> None:
        page = self.new_stealth_page()  # stealth applied to bypass bot detection
        query = f"{category} in {area}, {city}"
        self.logger.info(f"[JustDial] Searching: {query}")

        try:
            success = self._navigate_via_search(page, city, category, area)
            if not success:
                self.logger.warning(f"[JustDial] Could not load results for: {query}")
                return

            self._scroll_all_results(page)
            count = self._extract_all_results(page, category, area, city)
            self.logger.info(f"[JustDial] Collected {count} businesses for: {query}")
        except Exception as exc:
            self.logger.error(f"[JustDial] Failed '{query}': {exc}", exc_info=True)
        finally:
            page.close()

    # ------------------------------------------------------------------ #
    # Navigation — use the search UI, not direct URL                      #
    # ------------------------------------------------------------------ #

    def _navigate_via_search(self, page: Page, city: str, category: str, area: str) -> bool:
        """
        Navigate to JustDial by interacting with the search form.
        This bypasses the anti-bot redirect that drops the area filter.
        """
        timeout_ms = self.config.get("scraper", {}).get("timeout_ms", 30000)

        try:
            # Step 1: Load homepage
            self.logger.debug("[JustDial] Loading homepage...")
            page.goto(self.BASE_URL, wait_until="domcontentloaded", timeout=timeout_ms)
            page.wait_for_timeout(random.randint(2000, 3500))

            # Step 2: Handle popups/modals
            self._dismiss_popups(page)

            # Step 3: Set city in the location bar (if not already Bangalore)
            self._set_city(page, city)

            # Step 4: Type category in the main search box
            self._fill_search_query(page, category)

            # Step 5: Type area in the locality "Near" box
            self._fill_near_location(page, area)

            # Step 6: Submit search
            self._submit_search(page)

            # Step 7: Wait for results
            page.wait_for_timeout(4000)

            # Check if results loaded
            card_count = page.locator(".resultbox").count()
            self.logger.debug(f"[JustDial] Cards after search: {card_count}")
            return card_count > 0

        except Exception as exc:
            self.logger.error(f"[JustDial] Navigation failed: {exc}")
            return False

    def _set_city(self, page: Page, city: str) -> None:
        """Set the city/location in JustDial's city selector."""
        try:
            # JustDial city selector is usually a clickable element showing current city
            for sel in ["#city-name", ".city-name", "[placeholder*='City']", "#selectedCity"]:
                el = page.locator(sel).first
                if el.is_visible(timeout=1000):
                    el.click()
                    page.wait_for_timeout(500)
                    el.fill(city)
                    page.wait_for_timeout(500)
                    # Select from dropdown
                    page.locator(f"li:has-text('{city}'), [data-city*='{city}']").first.click(timeout=2000)
                    return
        except Exception:
            pass  # City may already be set correctly; proceed

    def _fill_search_query(self, page: Page, category: str) -> None:
        """Fill the main search box with the category."""
        for sel in [
            "input#search",
            "input[name='search']",
            "input[placeholder*='Search']",
            "input[placeholder*='What']",
            "#what",
            "input.search-input",
        ]:
            try:
                box = page.locator(sel).first
                if box.is_visible(timeout=1000):
                    box.triple_click()  # clear existing text
                    box.type(category, delay=80)
                    page.wait_for_timeout(600)
                    # Dismiss any autocomplete
                    try:
                        page.locator(f"li:has-text('{category}')").first.click(timeout=800)
                    except Exception:
                        pass
                    return
            except Exception:
                continue

    def _fill_near_location(self, page: Page, area: str) -> None:
        """Fill the 'Near' / locality input with the area name."""
        for sel in [
            "input#where",
            "input[name='where']",
            "input[placeholder*='Where']",
            "input[placeholder*='Near']",
            "input[placeholder*='Location']",
            "#where",
            "input.locality-input",
        ]:
            try:
                box = page.locator(sel).first
                if box.is_visible(timeout=1000):
                    box.triple_click()
                    box.type(area, delay=80)
                    page.wait_for_timeout(700)
                    # Select area from dropdown suggestions
                    try:
                        page.locator(f"li:has-text('{area}'), [data-locality*='{area}']").first.click(timeout=1200)
                    except Exception:
                        pass
                    return
            except Exception:
                continue

    def _submit_search(self, page: Page) -> None:
        """Click the search button or press Enter."""
        for sel in [
            "button[type='submit']",
            "button.search-btn",
            "#search-btn",
            "input[type='submit']",
        ]:
            try:
                btn = page.locator(sel).first
                if btn.is_visible(timeout=800):
                    btn.click()
                    return
            except Exception:
                continue
        # Fallback: press Enter on the search box
        try:
            page.keyboard.press("Enter")
        except Exception:
            pass

    def _dismiss_popups(self, page: Page) -> None:
        """Close login/app-install overlays."""
        for selector in [
            ".nsf-overlay-close",
            ".popupCloseIcon",
            "[class*='modal'] [class*='close']",
            "[id*='modal'] button",
            "button[class*='close']",
            "span.close",
        ]:
            try:
                btn = page.locator(selector).first
                if btn.is_visible(timeout=1000):
                    btn.click()
                    page.wait_for_timeout(300)
                    self.logger.debug(f"[JustDial] Dismissed overlay: {selector}")
                    break
            except Exception:
                continue

    # ------------------------------------------------------------------ #
    # Pagination — scroll + Load More                                      #
    # ------------------------------------------------------------------ #

    def _scroll_all_results(self, page: Page) -> None:
        self.logger.info("[JustDial] Loading all results...")
        prev_count = 0
        stable_rounds = 0

        for i in range(self.MAX_SCROLL_ATTEMPTS):
            page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            page.wait_for_timeout(random.randint(1500, 2500))

            try:
                load_more = page.locator(
                    "a.loadMore, button.loadMore, "
                    "a[class*='load_more'], a[class*='loadmore'], "
                    "a:text('Load More'), button:text('Load More')"
                ).first
                if load_more.is_visible(timeout=700):
                    load_more.scroll_into_view_if_needed()
                    load_more.click()
                    page.wait_for_timeout(2000)
            except Exception:
                pass

            current_count = page.locator(".resultbox").count()
            self.logger.debug(f"[JustDial] Cards: {current_count} (round {i+1})")

            if current_count == prev_count:
                stable_rounds += 1
                if stable_rounds >= 3:
                    self.logger.info(f"[JustDial] Stable at {current_count} cards.")
                    break
            else:
                stable_rounds = 0

            prev_count = current_count

    # ------------------------------------------------------------------ #
    # Card extraction                                                      #
    # ------------------------------------------------------------------ #

    def _extract_all_results(self, page: Page, category: str, area: str, city: str) -> int:
        cards = page.locator(".resultbox")
        total = cards.count()
        self.logger.info(f"[JustDial] Extracting {total} cards...")
        extracted = 0

        for idx in range(total):
            try:
                card = cards.nth(idx)
                business = self._extract_single_card(card, page, category, area, city, idx)
                if business is not None:
                    self.state_manager.add(business)
                    extracted += 1
            except Exception as exc:
                self.logger.debug(f"[JustDial] Card #{idx} error: {exc}")

        return extracted

    def _extract_single_card(
        self, card, page: Page, category: str, area: str, city: str, idx: int
    ) -> Optional[BusinessData]:
        filters = self.config.get("scraper", {}).get("filters", {})

        # Name
        name = self._try_text(card, [
            ".resultbox_title_anchorbox",
            ".resultbox_title_anchor",
            "a.jcn",
            "span.jcn",
        ])
        if not name:
            return None

        # Status
        card_text = card.inner_text(timeout=2000)
        is_closed = "permanently closed" in card_text.lower()
        status = "Permanently Closed" if is_closed else "Operational"
        if filters.get("exclude_permanently_closed") and is_closed:
            return None

        # Address
        address = self._try_text(card, [
            "address",
            ".resultbox_address",
            "span[class*='addr']",
            ".cont_fl_addr",
        ])

        # Rating
        rating: Optional[float] = None
        r_str = self._try_text(card, [".resultbox_totalrate", ".star_m"])
        if r_str:
            try:
                rating = float(re.sub(r"[^\d.]", "", r_str))
            except ValueError:
                pass

        # Review count
        review_count: Optional[int] = None
        rc_str = self._try_text(card, [".resultbox_countrate", ".rt_count"])
        if rc_str:
            try:
                review_count = int(re.sub(r"[^\d]", "", rc_str))
            except ValueError:
                pass

        # Source URL
        source_url = page.url
        try:
            href = card.locator(
                ".resultbox_title_anchorbox, .resultbox_title_anchor"
            ).first.get_attribute("href", timeout=500)
            if href:
                source_url = href if href.startswith("http") else f"{self.BASE_URL}{href}"
        except Exception:
            pass

        # Phone via modal click
        phone = self._extract_phone_via_modal(card, page, idx)

        # Website
        website = self._try_attr(card, [
            "a[href^='http'][target='_blank']",
            "a[class*='website']",
        ], "href")

        # Hours
        hours_text = self._try_text(card, [
            ".offon_detail",
            ".resultbox_timing",
            "span[class*='timing']",
        ])
        open_now: Optional[bool] = None
        if hours_text:
            hl = hours_text.lower()
            open_now = True if "open now" in hl else (False if "closed" in hl else None)

        # Services
        services: List[str] = []
        try:
            raw = card.locator(
                ".resultbox_tags span, span.mrehover"
            ).all_inner_texts()
            services = [s.strip() for s in raw if s.strip()]
        except Exception:
            pass

        # Inconsistency filter
        if filters.get("exclude_inconsistent_data"):
            if not phone and not address:
                return None

        return BusinessData(
            business_name=name,
            business_category=category,
            address=address,
            city=city,
            state="Karnataka",
            phone_number=phone,
            website=website,
            opening_hours=hours_text,
            open_now=open_now,
            rating=rating,
            review_count=review_count,
            services=services,
            business_status=status,
            source_url=source_url,
        )

    # ------------------------------------------------------------------ #
    # Phone extraction via modal click                                     #
    # ------------------------------------------------------------------ #

    def _extract_phone_via_modal(self, card, page: Page, card_idx: int) -> Optional[str]:
        """
        Click the Show Number button and extract phone from the modal overlay.
        Verified: phone appears as 10-digit Indian mobile in body text after modal opens.
        """
        try:
            card.scroll_into_view_if_needed(timeout=1500)

            call_btn = card.locator(
                ".callbutton, [class*='callbutton'], .callcontent, [class*='callcontent']"
            ).first
            if not call_btn.is_visible(timeout=800):
                return None

            call_btn.click(timeout=1000)
            page.wait_for_timeout(2000)

            # Primary: scan body for Indian mobile numbers
            body_text = page.inner_text("body", timeout=1500)
            matches = re.findall(r"\b([6-9]\d{9}|0\d{10})\b", body_text)
            if matches:
                self._close_modal(page)
                return matches[0]

        except Exception as exc:
            self.logger.debug(f"[JustDial] Phone modal error #{card_idx}: {exc}")

        self._close_modal(page)
        return None

    def _close_modal(self, page: Page) -> None:
        try:
            for sel in [
                "[class*='popbddvn'] .close",
                "#bd_call_popup .close",
                "[class*='modal'] [class*='close']",
                ".jd-overlay .close",
            ]:
                btn = page.locator(sel).first
                if btn.is_visible(timeout=300):
                    btn.click()
                    return
        except Exception:
            pass
        try:
            page.keyboard.press("Escape")
        except Exception:
            pass

    # ------------------------------------------------------------------ #
    # Helpers                                                              #
    # ------------------------------------------------------------------ #

    def _try_text(self, card, selectors: List[str]) -> Optional[str]:
        for sel in selectors:
            try:
                text = card.locator(sel).first.inner_text(timeout=400).strip()
                if text:
                    return text
            except Exception:
                pass
        return None

    def _try_attr(self, card, selectors: List[str], attr: str) -> Optional[str]:
        for sel in selectors:
            try:
                val = card.locator(sel).first.get_attribute(attr, timeout=400)
                if val and val.strip():
                    return val.strip()
            except Exception:
                pass
        return None
