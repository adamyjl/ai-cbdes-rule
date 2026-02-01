from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class FunctionChunk:
    function_id: str
    language: str
    file_path: str
    start_line: int
    end_line: int
    name: str
    signature: str
    code: str

