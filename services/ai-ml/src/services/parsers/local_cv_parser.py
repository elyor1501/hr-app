from __future__ import annotations
import re
from dataclasses import dataclass, field
import logging

from .section_detector import detect_sections
from .section_extractor import extract_verbatim, extract_with_spacy, _is_sentence_format
from .esco_matcher import match_esco_skills
from .skills_vocabulary import SKILLS_ALIASES
from .labeled_experience_parser import extract_labeled_experience

logger = logging.getLogger(__name__)

@dataclass
class ParsedSkill:
    value: str
    confidence: float
    source: str  # "verbatim" | "dependency" | "esco" | "summary" | "fallback"


@dataclass
class ParseResult:
    skills: list[ParsedSkill] = field(default_factory=list)
    experiences: list[dict] = field(default_factory=list)
    full_name: str | None = None
    email: str | None = None
    phone: str | None = None
    raw_sections: dict[str, str] = field(default_factory=dict)
    skills_raw_text: str | None = None
    experience_raw_text: str | None = None


_EMAIL_RE = re.compile(r"[\w.+\-]+@[\w\-]+\.[a-zA-Z]{2,7}")
_PHONE_RE = re.compile(r"(?:\+?\d[\d \t()\-\.]{6,}\d)")
_MIN_PHONE_DIGITS = 10  # year ranges (2012–2020) have 8 digits; real phones have ≥ 10

_NAME_LABEL_RE = re.compile(
    r"(?:full\s+)?name\s*[:\-]\s*([^\d\n@/:;|\\]{2,60})",
    re.IGNORECASE,
)

_HEADING_WORDS = frozenset({
    "curriculum", "vitae", "resume", "profile", "contact",
    "summary", "education", "experience", "skills", "objective",
    "about", "personal", "general", "information", "details",
    "training", "attendance", "confirmation", "page", "address",
    "references", "declaration", "overview", "introduction",
    "employment", "professional", "academic", "achievements",
    "certifications", "hobbies", "interests", "languages",
    "nationality", "marital", "status", "gender", "dob", "birth",
    "date", "born", "photograph", "photo", "signature",
    # Job title words that appear as section headings or role labels at CV tops
    "administrator", "developer", "consultant", "engineer", "analyst",
    "architect", "manager", "specialist", "programmer", "designer",
    "technician", "officer", "director", "executive", "intern", "trainee",
    # German doc-title words that appear before the actual name
    "profil", "lebenslauf", "von",
})

# Matches German/English document title prefixes: "Profil von X", "Lebenslauf von X"
_DOC_PREFIX_RE = re.compile(
    r"^(?:profil|lebenslauf|curriculum\s+vitae|cv|resume|profile)\s+(?:von|of|by)\s+(.+)",
    re.I,
)

_SUMMARY_SKIP_WORDS = frozenset({
    "years", "clients", "projects", "solutions", "systems", "team",
    "management", "delivery", "support", "service", "business",
    "company", "organization", "environment", "global", "leading",
})

# ── Experience extraction ──────────────────────────────────────────────────────

_MONTH_ABBR = (
    r"Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?"
    r"|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?"
)
_DATE_FRAG = rf"(?:(?:{_MONTH_ABBR})[\s,\.]+\d{{2,4}}|\d{{1,2}}[/.]\d{{2,4}}|\d{{4}})"
_DATE_END_FRAG = (
    rf"(?:{_DATE_FRAG}"
    r"|[Pp]resent|[Cc]urrent|[Hh]eute|[Nn]ow|[Tt]ill\s*[Dd]ate|[Oo]ngoing|[Tt]oday)"
)
_DATE_RANGE_RE = re.compile(
    rf"({_DATE_FRAG})\s*(?:–|—|-{{1,2}}|to\b|till\b|until\b|bis\b)\s*({_DATE_END_FRAG})",
    re.I,
)

_ROLE_WORDS_RE = re.compile(
    r"\b(?:engineer|developer|consultant|manager|analyst|architect|lead|senior|junior|"
    r"associate|director|officer|intern|trainee|executive|administrator|coordinator|"
    r"specialist|programmer|designer|expert|head|chief|partner|advisor|contractor|"
    r"technician|supervisor|berater|entwickler|architekt)\b",
    re.I,
)

