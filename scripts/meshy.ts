/**
 * Local-only Meshy CLI (never bundled into the game). Reads MESHY_API_KEY from the environment and never prints it.
 *
 *   node scripts/meshy.ts balance
 *   node scripts/meshy.ts estimate --params <file.json>
 *   node scripts/meshy.ts image-to-3d --asset VEG-001 --image <ref.png> --params <file.json> --max-attempts 2 --max-credits 60
 *   node scripts/meshy.ts fetch --asset VEG-001 --task <taskId>      (resume polling/downloading an existing task)
 *
 * Paid calls require the explicit --max-attempts/--max-credits authorised by the user; both are checked against the
 * ledger (assets/meshy/ledger.json) before any request is sent. Outputs are downloaded immediately because Meshy
 * deletes API results after 3 days and signed URLs expire.
 */
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { estimateCredits } from './meshyPricing.ts'

const API = 'https://api.meshy.ai/openapi/v1'
const LEDGER = 'assets/meshy/ledger.json'
const RAW_DIR = 'assets/meshy/raw'
const ASSET_ID = /^(CHR|VEG|ARC|PRP|INT|CRT)-\d{3}$/
const POLL_MS = 10_000, TIMEOUT_MS = 30 * 60_000

interface LedgerEntry {
  asset: string; taskId: string; endpoint: 'image-to-3d'; createdAt: string; status: string; estimatedCredits: number
  consumedCredits: number | null; params: Record<string, unknown>; input: { file: string; sha256: string } | null; outputDir: string
}
interface MeshyTask {
  id: string; status: string; progress?: number; consumed_credits?: number; task_error?: { message?: string }
  model_urls?: Record<string, string>; texture_urls?: Record<string, string>[]; thumbnail_url?: string; thumbnail_urls?: Record<string, string>
}

const out = (line: string) => process.stdout.write(`${line}\n`)
function fail(message: string): never { throw new Error(message) }

function apiKey() { return process.env.MESHY_API_KEY || fail('MESHY_API_KEY is not set in the environment.') }

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, { ...init, headers: { Authorization: `Bearer ${apiKey()}`, 'Content-Type': 'application/json', ...init.headers } })
  if (!res.ok) fail(`Meshy ${init.method ?? 'GET'} ${path} -> HTTP ${res.status}: ${(await res.text()).slice(0, 500)}`)
  return res.json() as Promise<T>
}

function args() {
  const [command = '', ...rest] = process.argv.slice(2), flags: Record<string, string> = {}
  for (let i = 0; i < rest.length; i += 2) {
    if (!rest[i].startsWith('--') || rest[i + 1] === undefined) fail(`Bad argument near "${rest[i]}"`)
    flags[rest[i].slice(2)] = rest[i + 1]
  }
  return { command, flags }
}
const need = (flags: Record<string, string>, name: string) => flags[name] ?? fail(`Missing --${name}`)
function positiveInt(flags: Record<string, string>, name: string) {
  const value = Number(need(flags, name))
  return Number.isInteger(value) && value > 0 ? value : fail(`--${name} must be a positive integer`)
}

async function readLedger(): Promise<LedgerEntry[]> { return existsSync(LEDGER) ? JSON.parse(await readFile(LEDGER, 'utf8')) as LedgerEntry[] : [] }
async function writeLedger(entries: LedgerEntry[]) { await writeFile(LEDGER, `${JSON.stringify(entries, null, 2)}\n`) }
async function updateLedger(taskId: string, patch: Partial<LedgerEntry>) {
  const entries = await readLedger(), entry = entries.find(e => e.taskId === taskId) ?? fail(`Task ${taskId} is not in the ledger`)
  Object.assign(entry, patch); await writeLedger(entries)
}

const stripQuery = (url: string) => url.split('?')[0]
async function download(url: string, file: string) {
  const res = await fetch(url)
  if (!res.ok) fail(`Download failed (${res.status}) for ${stripQuery(url)}`)
  await writeFile(file, Buffer.from(await res.arrayBuffer()))
  out(`  saved ${file}`)
}

