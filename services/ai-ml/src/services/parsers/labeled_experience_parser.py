from __future__ import annotations
import re

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

# Matches "Label: Value" — label is 1-5 words, may contain spaces, German umlauts, &, /
_LABEL_LINE_RE = re.compile(
    r"^([A-Za-züäöÜÄÖß][A-Za-züäöÜÄÖß\s&/]{1,40}?)\s*[:\-]\s*(.+)$"
)

# "Project 10: Apple" or "Project 9: ELM(Riyadh)"
_NUMBERED_PROJECT_RE = re.compile(r"^[Pp]roject\s+\d+\s*:\s*(.+)$")

_ROLE_WORDS_RE = re.compile(
    r"\b(?:engineer|developer|consultant|manager|analyst|architect|lead|senior|junior|"
    r"associate|director|officer|intern|trainee|executive|administrator|coordinator|"
    r"specialist|programmer|designer|expert|head|chief|partner|advisor|contractor|"
    r"technician|supervisor|berater|entwickler|architekt)\b",
    re.I,
)

# Maps label text (lowercased) → internal field name
_LABEL_MAP: dict[str, str] = {
    # job title
    "role": "job_title",
    "title": "job_title",
    "designation": "job_title",
    "position": "job_title",
    "last designation": "job_title",
    "rolle": "job_title",
    # company / client
    "organization": "company",
    "organisation": "company",
    "company": "company",
    "client": "company",
    "employer": "company",
    "kunde": "company",
    # duration
    "duration": "duration",
    "period": "duration",
    "tenure": "duration",
    "project duration": "duration",
    "dauer": "duration",
    "employment period": "duration",
    # responsibilities — signals start of free-text block
    "responsibilities": "resp",
    "roles & responsibilities": "resp",
    "key responsibilities": "resp",
    "roles and responsibilities": "resp",
    "aufgaben": "resp",
    # metadata — stored internally, not exposed
    "environment": "env",
    "tech stack": "env",
    "technologies": "env",
    "technische umgebung": "env",
    "modules": "env",
    "module": "env",
    "version": "env",
    "type": "env",
    "industry": "env",
    "team size": "env",
    "project": "env",
    "projekt": "env",
    "client profile": "env",
}

# Duration-specific labels — date range on these lines is already captured as anchor
_DURATION_LABELS: frozenset[str] = frozenset({
    "duration", "dauer", "project duration", "period", "tenure", "employment period",
})


def _clean_date(d: str) -> str:
    return re.sub(r"\s+", " ", d.strip().rstrip(".,;:"))


