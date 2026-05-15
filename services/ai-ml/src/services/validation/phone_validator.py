from __future__ import annotations
import re
import logging

import phonenumbers
from phonenumbers import PhoneNumberFormat, NumberParseException

logger = logging.getLogger(__name__)

# Country code signals derived from city/country names found anywhere in the CV text.
# Each key is an ISO 3166-1 alpha-2 country code.
_COUNTRY_SIGNALS: dict[str, list[str]] = {
    "DE": [
        "germany", "deutschland", "münchen", "munich", "berlin", "hamburg",
        "frankfurt", "köln", "cologne", "stuttgart", "düsseldorf", "nürnberg",
        "nuremberg", "dortmund", "essen", "leipzig", "bremen", "dresden",
        "hannover", "hanover", "hessen", "bavaria", "bayern", "nrw",
        "nordrhein", "westfalen", "sachsen", "thüringen",
    ],
    "CH": [
        "switzerland", "schweiz", "zürich", "zurich", "genf", "geneva",
        "bern", "basel", "lausanne", "luzern", "lucerne",
    ],
    "AT": [
        "austria", "österreich", "wien", "vienna", "graz", "linz",
        "salzburg", "innsbruck",
    ],
    "IN": [
        "india", "bangalore", "bengaluru", "mumbai", "bombay", "delhi",
        "new delhi", "hyderabad", "chennai", "madras", "pune", "poona",
        "noida", "gurgaon", "gurugram", "ahmedabad", "kolkata", "calcutta",
    ],
    "GB": [
        "united kingdom", "uk", "england", "london", "manchester",
        "birmingham", "leeds", "glasgow", "edinburgh", "bristol",
    ],
    "US": [
        "united states", "usa", "new york", "california", "texas",
        "chicago", "los angeles", "san francisco", "seattle", "boston",
    ],
    "NL": [
        "netherlands", "holland", "niederlande", "amsterdam", "rotterdam",
        "the hague", "den haag", "utrecht", "eindhoven",
    ],
    "FR": [
        "france", "frankreich", "paris", "lyon", "marseille", "toulouse",
        "bordeaux", "nice", "nantes", "strasbourg",
    ],
    "PL": [
        "poland", "polen", "warsaw", "warszawa", "krakow", "kraków",
        "wroclaw", "wrocław", "gdansk", "gdańsk",
    ],
}

# Default fallback for this deployment context (VASPP GmbH operates from Germany)
_DEFAULT_COUNTRY = "DE"


def validate_phone(phone: str | None, raw_text: str) -> str:
    """
    Return a phone number in E.164 format (+CC...) or "NA".

    Strategy:
    1. If LLM returned a phone, parse it directly (already has +CC) or
       with inferred country code.
    2. If LLM returned nothing, scan raw_text for a phone-shaped string and
       apply the same parse/infer logic.
    3. Return "NA" only when no valid number can be produced.
    """
    inferred_country = _infer_country(raw_text)

    if phone:
        result = _try_parse(phone, inferred_country)
        if result:
            return result

    # Fallback: attempt extraction directly from raw text
    raw_candidate = _extract_from_text(raw_text)
    if raw_candidate:
        result = _try_parse(raw_candidate, inferred_country)
        if result:
            return result

    return "NA"


def _try_parse(raw: str, country: str) -> str | None:
    """
    Parse a phone string with the phonenumbers library.
    Returns E.164 string on success, None on failure.
    """
    cleaned = raw.strip()

    # Attempt 1: number may already carry a country code (+XX prefix)
    try:
        parsed = phonenumbers.parse(cleaned, None)
        if phonenumbers.is_valid_number(parsed):
            return phonenumbers.format_number(parsed, PhoneNumberFormat.E164)
    except NumberParseException:
        pass

    # Attempt 2: parse with inferred country as default region
    try:
        parsed = phonenumbers.parse(cleaned, country)
        if phonenumbers.is_valid_number(parsed):
            return phonenumbers.format_number(parsed, PhoneNumberFormat.E164)
    except NumberParseException:
        pass

    # Attempt 3: strip common noise chars and retry with inferred country
    stripped = re.sub(r"[^\d+]", "", cleaned)
    if len(stripped) >= 7:
        try:
            parsed = phonenumbers.parse(stripped, country)
            if phonenumbers.is_valid_number(parsed):
                return phonenumbers.format_number(parsed, PhoneNumberFormat.E164)
        except NumberParseException:
            pass

    return None


def _infer_country(text: str) -> str:
    """
    Score country signals in the full CV text and return the best match.
    If no signal is found, returns the deployment default.
    """
    if not text:
        return _DEFAULT_COUNTRY

    lower = text.lower()
    scores: dict[str, int] = {}
    for code, signals in _COUNTRY_SIGNALS.items():
        hit = sum(1 for s in signals if s in lower)
        if hit:
            scores[code] = hit

    if not scores:
        return _DEFAULT_COUNTRY

    return max(scores, key=lambda c: scores[c])


_PHONE_CANDIDATE_RE = re.compile(
    r"(?:\+?\d[\d \t()\-\.]{6,}\d)"
)
_MIN_DIGITS = 7


def _extract_from_text(text: str) -> str | None:
    """
    Find the first phone-shaped token in raw_text that has enough digits
    to be a real phone number (not a year range or date).
    """
    if not text:
        return None
    for match in _PHONE_CANDIDATE_RE.finditer(text):
        candidate = match.group()
        if sum(c.isdigit() for c in candidate) >= _MIN_DIGITS:
            return candidate
    return None
