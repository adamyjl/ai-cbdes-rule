from __future__ import annotations

import json
import re

from backend.app.services.llm_policy import llm_call
from backend.app.services.openai_client import get_chat_model, get_openai_client


CPP_REWRITE_SPEC = (
    '生成 C++ 代码改写时需按统一表格字段与编码规范填写与实现：完成日期与姓名按“每个函数一行”分别记录以便追溯与工时统计；改写后文件夹名称采用大驼峰命名（如 BezierSpline），改写后源文件与头文件采用小驼峰命名（如 funBezier.cpp、funBezier.h），改写后路径按实际工程路径填写；改写前类型仅能在“类/函数”中二选一；改写后一级函数名必须同时满足三条约束：提供 Doxygen 函数说明、使用小驼峰且不得包含“_”“.”等分隔符、并作为测试用例中可由 main 直接调用的最上层入口（如 generateBezierPath），二级函数名为一级函数调用的下层函数（如 pointOnCubicBezier），三级函数名为二级函数调用的更下层函数（若有则同样小驼峰命名）；同时需给出函数中文名称（如“贝塞尔曲线”）用于组件展示与检索；整体质量与设计要求为：编译器警告/错误等级必须拉到最高并消除全部告警，代码结构必须包含注释说明、设计文档与函数主体三部分，不允许使用全局变量且静态变量不推荐使用（尽量将状态保存在顶层函数变量中），函数职责应单一，函数/类命名统一采用驼峰法，函数名展示长度建议不超过 12 个汉字，源码统一使用 UTF-8 编码，注释统一采用 Doxygen 格式且使用中文标点；控制流与语言特性限制为：禁止使用 goto，以及在 if-else 的 body 内禁止出现 return、break 等逻辑跳出语句，单个函数代码行数上限为 200 行；代码改写遵循“整体按 C 语言规范书写”的原则：复合函数必须采用 C 风格接口与实现形态，原子函数内部可采用少量 C++ 语法但对外接口必须呈现 C 语法格式，不支持类与模板语法，容器类（如 vector）需改为定长数组或 malloc 动态分配，指针使用方式需统一为“数组化”呈现并保持风格一致，表达式需拆解为清晰的逐步计算节点（禁止 ++/--，+=/-= 等复合赋值必须展开为显式赋值，三目运算符必须改为 if-else）；逻辑控制语句需满足“条件为单一变量、执行体为单一函数、禁止逻辑跳出语句”的约束：if-else 的条件变量应来自变量赋值或函数返回的单值比较，执行体封装为单一原子/复合函数且允许只有 if 无 else，但禁止在 if/else 内提前 return；for 循环必须将起始值、步进值、结束值拆为单一变量并以显式赋值/函数赋值方式获得，循环体同样封装为单一函数；注释细则为：函数头注释按给定 Doxygen 字段模板完整填写（含 @brief、@en_name、@cn_name、@type、@param、@param[IN]/[OUT]、@var、@retval、@granularity、@tag_level1/@tag_level2、@formula、@version、@date、@author 等），复合函数体内局部变量声明/定义必须在行尾注释说明变量含义；结构体字段采用大驼峰命名并在行尾注释中标注物理单位，数组字段在 @field 中用 Array<元素类型, 维度> 书写；枚举、宏定义与宏函数分别按对应 Doxygen 规范注释，其中宏定义可按日常习惯行尾注释即可，宏函数需提供 @tag MACRO_Function 与入参/返回值说明。'
)


def _parse_json(text: str) -> dict:
    text = (text or '').strip()
    try:
        return json.loads(text)
    except Exception:
        m = re.search(r'\{[\s\S]*\}', text)
        if not m:
            return {}
        try:
            return json.loads(m.group(0))
        except Exception:
            return {}


def _clean_str_list(v: object, *, limit: int = 30) -> list[str]:
    out: list[str] = []
    if isinstance(v, list):
        for it in v:
            s = str(it or '').strip()
            if not s:
                continue
            if s not in out:
                out.append(s)
            if len(out) >= limit:
                break
    return out


