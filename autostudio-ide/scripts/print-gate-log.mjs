import process from 'node:process';

async function readStdin() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks).toString('utf8');
}

const raw = await readStdin();
let data;
try {
  data = JSON.parse(raw);
} catch (e) {
  process.stderr.write('Failed to parse JSON from stdin\n');
  process.exit(2);
}

const ok = data?.ok;
const stage = data?.stage;
const done = data?.done;
const error = data?.error;

process.stdout.write(`ok=${ok} stage=${stage} done=${done} error=${error || ''}\n`);

if (Array.isArray(data?.statuses)) {
  process.stdout.write('statuses:\n');
  for (const s of data.statuses) {
    process.stdout.write(`- ${s?.name ?? ''}: ${s?.status ?? ''}\n`);
  }
}

const lines = Array.isArray(data?.log_lines) ? data.log_lines : [];
process.stdout.write(`log_lines=${lines.length}\n`);
process.stdout.write('--- log tail ---\n');
for (const line of lines.slice(-200)) {
  process.stdout.write(String(line) + '\n');
}

