"""
Security verification tests — run with:
  .venv/bin/pytest test_security.py -v
"""
import pytest
from fastapi.testclient import TestClient

from ingest import safe_kb_path
from main import app

client = TestClient(app)


# ── Path traversal ──────────────────────────────────────────────────────────

class TestSafeKbPath:
    def test_traversal_dotdot_raises(self):
        with pytest.raises(ValueError, match="traversal|Invalid"):
            safe_kb_path("../../etc/passwd")

    def test_traversal_absolute_raises(self):
        with pytest.raises(ValueError, match="Invalid"):
            safe_kb_path("/etc/passwd")

    def test_traversal_encoded_raises(self):
        with pytest.raises(ValueError, match="Invalid"):
            safe_kb_path("..%2F..%2Fetc%2Fpasswd")

    def test_invalid_extension_raises(self):
        with pytest.raises(ValueError, match="Invalid"):
            safe_kb_path("cv.txt")

    def test_valid_filename_accepted(self):
        # Does not need the file to exist — just checks the path is returned
        result = safe_kb_path("cv.md")
        assert result.endswith("cv.md")
        assert "knowledge_base" in result


# ── Input validation ────────────────────────────────────────────────────────

class TestQueryValidation:
    def test_empty_string_returns_422(self):
        resp = client.post("/query", json={"question": ""})
        assert resp.status_code == 422

    def test_whitespace_only_returns_422(self):
        resp = client.post("/query", json={"question": "   "})
        assert resp.status_code == 422

    def test_501_chars_returns_422(self):
        resp = client.post("/query", json={"question": "a" * 501})
        assert resp.status_code == 422

    def test_500_chars_accepted(self):
        # 500 chars is the limit — should reach the RAG layer, not be rejected
        # We expect 200 or 500 (RAG error), never 422
        resp = client.post("/query", json={"question": "a" * 500})
        assert resp.status_code != 422

    def test_missing_question_field_returns_422(self):
        resp = client.post("/query", json={})
        assert resp.status_code == 422

    def test_wrong_type_returns_422(self):
        resp = client.post("/query", json={"question": 12345})
        assert resp.status_code == 422
