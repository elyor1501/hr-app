from __future__ import annotations
import re
from rapidfuzz import fuzz

SECTION_SYNONYMS: dict[str, list[str]] = {
    "skills": [
        "skills", "technical skills", "core skills", "key skills", "competencies",
        "expertise", "proficiencies", "technologies", "tech stack", "tools",
        "tools & technologies", "tools and technologies", "what i know",
        "strengths", "abilities", "hard skills", "technical competencies",
        "it skills", "it-skills", "tools and technical skills", "technical expertise",
        "domain skills", "sap expertise", "sap modules", "areas of expertise",
        "core competencies", "technical areas", "kompetenzprofil",
        # German
        "kenntnisse", "fachkenntnisse", "kompetenzen", "fähigkeiten",
        "technische kenntnisse", "werkzeuge", "technologien",
        "schwerpunkte", "methoden", "softwarekenntnisse", "it-kenntnisse",
        "softwarekompetenzen", "tools", "tools und technologien",
        "technologien und methoden", "technologien tools methoden",
    ],
    "experience": [
        "experience", "work experience", "professional experience",
        "employment history", "work history", "career history", "employment",
        "positions held", "professional background", "relevant experience",
        "professional history",
        # German
        "berufserfahrung", "erfahrung", "arbeitserfahrung",
        "beruflicher werdegang", "tätigkeiten", "berufliche stationen",
        "berufliche laufbahn", "berufliche erfahrung",
    ],
    "education": [
        "education", "academic background", "educational background",
        "qualifications", "academic qualifications", "degrees", "training",
        "schooling", "academic history",
        # German
        "ausbildung", "bildung", "studium", "schulbildung",
        "akademischer hintergrund", "qualifikationen",
    ],
    "projects": [
        "projects", "personal projects", "side projects", "key projects",
        "notable projects", "portfolio", "technical projects", "open source",
        # German
        "projekte", "eigene projekte", "persönliche projekte",
    ],
    "summary": [
        "summary", "professional summary", "profile", "objective",
        "career objective", "about me", "about", "executive summary",
        "overview", "introduction", "personal statement",
        # German
        "profil", "berufsprofil", "zusammenfassung", "über mich", "kurzprofil",
    ],
    "certifications": [
        "certifications", "certificates", "certifications & awards",
        "licenses", "accreditations", "credentials",
        # German
        "zertifikate", "zertifizierungen", "abschlüsse",
    ],
}

# Colon-ending is the primary, most reliable heading signal.
# ALL-CAPS requires 7+ chars to exclude tech abbreviations (ABAP=4, FIORI=5, ODATA=5).
_HEADING_PATTERNS: list[re.Pattern] = [
    re.compile(r"^.{3,50}:\s*$"),                   # ends with colon — primary signal
    re.compile(r"^#{1,3}\s+.+$"),                   # markdown heading
    re.compile(r"^[A-ZÄÖÜ][A-ZÄÖÜ\s&/\-]{6,40}$"), # ALL-CAPS, min 7 chars total
]

# Explicit no-colon headings — covers CVs where section heading has no trailing colon
_NO_COLON_HEADINGS: frozenset[str] = frozenset({
    "skills", "experience", "education", "projects", "summary",
    "certifications", "profile", "objective", "overview",
    "key skills", "technical skills", "work experience", "professional experience",
    "professional summary", "profile summary", "career summary",
    "technical summary", "areas of expertise",
})

# Last-resort keyword map for headings that match no synonym
_SECTION_KEYWORDS: dict[str, str] = {
    "skills": "skills",
    "experience": "experience",
    "education": "education",
    "projects": "projects",
    "summary": "summary",
    "certifications": "certifications",
}


def _normalise(s: str) -> str:
    return re.sub(r'[^a-z\s]', '', s.lower().replace('-', ' ')).strip()


def _looks_like_heading(line: str) -> bool:
    s = line.strip()
    if not s or len(s) > 55:
        return False
    if _normalise(s) in _NO_COLON_HEADINGS:
        return True
    return any(p.match(s) for p in _HEADING_PATTERNS)


def _classify_heading(heading: str, threshold: int = 78) -> str | None:
    normalised = _normalise(heading.rstrip(":"))

    for section_type, synonyms in SECTION_SYNONYMS.items():        # exact
        for syn in synonyms:
            if normalised == _normalise(syn):
                return section_type

    for section_type, synonyms in SECTION_SYNONYMS.items():        # substring
        for syn in synonyms:
            if _normalise(syn) in normalised:
                return section_type

    for section_type, synonyms in SECTION_SYNONYMS.items():        # fuzzy fallback
        for syn in synonyms:
            if fuzz.ratio(normalised, _normalise(syn)) >= threshold:
                return section_type

    for section_type, keyword in _SECTION_KEYWORDS.items():        # keyword presence
        if keyword in normalised:
            return section_type

    return None

# Strips "X Skills:", "Technical X:", "X Summary:" sub-section labels from lines
# before they enter the skill extractor — prevents them appearing as skill items.
_SUBSECTION_LABEL_RE = re.compile(
    r"^(?:[A-Za-z/\s]{2,30}?(?:skills?|summary|expertise|competencies|knowledge|tools?|stack))\s*[:\-]\s*",
    re.I,
)


def detect_sections(text: str) -> dict[str, str]:
    """
    Returns dict mapping section_type -> concatenated section text.
    Multiple headings that map to the same section type are accumulated (not overwritten).
    This handles CVs with multiple separate skills blocks (Technical Skills, Domain
    Expertise, Tools, etc.) by treating them as one unified skills section.
    Sub-section labels (e.g. "S4 HANA Skills:") are stripped from content lines
    before accumulation so they do not appear as skill items.
    Unknown headings stop accumulation into the current section.
    """
    lines = text.splitlines()
    sections: dict[str, list[str]] = {}
    current: str | None = None

    for line in lines:
        if _looks_like_heading(line):
            section_type = _classify_heading(line)
            if section_type:
                current = section_type
                if current not in sections:
                    sections[current] = []
                # Intentionally do NOT reset sections[current] on re-entry —
                # accumulate content from all headings of the same type.
            else:
                current = None
            continue

        if current is not None:
            # Strip inline sub-section labels from skills content lines
            content_line = line
            if current == "skills" and _SUBSECTION_LABEL_RE.match(line.strip()):
                content_line = _SUBSECTION_LABEL_RE.sub("", line.strip())
            sections[current].append(content_line)

    return {k: "\n".join(v).strip() for k, v in sections.items() if "\n".join(v).strip()}