export function extractPureCppFromMarkdown(md: string) {
  const s = String(md || '')
  const re = /^###\s+(.+?)\s*$\n```(?:cpp|c\+\+|c)\s*\n([\s\S]*?)\n```\s*$/gim
  const files: Array<{ path: string; code: string }> = []
  let m: RegExpExecArray | null
  while ((m = re.exec(s))) {
    const path = String(m[1] || '').trim()
    const code = String(m[2] || '').trim()
    if (code) files.push({ path, code })
  }
  if (!files.length) {
    const re2 = /^```(?:cpp|c\+\+|c)\s*\n([\s\S]*?)\n```\s*$/gim
    while ((m = re2.exec(s))) {
      const code = String(m[1] || '').trim()
      if (code) files.push({ path: 'main.cpp', code })
      break
    }
  }

  if (!files.length) {
    const raw = s.trim()
    if (!raw) return { raw: s, display: '' }
    return { raw: s, display: raw }
  }

  if (files.length === 1) return { raw: s, display: files[0].code }
  const merged = files
    .map((f) => `// ===== ${f.path} =====\n${f.code}`)
    .join('\n\n')
    .trim()
  return { raw: s, display: merged }
}

