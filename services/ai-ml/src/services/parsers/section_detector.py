from __future__ import annotations
import re
from rapidfuzz import fuzz

SECTION_SYNONYMS: dict[str, list[str]] = {
    "skills": [
        "skills", "technical skills", "core skills", "key skills", "competencies",
        "expertise", "proficiencies", "technologies", "tech stack", "tools",
        "tools & technologies", "tools and technologies", "what i know",
        "strengths", "abilities", "hard skills", "technical competencies",
        # German
        "kenntnisse", "fachkenntnisse", "kompetenzen", "fähigkeiten",
        "technische kenntnisse", "werkzeuge", "technologien",
    ],
    "experience": [
        "experience", "work experience", "professional experience",
        "employment history", "work history", "career history", "employment",
        "positions held", "professional background", "relevant experience",
        # German
        "berufserfahrung", "erfahrung", "arbeitserfahrung",
        "beruflicher werdegang", "tätigkeiten", "berufliche stationen",
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

# Heading heuristics — checked before fuzzy matching (faster)
_HEADING_PATTERNS: list[re.Pattern] = [
    re.compile(r"^[A-ZÄÖÜ][A-ZÄÖÜ\s&/\-]{2,40}$"),  # ALL-CAPS
    re.compile(r"^.{3,50}:\s*$"),                       # ends with colon
    re.compile(r"^#{1,3}\s+.+$"),                       # markdown heading
]

def _looks_like_heading(line: str) -> bool:
    s = line.strip()
    return bool(s) and len(s) <= 55 and any(p.match(s) for p in _HEADING_PATTERNS)

def _classify_heading(heading: str, threshold: int = 78) -> str | None:
    normalised = heading.lower().strip().rstrip(":").strip()
    for section_type, synonyms in SECTION_SYNONYMS.items():
        for syn in synonyms:
            if fuzz.ratio(normalised, syn) >= threshold:
                return section_type
    return None

def detect_sections(text: str) -> dict[str, str]:
    """
    Returns dict mapping section_type -> concatenated section text.
    Unknown or unclassified headings are skipped.
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
                continue
        if current is not None:
            sections[current].append(line)

    return {k: "\n".join(v).strip() for k, v in sections.items() if "\n".join(v).strip()}