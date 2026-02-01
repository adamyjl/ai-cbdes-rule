import express from 'express'

const app = express()

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

const port = Number(process.env.PORT ?? 3001)
app.listen(port, () => {
  process.stdout.write(`API listening on http://localhost:${port}\n`)
})

