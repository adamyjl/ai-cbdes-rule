from __future__ import annotations

import ast
from pathlib import Path

from backend.app.services.code_models import FunctionChunk


def split_python_functions(file_path: str, source: str) -> list[FunctionChunk]:
    try:
        tree = ast.parse(source)
    except SyntaxError:
        return []

    lines = source.splitlines()
    rel = str(Path(file_path))

    chunks: list[FunctionChunk] = []

    class_stack: list[str] = []

    def visit(node: ast.AST) -> None:
        nonlocal class_stack
        if isinstance(node, ast.ClassDef):
            class_stack.append(node.name)
            for child in node.body:
                visit(child)
            class_stack.pop()
            return

        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            start = getattr(node, 'lineno', None)
            end = getattr(node, 'end_lineno', None)
            if not start or not end or start < 1 or end < start:
                return

            code = '\n'.join(lines[start - 1 : end])
            qual = '.'.join(class_stack) if class_stack else ''
            name = node.name
            full_name = f"{qual}.{name}" if qual else name
            function_id = f"py::{rel}::{full_name}::{start}-{end}"
            args = []
            for a in node.args.args:
                args.append(a.arg)
            signature = f"def {full_name}({', '.join(args)})"
            chunks.append(
                FunctionChunk(
                    function_id=function_id,
                    language='python',
                    file_path=rel,
                    start_line=start,
                    end_line=end,
                    name=full_name,
                    signature=signature,
                    code=code,
                )
            )
            return

    for top in getattr(tree, 'body', []):
        visit(top)

    return chunks

