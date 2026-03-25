def compute_docx_confidence(blocks):
    if not blocks:
        return 0.0

    return round(
        sum(b.confidence for b in blocks) / len(blocks),
        2,
    )
