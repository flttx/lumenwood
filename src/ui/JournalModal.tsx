import { useState } from 'react'
import { useGameStore, type RegionId } from '../state/gameStore'
import { route, SECRET_IDS, type SecretId } from '../game/features/route/progress'
import { zoneLanterns } from '../game/features/route/routeLayout'
import { memories } from '../game/features/secrets/secrets'
import { seeds as seedSpots } from '../game/world/zones/sideLayout'
import { BEACH, CAMP, GLADE, GLEN, GLEN_LAKE_TRAIL, HIGHLAND, HOLLOW, LAKE, OVERLOOK, REEF, STAR_CLIFF, VALE, WETLAND, gates, rectDistance, type Rect } from '../game/world/regions'
import { LanternGlyph, Leaf, SeedGlyph, SparkGlyph } from './decor'
import { REGION_NAMES } from './Hud'

interface MapNode {
  id: RegionId
  x: number
  y: number
  kind: 'main' | 'side'
  secret?: SecretId
}

/** Schematic island layout (North up, South down) mirroring the real world topology. */
const MAP_NODES: readonly MapNode[] = [
  { id: 'starcliff', x: 220, y: 46, kind: 'side' },
  { id: 'highland', x: 220, y: 102, kind: 'main' },
  { id: 'overlook', x: 354, y: 102, kind: 'side', secret: 'overlook' },
  { id: 'glade', x: 220, y: 158, kind: 'main' },
  { id: 'lake', x: 86, y: 210, kind: 'side', secret: 'lake' },
  { id: 'wetland', x: 220, y: 210, kind: 'main' },
  { id: 'vale', x: 354, y: 210, kind: 'side', secret: 'vale' },
  { id: 'glen', x: 86, y: 282, kind: 'side', secret: 'glen' },
  { id: 'camp', x: 220, y: 282, kind: 'main' },
  { id: 'hollow', x: 354, y: 282, kind: 'side', secret: 'hollow' },
  { id: 'beach', x: 220, y: 338, kind: 'side' },
  { id: 'reef', x: 220, y: 386, kind: 'side', secret: 'reef' },
]

interface MapEdge { from: RegionId; to: RegionId; gated?: 'north' | 'bridge' | 'ascent' }
const MAP_EDGES: readonly MapEdge[] = [
  { from: 'reef', to: 'beach' },
  { from: 'beach', to: 'camp' },
  { from: 'beach', to: 'glen' },
  { from: 'beach', to: 'hollow' },
  { from: 'camp', to: 'glen' },
  { from: 'camp', to: 'hollow' },
  { from: 'camp', to: 'wetland', gated: 'north' },
  { from: 'glen', to: 'lake', gated: 'north' },
  { from: 'hollow', to: 'vale', gated: 'north' },
  { from: 'wetland', to: 'lake' },
  { from: 'wetland', to: 'vale' },
  { from: 'wetland', to: 'glade', gated: 'bridge' },
  { from: 'glade', to: 'highland', gated: 'ascent' },
  { from: 'vale', to: 'overlook', gated: 'ascent' },
  { from: 'highland', to: 'overlook' },
  { from: 'highland', to: 'starcliff' },
]

const REGION_LORE: Record<RegionId, string> = {
  camp: '温暖篝火与木屋所在，借日光生出藤桥并点亮三盏灯笼后可通往北方。',
  wetland: '浅水与芦苇间萤火流转，点亮三盏湿地灯笼即可在深水渠上架起光桥。',
  glade: '光桥彼端的隐秘空地，踏入其中会让萤火汇聚成指向高地的光柱。',
  highland: '沉睡古树矗立于此，依次在三座石灯座面向古树按住 E 接通光脉。',
  glen: '西侧峭壁瀑布落入深潭，倾听水声哼唱的顺序并回应三块回声石。',
  hollow: '红杉暗林深处长着七丛巨型蘑菇，走到伞盖下便能唤醒幽谷孢子。',
  lake: '宽阔静谧的浅湖，从东岸起一步接一步踩过六块踏石可唤醒湖心石龛。',
  overlook: '高地东侧面向林海与远山的悬崖，在崖边驻足片刻即可展开全景。',
  beach: '沿营地林径向南走到海浪轻拍的月牙沙滩，沙岸角落藏着微光。',
  vale: '白桦环抱的东侧林谷，靠近或按 F 唤光将四座阳石柱同时点亮。',
  reef: '沿南湾浅滩踏石步入近海岩台，唤醒三座海石可回望整座流光之岛。',
  starcliff: '古树北崖尽头的观星石龛，按 E 可静望北海、星夜与流动极光。',
}

