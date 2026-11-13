import { echoStones, fordStones, giantMushrooms } from '../../world/zones/sideLayout'
/** Frame-loop-owned visual state for the side areas' secrets (written by SecretsDirector, read by the renderers); not React state. */
export const secretFx = {
  /** 0–1 gold wash on the waterfall after the echo puzzle. */
  waterfallGlow: 0,
  /** 0–1 glow of each echo stone (its note playing or touched). */
  echo: echoStones.map(() => 0),
  /** 0–1 how awake each giant mushroom is. */
  mushrooms: giantMushrooms.map(() => 0),
  /** 0–1 glow of each ford stone. */
  ford: fordStones.map(() => 0),
  /** 0–1 the island shrine's light. */
  shrine: 0,
  /** 0–1 the hollow's spore column. */
  spores: 0,
}
