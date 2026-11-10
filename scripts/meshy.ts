/**
 * Local-only Meshy CLI (never bundled into the game). Reads MESHY_API_KEY from the environment and never prints it.
 *
 *   node scripts/meshy.ts balance
 *   node scripts/meshy.ts estimate --params <file.json> [--endpoint multi-image-to-3d]
 *   node scripts/meshy.ts image-to-3d --asset VEG-001 --image <ref.png> --params <file.json> --max-attempts 2 --max-credits 60
 *   node scripts/meshy.ts multi-image-to-3d --asset ARC-001 --images <a.png,b.png> --params <file.json> --max-attempts 3 --max-credits 90
 *   node scripts/meshy.ts rigging --asset CHR-001 --input-task <taskId> --height 1.7 --max-attempts 2 --max-credits 120
 *   node scripts/meshy.ts animations --asset CHR-001 --rig-task <taskId> --actions 0,1 --max-attempts 2 --max-credits 120
 *   node scripts/meshy.ts library [--category WalkAndRun] [--search idle]      (free)
 *   node scripts/meshy.ts fetch --asset VEG-001 --task <taskId>      (resume polling/downloading an existing task)
 *
 * Paid calls require the explicit --max-attempts/--max-credits authorised by the user; attempts are counted per asset and
 * endpoint, credits per asset across all endpoints, both against the ledger (assets/meshy/ledger.json) before any request
 * is sent. Outputs are downloaded immediately because Meshy deletes API results after 3 days and signed URLs expire.
 */
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { estimateCredits, type MeshyEndpoint } from './meshyPricing.ts'

const API = 'https://api.meshy.ai/openapi/v1'
const LEDGER = 'assets/meshy/ledger.json'
const RAW_DIR = 'assets/meshy/raw'
const ASSET_ID = /^(CHR|VEG|ARC|PRP|INT|CRT)-\d{3}$/
const POLL_MS = 10_000, TIMEOUT_MS = 30 * 60_000

type InputRecord = { file: string; sha256: string }
interface LedgerEntry {
  asset: string; taskId: string; endpoint: MeshyEndpoint; createdAt: string; status: string; estimatedCredits: number
  consumedCredits: number | null; params: Record<string, unknown>; input: InputRecord | InputRecord[] | null; outputDir: string
}
interface MeshyTask { id: string; status: string; progress?: number; consumed_credits?: number; task_error?: { message?: string } | null }

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

/** Every https URL in a task with its JSON path, e.g. ["model_urls.glb", url] or ["result.basic_animations.walking_glb_url", url]. */
function taskUrls(value: unknown, path = ''): [string, string][] {
  if (typeof value === 'string') return value.startsWith('https://') ? [[path, value]] : []
  if (!value || typeof value !== 'object') return []
  return Object.entries(value).flatMap(([key, v]) => taskUrls(v, path ? `${path}.${key}` : key))
}
/** Stable local name: "model_urls.glb" -> "model.glb", "texture_urls.0.normal" -> "texture_normal.png", "result.rigged_character_glb_url" -> "rigged_character.glb". */
function fileName(path: string, url: string) {
  const ext = extname(stripQuery(url)) || '.bin'
  if (path.startsWith('model_urls.')) return path === 'model_urls.pre_remeshed_glb' ? 'model.pre_remeshed.glb' : `model${ext}`
  const name = path.replace(/^result\./, '').replace(/^texture_urls\.(\d+)\./, (_, i: string) => `texture${i === '0' ? '' : i}_`)
    .replace(/^thumbnail_urls\./, 'thumbnail_').replace(/^thumbnail_url$/, 'thumbnail').replace(/_(glb|fbx|usdz|obj)_url$/, '').replace(/_url$/, '')
  return `${name.replace(/[^\w-]+/g, '_')}${ext}`
}

async function pollAndDownload(asset: string, taskId: string, endpoint: MeshyEndpoint) {
  const started = Date.now()
  let task: MeshyTask
  for (;;) {
    task = await api<MeshyTask>(`/${endpoint}/${taskId}`)
    out(`  ${task.status} ${task.progress ?? 0}%`)
    if (['SUCCEEDED', 'FAILED', 'CANCELED'].includes(task.status)) break
    if (Date.now() - started > TIMEOUT_MS) fail(`Timed out waiting for ${taskId}; resume with: fetch --asset ${asset} --task ${taskId}`)
    await new Promise(resolve => setTimeout(resolve, POLL_MS))
  }
  const dir = join(RAW_DIR, asset, taskId).replaceAll('\\', '/')
  await mkdir(dir, { recursive: true })
  // model_url duplicates model_urls.glb.
  if (task.status === 'SUCCEEDED') for (const [path, url] of taskUrls(task)) if (path !== 'model_url') await download(url, join(dir, fileName(path, url)))
  // Keep the task record without signed query strings.
  const record = JSON.parse(JSON.stringify(task, (_, v: unknown) => typeof v === 'string' && v.startsWith('https://') ? stripQuery(v) : v)) as MeshyTask
  await writeFile(join(dir, 'task.json'), `${JSON.stringify(record, null, 2)}\n`)
  await updateLedger(taskId, { status: task.status, consumedCredits: task.consumed_credits ?? null, outputDir: dir })
  out(`${task.status}: ${taskId}, consumed ${task.consumed_credits ?? '?'} credits${task.task_error?.message ? `, error: ${task.task_error.message}` : ''}`)
}

