import { ASCENT, BRIDGE, CAMP, EAST_RIDGE_TRAIL, GLADE, GLEN, GLEN_LAKE_TRAIL, HOLLOW, HOLLOW_VALE_TRAIL, NORTH_CORRIDOR, VALE, WETLAND, type gates as GateState } from '../../world/regions'
import type { RouteProgress } from './progress'
import { zoneLanterns } from './routeLayout'

const nearMouth = (x: number, z: number, minX: number, maxX: number, edgeZ: number, padX = 4, reach = 6.5) =>
  x >= minX - padX && x <= maxX + padX && z >= edgeZ - reach && z <= edgeZ + 2.5

/**
 * Contextual unlock hint when the player approaches a closed gated passage (corridor, side loop, light bridge, or ramp).
 * Returns null once the gate is open or when the player is away from locked boundaries.
 */
export function lockedGatePrompt(p: RouteProgress, g: typeof GateState, x: number, z: number): string | null {
  if (!g.north) {
    const campLit = zoneLanterns('camp').filter(i => p.litAt[i] !== null).length
    if (nearMouth(x, z, NORTH_CORRIDOR.minX, NORTH_CORRIDOR.maxX, CAMP.maxZ)) {
      return campLit < 3
        ? `北路被迷雾封住 · 点亮林间营地全部 3 盏灯笼开启（${campLit}/3）`
        : '迷雾正在散去 · 稍候片刻即可北行'
    }
    if (nearMouth(x, z, GLEN_LAKE_TRAIL.minX, GLEN_LAKE_TRAIL.maxX, GLEN.maxZ)) {
      return campLit < 3
        ? `通往镜湖的迷雾尚未散去 · 点亮林间营地全部 3 盏灯笼开启（${campLit}/3）`
        : '迷雾正在散去 · 稍候即可通往镜湖'
    }
    if (nearMouth(x, z, HOLLOW_VALE_TRAIL.minX, HOLLOW_VALE_TRAIL.maxX, HOLLOW.maxZ)) {
      return campLit < 3
        ? `通往阳石林谷的迷雾尚未散去 · 点亮林间营地全部 3 盏灯笼开启（${campLit}/3）`
        : '迷雾正在散去 · 稍候即可通往阳石林谷'
    }
  }
  if (!g.bridge && nearMouth(x, z, BRIDGE.minX, BRIDGE.maxX, WETLAND.maxZ, 5)) {
    const wetlandLit = zoneLanterns('wetland').filter(i => p.litAt[i] !== null).length
    return wetlandLit < 3
      ? `深水渠阻隔了去路 · 点亮萤光湿地全部 3 盏灯笼铺成光桥（${wetlandLit}/3）`
      : '光桥正在铺成 · 稍候片刻即可过河'
  }
  if (!g.ascent) {
    if (nearMouth(x, z, ASCENT.minX, ASCENT.maxX, GLADE.maxZ, 5)) {
      return p.finaleAt === null
        ? '高地坡道被迷雾封住 · 先步入隐秘空地中央汇聚萤火'
        : '萤火光柱正在驱散迷雾 · 稍候即可登上古树高地'
    }
    if (nearMouth(x, z, EAST_RIDGE_TRAIL.minX, EAST_RIDGE_TRAIL.maxX, VALE.maxZ)) {
      return p.finaleAt === null
        ? '东侧高地山径被迷雾封住 · 开启湿地光桥并步入隐秘空地后解锁'
        : '迷雾正在散去 · 稍候即可沿东回径登上高地'
    }
  }
  return null
}
