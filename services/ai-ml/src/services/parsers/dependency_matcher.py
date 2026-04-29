from __future__ import annotations
import re
from dataclasses import dataclass

@dataclass
class DependencyMatch:
    value: str
    confidence: float = 0.75
    source: str = "dependency"

# Skill-term pattern — allows: Python, Machine Learning, Node.js, C++, scikit-learn
_SKILL_TERM = r"[\w][\w+#.\-/ ]{0,38}[\w+#.\-/]"

_PATTERNS: list[re.Pattern] = [
    # "proficient/skilled/experienced/expert/fluent in X"
    re.compile(rf"(?:proficient|skilled|experienced|expert|fluent)\s+in\s+({_SKILL_TERM})", re.I),
    # "X developer / engineer / architect / programmer / specialist"
    re.compile(rf"({_SKILL_TERM})\s+(?:developer|engineer|architect|programmer|specialist)\b", re.I),
    # "N years of X" / "N years experience in X"
    re.compile(rf"\d+\+?\s+years?\s+(?:of\s+)?(?:experience\s+(?:in|with)\s+)?({_SKILL_TERM})", re.I),
    # "experience/knowledge/expertise/familiarity with/in/of X"
    re.compile(rf"(?:experience|knowledge|expertise|familiarity|understanding)\s+(?:with|in|of)\s+({_SKILL_TERM})", re.I),
    # "worked with / built with / built using / developed using / using X"
    re.compile(rf"(?:worked?\s+with|working\s+with|built\s+(?:with|using)|developed\s+(?:with|using)|implemented\s+(?:with|using)|using)\s+({_SKILL_TERM})", re.I),
]

_STOPWORDS: frozenset[str] = frozenset({
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "as", "is", "was", "are", "were", "be",
    "been", "being", "have", "has", "had", "do", "does", "did", "will",
    "would", "could", "should", "may", "might", "shall", "team", "various",
    "multiple", "different", "large", "small", "new", "old", "good", "best",
    "clients", "stakeholders", "management", "business", "company", "cross",
    "functional", "internal", "external", "senior", "junior", "lead", "global",
    "local", "remote", "full", "part", "time", "role", "position", "responsibilities",
})

def _is_valid(candidate: str) -> bool:
    s = candidate.strip()
    if len(s) < 2 or len(s) > 45:
        return False
    if s.lower() in _STOPWORDS:
        return False
    if not re.search(r"[a-zA-Z]", s):
        return False
    return True

def extract_dependency_skills(text: str) -> list[DependencyMatch]:
    """
    Scan full CV text for linguistic skill-claim patterns.
    Returns deduplicated list of skill candidates at 0.75 confidence.
    """
    seen: set[str] = set()
    results: list[DependencyMatch] = []
    for pattern in _PATTERNS:
        for match in pattern.finditer(text):
            candidate = match.group(1).strip()
            if _is_valid(candidate):
                key = candidate.lower()
                if key not in seen:
                    seen.add(key)
                    results.append(DependencyMatch(value=candidate))
    return results