"""
M7 Business School Events Scraper
Scrapes upcoming admissions events from all 7 M7 business schools.
Output: m7-events.json + individual events/<school>-events.json files
"""

import asyncio
import json
import re
import os
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse

from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout
from bs4 import BeautifulSoup

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

TODAY       = datetime.now(timezone.utc)
CUTOFF      = TODAY + timedelta(days=365)   # accept up to 12 months out
OUTPUT_DIR  = Path(__file__).parent / "events"
LOG_LINES   = []

SCHOOLS = [
    {
        "id":   "harvard-hbs",
        "name": "Harvard Business School",
        "url":  "https://www.hbs.edu/mba/admissions/events/Pages/default.aspx",
    },
    {
        "id":   "stanford-gsb",
        "name": "Stanford Graduate School of Business",
        "url":  "https://www.gsb.stanford.edu/programs/mba/admission/events",
    },
    {
        "id":   "wharton-penn",
        "name": "Wharton School",
        "url":  "https://mba.wharton.upenn.edu/admissions-events/",
    },
    {
        "id":   "booth-chicago",
        "name": "Booth School of Business",
        "url":  "https://www.chicagobooth.edu/mba/full-time/admissions/events",
    },
    {
        "id":   "sloan-mit",
        "name": "MIT Sloan School of Management",
        "url":  "https://mitsloan.mit.edu/mba/admissions/events",
    },
    {
        "id":   "kellogg-northwestern",
        "name": "Kellogg School of Management",
        "url":  "https://www.kellogg.northwestern.edu/admissions/admissions-events.aspx",
    },
    {
        "id":   "columbia-cbs",
        "name": "Columbia Business School",
        "url":  "https://academics.business.columbia.edu/mba/admissions/events",
    },
]

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def log(msg: str):
    ts = datetime.now().strftime("%H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line)
    LOG_LINES.append(line)


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def parse_date(raw: str) -> str | None:
    """Try to parse a messy date string into YYYY-MM-DD. Returns None on failure."""
    if not raw:
        return None
    raw = raw.strip()

    # Remove ordinal suffixes: 1st, 2nd, 3rd, 4th … 31st
    raw = re.sub(r"(\d+)(st|nd|rd|th)", r"\1", raw, flags=re.IGNORECASE)

    # Remove day-of-week prefixes (Monday, Tue, etc.)
    raw = re.sub(
        r"^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)[,\s]*",
        "", raw, flags=re.IGNORECASE
    )

    formats = [
        "%B %d, %Y",   # April 15, 2025
        "%b %d, %Y",   # Apr 15, 2025
        "%B %d %Y",    # April 15 2025
        "%b %d %Y",    # Apr 15 2025
        "%m/%d/%Y",    # 04/15/2025
        "%Y-%m-%d",    # 2025-04-15
        "%d %B %Y",    # 15 April 2025
        "%d %b %Y",    # 15 Apr 2025
    ]

    for fmt in formats:
        try:
            # Inject current year for year-less formats to avoid Python 3.14 ambiguity
            raw_with_year = raw.strip()
            if fmt in ("%B %d", "%b %d"):
                raw_with_year = f"{raw_with_year} {TODAY.year}"
                fmt = fmt + " %Y"
            dt = datetime.strptime(raw_with_year, fmt)
            if dt.replace(tzinfo=None) < TODAY.replace(tzinfo=None) - timedelta(days=1):
                dt = dt.replace(year=dt.year + 1)
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            pass

    # Last-ditch: look for a 4-digit year + month name pattern anywhere
    m = re.search(r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})[,\s]+(\d{4})", raw, re.I)
    if m:
        try:
            dt = datetime.strptime(f"{m.group(1)} {m.group(2)} {m.group(3)}", "%b %d %Y")
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            pass

    return None


def is_future(date_str: str | None) -> bool:
    if not date_str:
        return True   # keep events with unknown dates (might be upcoming)
    try:
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        return dt >= TODAY.replace(tzinfo=None) - timedelta(days=1)
    except ValueError:
        return True


