FROM python:3.11-slim

WORKDIR /app

# Prevent Python from writing .pyc files
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

ENV PYTHONPATH=/app/src

RUN apt-get update && apt-get install -y \
  gcc \
  curl \
  poppler-utils \
  tesseract-ocr \
  libmupdf-dev \
  && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

RUN pip install --no-cache-dir -r requirements.txt

# Download spaCy English model (CPU-only, 12MB) for POS-based skill extraction
RUN python -m spacy download en_core_web_sm

# Cache the embedding model in the image so startup is instant and offline-safe
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('BAAI/bge-base-en')"

# Download ESCO skills vocabulary CSV (13,790 skills) — non-fatal if network unavailable
RUN mkdir -p /app/data && \
    curl -L --fail --connect-timeout 30 --max-time 120 \
    "https://esco.ec.europa.eu/sites/default/files/taxonomy/ESCO%20dataset%20-%20v1.2.0/en/skills_en.csv" \
    -o /app/data/skills_en.csv \
    && echo "ESCO vocabulary downloaded: $(wc -l < /app/data/skills_en.csv) rows" \
    || echo "ESCO download failed — built-in 400-skill vocabulary will be active"

COPY src ./src

EXPOSE 8001

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8001"]
