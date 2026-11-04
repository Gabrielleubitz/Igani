#!/usr/bin/env node
/**
 * One-time helper: turns the course videos into a timestamped transcript file.
 *
 *   OPENAI_API_KEY=sk-... node scripts/transcribe-course.mjs "/path/to/folder/with/the/mp4s"
 *   (add --dry-run to only check that ffmpeg can read the files; nothing is sent to OpenAI)
 *
 * Needs Node 18+ and ffmpeg (macOS: `brew install ffmpeg`). For each video it extracts mono 32 kbps audio in 10-minute
 * pieces (small enough for OpenAI's upload limit), transcribes each piece with Whisper, and writes
 * course-transcripts.json next to the videos. Nothing is uploaded anywhere except the audio pieces to OpenAI.
 */
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, extname, join } from 'node:path'

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const dir = args.find((a) => !a.startsWith('--'))
const key = process.env.OPENAI_API_KEY
const PIECE_SEC = 600

if (!dir) throw new Error('Usage: node scripts/transcribe-course.mjs "/path/to/videos" [--dry-run]')
if (!dryRun && !key) throw new Error('Set OPENAI_API_KEY first (the same key the CRM uses).')

const run = (cmd, a) => {
  const r = spawnSync(cmd, a, { encoding: 'utf8' })
  if (r.error) throw new Error(`${cmd} is not installed or failed to start. Install ffmpeg first (macOS: brew install ffmpeg).`)
  if (r.status !== 0) throw new Error(`${cmd} failed: ${r.stderr.slice(-400)}`)
  return r.stdout
}

async function whisper(file, tries = 4) {
  for (let i = 1; i <= tries; i++) {
    const form = new FormData()
    form.append('file', new Blob([readFileSync(file)]), basename(file))
    form.append('model', 'whisper-1')
    form.append('language', 'en')
    form.append('response_format', 'verbose_json')
    form.append('timestamp_granularities[]', 'segment')
    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { authorization: `Bearer ${key}` }, body: form })
    if (res.ok) return (await res.json()).segments ?? []
    if (i === tries || (res.status < 500 && res.status !== 429)) throw new Error(`Whisper failed (${res.status}): ${(await res.text()).slice(0, 200)}`)
    await new Promise((r) => setTimeout(r, 3000 * i))
  }
}

const files = readdirSync(dir)
  .filter((f) => ['.mp4', '.mov', '.m4v', '.mkv'].includes(extname(f).toLowerCase()))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
if (!files.length) throw new Error(`No video files found in ${dir}`)

const out = []
for (const f of files) {
  const m = /^(\d+)\s*[-–.]\s*(.*)\.[^.]+$/.exec(f)
  const ep = m ? Number(m[1]) : out.length + 1
  const title = m ? m[2].trim() : basename(f, extname(f))
  const tmp = mkdtempSync(join(tmpdir(), 'course-'))
  try {
    const duration = Number(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', join(dir, f)]).trim()) || 0
    console.log(`Episode ${ep}: ${title} (${Math.round(duration / 60)} min)`)
    run('ffmpeg', ['-y', '-i', join(dir, f), '-vn', '-ac', '1', '-ar', '16000', '-b:a', '32k', '-f', 'segment', '-segment_time', String(PIECE_SEC), '-reset_timestamps', '1', join(tmp, 'piece%03d.mp3')])
    const pieces = readdirSync(tmp).filter((p) => p.endsWith('.mp3')).sort()
    const segments = []
    for (const [i, p] of pieces.entries()) {
      if (dryRun) continue
      process.stdout.write(`  piece ${i + 1}/${pieces.length}\r`)
      for (const s of await whisper(join(tmp, p))) segments.push({ start: +(s.start + i * PIECE_SEC).toFixed(1), end: +(s.end + i * PIECE_SEC).toFixed(1), text: s.text.trim() })
    }
    out.push({ ep, title, durationSec: Math.round(duration), segments })
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
}

if (dryRun) console.log('Dry run OK: ffmpeg can read all the files.')
else {
  const dest = join(dir, 'course-transcripts.json')
  writeFileSync(dest, JSON.stringify(out))
  console.log(`\nDone. Wrote ${dest} (${out.reduce((n, e) => n + e.segments.length, 0)} lines). Send me that file.`)
}