async function pollAndDownload(asset: string, taskId: string) {
  const started = Date.now()
  let task: MeshyTask
  for (;;) {
    task = await api<MeshyTask>(`/image-to-3d/${taskId}`)
    out(`  ${task.status} ${task.progress ?? 0}%`)
    if (['SUCCEEDED', 'FAILED', 'CANCELED'].includes(task.status)) break
    if (Date.now() - started > TIMEOUT_MS) fail(`Timed out waiting for ${taskId}; resume with: fetch --asset ${asset} --task ${taskId}`)
    await new Promise(resolve => setTimeout(resolve, POLL_MS))
  }
  const dir = join(RAW_DIR, asset, taskId).replaceAll('\\', '/')
  await mkdir(dir, { recursive: true })
  if (task.status === 'SUCCEEDED') {
    for (const [format, url] of Object.entries(task.model_urls ?? {})) await download(url, join(dir, `model${format === 'pre_remeshed_glb' ? '.pre_remeshed.glb' : `.${format}`}`))
    for (const [i, maps] of (task.texture_urls ?? []).entries()) for (const [kind, url] of Object.entries(maps)) await download(url, join(dir, `texture${i || ''}_${kind}${extname(stripQuery(url)) || '.png'}`))
    if (task.thumbnail_url) await download(task.thumbnail_url, join(dir, 'thumbnail.png'))
    for (const [view, url] of Object.entries(task.thumbnail_urls ?? {})) await download(url, join(dir, `thumbnail_${view}.png`))
  }
  // Keep the task record without signed query strings.
  const record = JSON.parse(JSON.stringify(task, (_, v: unknown) => typeof v === 'string' && v.startsWith('https://') ? stripQuery(v) : v)) as MeshyTask
  await writeFile(join(dir, 'task.json'), `${JSON.stringify(record, null, 2)}\n`)
  await updateLedger(taskId, { status: task.status, consumedCredits: task.consumed_credits ?? null, outputDir: dir })
  out(`${task.status}: ${taskId}, consumed ${task.consumed_credits ?? '?'} credits${task.task_error?.message ? `, error: ${task.task_error.message}` : ''}`)
}

async function imageTo3d(flags: Record<string, string>) {
  const asset = need(flags, 'asset')
  if (!ASSET_ID.test(asset)) fail(`Asset id "${asset}" does not match the manifest format`)
  const maxAttempts = positiveInt(flags, 'max-attempts'), maxCredits = positiveInt(flags, 'max-credits')
  const params = JSON.parse(await readFile(need(flags, 'params'), 'utf8')) as Record<string, unknown>
  if ('image_url' in params || 'input_task_id' in params) fail('Params file must not contain image_url/input_task_id; pass --image')
  const estimate = estimateCredits(params)
  const ledger = await readLedger(), previous = ledger.filter(e => e.asset === asset && e.status !== 'FAILED')
  const spent = previous.reduce((sum, e) => sum + (e.consumedCredits ?? e.estimatedCredits), 0)
  if (previous.length + 1 > maxAttempts) fail(`${asset} already has ${previous.length} non-failed attempt(s); authorised maximum is ${maxAttempts}`)
  if (spent + estimate > maxCredits) fail(`${asset} would reach ${spent + estimate} credits (spent ${spent} + estimate ${estimate}); authorised maximum is ${maxCredits}`)
  const { balance } = await api<{ balance: number }>('/balance')
  if (balance < estimate) fail(`Balance ${balance} is below the estimated ${estimate} credits`)

  const imagePath = need(flags, 'image'), image = await readFile(imagePath)
  const mime = ({ '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' } as Record<string, string>)[extname(imagePath).toLowerCase()] ?? fail('Image must be PNG, JPG or WebP')
  if (image.length > 20 * 1024 * 1024) fail('Image exceeds Meshy\'s 20 MB limit')
  out(`Creating image-to-3d for ${asset}: estimate ${estimate} credits (spent so far ${spent}/${maxCredits}, attempt ${previous.length + 1}/${maxAttempts}, balance ${balance})`)
  const { result: taskId } = await api<{ result: string }>('/image-to-3d', { method: 'POST', body: JSON.stringify({ ...params, image_url: `data:${mime};base64,${image.toString('base64')}` }) })
  ledger.push({ asset, taskId, endpoint: 'image-to-3d', createdAt: new Date().toISOString(), status: 'PENDING', estimatedCredits: estimate, consumedCredits: null, params, input: { file: imagePath.replaceAll('\\', '/'), sha256: createHash('sha256').update(image).digest('hex') }, outputDir: '' })
  await writeLedger(ledger)
  out(`Task ${taskId} recorded in ${LEDGER}`)
  await pollAndDownload(asset, taskId)
}

async function main() {
  const { command, flags } = args()
  if (command === 'balance') { const b = await api<{ balance: number; monthly_credits: number; permanent_credits: number; monthly_resets_at: number | null }>('/balance'); out(`balance ${b.balance} (monthly ${b.monthly_credits}, permanent ${b.permanent_credits}, resets ${b.monthly_resets_at ? new Date(b.monthly_resets_at).toISOString() : 'n/a'})`) }
  else if (command === 'estimate') out(`${estimateCredits(JSON.parse(await readFile(need(flags, 'params'), 'utf8')) as Record<string, unknown>)} credits`)
  else if (command === 'image-to-3d') await imageTo3d(flags)
  else if (command === 'fetch') await pollAndDownload(need(flags, 'asset'), need(flags, 'task'))
  else fail('Usage: node scripts/meshy.ts <balance|estimate|image-to-3d|fetch> [--flags]')
}

main().catch((error: unknown) => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1 })