# Sentences starting with these verbs are activity descriptions, not job titles
_SENTENCE_STARTER_RE = re.compile(
    r"^\s*(?:worked|working|joined|currently|responsible|handling|serving|managing|"
    r"leading|overseeing|reporting|assigned|deployed|engaged)\b",
    re.I,
)


def _clean_date(d: str) -> str:
    return re.sub(r"\s+", " ", d.strip().rstrip(".,;:"))


def _extract_by_date_proximity(experience_text: str) -> list[dict]:
    """
    Fallback experience extractor: scans ±5 lines around each date anchor for
    a job title (role-word match) and company (short capitalised line).
    Used when the labeled field parser returns no results.
    """
    lines = experience_text.splitlines()

    anchors: list[tuple[int, str, str]] = []
    for i, line in enumerate(lines):
        m = _DATE_RANGE_RE.search(line)
        if m:
            anchors.append((i, _clean_date(m.group(1)), _clean_date(m.group(2))))

    if not anchors:
        return []

    entries: list[dict] = []
    seen_dates: set[tuple[str, str]] = set()

    for anchor_idx, (line_idx, start_date, end_date) in enumerate(anchors):
        date_key = (start_date.lower(), end_date.lower())
        if date_key in seen_dates:
            continue
        seen_dates.add(date_key)

        ctx_start = max(0, line_idx - 5)
        ctx_end = min(len(lines), line_idx + 5)
        context = [l.strip() for l in lines[ctx_start:ctx_end] if l.strip()]

        job_title: str | None = None
        company: str | None = None

        for cl in context:
            if _DATE_RANGE_RE.search(cl):
                continue
            if (_ROLE_WORDS_RE.search(cl)
                    and 2 <= len(cl.split()) <= 7
                    and not _SENTENCE_STARTER_RE.match(cl)):
                if job_title is None:
                    job_title = cl

        for cl in context:
            if cl == job_title:
                continue
            if _DATE_RANGE_RE.search(cl):
                continue
            if _ROLE_WORDS_RE.search(cl):
                continue
            if 1 <= len(cl.split()) <= 6 and cl[0].isupper() and not cl.endswith("."):
                company = cl
                break

        block_start = max(0, line_idx - 5)
        block_end = anchors[anchor_idx + 1][0] if anchor_idx + 1 < len(anchors) else len(lines)
        responsibilities = [
            l.strip()
            for l in lines[block_start:block_end]
            if l.strip() and not _DATE_RANGE_RE.search(l)
        ]

        entries.append({
            "job_title": job_title,
            "company": company,
            "start_date": start_date,
            "end_date": end_date,
            "responsibilities": responsibilities,
            "confidence": 0.70,
        })

    return entries


def _extract_experience(experience_text: str) -> list[dict]:
    """
    Tiered experience extraction:
    Tier 1 — labeled field parser (handles VASPP template, German CVs, client-based formats).
    Tier 2 — date-proximity scanner (fallback for non-standard formats).
    """
    if not experience_text:
        return []

    labeled = extract_labeled_experience(experience_text)
    if labeled:
        return labeled

    return _extract_by_date_proximity(experience_text)


# ── Name extraction ────────────────────────────────────────────────────────────

def _is_name_word(w: str) -> bool:
    stripped = w.replace("-", "").replace("'", "").replace(".", "")
    return bool(stripped) and stripped.isalpha()


def _extract_name(text: str) -> str | None:
    # "Profil von Marc Schrod" / "Lebenslauf von X" → extract the real name after the prefix
    for line in text.splitlines()[:5]:
        m = _DOC_PREFIX_RE.match(line.strip())
        if m:
            suffix = m.group(1).strip()
            words = suffix.split()[:4]
            if (len(words) >= 2
                    and all(_is_name_word(w) for w in words)
                    and not any(w.lower() in _HEADING_WORDS for w in words)):
                return " ".join(words)

    for line in text.splitlines()[:15]:
        line = line.strip()
        if not line:
            continue
        if re.search(r'[\d@/:;|\\+_=<>(){}[\]]', line):
            continue
        words = line.split()
        if not (2 <= len(words) <= 4):
            continue
        if not all(_is_name_word(w) for w in words):
            continue
        if not words[0][0].isupper():
            continue
        if any(w.lower() in _HEADING_WORDS for w in words):
            continue
        return line

    label_match = _NAME_LABEL_RE.search(text[:2000])
    if label_match:
        candidate = label_match.group(1).strip()
        words = candidate.split()[:4]
        if len(words) >= 2 and all(_is_name_word(w) for w in words) and not any(
            w.lower() in _HEADING_WORDS for w in words
        ):
            return " ".join(words)

    return None


