from dataclasses import dataclass

import anthropic
import chromadb
from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction

from config import (
    ANTHROPIC_API_KEY,
    CHROMA_PATH,
    EMBEDDING_MODEL,
    SIMILARITY_THRESHOLD,
    TOP_K,
)

SYSTEM_PROMPT = """You are a professional profile assistant for Tania, a London-based \
full-stack developer. You answer questions about her background, skills, projects, and \
experience using only the provided document excerpts.

Rules:
- Speak in third person: "Tania built..." not "I built..."
- Only use information present in the provided excerpts
- Cite your source at the end of each factual claim using [source: filename]
- If the excerpts do not contain enough information to answer, say: \
"That detail isn't in my current knowledge base — Tania can answer directly."
- Never invent skills, projects, or experiences
- Keep answers concise: 3–5 sentences unless a longer answer is clearly needed"""


@dataclass
class RAGResponse:
    answer: str
    sources: list[str]


def _get_collection() -> chromadb.Collection:
    embedding_fn = SentenceTransformerEmbeddingFunction(model_name=EMBEDDING_MODEL)
    client = chromadb.PersistentClient(path=CHROMA_PATH)
    return client.get_collection(name="whoistrs", embedding_function=embedding_fn)


def _retrieve(question: str, collection: chromadb.Collection) -> list[dict]:
    results = collection.query(
        query_texts=[question],
        n_results=TOP_K,
        include=["documents", "metadatas", "distances"],
    )

    chunks = []
    for doc, meta, distance in zip(
        results["documents"][0],
        results["metadatas"][0],
        results["distances"][0],
    ):
        # Chroma returns L2 distance; convert to cosine similarity approximation.
        # For normalised embeddings: similarity ≈ 1 - (distance / 2)
        similarity = 1 - (distance / 2)
        if similarity >= SIMILARITY_THRESHOLD:
            chunks.append({"text": doc, "source": meta["source"], "similarity": similarity})

    return chunks


def _build_prompt(question: str, chunks: list[dict]) -> str:
    if not chunks:
        return f"Question: {question}\n\nNo relevant excerpts found."

    excerpt_block = "\n\n".join(
        f"[source: {c['source']}]\n{c['text']}" for c in chunks
    )
    return f"Document excerpts:\n\n{excerpt_block}\n\nQuestion: {question}"


def _call_claude(prompt: str) -> str:
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text


def query(question: str) -> RAGResponse:
    if not question or not question.strip():
        return RAGResponse(answer="Please ask a question about Tania.", sources=[])

    collection = _get_collection()
    chunks = _retrieve(question, collection)
    prompt = _build_prompt(question, chunks)
    answer = _call_claude(prompt)
    sources = list(dict.fromkeys(c["source"] for c in chunks))

    return RAGResponse(answer=answer, sources=sources)
