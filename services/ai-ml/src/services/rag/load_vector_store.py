import json
from pathlib import Path
from services.rag.in_memory_store import InMemoryVectorStore
 
 
EMBEDDING_BASE = Path("services/data/embeddings")
 
 
def load_embeddings_into_memory() -> InMemoryVectorStore:
    """
    Load all chunk embeddings from disk into RAM vector store.
    """
 
    store = InMemoryVectorStore()
 
    if not EMBEDDING_BASE.exists():
        print("Embedding directory does not exist.")
        return store
 
    total_files = 0
    total_chunks = 0
 
    for file in EMBEDDING_BASE.glob("*.json"):
        total_files += 1
 
        try:
            with open(file, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception as e:
            print(f"Failed reading {file.name}: {e}")
            continue
 
        source_file = data.get("source_file", file.name)
        chunks = data.get("chunks", [])
 
        for chunk in chunks:
            text_chunk = chunk.get("text_chunk")
            embedding = chunk.get("embedding")
 
            if not text_chunk or not embedding:
                continue
 
            store.add(
                source_file=source_file,
                text_chunk=text_chunk,
                embedding=embedding,
            )
 
            total_chunks += 1
 
    print(f"Loaded {total_chunks} chunks from {total_files} files into RAM.")
 
    return store
 