const REGION_SEED_RECTS: Record<RegionId, readonly Rect[]> = {
  camp: [CAMP], wetland: [WETLAND], glade: [GLADE], highland: [HIGHLAND],
  glen: [GLEN, GLEN_LAKE_TRAIL], hollow: [HOLLOW], lake: [LAKE], overlook: [OVERLOOK],
  beach: [BEACH], vale: [VALE], reef: [REEF], starcliff: [STAR_CLIFF],
}

const NODE_BY_ID = new Map(MAP_NODES.map(n => [n.id, n]))

function zoneLitCount(zone: 'camp' | 'wetland' | 'highland') {
  return zoneLanterns(zone).filter(i => route.litAt[i] !== null).length
}

function regionSeedProgress(id: RegionId) {
  const rects = REGION_SEED_RECTS[id]
  let found = 0, total = 0
  seedSpots.forEach((s, i) => {
    const belongs = s.secret ? s.secret === id : rects.some(r => rectDistance(s.x, s.z, r) === 0)
    if (!belongs) return
    total++
    if (route.seedsAt.has(i)) found++
  })
  return { found, total }
}

/** Travel journal overlay (`Tab`): interactive schematic island map + collected forest memories. */
export function JournalModal() {
  const setJournalOpen = useGameStore(s => s.setJournalOpen)
  const region = useGameStore(s => s.region)
  const visitedRegions = useGameStore(s => s.visitedRegions)
  const journey = useGameStore(s => s.journey)
  const seeds = useGameStore(s => s.seeds)
  const [tab, setTab] = useState<'map' | 'memories'>('map')

  const currentRegion: RegionId = region?.name ?? 'camp'
  const [selectedRegion, setSelectedRegion] = useState<RegionId>(currentRegion)
  const foundSeeds = Math.max(seeds.found, route.seedsAt.size)
  const totalSeeds = seeds.total || seedSpots.length
  const solvedSecrets = route.secretsAt.size
  const visited = new Set<RegionId>(visitedRegions)
  visited.add(currentRegion)
  if (route.completedAt.camp !== null) visited.add('camp')
  if (route.completedAt.wetland !== null) visited.add('wetland')
  if (route.finaleAt !== null) visited.add('glade')
  if (route.completedAt.highland !== null) visited.add('highland')
  for (const id of route.secretsAt.keys()) visited.add(id)

  const selectedNode = NODE_BY_ID.get(selectedRegion)!
  const selectedSeeds = regionSeedProgress(selectedRegion)
  const selectedLit = selectedRegion === 'camp' || selectedRegion === 'wetland' || selectedRegion === 'highland' ? zoneLitCount(selectedRegion) : null
  const selectedSecret = selectedNode.secret ? route.secretsAt.has(selectedNode.secret) : null
  const statusTag = selectedRegion === currentRegion ? '当前所在' : visited.has(selectedRegion) ? '已踏足' : '尚未踏足'

  const close = () => setJournalOpen(false)

  return <div className="screen journal-screen" role="dialog" aria-modal="true" aria-label="岛屿手账" onMouseDown={e => { if (e.target === e.currentTarget) close() }}>
    <div className="journal-card glass-card">
      <div className="journal-head">
        <div>
          <div className="eyebrow"><Leaf/>FIELD JOURNAL<Leaf className="flip"/></div>
          <h2 className="journal-title">流光岛屿手账</h2>
        </div>
        <div className="seg-group" role="tablist" aria-label="手账视图">
          <button type="button" role="tab" aria-selected={tab === 'map'} className={tab === 'map' ? 'seg active' : 'seg'} onClick={() => setTab('map')}>岛屿简图</button>
          <button type="button" role="tab" aria-selected={tab === 'memories'} className={tab === 'memories' ? 'seg active' : 'seg'} onClick={() => setTab('memories')}>森林记忆 ({foundSeeds}/{totalSeeds})</button>
        </div>
        <button type="button" className="pill-btn journal-close" onClick={close} aria-label="关闭手账">合上手账 <kbd className="wide">Tab</kbd></button>
      </div>

      {tab === 'map' ? <div className="journal-map-layout">
        <div className="journal-svg-wrap">
          <svg className="journal-svg" viewBox="0 0 440 442" aria-label="流光之森区域简图">
            <defs>
              <radialGradient id="islandGlow" cx="50%" cy="48%" r="48%">
                <stop offset="0%" stopColor="rgba(154,216,166,0.12)"/>
                <stop offset="60%" stopColor="rgba(244,211,146,0.045)"/>
                <stop offset="100%" stopColor="rgba(9,18,16,0)"/>
              </radialGradient>
            </defs>
            {/* Soft sea contour & sanctuary aura */}
            <ellipse cx="220" cy="222" rx="198" ry="204" fill="url(#islandGlow)" stroke="rgba(244,211,146,0.16)" strokeDasharray="4 6"/>
            <ellipse cx="220" cy="222" rx="164" ry="170" fill="none" stroke="rgba(154,216,166,0.08)"/>
            <text x="220" y="16" textAnchor="middle" className="map-compass">北 · 北海星光</text>
            <text x="220" y="436" textAnchor="middle" className="map-compass">南 · 月牙海湾</text>
            {MAP_EDGES.map(edge => {
              const a = NODE_BY_ID.get(edge.from)!, b = NODE_BY_ID.get(edge.to)!
              const open = !edge.gated || gates[edge.gated]
              return <line key={`${edge.from}-${edge.to}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                className={open ? 'map-edge open' : 'map-edge locked'}/>
            })}
            {MAP_NODES.map(node => {
              const isHere = node.id === currentRegion
              const isSelected = node.id === selectedRegion
              const seen = visited.has(node.id)
              const secretSolved = node.secret ? route.secretsAt.has(node.secret) : false
              const litZone = node.id === 'camp' || node.id === 'wetland' || node.id === 'highland' ? zoneLitCount(node.id) : null
              const complete = secretSolved || (litZone !== null && litZone === 3)
              return <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                className={`map-node ${seen ? 'seen' : 'unseen'} ${isHere ? 'here' : ''} ${isSelected ? 'selected' : ''} ${complete ? 'done' : ''}`}
                role="button"
                tabIndex={0}
                aria-label={`${REGION_NAMES[node.id][0]}${isHere ? '（当前位置）' : ''}`}
                aria-pressed={isSelected}
                onClick={() => setSelectedRegion(node.id)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedRegion(node.id) } }}
              >
                {isHere && <circle r="19" className="map-pulse"/>}
                {isSelected && <circle r="16" className="map-select-ring"/>}
                <circle r={node.kind === 'main' ? 12 : 9.5} className="map-dot"/>
                {complete && <circle r="4" className="map-core"/>}
                <text y={node.kind === 'main' ? 24 : 21} textAnchor="middle" className="map-label">{REGION_NAMES[node.id][0]}</text>
                {litZone !== null && <text y="3.5" textAnchor="middle" className="map-count">{litZone}</text>}
              </g>
            })}
          </svg>
        </div>
        <div className="journal-side">
          <div className="journal-stat-card" aria-live="polite">
            <div className="journal-stat-top">
              <span className="summary-k">{selectedRegion === currentRegion ? '当前位置' : '区域札记'}</span>
              <span className={selectedRegion === currentRegion ? 'journal-badge here' : visited.has(selectedRegion) ? 'journal-badge seen' : 'journal-badge'}>{statusTag}</span>
            </div>
            <strong>{REGION_NAMES[selectedRegion][0]}</strong>
            <small>{REGION_NAMES[selectedRegion][1]}</small>
            <p className="journal-lore">{REGION_LORE[selectedRegion]}</p>
            <div className="journal-region-checks">
              {selectedLit !== null && <span className="stat-chip"><LanternGlyph lit={selectedLit === 3}/>灯火 {selectedLit}/3</span>}
              {selectedSecret !== null && <span className="stat-chip"><SparkGlyph/>秘境 {selectedSecret ? '已解开' : '待探寻'}</span>}
              {selectedSeeds.total > 0 && <span className="stat-chip"><SeedGlyph/>种子 {selectedSeeds.found}/{selectedSeeds.total}</span>}
              {selectedRegion === 'camp' && <span className="stat-chip">日光藤桥 · {route.sunlight.grownAt !== null ? '已长成' : '待唤醒'}</span>}
            </div>
          </div>
          <div className="journal-metrics">
            <div className="metric-row"><span><LanternGlyph lit/>全岛灯火</span><strong>{journey.lit}/{journey.total || 9}</strong></div>
            <div className="metric-row"><span><SeedGlyph/>光之种子</span><strong>{foundSeeds}/{totalSeeds}</strong></div>
            <div className="metric-row"><span><SparkGlyph/>秘境回响</span><strong>{solvedSecrets}/{SECRET_IDS.length}</strong></div>
          </div>
          <p className="journal-legend">点击任意节点可查看该区札记与进度；实线为已连通林径，虚线待前置灯火开启。</p>
        </div>
      </div> : <div className="journal-memories" aria-label="已收集的森林记忆">
        {memories.map((line, i) => {
          const unlocked = i < foundSeeds
          return <div key={i} className={unlocked ? 'memory-row unlocked' : 'memory-row locked'}>
            <span className="memory-idx">{String(i + 1).padStart(2, '0')}</span>
            <p>{unlocked ? line : '尚未拾取的光之种子 · 仍在林间静候'}</p>
          </div>
        })}
      </div>}
    </div>
  </div>
}
