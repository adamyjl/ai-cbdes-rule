from fastapi import APIRouter

from backend.app.schemas import ArchiveEventIn, ArchiveEventOut
from backend.app.services.archive_service import ArchiveService


def _is_suspicious_function_splits(items: list[dict] | None) -> bool:
    if not items:
        return True
    bad = {'if', 'for', 'while', 'switch', 'catch', 'else'}
    for it in items:
        name = str((it or {}).get('name') or '').strip()
        head = name.split('::')[-1] if '::' in name else name
        if head in bad:
            return True
        sig = str((it or {}).get('signature') or '').strip().lower()
        if sig.startswith('else if'):
            return True
    return False


def _strip_comments_keep_len(s: str) -> str:
    from backend.app.services.cpp_splitter import _strip_comments_keep_len as _strip

    return _strip(s)


def _extract_cpp_functions_for_display(*, file_path: str, source: str) -> list[dict]:
    from backend.app.services.cpp_splitter import _control_keywords

    lines = (source or '').splitlines()
    scrub_lines = _strip_comments_keep_len(source or '').splitlines()
    out: list[dict] = []

    i = 0
    while i < len(scrub_lines):
        line = scrub_lines[i].strip()
        if not line or line.startswith('#'):
            i += 1
            continue
        if '(' not in line:
            i += 1
            continue

        sig_start = i
        sig_lines = [scrub_lines[i]]
        j = i
        open_paren = sig_lines[0].count('(') - sig_lines[0].count(')')
        while open_paren > 0 and j + 1 < len(scrub_lines):
            j += 1
            sig_lines.append(scrub_lines[j])
            open_paren += scrub_lines[j].count('(') - scrub_lines[j].count(')')

        head = ' '.join(s.strip() for s in sig_lines).strip()
        head_low = head.lower()
        if head_low.startswith('else if'):
            i += 1
            continue
        if any(head_low.startswith(k + ' ') or head_low.startswith(k + '(') for k in _control_keywords):
            i += 1
            continue
        if ';' in head:
            i += 1
            continue

        brace_line = j
        brace_pos = scrub_lines[brace_line].find('{')
        if brace_pos == -1 and brace_line + 1 < len(scrub_lines) and scrub_lines[brace_line + 1].strip().startswith('{'):
            brace_line = brace_line + 1
            brace_pos = scrub_lines[brace_line].find('{')
        if brace_pos == -1:
            i += 1
            continue

        signature_raw = ' '.join(lines[k].strip() for k in range(sig_start, brace_line + 1))
        m = __import__('re').search(r'([~\w:]+)\s*\(', signature_raw)
        name = (m.group(1) if m else '').strip()
        if not name:
            i += 1
            continue
        name_head = name.split('::')[-1] if '::' in name else name
        if name_head in {'if', 'for', 'while', 'switch', 'catch', 'else'}:
            i += 1
            continue

        start_line = sig_start + 1
        brace_count = 0
        end_line = brace_line
        k = brace_line
        while k < len(scrub_lines):
            for ch in scrub_lines[k]:
                if ch == '{':
                    brace_count += 1
                elif ch == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        end_line = k
                        break
            if brace_count == 0:
                break
            k += 1
        if brace_count != 0:
            i += 1
            continue

        content = '\n'.join(lines[sig_start : end_line + 1]).strip()
        out.append(
            {
                'file_path': str(file_path),
                'name': name,
                'signature': signature_raw.strip(),
                'content': content,
                'comment': '',
            }
        )
        i = end_line + 1
    return out


router = APIRouter(prefix="/archive", tags=["archive"])
archive_service = ArchiveService()


@router.post("/events", response_model=ArchiveEventOut)
def append_event(req: ArchiveEventIn):
    payload = dict(req.payload or {})
    legacy_line = '请根据当前画布中的模块、函数以及它们的连接关系，整合已有实现并生成可编译运行的目标 C++ 代码。'
    improved_line = (
        '根据已有的函数代码和模块连接关系，给出代码模块的描述和简介，整合已有实现代码和调用前后关系，并生成可编译运行的目标 C++代码，'
        '给出所需运行必要的h头文件代码和cpp文件源代码。'
    )
    p = payload.get('prompt')
    if isinstance(p, str) and legacy_line in p:
        payload['prompt'] = p.replace(legacy_line, improved_line)

    ev = archive_service.append_event(req.type, payload)
    return ArchiveEventOut(**ev)


@router.get("/events", response_model=list[ArchiveEventOut])
def list_events(limit: int = 50):
    out: list[ArchiveEventOut] = []
    for ev in archive_service.list_events(limit=limit):
        try:
            if str(ev.get('type') or '') == 'gate.run':
                payload = ev.get('payload') if isinstance(ev.get('payload'), dict) else {}
                function_splits = payload.get('function_splits') if isinstance(payload.get('function_splits'), list) else []
                if _is_suspicious_function_splits(function_splits):
                    files = payload.get('file_splits') if isinstance(payload.get('file_splits'), list) else []
                    if not files:
                        from backend.app.services.gate_workspace import _extract_files_from_markdown

                        files = _extract_files_from_markdown(str(payload.get('generated_result') or ''))
                    rebuilt: list[dict] = []
                    for f in files:
                        if not isinstance(f, dict):
                            continue
                        p = str(f.get('path') or f.get('file_path') or '').strip()
                        c = str(f.get('content') or '').strip()
                        if not p or not c:
                            continue
                        rebuilt.extend(_extract_cpp_functions_for_display(file_path=p, source=c))
                    payload = dict(payload)
                    payload['function_splits'] = rebuilt
                    ev = dict(ev)
                    ev['payload'] = payload
        except Exception:
            pass
        out.append(ArchiveEventOut(**ev))
    return out


@router.get("/events/{event_id}", response_model=ArchiveEventOut)
def get_event(event_id: str):
    ev = archive_service.get_event(event_id)
    if not ev:
        return ArchiveEventOut(id=str(event_id), type='missing', payload={'error': 'not_found'}, ts='')
    return ArchiveEventOut(**ev)
