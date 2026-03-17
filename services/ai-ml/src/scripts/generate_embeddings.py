import json
import os
import logging
from dotenv import load_dotenv

from src.services.embeddings.service import EmbeddingService
from src.services.embeddings.rate_limiter import RateLimitExceeded


load_dotenv()

BASE_DIR = os.path.dirname(os.path.dirname(__file__))  # points to src/

INPUT_DIR = os.path.join(BASE_DIR, "data", "output")
OUTPUT_DIR = os.path.join(BASE_DIR, "data", "with_embeddings")

os.makedirs(OUTPUT_DIR, exist_ok=True)



embedding_service = EmbeddingService()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def extract_text_from_pdf(data: dict) -> str:
    texts = []
    for unit in data.get("units", []):
        text_obj = unit.get("text", {})
        if isinstance(text_obj, dict):
            content = text_obj.get("text", "")
            if content:
                texts.append(content)
    return "\n".join(texts)


def extract_text_from_docx(data: dict) -> str:
    texts = []
    for unit in data.get("units", []):
        content = unit.get("text", "")
        if content:
            texts.append(content)
    return "\n".join(texts)

def process_file(filepath: str):
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)

        file_type = data.get("file_type")

        if file_type == "pdf":
            full_text = extract_text_from_pdf(data)
        elif file_type == "docx":
            full_text = extract_text_from_docx(data)
        else:
            logger.warning(f"Skipping unsupported file: {filepath}")
            return

        if not full_text.strip():
            logger.warning(f"No text found in {filepath}")
            return

        # Generate embedding
        embedding = embedding_service.get_embedding(full_text)

        data["embedding"] = embedding

        filename = os.path.basename(filepath)
        output_path = os.path.join(OUTPUT_DIR, filename)

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f)

        logger.info(f"Processed: {filename}")

    except RateLimitExceeded as e:
        logger.error(f"Rate limit exceeded while processing {filepath}: {e}")

    except Exception as e:
        logger.exception(f"Failed processing {filepath}: {e}")

def main():
    logger.info("Starting embedding generation...")

    for root, _, files in os.walk(INPUT_DIR):
        for file in files:
            if file.endswith(".json"):
                process_file(os.path.join(root, file))

    logger.info("Embedding generation completed.")


if __name__ == "__main__":
    main()
