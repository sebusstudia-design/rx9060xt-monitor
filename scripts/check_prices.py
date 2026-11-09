"""Daily collector for Radeon RX 9060 XT 16 GB listings from TagDip.

Uses one public HTML page request per run. No CAPTCHA bypass, no hidden APIs.
If markup changes, the last successful prices are preserved and the status
file records the failure (instead of displaying old prices as current).
"""
from __future__ import annotations

import json
import re
import sys
import unicodedata
from datetime import datetime
from pathlib import Path
from urllib.parse import urljoin, urlparse
from zoneinfo import ZoneInfo

import requests
from bs4 import BeautifulSoup

SITE = "https://tagdip.pl/m/3/radeon-rx-9060-xt-16-gb"
ROOT = Path(__file__).resolve().parents[1] / "docs" / "data"
NOW = lambda: datetime.now(ZoneInfo("Europe/Warsaw"))
PRICE = re.compile(r"(?<!\d)(\d{1,3}(?:[\s\u00a0\u202f]\d{3})+|\d{4,6})(?:[,.](\d{1,2}))?\s*zł", re.I)
PRODUCT_URL = re.compile(r"/p/\d+/[\w-]+", re.I)
CARD_PATTERN = re.compile(r"\brx\s*9060\s*xt\b", re.I)
CAPACITY = re.compile(r"\b16\s*gb\b", re.I)
BANNED = re.compile(r"(outlet|refurb|używan|powystaw|odnowion|uszkodzon|b-stock|reconditioned)", re.I)
STORES = ("RTV Euro AGD", "Media Expert", "Media Markt", "Komputronik", "Proline", "Morele", "x-kom", "Sferis", "Neonet", "Amazon")
BRANDS = ("ASRock", "Asus", "Gigabyte", "PowerColor", "Sapphire", "XFX")


def model_key(name: str) -> str:
    norm = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", norm).strip("-")


def price_number(text: str) -> float | None:
    match = PRICE.search(text)
    if not match:
        return None
    whole = re.sub(r"\s", "", match.group(1))
    frac = match.group(2) or ""
    result = float(f"{whole}.{frac}" if frac else whole)
    return round(result, 2) if 1000 <= result <= 10000 else None


def extract_offers(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    seen: dict[str, dict] = {}
    for a in soup.find_all("a", href=PRODUCT_URL):
        name = " ".join(a.stripped_strings)
        name = re.sub(r"\s+", " ", name).strip()
        if not CARD_PATTERN.search(name) or not CAPACITY.search(name) or BANNED.search(name):
            continue
        if re.search(r"\b8\s*gb\b", name, re.I):
            continue
        href = urljoin(SITE, a.get("href", ""))
        if urlparse(href).netloc != "tagdip.pl":
            continue
        # The closest ancestor with both the product name and its price is
        # generally a product card. Do not take a price from the entire page.
        par = a
        candidate = None
        for _ in range(7):
            par = par.parent
            if par is None:
                break
            block = par.get_text(" ", strip=True)
            if len(block) > 1100:
                break
            i = block.lower().find(name.lower())
            if i < 0:
                continue
            excerpt = block[i + len(name):]
            if BANNED.search(block[:i + len(name) + 200]):
                break
            if re.search(r"brak w sklepach|niedostępn", excerpt[:120], re.I):
                break
            m = PRICE.search(excerpt)
            if m and m.start() < 230:
                amount = price_number(m.group())
                if amount is None:
                    break
                merchant_text = excerpt[:m.start()]
                merchant = next((s for s in STORES if s.lower() in merchant_text.lower()), "Porównaj sklepy")
                if merchant == "Porównaj sklepy" or merchant.lower() == "allegro":
                    break
                candidate = {"id": model_key(name), "brand": next((b for b in BRANDS if b.lower() in name.lower()),"GPU"),
                             "name": name, "merchant": merchant, "price": amount, "url": href, "inStock": True}
                break
        if candidate:
            # Model can appear more than once in markup. Keep cheapest.
            key = candidate["id"]
            if key not in seen or candidate["price"] < seen[key]["price"]:
                seen[key] = candidate
    return sorted(seen.values(), key=lambda p: (p["price"], p["brand"], p["name"]))


def load(path: Path, fallback):
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except (ValueError, OSError):
            pass
    return fallback


def write(name: str, data: dict):
    ROOT.mkdir(parents=True, exist_ok=True)
    (ROOT / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def record_success(items: list[dict], at: str):
    current = {"updatedAt": at, "source": "TagDip", "sourceUrl": SITE, "items": items}
    history = load(ROOT / "history.json", {"records": []})
    records = history.get("records", [])
    today = at[:10]
    entry = {"date": today, "checkedAt": at, "minPrice": min(x["price"] for x in items),
             "count": len(items), "prices": {x["id"]: x["price"] for x in items}}
    records = [r for r in records if r.get("date") != today] + [entry]
    records = sorted(records, key=lambda r: r["date"])[-200:]
    write("latest.json", current)
    write("history.json", {"records": records})
    write("status.json", {"lastCheckedAt": at, "ok": True, "error": None})


def record_failure(error: str, at: str):
    # We deliberately do not alter latest/history on failed fetch.
    write("status.json", {"lastCheckedAt": at, "ok": False, "error": error[:250]})


def run():
    at = NOW().isoformat(timespec="seconds")
    try:
        response = requests.get(SITE, headers={"User-Agent": "Mozilla/5.0 (compatible; PersonalPriceTracker/1.0; +https://github.com)"}, timeout=25)
        response.raise_for_status()
        offers = extract_offers(response.text)
        if len(offers) < 4:
            raise RuntimeError(f"Znaleziono tylko {len(offers)} ofert; zmiana struktury strony lub ograniczenie dostępu")
        record_success(offers, at)
        print(f"OK: {len(offers)} dostępnych ofert; minimum {offers[0]['price']} PLN")
    except (requests.RequestException, ValueError, RuntimeError) as exc:
        record_failure(str(exc), at)
        print(f"UWAGA: odczyt nieudany: {exc}", file=sys.stderr)


if __name__ == "__main__":
    run()