async function dataUri(path: string) {
  const image = await readFile(path)
  const mime = ({ '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' } as Record<string, string>)[extname(path).toLowerCase()] ?? fail('Image must be PNG, JPG or WebP')
  if (image.length > 20 * 1024 * 1024) fail(`${path} exceeds Meshy's 20 MB limit`)
  return { uri: `data:${mime};base64,${image.toString('base64')}`, record: { file: path.replaceAll('\\', '/'), sha256: createHash('sha256').update(image).digest('hex') } }
}

/** Checks the authorised caps against the ledger, then creates the task, records it and downloads its outputs. */
async function createTask(endpoint: MeshyEndpoint, flags: Record<string, string>, params: Record<string, unknown>, body: Record<string, unknown>, input: LedgerEntry['input']) {
  const asset = need(flags, 'asset')
  if (!ASSET_ID.test(asset)) fail(`Asset id "${asset}" does not match the manifest format`)
  const maxAttempts = positiveInt(flags, 'max-attempts'), maxCredits = positiveInt(flags, 'max-credits')
  const estimate = estimateCredits(params, endpoint)
  const ledger = await readLedger(), live = ledger.filter(e => e.asset === asset && e.status !== 'FAILED')
  const attempts = live.filter(e => e.endpoint === endpoint).length
  const spent = live.reduce((sum, e) => sum + (e.consumedCredits ?? e.estimatedCredits), 0)
  if (attempts + 1 > maxAttempts) fail(`${asset} already has ${attempts} non-failed ${endpoint} attempt(s); authorised maximum is ${maxAttempts}`)
  if (spent + estimate > maxCredits) fail(`${asset} would reach ${spent + estimate} credits (spent ${spent} + estimate ${estimate}); authorised maximum is ${maxCredits}`)
  const { balance } = await api<{ balance: number }>('/balance')
  if (balance < estimate) fail(`Balance ${balance} is below the estimated ${estimate} credits`)
  out(`Creating ${endpoint} for ${asset}: estimate ${estimate} credits (spent so far ${spent}/${maxCredits}, attempt ${attempts + 1}/${maxAttempts}, balance ${balance})`)
  const { result: taskId } = await api<{ result: string }>(`/${endpoint}`, { method: 'POST', body: JSON.stringify({ ...params, ...body }) })
  ledger.push({ asset, taskId, endpoint, createdAt: new Date().toISOString(), status: 'PENDING', estimatedCredits: estimate, consumedCredits: null, params, input, outputDir: '' })
  await writeLedger(ledger)
  out(`Task ${taskId} recorded in ${LEDGER}`)
  await pollAndDownload(asset, taskId, endpoint)
}

async function readParams(flags: Record<string, string>) {
  const params = JSON.parse(await readFile(need(flags, 'params'), 'utf8')) as Record<string, unknown>
  if (['image_url', 'image_urls', 'input_task_id'].some(key => key in params)) fail('Params file must not contain image_url(s)/input_task_id; pass them as flags')
  return params
}

async function main() {
  const { command, flags } = args()
  if (command === 'balance') { const b = await api<{ balance: number; monthly_credits: number; permanent_credits: number; monthly_resets_at: number | null }>('/balance'); out(`balance ${b.balance} (monthly ${b.monthly_credits}, permanent ${b.permanent_credits}, resets ${b.monthly_resets_at ? new Date(b.monthly_resets_at).toISOString() : 'n/a'})`) }
  else if (command === 'estimate') out(`${estimateCredits(JSON.parse(await readFile(need(flags, 'params'), 'utf8')) as Record<string, unknown>, (flags.endpoint ?? 'image-to-3d') as MeshyEndpoint)} credits`)
  else if (command === 'image-to-3d') {
    const image = await dataUri(need(flags, 'image'))
    await createTask('image-to-3d', flags, await readParams(flags), { image_url: image.uri }, image.record)
  } else if (command === 'multi-image-to-3d') {
    const images = await Promise.all(need(flags, 'images').split(',').map(dataUri))
    if (images.length > 4) fail('multi-image-to-3d takes at most 4 images')
    await createTask('multi-image-to-3d', flags, await readParams(flags), { image_urls: images.map(i => i.uri) }, images.map(i => i.record))
  } else if (command === 'rigging') {
    const height = Number(need(flags, 'height'))
    if (!(height > 0)) fail('--height must be a positive number of metres')
    await createTask('rigging', flags, { input_task_id: need(flags, 'input-task'), height_meters: height }, {}, null)
  } else if (command === 'animations') {
    const actions = need(flags, 'actions').split(',').map(Number)
    if (!actions.length || actions.length > 10 || !actions.every(Number.isInteger)) fail('--actions must be 1–10 comma-separated integers')
    await createTask('animations', flags, { rig_task_id: need(flags, 'rig-task'), action_ids: actions }, {}, null)
  } else if (command === 'library') {
    const query = new URLSearchParams(Object.entries(flags).filter(([key]) => ['category', 'search', 'sub_category'].includes(key)))
    out(JSON.stringify(await api<unknown>(`/animations/library?${query}`), null, 2))
  } else if (command === 'fetch') {
    const taskId = need(flags, 'task'), entry = (await readLedger()).find(e => e.taskId === taskId) ?? fail(`Task ${taskId} is not in the ledger`)
    await pollAndDownload(need(flags, 'asset'), taskId, entry.endpoint)
  } else fail('Usage: node scripts/meshy.ts <balance|estimate|image-to-3d|multi-image-to-3d|rigging|animations|library|fetch> [--flags]')
}

main().catch((error: unknown) => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1 })
