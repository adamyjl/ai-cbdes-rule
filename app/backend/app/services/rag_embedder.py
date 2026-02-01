from __future__ import annotations

from array import array
import os

from backend.app.services.openai_client import get_embedding_model, get_openai_client
from backend.app.services.llm_policy import llm_call


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, str(default)))
    except Exception:
        return default


def _normalize_text(s: str) -> str:
    if s is None:
        return ''
    if not isinstance(s, str):
        s = str(s)
    s = s.replace('\x00', '')
    return s


def _truncate_text(s: str, max_chars: int) -> str:
    s = _normalize_text(s)
    if max_chars <= 0:
        return 'x'
    if len(s) <= max_chars:
        return s if s else 'x'
    return (s[:max_chars]).strip() or 'x'


def _is_input_length_error(e: Exception) -> bool:
    msg = str(e) or ''
    if 'Range of input length' in msg:
        return True
    if 'input length' in msg and 'InvalidParameter' in msg:
        return True
    return False


def embed_texts(texts: list[str]) -> list[list[float]]:
    client = get_openai_client()
    model = get_embedding_model()
    max_batch = _env_int('AI_CBDES_EMBED_BATCH_SIZE', 10)
    max_batch = max(1, min(max_batch, 64))
    max_chars = _env_int('AI_CBDES_EMBED_MAX_CHARS', 7800)
    max_chars = max(64, min(max_chars, 20000))

    out: list[list[float]] = []
    for i in range(0, len(texts), max_batch):
        raw_part = texts[i : i + max_batch]
        part = [_truncate_text(t, max_chars) for t in raw_part]
        try:
            res = llm_call(lambda: client.embeddings.create(model=model, input=part))
        except Exception as e:
            if not _is_input_length_error(e):
                raise

            retry_chars = max(256, int(max_chars * 0.5))
            for _ in range(2):
                part = [_truncate_text(t, retry_chars) for t in raw_part]
                try:
                    res = llm_call(lambda: client.embeddings.create(model=model, input=part))
                    break
                except Exception as e2:
                    if not _is_input_length_error(e2):
                        raise
                    retry_chars = max(256, int(retry_chars * 0.5))
            else:
                raise
        out.extend([d.embedding for d in res.data])
    return out


def pack_embedding(vec: list[float]) -> tuple[bytes, int]:
    a = array('f', vec)
    return a.tobytes(), len(a)
