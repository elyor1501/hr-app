import json
import time
import os

from services.embeddings.service import EmbeddingService

BASE = os.path.dirname(__file__)

# src/scripts -> src/data/output_docx
DOCX_OUT = os.path.abspath(
    os.path.join(BASE, "../data/output_docx")
)

svc = EmbeddingService()


def load_texts(limit=20):
    texts = []

    if not os.path.exists(DOCX_OUT):
        raise RuntimeError(f"DOCX output folder not found: {DOCX_OUT}")

    for file in os.listdir(DOCX_OUT):
        if not file.endswith(".json"):
            continue

        path = os.path.join(DOCX_OUT, file)

        with open(path, encoding="utf-8") as f:
            data = json.load(f)

        for block in data.get("blocks", []):
            if block["type"] in ("paragraph", "list"):
                txt = block["text"].strip()
                if len(txt) > 30:
                    texts.append(txt)

        if len(texts) >= limit:
            break

    return texts[:limit]


if __name__ == "__main__":
    texts = load_texts(limit=30)

    print("Loaded texts:", len(texts))

    start = time.time()
    vectors = svc.get_embeddings(texts)
    t1 = time.time() - start

    print("First batch call:", round(t1, 3), "sec")
    print("Vector dim:", len(vectors[0]))

    start = time.time()
    vectors2 = svc.get_embeddings(texts)
    t2 = time.time() - start

    print("Second batch (cached):", round(t2, 3), "sec")

    print("Cache speedup:", round(t1 / max(t2, 0.01), 2), "x")
