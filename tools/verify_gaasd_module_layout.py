import json
import sqlite3
import sys
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple


DB_PATH = "c:/srv/ai-cbdes-rule/data/rag.sqlite3"
TARGET_DISPLAY_NAME_KEYWORD = "计算控制命令"


def parse_field_names(v: Any) -> List[str]:
    try:
        obj = json.loads(str(v or "{}"))
        fs = obj.get("fields") if isinstance(obj, dict) else None
        if not isinstance(fs, list):
            return []
        out: List[str] = []
        for x in fs:
            name = str((x or {}).get("name") or "").strip() if isinstance(x, dict) else ""
            if name:
                out.append(name)
        return out
    except Exception:
        return []


def io_match(out_json: Any, in_json: Any) -> Tuple[int, List[str]]:
    out_names = parse_field_names(out_json)
    in_names = parse_field_names(in_json)
    shared = [n for n in out_names if n in in_names]
    return len(shared), shared


def load_one_module() -> Tuple[str, str, List[Dict[str, Any]], List[Dict[str, Any]]]:
    keyword = TARGET_DISPLAY_NAME_KEYWORD
    if len(sys.argv) >= 2 and str(sys.argv[1]).strip():
        keyword = str(sys.argv[1]).strip()
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()
    cur.execute(
        "select module_key, display_name, nodes_json, edges_json from modules where display_name like ? order by updated_at desc limit 1",
        (f"%{keyword}%",),
    )
    row = cur.fetchone()
    if not row:
        cur.execute(
            "select module_key, display_name, nodes_json, edges_json from modules where display_name like ? order by updated_at desc limit 1",
            ("%控制%",),
        )
        row = cur.fetchone()
    if not row:
        cur.execute("select module_key, display_name, nodes_json, edges_json from modules order by updated_at desc limit 1")
        row = cur.fetchone()
    if not row:
        raise RuntimeError("modules 表为空")

    module_key, display_name, nodes_json, edges_json = row
    try:
        nodes = json.loads(nodes_json or "[]")
    except Exception:
        nodes = []
    try:
        edges = json.loads(edges_json or "[]")
    except Exception:
        edges = []
    if not isinstance(nodes, list):
        nodes = []
    if not isinstance(edges, list):
        edges = []
    con.close()
    return str(module_key or ""), str(display_name or ""), nodes, edges


