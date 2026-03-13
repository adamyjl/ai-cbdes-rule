export type DiffOp = { type: 'equal' | 'insert' | 'delete'; value: string };

export type DiffRow = {
  leftNo: number | null;
  rightNo: number | null;
  leftText: string;
  rightText: string;
  kind: 'equal' | 'insert' | 'delete' | 'change';
};

function myersDiff(a: string[], b: string[]): DiffOp[] {
  const n = a.length;
  const m = b.length;
  const max = n + m;
  const v = new Map<number, number>();
  v.set(1, 0);
  const trace: Array<Map<number, number>> = [];

  for (let d = 0; d <= max; d += 1) {
    const vCopy = new Map<number, number>();
    for (const [k, x] of v.entries()) vCopy.set(k, x);
    trace.push(vCopy);

    for (let k = -d; k <= d; k += 2) {
      const down = k === -d || (k !== d && (v.get(k - 1) ?? -1) < (v.get(k + 1) ?? -1));
      let x = down ? (v.get(k + 1) ?? 0) : (v.get(k - 1) ?? 0) + 1;
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) {
        x += 1;
        y += 1;
      }
      v.set(k, x);
      if (x >= n && y >= m) {
        const out: DiffOp[] = [];
        let bx = n;
        let by = m;
        for (let bd = trace.length - 1; bd >= 0; bd -= 1) {
          const tv = trace[bd];
          const kk = bx - by;
          const bdVal = bd;
          const chooseDown = kk === -bdVal || (kk !== bdVal && (tv.get(kk - 1) ?? -1) < (tv.get(kk + 1) ?? -1));
          const prevK = chooseDown ? kk + 1 : kk - 1;
          const prevX = tv.get(prevK) ?? 0;
          const prevY = prevX - prevK;

          while (bx > prevX && by > prevY) {
            out.push({ type: 'equal', value: a[bx - 1] });
            bx -= 1;
            by -= 1;
          }
          if (bd === 0) break;
          if (chooseDown) {
            out.push({ type: 'insert', value: b[prevY] });
          } else {
            out.push({ type: 'delete', value: a[prevX] });
          }
          bx = prevX;
          by = prevY;
        }
        return out.reverse();
      }
    }
  }

  return a.map((x) => ({ type: 'delete', value: x } as DiffOp)).concat(b.map((x) => ({ type: 'insert', value: x } as DiffOp)));
}

export function computeSideBySideLineDiff(oldText: string, newText: string): DiffRow[] {
  const a = String(oldText || '').replace(/\r\n/g, '\n').split('\n');
  const b = String(newText || '').replace(/\r\n/g, '\n').split('\n');

  const ops = myersDiff(a, b);
  const rows: DiffRow[] = [];
  let i = 0;
  let leftNo = 1;
  let rightNo = 1;

  const flushChange = (dels: string[], ins: string[]) => {
    const k = Math.max(dels.length, ins.length);
    for (let j = 0; j < k; j += 1) {
      const hasDel = j < dels.length;
      const hasIns = j < ins.length;
      const kind: DiffRow['kind'] = hasDel && hasIns ? 'change' : hasDel ? 'delete' : 'insert';
      rows.push({
        leftNo: hasDel ? leftNo++ : null,
        rightNo: hasIns ? rightNo++ : null,
        leftText: hasDel ? dels[j] : '',
        rightText: hasIns ? ins[j] : '',
        kind
      });
    }
  };

  while (i < ops.length) {
    const op = ops[i];
    if (op.type === 'equal') {
      rows.push({ leftNo: leftNo++, rightNo: rightNo++, leftText: op.value, rightText: op.value, kind: 'equal' });
      i += 1;
      continue;
    }
    const dels: string[] = [];
    const ins: string[] = [];
    while (i < ops.length && ops[i].type !== 'equal') {
      if (ops[i].type === 'delete') dels.push(ops[i].value);
      else ins.push(ops[i].value);
      i += 1;
    }
    flushChange(dels, ins);
  }
  return rows;
}