def make_event_id(school_id: str, title: str, date: str | None) -> str:
    date_part = date or "undated"
    title_part = slugify(title)[:40]
    return f"{school_id}-{date_part}-{title_part}"


def detect_event_type(title: str, description: str = "") -> str:
    text = (title + " " + description).lower()
    if any(w in text for w in ["campus visit", "campus tour", "open house", "visit day"]):
        return "campus-visit"
    if any(w in text for w in ["class visit", "sit in"]):
        return "class-visit"
    if any(w in text for w in ["webinar", "virtual info", "online info", "live stream"]):
        return "webinar"
    if any(w in text for w in ["coffee chat", "coffee connect"]):
        return "coffee-chat"
    if any(w in text for w in ["info session", "information session", "admissions briefing"]):
        return "info-session"
    if any(w in text for w in ["interview", "interviewing"]):
        return "interview-prep"
    return "info-session"


def detect_location(title: str, description: str, venue_text: str = "") -> dict:
    text = (title + " " + description + " " + venue_text).lower()
    if any(w in text for w in ["virtual", "online", "webinar", "zoom", "livestream", "live stream"]):
        return {"type": "virtual", "venue": None, "city": None, "state": None}
    if any(w in text for w in ["hybrid"]):
        return {"type": "hybrid", "venue": venue_text or None, "city": None, "state": None}
    return {"type": "in-person", "venue": venue_text or None, "city": None, "state": None}


# ---------------------------------------------------------------------------
# Per-school scrapers
# ---------------------------------------------------------------------------

async def scrape_hbs(page) -> list[dict]:
    """Harvard Business School -- SharePoint-based list page."""
    events = []
    try:
        await page.goto(
            "https://www.hbs.edu/mba/admissions/events/Pages/default.aspx",
            wait_until="domcontentloaded", timeout=30000
        )
        await page.wait_for_timeout(3000)
        html = await page.content()
        soup = BeautifulSoup(html, "lxml")

        # HBS events are in .ms-listviewtable or article/li.event-item blocks
        rows = soup.select("tr.ms-itmhover, .event-item, article.event, li.event, .views-row")
        if not rows:
            # Try generic: look for divs/articles containing a date + link
            rows = soup.select("div.event, div[class*='event'], article")

        for row in rows:
            title_el = row.select_one("a, h3, h2, .event-title, .title")
            if not title_el:
                continue
            title = title_el.get_text(strip=True)
            if not title or len(title) < 5:
                continue

            href = title_el.get("href", "")
            if href and not href.startswith("http"):
                href = urljoin("https://www.hbs.edu", href)

            # Date
            date_el = row.select_one(".date, .event-date, time, [class*='date']")
            raw_date = date_el.get_text(strip=True) if date_el else ""
            parsed_date = parse_date(raw_date)

            # Description
            desc_el = row.select_one("p, .description, .summary, .event-desc")
            description = desc_el.get_text(strip=True)[:200] if desc_el else ""

            location = detect_location(title, description)
            events.append({
                "id": make_event_id("harvard-hbs", title, parsed_date),
                "title": title,
                "date": parsed_date,
                "time": None,
                "location": location,
                "eventType": detect_event_type(title, description),
                "description": description,
                "registrationUrl": href or "https://www.hbs.edu/mba/admissions/events/Pages/default.aspx",
                "registrationDeadline": None,
                "scrapedAt": TODAY.isoformat(),
            })
    except Exception as e:
        log(f"  HBS error: {e}")
    return events