def main() -> None:
    module_key, display_name, raw_nodes, raw_edges = load_one_module()

    nodes_by_id: Dict[str, Dict[str, Any]] = {}
    nodes_by_function_id: Dict[str, Dict[str, Any]] = {}
    raw_x: Dict[str, float] = {}
    for n in raw_nodes:
        if not isinstance(n, dict):
            continue
        nid = str(n.get("id") or "")
        fid = str(n.get("function_id") or n.get("functionId") or "")
        try:
            rx = float(n.get("x"))
            if nid:
                raw_x[nid] = rx
            if fid:
                raw_x[fid] = rx
        except Exception:
            pass
        if nid:
            nodes_by_id[nid] = n
        if fid:
            nodes_by_function_id[fid] = n

    total_edges = 0
    mapped_edges = 0
    mapped_by_id = 0
    mapped_by_function_id = 0
    swapped_dir = 0
    with_ports = 0
    ports_resolve_ok = 0
    missing_endpoint = 0
    edges_raw_x_reversed = 0

    for e in raw_edges:
        if not isinstance(e, dict):
            continue
        total_edges += 1
        raw_from = str(e.get("from") or e.get("source") or "")
        raw_to = str(e.get("to") or e.get("target") or "")

        from_node = nodes_by_id.get(raw_from) or nodes_by_function_id.get(raw_from)
        to_node = nodes_by_id.get(raw_to) or nodes_by_function_id.get(raw_to)

        if from_node is None or to_node is None:
            missing_endpoint += 1
            continue

        fx = raw_x.get(raw_from)
        tx = raw_x.get(raw_to)
        if fx is not None and tx is not None and fx > tx:
            edges_raw_x_reversed += 1

        if raw_from in nodes_by_id and raw_to in nodes_by_id:
            mapped_by_id += 1
        if raw_from in nodes_by_function_id and raw_to in nodes_by_function_id:
            mapped_by_function_id += 1
        mapped_edges += 1

        f_out = from_node.get("outputsJson") or from_node.get("outputs_json") or "{}"
        f_in = from_node.get("inputsJson") or from_node.get("inputs_json") or "{}"
        t_out = to_node.get("outputsJson") or to_node.get("outputs_json") or "{}"
        t_in = to_node.get("inputsJson") or to_node.get("inputs_json") or "{}"
        fwd_score, fwd_shared = io_match(f_out, t_in)
        rev_score, rev_shared = io_match(t_out, f_in)
        if rev_score > fwd_score:
            swapped_dir += 1
            if rev_shared:
                with_ports += 1
        else:
            if fwd_shared:
                with_ports += 1

        from_out_names = parse_field_names(f_out)
        to_in_names = parse_field_names(t_in)
        chosen_from_port = (rev_shared[0] if rev_score > fwd_score and rev_shared else (fwd_shared[0] if fwd_shared else (from_out_names[0] if from_out_names else "")))
        chosen_to_port = (rev_shared[0] if rev_score > fwd_score and rev_shared else (fwd_shared[0] if fwd_shared else (to_in_names[0] if to_in_names else "")))
        if (not chosen_from_port or chosen_from_port in from_out_names) and (not chosen_to_port or chosen_to_port in to_in_names):
            ports_resolve_ok += 1

    print("=== GAASD 模块展开/布局离线校验 ===")
    print(f"db: {DB_PATH}")
    print(f"module_key: {module_key}")
    print(f"display_name: {display_name}")
    print(f"nodes: {len(raw_nodes)}")
    print(f"edges: {len(raw_edges)}")
    print("--- nodes (raw) ---")
    for i, n in enumerate(raw_nodes[:30]):
        if not isinstance(n, dict):
            continue
        nid = str(n.get('id') or '')
        fid = str(n.get('function_id') or n.get('functionId') or '')
        name = str(n.get('display_name') or n.get('name') or '')
        mod = str(n.get('module') or '')
        x = n.get('x')
        y = n.get('y')
        ins = n.get('inputsJson') or n.get('inputs_json') or '{}'
        outs = n.get('outputsJson') or n.get('outputs_json') or '{}'
        in_names = parse_field_names(ins)
        out_names = parse_field_names(outs)
        print(f"[{i}] id={nid} function_id={fid} name={name} module={mod} x={x} y={y} in={in_names[:4]} out={out_names[:4]}")
    print("--- edges (raw) ---")
    for i, e in enumerate(raw_edges[:40]):
        if not isinstance(e, dict):
            continue
        rf = str(e.get('from') or e.get('source') or '')
        rt = str(e.get('to') or e.get('target') or '')
        print(f"[{i}] from={rf} to={rt} keys={sorted(list(e.keys()))}")
    print("--- edge mapping ---")
    print(f"edges_total: {total_edges}")
    print(f"edges_mapped_any: {mapped_edges}")
    print(f"edges_mapped_by_id: {mapped_by_id}")
    print(f"edges_mapped_by_function_id: {mapped_by_function_id}")
    print(f"edges_missing_endpoint: {missing_endpoint}")
    print("--- io inference ---")
    print(f"edges_swapped_direction_by_io: {swapped_dir}")
    print(f"edges_with_inferred_ports: {with_ports}")
    print(f"edges_ports_resolve_ok_by_first_port_fallback: {ports_resolve_ok}")
    print(f"edges_raw_direction_reversed_by_x: {edges_raw_x_reversed}")

    if missing_endpoint:
        raise SystemExit(2)


if __name__ == "__main__":
    main()
