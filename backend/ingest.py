import os
import re
from pathlib import Path

import chromadb
from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction
from langchain_text_splitters import MarkdownHeaderTextSplitter

from config import CHROMA_PATH, EMBEDDING_MODEL

KNOWLEDGE_BASE_PATH = Path(__file__).parent / "knowledge_base"
KB_ROOT = str(KNOWLEDGE_BASE_PATH.resolve())

_SAFE_FILENAME_RE = re.compile(r'^[\w\-]+\.md$')


def safe_kb_path(filename: str) -> str:
    if not _SAFE_FILENAME_RE.match(filename):
        raise ValueError(f"Invalid knowledge base filename: {filename!r}")
    resolved = os.path.realpath(os.path.join(KB_ROOT, filename))
    if not resolved.startswith(KB_ROOT + os.sep):
        raise ValueError("Path traversal detected")
    return resolved

CHUNK_SIZE = 400
CHUNK_OVERLAP = 50

# Doc type is inferred from filename prefix
DOC_TYPE_MAP = {
    "cv": "cv",
    "readme": "readme",
    "career": "narrative",
    "memoir": "narrative",
}

HEADER_SPLITS = [("#", "h1"), ("##", "h2"), ("###", "h3")]


def infer_doc_type(filename: str) -> str:
    for prefix, doc_type in DOC_TYPE_MAP.items():
        if filename.startswith(prefix):
            return doc_type
    return "other"


def load_documents() -> list[dict]:
    docs = []
    for path in sorted(KNOWLEDGE_BASE_PATH.glob("*.md")):
        if path.name == ".gitkeep":
            continue
        text = path.read_text(encoding="utf-8")
        docs.append({"filename": path.stem, "text": text})
    print(f"Loaded {len(docs)} documents from {KNOWLEDGE_BASE_PATH}")
    return docs


def chunk_document(doc: dict) -> list[dict]:
    splitter = MarkdownHeaderTextSplitter(
        headers_to_split_on=HEADER_SPLITS,
        strip_headers=False,
    )
    sections = splitter.split_text(doc["text"])

    chunks = []
    for section in sections:
        text = section.page_content.strip()
        if not text:
            continue

        section_heading = (
            section.metadata.get("h2")
            or section.metadata.get("h1")
            or section.metadata.get("h3")
            or "unknown"
        )

        # Hard-split sections that exceed CHUNK_SIZE words
        words = text.split()
        if len(words) <= CHUNK_SIZE:
            chunks.append(
                {
                    "text": text,
                    "source": doc["filename"],
                    "section": section_heading,
                    "doc_type": infer_doc_type(doc["filename"]),
                }
            )
        else:
            # Slide a window with overlap
            for i in range(0, len(words), CHUNK_SIZE - CHUNK_OVERLAP):
                window = words[i : i + CHUNK_SIZE]
                if not window:
                    break
                chunks.append(
                    {
                        "text": " ".join(window),
                        "source": doc["filename"],
                        "section": section_heading,
                        "doc_type": infer_doc_type(doc["filename"]),
                    }
                )

    return chunks


def build_collection(chunks: list[dict]) -> None:
    embedding_fn = SentenceTransformerEmbeddingFunction(model_name=EMBEDDING_MODEL)

    client = chromadb.PersistentClient(path=CHROMA_PATH)

    # Drop and recreate so re-runs are idempotent
    try:
        client.delete_collection("whoistrs")
    except Exception:
        pass

    collection = client.create_collection(
        name="whoistrs",
        embedding_function=embedding_fn,
    )

    ids = [f"chunk_{i}" for i in range(len(chunks))]
    documents = [c["text"] for c in chunks]
    metadatas = [
        {"source": c["source"], "section": c["section"], "doc_type": c["doc_type"]}
        for c in chunks
    ]

    collection.add(ids=ids, documents=documents, metadatas=metadatas)
    print(f"Stored {len(chunks)} chunks in Chroma at {CHROMA_PATH}")


def main() -> None:
    docs = load_documents()
    if not docs:
        raise SystemExit("No documents found in knowledge_base/. Nothing to ingest.")

    all_chunks: list[dict] = []
    for doc in docs:
        chunks = chunk_document(doc)
        all_chunks.extend(chunks)
        print(f"  {doc['filename']}: {len(chunks)} chunks")

    build_collection(all_chunks)
    print("Ingestion complete.")


if __name__ == "__main__":
    main()