async def scrape_stanford(page) -> list[dict]:
    """Stanford GSB -- Drupal-based event listing."""
    events = []
    try:
        await page.goto(
            "https://www.gsb.stanford.edu/programs/mba/admission/events",
            wait_until="domcontentloaded", timeout=30000
        )
        await page.wait_for_timeout(3000)
        html = await page.content()
        soup = BeautifulSoup(html, "lxml")

        items = soup.select(
            "article.event, .views-row, li.event-item, "
            ".event-card, div.event, [class*='event-list'] li"
        )

        for item in items:
            title_el = item.select_one("h3 a, h2 a, h4 a, a.event-title, a")
            if not title_el:
                continue
            title = title_el.get_text(strip=True)
            if not title or len(title) < 5:
                continue

            href = title_el.get("href", "")
            if href and not href.startswith("http"):
                href = urljoin("https://www.gsb.stanford.edu", href)

            date_el = item.select_one("time, .date, .event-date, [class*='date']")
            raw_date = (date_el.get("datetime") or date_el.get_text(strip=True)) if date_el else ""
            parsed_date = parse_date(raw_date)

            desc_el = item.select_one("p, .description, .field-summary")
            description = desc_el.get_text(strip=True)[:200] if desc_el else ""

            location = detect_location(title, description)
            events.append({
                "id": make_event_id("stanford-gsb", title, parsed_date),
                "title": title,
                "date": parsed_date,
                "time": None,
                "location": location,
                "eventType": detect_event_type(title, description),
                "description": description,
                "registrationUrl": href or "https://www.gsb.stanford.edu/programs/mba/admission/events",
                "registrationDeadline": None,
                "scrapedAt": TODAY.isoformat(),
            })
    except Exception as e:
        log(f"  Stanford error: {e}")
    return events


async def scrape_wharton(page) -> list[dict]:
    """Wharton -- WordPress site."""
    events = []
    try:
        await page.goto(
            "https://mba.wharton.upenn.edu/events/",
            wait_until="networkidle", timeout=30000
        )
        await page.wait_for_timeout(3000)
        html = await page.content()
        soup = BeautifulSoup(html, "lxml")

        # Real Wharton event selector (confirmed via inspection)
        items = soup.select(".martech-wevent-list--item")

        for item in items:
            title_el = item.select_one("h3 a, h2 a, a")
            if not title_el:
                continue
            title = title_el.get_text(strip=True)
            if not title or len(title) < 5:
                continue

            href = title_el.get("href", "")
            if href and not href.startswith("http"):
                href = urljoin("https://mba.wharton.upenn.edu", href)

            # Date from calendar widget: .month + .day
            month_el = item.select_one(".month")
            day_el   = item.select_one(".day")
            raw_date = ""
            if month_el and day_el:
                raw_date = f"{month_el.get_text(strip=True)} {day_el.get_text(strip=True)}"
            parsed_date = parse_date(raw_date)

            # Time + location in .info span
            info_el  = item.select_one(".info span, .info")
            info_txt = info_el.get_text(" ", strip=True) if info_el else ""
            # Extract time (e.g. "04:00 PM - 05:00 PM")
            time_match = re.search(r"\d{1,2}:\d{2}\s*[AP]M", info_txt)
            time_str   = time_match.group(0) if time_match else None
            # Venue is text after last line break / after time part
            venue = re.sub(r".*\d{1,2}:\d{2}\s*[AP]M\s*-\s*\d{1,2}:\d{2}\s*[AP]M\s*", "", info_txt).strip()

            location = detect_location(title, info_txt, venue)
            events.append({
                "id": make_event_id("wharton-penn", title, parsed_date),
                "title": title,
                "date": parsed_date,
                "time": time_str,
                "location": location,
                "eventType": detect_event_type(title, info_txt),
                "description": info_txt[:200],
                "registrationUrl": href or "https://mba.wharton.upenn.edu/events/",
                "registrationDeadline": None,
                "scrapedAt": TODAY.isoformat(),
            })
    except Exception as e:
        log(f"  Wharton error: {e}")
    return events