def _extract_code_markdown(text: str) -> str:
    s = (text or '').strip()
    if not s:
        return ''
    first = re.search(r'^###\s+.+$', s, flags=re.MULTILINE)
    if first:
        s = s[first.start() :].strip()
    pat = re.compile(
        r'(^###\s+.+$\n(?:.|\n)*?^```(?:cpp|c\+\+|c)\s*$\n(?:.|\n)*?^```\s*$)',
        flags=re.MULTILINE,
    )
    blocks = pat.findall(s)
    if blocks:
        return '\n\n'.join(b.strip() for b in blocks if b.strip())
    if '```' in s and ('```cpp' in s.lower() or '```c++' in s.lower()):
        return s
    return ''


def _format_files_to_markdown(files: list[dict]) -> str:
    out: list[str] = []
    for f in files:
        path = str(f.get('path') or '').strip() or 'main.cpp'
        lang = str(f.get('language') or '').strip().lower() or 'cpp'
        content = str(f.get('content') or '').strip()
        if not content:
            continue
        content = re.sub(r'^```[a-zA-Z0-9_+\-]*\s*$', '', content, flags=re.MULTILINE).strip()
        content = re.sub(r'^```\s*$', '', content, flags=re.MULTILINE).strip()
        out.append(f"### {path}\n```{lang}\n{content}\n```")
    return "\n\n".join(out).strip()


def _extract_files_from_markdown(text: str) -> list[dict]:
    s = (text or '').strip()
    if not s:
        return []

    pat = re.compile(
        r'^###\s+(?P<path>.+?)\s*$\n(?:(?:.|\n)*?)^```(?P<lang>cpp|c\+\+|c)\s*$\n(?P<body>(?:.|\n)*?)^```\s*$',
        flags=re.MULTILINE,
    )
    files: list[dict] = []
    for m in pat.finditer(s):
        path = (m.group('path') or '').strip()
        lang = (m.group('lang') or '').strip().lower()
        body = (m.group('body') or '').strip()
        if not body:
            continue
        files.append({'path': path, 'language': 'cpp' if lang in {'cpp', 'c++'} else 'c', 'content': body})

    if files:
        return files

    pat2 = re.compile(
        r'^```(?P<lang>cpp|c\+\+|c)\s*$\n(?P<body>(?:.|\n)*?)^```\s*$',
        flags=re.MULTILINE,
    )
    blocks: list[dict] = []
    for m in pat2.finditer(s):
        lang = (m.group('lang') or '').strip().lower()
        body = (m.group('body') or '').strip()
        if not body:
            continue
        blocks.append({'path': 'main.cpp', 'language': 'cpp' if lang in {'cpp', 'c++'} else 'c', 'content': body})
        if len(blocks) >= 8:
            break
    return blocks


