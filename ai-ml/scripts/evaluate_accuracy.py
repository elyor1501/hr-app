import os
import json
from rapidfuzz.distance import Levenshtein

OUTPUT_DIR = "ai-ml/tests/output"
GROUND_TRUTH_DIR = "ai-ml/tests/ground_truth"

def normalize(text: str) -> str:
    """Normalize whitespace & casing for fair comparison."""
    return " ".join(text.lower().split())

scores = []

print("\n Running PDF accuracy evaluation...\n")

for fname in os.listdir(OUTPUT_DIR):
    if not fname.endswith(".json"):
        continue

    json_path = os.path.join(OUTPUT_DIR, fname)

    # load json
    with open(json_path, encoding="utf-8") as f:
        data = json.load(f)

    # extract real PDF filename
    pdf_name = data.get("file_name")
    if not pdf_name:
        continue

    base_name = pdf_name.replace(".pdf", "")
    gt_file = base_name + ".txt"
    gt_path = os.path.join(GROUND_TRUTH_DIR, gt_file)

    if not os.path.exists(gt_path):
        print(" No ground truth for:", gt_file)
        continue

    # rebuild extracted text from pages
    parts = []
    for p in data.get("pages", []):
        txt = p.get("text")

        if isinstance(txt, dict):
            parts.append(txt.get("text", ""))
        elif isinstance(txt, str):
            parts.append(txt)

    extracted = "\n".join(parts)

    with open(gt_path, encoding="utf-8") as f:
        truth = f.read()

    extracted = normalize(extracted)
    truth = normalize(truth)

    dist = Levenshtein.distance(extracted, truth)
    similarity = 1 - dist / max(len(truth), 1)

    scores.append(similarity)

    print(f"{base_name} → accuracy = {similarity:.3f}")

print("\n----------------------------")

if scores:
    avg = sum(scores) / len(scores)
    print("FILES TESTED:", len(scores))
    print("AVERAGE ACCURACY:", round(avg, 3))

    if avg >= 0.95:
        print(" PASS — >95% requirement satisfied")
    else:
        print(" FAIL — below 95%")
else:
    print(" No matching ground truth files found!")