async def scrape_booth(page) -> list[dict]:
    """Booth -- custom JS events page."""
    events = []
    try:
        await page.goto(
            "https://www.chicagobooth.edu/mba/full-time/admissions/events",
            wait_until="networkidle", timeout=40000
        )
        await page.wait_for_timeout(4000)
        html = await page.content()
        soup = BeautifulSoup(html, "lxml")

        items = soup.select(
            ".event-card, article.event, .event-item, "
            "li.views-row, .views-row, [class*='event']"
        )

        for item in items:
            title_el = item.select_one("h2, h3, h4, .event-title, a")
            if not title_el:
                continue
            title = title_el.get_text(strip=True)
            if not title or len(title) < 5:
                continue

            link_el = item.select_one("a") or title_el
            href = link_el.get("href", "")
            if href and not href.startswith("http"):
                href = urljoin("https://www.chicagobooth.edu", href)

            date_el = item.select_one("time, .date, .event-date, [class*='date']")
            raw_date = ""
            if date_el:
                raw_date = date_el.get("datetime") or date_el.get_text(strip=True)
            parsed_date = parse_date(raw_date)

            desc_el = item.select_one("p, .description, .summary")
            description = desc_el.get_text(strip=True)[:200] if desc_el else ""

            location = detect_location(title, description)
            events.append({
                "id": make_event_id("booth-chicago", title, parsed_date),
                "title": title,
                "date": parsed_date,
                "time": None,
                "location": location,
                "eventType": detect_event_type(title, description),
                "description": description,
                "registrationUrl": href or "https://www.chicagobooth.edu/mba/full-time/admissions/events",
                "registrationDeadline": None,
                "scrapedAt": TODAY.isoformat(),
            })
    except Exception as e:
        log(f"  Booth error: {e}")
    return events


async def scrape_sloan(page) -> list[dict]:
    """MIT Sloan -- events page (confirmed URL: mitsloan.mit.edu/events)."""
    events = []
    try:
        await page.goto(
            "https://mitsloan.mit.edu/events",
            wait_until="networkidle", timeout=40000
        )
        await page.wait_for_timeout(3000)
        html = await page.content()
        soup = BeautifulSoup(html, "lxml")

        # Confirmed selector: .search-result--content h3 a
        items = soup.select(".search-result--content, .search-result")

        for item in items:
            title_el = item.select_one("h3 a, h2 a, a.search-result--title_link")
            if not title_el:
                continue
            title = title_el.get_text(strip=True)
            if not title or len(title) < 5:
                continue
            # Skip exec / non-MBA program nav items
            if any(x in title.lower() for x in ["executive", "emba", "phd"]):
                continue

            href = title_el.get("href", "")
            if href and not href.startswith("http"):
                href = urljoin("https://mitsloan.mit.edu", href)

            date_el = item.select_one("time, .date, [class*='date'], .event-date")
            raw_date = ""
            if date_el:
                raw_date = date_el.get("datetime") or date_el.get_text(strip=True)
            parsed_date = parse_date(raw_date)

            desc_el = item.select_one("p, .description, .search-result--summary")
            description = desc_el.get_text(strip=True)[:200] if desc_el else ""

            location = detect_location(title, description)
            events.append({
                "id": make_event_id("sloan-mit", title, parsed_date),
                "title": title,
                "date": parsed_date,
                "time": None,
                "location": location,
                "eventType": detect_event_type(title, description),
                "description": description,
                "registrationUrl": href or "https://mitsloan.mit.edu/events",
                "registrationDeadline": None,
                "scrapedAt": TODAY.isoformat(),
            })
    except Exception as e:
        log(f"  Sloan error: {e}")
    return events