def extract_labeled_experience(text: str) -> list[dict]:
    """
    Tiered experience extractor handling VASPP labeled blocks, German CVs,
    client-based formats, numbered project formats, and inline company-date lines.

    Tier 1: labeled field blocks (Organization/Role/Duration, Kunde/Rolle/Dauer, etc.)
    Tier 2: inline "Company - Start to End" with role inferred from adjacent lines
    Only returns entries that have at least a confirmed date range.
    """
    if not text:
        return []

    lines = [l.strip() for l in text.splitlines()]

    # Find all date range anchors
    anchors: list[tuple[int, str, str]] = []
    for i, line in enumerate(lines):
        m = _DATE_RANGE_RE.search(line)
        if m:
            anchors.append((i, _clean_date(m.group(1)), _clean_date(m.group(2))))

    if not anchors:
        return []

    entries: list[dict] = []
    seen_dates: set[tuple[str, str]] = set()

    for anchor_idx, (anchor_line, start_date, end_date) in enumerate(anchors):
        date_key = (start_date.lower(), end_date.lower())
        if date_key in seen_dates:
            continue
        seen_dates.add(date_key)

        # Block: from previous anchor boundary up to 12 lines back,
        # and from anchor line up to next anchor or 25 lines forward
        prev_boundary = anchors[anchor_idx - 1][0] if anchor_idx > 0 else 0
        block_start = max(prev_boundary, anchor_line - 12)
        next_boundary = anchors[anchor_idx + 1][0] if anchor_idx + 1 < len(anchors) else len(lines)
        block_end = min(next_boundary, anchor_line + 25)

        block = lines[block_start:block_end]

        job_title: str | None = None
        company: str | None = None
        responsibilities: list[str] = []
        in_resp_block = False

        for line in block:
            if not line:
                continue

            # Skip lines that contain a date range unless they are labeled duration fields
            if _DATE_RANGE_RE.search(line):
                lm = _LABEL_LINE_RE.match(line)
                if lm and lm.group(1).strip().lower() in _DURATION_LABELS:
                    continue  # dates already captured from anchor
                elif not lm:
                    continue  # bare date line — skip

            # "Project N: ClientName" pattern
            nm = _NUMBERED_PROJECT_RE.match(line)
            if nm:
                if not company:
                    company = nm.group(1).strip().rstrip(".")
                continue

            # Labeled field line
            lm = _LABEL_LINE_RE.match(line)
            if lm:
                label_raw = lm.group(1).strip().lower()
                value = lm.group(2).strip().rstrip(".")
                field = _LABEL_MAP.get(label_raw)

                if field == "job_title":
                    if not job_title:
                        job_title = value
                elif field == "company":
                    if not company:
                        company = value
                elif field == "resp":
                    in_resp_block = True
                    if value and len(value) > 3:
                        responsibilities.append(value)
                elif field == "env":
                    # Metadata — skip entirely, even in resp mode
                    pass
                elif field is None:
                    # Unrecognised label — treat as responsibility if already in resp block
                    if in_resp_block and value and len(value) > 3:
                        responsibilities.append(value)
                continue

            # Non-labeled line
            if in_resp_block:
                if len(line) > 5:
                    responsibilities.append(line)
            elif not job_title and _ROLE_WORDS_RE.search(line) and 2 <= len(line.split()) <= 12:
                job_title = line.rstrip(".")

        # Broad text fallback: when no explicit "Responsibilities:" label is found, capture
        # all substantive lines in the block — bullets, numbered, or plain text.
        if not responsibilities:
            captured = {s for s in (job_title, company) if s}
            for line in block:
                stripped = line.strip()
                if not stripped or len(stripped) <= 10:
                    continue
                if _DATE_RANGE_RE.search(stripped):
                    continue
                if _LABEL_LINE_RE.match(stripped):
                    continue
                if stripped in captured:
                    continue
                clean = re.sub(r"^[•*→▪►\d\.\)\s]+", "", stripped).strip()
                if clean:
                    responsibilities.append(clean)

        # Tier 2: try to extract inline company from the anchor line itself
        # Pattern: "Company Name - Jan 2021 to Present" or "Company, Location - dates"
        if not company:
            anchor_text = lines[anchor_line]
            date_match = _DATE_RANGE_RE.search(anchor_text)
            if date_match:
                prefix = anchor_text[:date_match.start()].strip().strip(".,;:–-").strip()
                words = prefix.split()
                if 1 <= len(words) <= 8 and prefix and prefix[0].isupper():
                    company = prefix

        # Tier 2: try to infer job title from the line immediately after the date anchor
        if not job_title:
            for offset in (1, -1):
                candidate_idx = anchor_line + offset
                if 0 <= candidate_idx < len(lines):
                    candidate = lines[candidate_idx]
                    if (candidate
                            and not _DATE_RANGE_RE.search(candidate)
                            and not _LABEL_LINE_RE.match(candidate)
                            and 2 <= len(candidate.split()) <= 12
                            and (_ROLE_WORDS_RE.search(candidate) or candidate[0].isupper())):
                        job_title = candidate.rstrip(".")
                        break

        if start_date:
            entries.append({
                "job_title": job_title,
                "company": company,
                "start_date": start_date,
                "end_date": end_date,
                "responsibilities": responsibilities[:15],
                "confidence": 0.85 if (job_title or company) else 0.65,
            })

    return entries