# ── Skill helpers ─────────────────────────────────────────────────────────────

def _normalise_skill(raw: str) -> str:
    key = re.sub(r"\s+", " ", raw.strip()).lower()
    return SKILLS_ALIASES.get(key, raw)


def _add_skill(
    result_skills: list[ParsedSkill],
    seen: set[str],
    value: str,
    confidence: float,
    source: str,
) -> None:
    canonical = _normalise_skill(value)
    key = canonical.lower()
    if key not in seen:
        seen.add(key)
        result_skills.append(ParsedSkill(value=canonical, confidence=confidence, source=source))


# ── Main parse function ────────────────────────────────────────────────────────

def parse_cv(text: str, sections: dict[str, str] | None = None) -> ParseResult:
    result = ParseResult()

    result.full_name = _extract_name(text)

    email_match = _EMAIL_RE.search(text)
    result.email = email_match.group(0) if email_match else None

    result.phone = None
    for phone_match in _PHONE_RE.finditer(text):
        if sum(c.isdigit() for c in phone_match.group(0)) >= _MIN_PHONE_DIGITS:
            result.phone = phone_match.group(0).strip()
            break

    # Caller may supply pre-computed sections (e.g. LLM-first detector); regex
    # remains the in-process default so direct callers and tests stay synchronous.
    if sections is None:
        sections = detect_sections(text)
    result.raw_sections = sections
    logger.info(f"Raw Sections: {sections}")
    result.skills_raw_text = sections.get("skills")
    result.experience_raw_text = sections.get("experience")

    seen: set[str] = set()

    # ── Layer 2 / 2.5 — skills section ──────────────────────────────────────
    if "skills" in sections:
        skills_text = sections["skills"]
        if _is_sentence_format(skills_text):
            # Prose/sentence format: spaCy POS tagging + vocabulary validation
            # extracts proper noun skill terms and discards narrative noise
            for item in extract_with_spacy(skills_text):
                _add_skill(result.skills, seen, item.value, item.confidence, item.source)
        else:
            # Clean list format: verbatim extraction
            for item in extract_verbatim(skills_text):
                _add_skill(result.skills, seen, item.value, item.confidence, item.source)

    # ── Layer 3 — summary supplemental (additive, always runs) ───────────────
    if "summary" in sections:
        for item in extract_with_spacy(sections["summary"][:2000]):
            if item.value.lower() not in _SUMMARY_SKIP_WORDS:
                _add_skill(result.skills, seen, item.value, 0.70, "summary")

    # ── Layer 3b — fallback chain when no skills section found ───────────────
    if not result.skills:
        if "experience" in sections:
            for item in extract_with_spacy(sections["experience"][:2500]):
                _add_skill(result.skills, seen, item.value, 0.65, "fallback")
        if not result.skills:
            for item in extract_with_spacy(text[300:2500]):
                _add_skill(result.skills, seen, item.value, 0.60, "fallback")

    # ── Layer 4 — ESCO vocabulary matching (additive) ────────────────────────
    esco_scope = "\n".join(filter(None, [
        sections.get("skills", ""),
        sections.get("experience", ""),
        sections.get("summary", ""),
    ])) or text[300:3000]

    for match in match_esco_skills(esco_scope):
        _add_skill(result.skills, seen, match.value, match.confidence, match.source)

    result.skills.sort(key=lambda s: s.confidence, reverse=True)

    if len(result.skills) > 50:
        result.skills = result.skills[:30]

    # ── Experience extraction ─────────────────────────────────────────────────
    if "experience" in sections:
        result.experiences = _extract_experience(sections["experience"])

    return result