async def scrape_kellogg(page) -> list[dict]:
    """Kellogg -- .aspx page with JS-rendered event list."""
    events = []
    try:
        await page.goto(
            "https://www.kellogg.northwestern.edu/admissions/admissions-events.aspx",
            wait_until="networkidle", timeout=40000
        )
        await page.wait_for_timeout(4000)
        html = await page.content()
        soup = BeautifulSoup(html, "lxml")

        items = soup.select(
            ".event-item, .event-card, article.event, "
            ".events-list li, ul.events li, li.event, "
            "[class*='event']"
        )

        for item in items:
            title_el = item.select_one("h2, h3, h4, a.event-title, a")
            if not title_el:
                continue
            title = title_el.get_text(strip=True)
            if not title or len(title) < 5:
                continue

            link_el = item.select_one("a") or title_el
            href = link_el.get("href", "") if hasattr(link_el, 'get') else ""
            if href and not href.startswith("http"):
                href = urljoin("https://www.kellogg.northwestern.edu", href)

            date_el = item.select_one("time, .date, .event-date, [class*='date']")
            raw_date = ""
            if date_el:
                raw_date = date_el.get("datetime") or date_el.get_text(strip=True)
            parsed_date = parse_date(raw_date)

            desc_el = item.select_one("p, .description, .summary")
            description = desc_el.get_text(strip=True)[:200] if desc_el else ""

            location = detect_location(title, description)
            events.append({
                "id": make_event_id("kellogg-northwestern", title, parsed_date),
                "title": title,
                "date": parsed_date,
                "time": None,
                "location": location,
                "eventType": detect_event_type(title, description),
                "description": description,
                "registrationUrl": href or "https://www.kellogg.northwestern.edu/admissions/admissions-events.aspx",
                "registrationDeadline": None,
                "scrapedAt": TODAY.isoformat(),
            })
    except Exception as e:
        log(f"  Kellogg error: {e}")
    return events


async def scrape_columbia(page) -> list[dict]:
    """Columbia Business School -- Drupal site."""
    events = []
    try:
        await page.goto(
            "https://academics.business.columbia.edu/mba/admissions/events",
            wait_until="networkidle", timeout=40000
        )
        await page.wait_for_timeout(3000)
        html = await page.content()
        soup = BeautifulSoup(html, "lxml")

        items = soup.select(
            "article.event, .views-row, .event-item, "
            "li.event, [class*='event'], .field--name-body li"
        )

        for item in items:
            title_el = item.select_one("h2 a, h3 a, h4 a, a.title, a")
            if not title_el:
                continue
            title = title_el.get_text(strip=True)
            if not title or len(title) < 5:
                continue

            href = title_el.get("href", "")
            if href and not href.startswith("http"):
                href = urljoin("https://academics.business.columbia.edu", href)

            date_el = item.select_one("time, .date, .event-date, [class*='date']")
            raw_date = ""
            if date_el:
                raw_date = date_el.get("datetime") or date_el.get_text(strip=True)
            parsed_date = parse_date(raw_date)

            desc_el = item.select_one("p, .description, .summary, .field--name-body")
            description = desc_el.get_text(strip=True)[:200] if desc_el else ""

            location = detect_location(title, description)
            events.append({
                "id": make_event_id("columbia-cbs", title, parsed_date),
                "title": title,
                "date": parsed_date,
                "time": None,
                "location": location,
                "eventType": detect_event_type(title, description),
                "description": description,
                "registrationUrl": href or "https://academics.business.columbia.edu/mba/admissions/events",
                "registrationDeadline": None,
                "scrapedAt": TODAY.isoformat(),
            })
    except Exception as e:
        log(f"  Columbia error: {e}")
    return events


# Map school id -> scraper function
SCRAPERS = {
    "harvard-hbs":        scrape_hbs,
    "stanford-gsb":       scrape_stanford,
    "wharton-penn":       scrape_wharton,
    "booth-chicago":      scrape_booth,
    "sloan-mit":          scrape_sloan,
    "kellogg-northwestern": scrape_kellogg,
    "columbia-cbs":       scrape_columbia,
}

# ---------------------------------------------------------------------------
# Deduplication
# ---------------------------------------------------------------------------

def clean_title(title: str) -> str:
    """Strip known UI noise from scraped titles."""
    noise_suffixes = ["open in new window", "opens in a new tab", "(opens new window)"]
    t = title
    for s in noise_suffixes:
        t = re.sub(re.escape(s), "", t, flags=re.IGNORECASE).strip()
    return t.strip(" -–—|")


UI_NOISE_TITLES = {
    "register now", "explore all events", "location type",
    "learn more", "view event", "click here", "see all events",
    "load more", "filter", "search", "submit", "sign up",
    "show more", "audience", "navigation", "menu", "close",
    "back", "next", "previous", "all events", "sort by",
}


