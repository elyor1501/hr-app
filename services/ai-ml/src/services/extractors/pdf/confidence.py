def compute_overall_confidence(pages):
    if not pages:
        return 0.0
    return round(sum(p.confidence for p in pages) / len(pages), 2)