def _looks_like_prompt_echo(text: str, *, prompt: str) -> bool:
    s = (text or '').strip()
    p = (prompt or '').strip()
    if not s or not p:
        return False

    low = s.lower()
    if '【c++代码改写统一规范' in low:
        return True
    if ('# 任务目标' in s and '# 关键约束' in s) or ('附录：' in s and '相关函数' in s):
        return True
    if 'output_schema' in low or '只输出 json' in low:
        return True

    snippets: list[str] = []
    if len(p) >= 80:
        for off in (0, max(0, len(p) // 2 - 40), max(0, len(p) - 120)):
            frag = p[off : off + 80].strip()
            if frag and frag not in snippets:
                snippets.append(frag)
    else:
        snippets.append(p)

    hits = sum(1 for frag in snippets if frag and frag in s)
    if hits >= 2:
        return True

    head = p[:160]
    if head and head in s:
        return True

    return False


def _looks_like_cpp_source(content: str) -> bool:
    s = (content or '').strip()
    if len(s) < 40:
        return False
    low = s.lower()
    if '【c++代码改写统一规范' in low:
        return False
    if '# 任务目标' in s or '# 关键约束' in s or 'output_schema' in low:
        return False

    signals = 0
    for token in ('#include', 'int main', 'void ', 'struct ', 'typedef', 'namespace', 'class '):
        if token in low:
            signals += 1
    if s.count(';') >= 3:
        signals += 1
    if '{' in s and '}' in s:
        signals += 1
    return signals >= 2


def _normalize_rel_posix_path(p: str) -> str:
    p = (p or '').replace('\\', '/').strip()
    parts: list[str] = []
    for part in p.split('/'):
        if not part or part == '.':
            continue
        if part == '..':
            if parts:
                parts.pop()
            continue
        parts.append(part)
    return '/'.join(parts)


def _find_missing_quote_includes(files: list[dict]) -> list[dict]:
    path_set = set()
    normalized_files: list[dict] = []
    for f in files or []:
        if not isinstance(f, dict):
            continue
        rel = _normalize_rel_posix_path(str(f.get('path') or ''))
        if not rel:
            continue
        normalized_files.append({'path': rel, 'content': str(f.get('content') or '')})
        path_set.add(rel)

    missing = []
    inc_re = re.compile(r'^\s*#\s*include\s*"([^"]+)"', re.M)
    for f in normalized_files:
        fpath = str(f.get('path') or '')
        content = str(f.get('content') or '')
        base = '/'.join(fpath.split('/')[:-1])
        for inc in inc_re.findall(content):
            inc = (inc or '').replace('\\', '/').strip()
            if not inc:
                continue
            if inc.startswith('/') or re.match(r'^[a-zA-Z]:', inc):
                continue
            expected = _normalize_rel_posix_path(f'{base}/{inc}' if base else inc)
            if expected and expected not in path_set:
                missing.append({'from': fpath, 'include': inc, 'expected': expected})
    return missing


def _rel_include(from_path: str, to_path: str) -> str:
    from_path = _normalize_rel_posix_path(from_path)
    to_path = _normalize_rel_posix_path(to_path)
    if not from_path or not to_path:
        return to_path
    from_dir = '/'.join(from_path.split('/')[:-1])
    if not from_dir:
        return to_path.split('/')[-1]
    a = from_dir.split('/') if from_dir else []
    b = to_path.split('/')
    i = 0
    while i < len(a) and i < len(b) and a[i] == b[i]:
        i += 1
    up = ['..'] * (len(a) - i)
    down = b[i:]
    rel = '/'.join(up + down)
    return rel or to_path.split('/')[-1]


def _auto_inject_includes(files: list[dict]) -> list[dict]:
    normalized: list[dict] = []
    for f in files or []:
        if not isinstance(f, dict):
            continue
        p = _normalize_rel_posix_path(str(f.get('path') or ''))
        if not p:
            continue
        normalized.append({'path': p, 'language': str(f.get('language') or 'cpp'), 'content': str(f.get('content') or '')})

    type_providers: dict[str, str] = {}
    type_def_re = re.compile(r'typedef\s+struct\s*\{[\s\S]*?\}\s*([A-Za-z_][A-Za-z0-9_]*)\s*;', re.M)
    for f in normalized:
        p = str(f.get('path') or '')
        if not (p.endswith('.h') or p.endswith('.hpp')):
            continue
        txt = str(f.get('content') or '')
        for m in type_def_re.finditer(txt):
            name = str(m.group(1) or '').strip()
            if name and name not in type_providers:
                type_providers[name] = p

    std_needles = [
        ('list', re.compile(r'\bstd::list\b|\blist\s*<', re.M), '<list>'),
        ('string', re.compile(r'\bstd::string\b|\bstring\b', re.M), '<string>'),
        ('map', re.compile(r'\bstd::map\b|\bmap\s*<', re.M), '<map>'),
        ('unordered_map', re.compile(r'\bstd::unordered_map\b|\bunordered_map\s*<', re.M), '<unordered_map>'),
        ('set', re.compile(r'\bstd::set\b|\bset\s*<', re.M), '<set>'),
        ('unordered_set', re.compile(r'\bstd::unordered_set\b|\bunordered_set\s*<', re.M), '<unordered_set>'),
        ('queue', re.compile(r'\bstd::queue\b|\bqueue\s*<', re.M), '<queue>'),
        ('stack', re.compile(r'\bstd::stack\b|\bstack\s*<', re.M), '<stack>'),
        ('pair', re.compile(r'\bstd::pair\b|\bpair\s*<', re.M), '<utility>'),
        ('size_t', re.compile(r'\bsize_t\b', re.M), '<cstddef>'),
    ]
    include_angle_re = re.compile(r'^\s*#\s*include\s*<([^>]+)>', re.M)
    include_quote_re = re.compile(r'^\s*#\s*include\s*"([^"]+)"', re.M)

    def _has_type_definition(txt: str, name: str) -> bool:
        if re.search(rf'\btypedef\s+struct\s*\{{[\s\S]*?\}}\s*{re.escape(name)}\s*;', txt, re.M):
            return True
        if re.search(rf'\bstruct\s+{re.escape(name)}\b', txt):
            return True
        if re.search(rf'\bclass\s+{re.escape(name)}\b', txt):
            return True
        return False

    out: list[dict] = []
    for f in normalized:
        p = str(f.get('path') or '')
        txt = str(f.get('content') or '')
        existing_angle = set(include_angle_re.findall(txt))
        existing_quote = set(_normalize_rel_posix_path(x) for x in include_quote_re.findall(txt))

        need_angle: list[str] = []
        for _key, rx, header in std_needles:
            if rx.search(txt):
                hname = header.strip('<>')
                if hname not in existing_angle:
                    need_angle.append(header)

        need_quote: list[str] = []
        for name, provider in type_providers.items():
            if name == 'main':
                continue
            if not re.search(rf'\b{re.escape(name)}\b', txt):
                continue
            if _has_type_definition(txt, name):
                continue
            if provider == p:
                continue
            rel = _rel_include(p, provider)
            rel_norm = _normalize_rel_posix_path(rel)
            if rel_norm and rel_norm not in existing_quote:
                need_quote.append(rel)

        if not need_angle and not need_quote:
            out.append(f)
            continue

        lines = txt.splitlines()
        insert_at = 0
        for i in range(min(len(lines), 80)):
            if re.match(r'^\s*#\s*include\b', lines[i]):
                insert_at = i + 1
        if insert_at == 0:
            for i in range(min(len(lines), 80)):
                if re.match(r'^\s*#\s*define\b', lines[i]):
                    insert_at = i + 1
                    break

        extra = []
        for h in need_angle:
            extra.append(f'#include {h}')
        for rel in need_quote:
            extra.append(f'#include "{rel}"')
        if extra:
            lines[insert_at:insert_at] = extra + ['']
        f2 = dict(f)
        f2['content'] = '\n'.join(lines) + ('\n' if txt.endswith('\n') else '')
        out.append(f2)
    return out


class OrchestratorService:
    def generate(self, *, prompt: str) -> dict:
        out = self.generate_cpp_code(prompt=prompt)
        return {
            'result': out.get('code'),
            'key_points': out.get('key_points') or [],
            'log': out.get('log'),
        }

    def generate_cpp_code(self, *, prompt: str) -> dict:
        prompt = (prompt or '').strip()

        legacy_line = '请根据当前画布中的模块、函数以及它们的连接关系，整合已有实现并生成可编译运行的目标 C++ 代码。'
        improved_line = (
            '根据已有的函数代码和模块连接关系，给出代码模块的描述和简介，整合已有实现代码和调用前后关系，并生成可编译运行的目标 C++代码，'
            '给出所需运行必要的h头文件代码和cpp文件源代码。'
        )
        if legacy_line in prompt:
            prompt = prompt.replace(legacy_line, improved_line)

        if CPP_REWRITE_SPEC in prompt:
            merged = prompt
        else:
            merged = (
                prompt
                + '\n\n---\n\n'
                + '【C++代码改写统一规范（必须严格遵守）】\n'
                + CPP_REWRITE_SPEC
            ).strip()

        payload = {
            'task': '你是智能驾驶代码生产线的 C/C++ 代码生成器。请基于输入提示词，直接生成目标 C/C++ 源码（可多文件），保证可落地编译。',
            'input': {
                'prompt': merged,
            },
            'output_schema': {
                'code': 'string (用 Markdown 输出，多文件用分段：先给出文件路径标题，再给出对应代码块；必须是可落地的 C/C++ 源码)',
                'key_points': 'string[] (生成/改写时必须关注的要点，10-20条)',
                'log': 'string (简要解释：你如何根据提示词与规范生成代码，包含关键取舍与假设)',
            },
            'rules': [
                '只输出 JSON',
                'code 中不得包含任何密钥或环境变量值',
                '不要复述/粘贴输入提示词内容',
                'code 必须严格按以下结构：对每个文件先输出一行 "### 相对路径"，下一行开始输出对应代码块（```cpp 或 ```c++）',
                '至少输出 1 个文件，若无法确定工程结构则只输出 main.cpp',
            ],
        }

        client = get_openai_client()
        model = get_chat_model()
        def _call():
            return client.chat.completions.create(
                model=model,
                temperature=0,
                messages=[
                    {'role': 'system', 'content': '输出 JSON。不要输出其它内容。'},
                    {'role': 'user', 'content': json.dumps(payload, ensure_ascii=False)},
                ],
                response_format={'type': 'json_object'},
                extra_body={'enable_thinking': False},
            )

        res = llm_call(_call)
        text = (res.choices[0].message.content or '').strip()
        obj = _parse_json(text)

        key_points = _clean_str_list(obj.get('key_points'))
        log = str(obj.get('log') or '').strip()

        code_text = str(obj.get('code') or obj.get('result') or '').strip()
        files = []
        if isinstance(obj.get('files'), list):
            files = [x for x in obj.get('files') if isinstance(x, dict)]
        if not files:
            files = _extract_files_from_markdown(code_text)
        code_md = _format_files_to_markdown(files) if files else ''

        def _is_valid_output(code_md_text: str) -> bool:
            if not code_md_text:
                return False
            if _looks_like_prompt_echo(code_md_text, prompt=merged):
                return False
            extracted_files = _extract_files_from_markdown(code_md_text)
            if not extracted_files:
                return False
            return any(_looks_like_cpp_source(f.get('content') or '') for f in extracted_files)

        if not _is_valid_output(code_md):
            strict_payload = {
                'task': '你是智能驾驶代码生产线的 C/C++ 代码生成器。请只输出可落地编译的 C/C++ 源码。',
                'input': {
                    'prompt': merged,
                },
                'output_schema': {
                    'files': [
                        {
                            'path': 'string (相对路径，例如 main.cpp 或 Control/BezierSpline/funBezier.cpp)',
                            'language': 'string (cpp 或 c)',
                            'content': 'string (纯源码文本，不要 Markdown code fence，不要解释文字)',
                        }
                    ],
                    'key_points': 'string[]',
                    'log': 'string',
                },
                'rules': [
                    '只输出 JSON',
                    'files 至少包含 1 个文件',
                    '严禁复述/粘贴输入提示词、规范、附录或任何非源码文字',
                    'content 只能是纯源码，不得包含 ``` 或 ### 或 Markdown 标题',
                ],
            }

            def _call_strict():
                return client.chat.completions.create(
                    model=model,
                    temperature=0,
                    messages=[
                        {'role': 'system', 'content': '输出 JSON。不要输出其它内容。'},
                        {'role': 'user', 'content': json.dumps(strict_payload, ensure_ascii=False)},
                    ],
                    response_format={'type': 'json_object'},
                    extra_body={'enable_thinking': False},
                )

            res2 = llm_call(_call_strict)
            text2 = (res2.choices[0].message.content or '').strip()
            obj2 = _parse_json(text2)
            key_points2 = _clean_str_list(obj2.get('key_points'))
            log2 = str(obj2.get('log') or '').strip()
            files2: list[dict] = []
            if isinstance(obj2.get('files'), list):
                for it in obj2.get('files'):
                    if not isinstance(it, dict):
                        continue
                    files2.append(
                        {
                            'path': str(it.get('path') or '').strip() or 'main.cpp',
                            'language': str(it.get('language') or 'cpp').strip() or 'cpp',
                            'content': str(it.get('content') or '').strip(),
                        }
                    )
            code_md2 = _format_files_to_markdown(files2)

            if _is_valid_output(code_md2):
                code_md = code_md2
                key_points = key_points2 or key_points
                log = log2 or log
            else:
                code_md = (
                    '### main.cpp\n'
                    '```cpp\n'
                    '#include <iostream>\n\n'
                    'int main() {\n'
                    '  std::cout << "Hello, world!" << std::endl;\n'
                    '  return 0;\n'
                    '}\n'
                    '```\n'
                )
                if not log2:
                    log2 = '模型未返回可验证的 C/C++ 源码输出（可能回显了提示词），已回退到最小可编译示例。'
                log = log2
                key_points = key_points2 or key_points

        extracted_final = _extract_files_from_markdown(code_md)
        missing_includes = _find_missing_quote_includes(extracted_final)
        if missing_includes:
            repair_payload = {
                'task': '你是智能驾驶代码生产线的 C/C++ 代码生成器。给定现有文件集合与缺失的 include 引用，请补全缺失文件并修正 include 路径，使输出文件集合可自洽编译。',
                'input': {
                    'prompt': merged,
                    'missing_includes': missing_includes,
                    'current_files': [
                        {
                            'path': str(f.get('path') or '').strip(),
                            'language': str(f.get('language') or 'cpp').strip() or 'cpp',
                            'content': str(f.get('content') or '').strip(),
                        }
                        for f in extracted_final
                        if isinstance(f, dict)
                    ],
                },
                'output_schema': {
                    'files': [
                        {
                            'path': 'string (相对路径)',
                            'language': 'string (cpp 或 c)',
                            'content': 'string (纯源码文本，不要 Markdown，不要解释文字)',
                        }
                    ],
                    'key_points': 'string[]',
                    'log': 'string',
                },
                'rules': [
                    '只输出 JSON',
                    'files 至少包含 1 个文件',
                    '必须包含 current_files 中的所有文件（内容可按需修正，但不得删掉）',
                    '必须补齐 missing_includes 列表中 expected 对应的文件，或修改 include 使其指向你输出的真实路径',
                    '严禁复述/粘贴输入提示词、规范或 current_files 的非源码信息',
                    'content 只能是纯源码，不得包含 ``` 或 ### 或 Markdown 标题',
                ],
            }

            def _call_repair():
                return client.chat.completions.create(
                    model=model,
                    temperature=0,
                    messages=[
                        {'role': 'system', 'content': '输出 JSON。不要输出其它内容。'},
                        {'role': 'user', 'content': json.dumps(repair_payload, ensure_ascii=False)},
                    ],
                    response_format={'type': 'json_object'},
                    extra_body={'enable_thinking': False},
                )

            try:
                res3 = llm_call(_call_repair)
                text3 = (res3.choices[0].message.content or '').strip()
                obj3 = _parse_json(text3)
                files3: list[dict] = []
                if isinstance(obj3.get('files'), list):
                    for it in obj3.get('files'):
                        if not isinstance(it, dict):
                            continue
                        files3.append(
                            {
                                'path': str(it.get('path') or '').strip() or 'main.cpp',
                                'language': str(it.get('language') or 'cpp').strip() or 'cpp',
                                'content': str(it.get('content') or '').strip(),
                            }
                        )
                code_md3 = _format_files_to_markdown(files3)
                if _is_valid_output(code_md3):
                    extracted3 = _extract_files_from_markdown(code_md3)
                    missing3 = _find_missing_quote_includes(extracted3)
                    if not missing3:
                        code_md = code_md3
                        key_points = _clean_str_list(obj3.get('key_points')) or key_points
                        log = str(obj3.get('log') or '').strip() or log
            except Exception:
                pass

        extracted_final2 = _extract_files_from_markdown(code_md)
        fixed_files = _auto_inject_includes(extracted_final2)
        if fixed_files:
            code_md = _format_files_to_markdown(fixed_files)

        return {'code': code_md, 'key_points': key_points, 'log': log or None}