def is_real_event(event: dict) -> bool:
    """Return False if the event looks like a scraped UI element."""
    title_lower = event["title"].lower().strip()
    if title_lower in UI_NOISE_TITLES:
        return False
    if len(event["title"]) < 8:
        return False
    # Filter out encoding noise
    if "?" in event["title"] and event["title"].count("?") > 2:
        return False
    return True


def dedupe(events: list[dict]) -> list[dict]:
    seen = set()
    out  = []
    for e in events:
        # Clean titles before deduplication
        e["title"] = clean_title(e["title"])
        if not is_real_event(e):
            continue
        key = slugify(e["title"])[:50]
        if key not in seen:
            seen.add(key)
            out.append(e)
    return out


# ---------------------------------------------------------------------------
# Main orchestrator
# ---------------------------------------------------------------------------

async def main():
    OUTPUT_DIR.mkdir(exist_ok=True)
    results = []

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1280, "height": 800},
        )

        for school in SCHOOLS:
            sid   = school["id"]
            sname = school["name"]
            log(f"\n{'='*55}")
            log(f"Scraping: {sname}")
            log(f"URL: {school['url']}")

            page = await context.new_page()
            # Block images/fonts to speed up loading
            await page.route(
                "**/*.{png,jpg,jpeg,gif,webp,svg,woff,woff2,ttf,eot}",
                lambda route: route.abort()
            )

            scraper_fn = SCRAPERS[sid]
            raw_events = await scraper_fn(page)
            await page.close()

            # Filter: future events only, remove TBD/coming-soon titles
            filtered = [
                e for e in raw_events
                if is_future(e.get("date"))
                and "tbd" not in e["title"].lower()
                and "coming soon" not in e["title"].lower()
                and len(e["title"]) > 5
            ]
            filtered = dedupe(filtered)

            # Columbia is blocked by Cloudflare bot protection
            if sid == "columbia-cbs" and not filtered:
                status = "blocked-bot-protection"
            else:
                status = "success" if filtered else "no-events-found"
            log(f"  Raw: {len(raw_events)}  |  After filter: {len(filtered)}  |  Status: {status}")

            if not filtered:
                note = "Blocked by bot-protection (Cloudflare)" if "blocked" in status \
                    else "No upcoming events found -- page may require login or JS"
                log(f"  WARNING: {note}")

            school_result = {
                "schoolId":      sid,
                "schoolName":    sname,
                "eventsPageUrl": school["url"],
                "scrapingStatus": status,
                "eventsFound":   len(filtered),
                "scrapedAt":     TODAY.isoformat(),
                "events":        filtered,
            }
            results.append(school_result)

            # Save individual file
            indiv_path = OUTPUT_DIR / f"{sid}-events.json"
            indiv_path.write_text(
                json.dumps(school_result, indent=2, ensure_ascii=False),
                encoding="utf-8"
            )
            log(f"  Saved -> events/{sid}-events.json")

            await asyncio.sleep(2)   # polite delay between schools

        await browser.close()

    # Combined output
    combined = {
        "lastUpdated": TODAY.isoformat(),
        "totalEvents": sum(r["eventsFound"] for r in results),
        "schools":     results,
    }
    combined_path = Path(__file__).parent / "m7-events.json"
    combined_path.write_text(
        json.dumps(combined, indent=2, ensure_ascii=False),
        encoding="utf-8"
    )
    log(f"\n{'='*55}")
    log(f"Combined output -> m7-events.json")
    log(f"Total events scraped: {combined['totalEvents']}")

    # Summary table
    log(f"\n{'?'*55}")
    log(f"{'School':<30} {'Events':>6}  {'Status'}")
    log(f"{'?'*55}")
    for r in results:
        log(f"{r['schoolId']:<30} {r['eventsFound']:>6}  {r['scrapingStatus']}")

    # Write log file
    log_path = Path(__file__).parent / "scraper-log.txt"
    log_path.write_text("\n".join(LOG_LINES), encoding="utf-8")
    print(f"\nLog saved -> scraper-log.txt")


if __name__ == "__main__":
    asyncio.run(main())
