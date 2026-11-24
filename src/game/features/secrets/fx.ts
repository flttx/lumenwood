import { echoStones, fordStones, giantMushrooms, reefCairns, valeStones } from '../../world/zones/sideLayout'
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
  /** Next expected ford stone index (0..5) for subtle visual beckoning before solving the lake secret. */
  nextFord: 0,
  /** 0–1 glow of each Sunstone Vale standing pillar and its central shrine. */
  vale: valeStones.map(() => 0),
  valeShrine: 0,
  /** 0–1 glow of each Tidewater Reef cairn and overall reef beacon. */
  reef: reefCairns.map(() => 0),
  reefBeacon: 0,
  /** 0–1 transient starlight pulse when activating the Starlight Terrace shrine. */
  starFlare: 0,
}
export function resetSecretFx() {
  secretFx.waterfallGlow = 0; secretFx.shrine = 0; secretFx.spores = 0; secretFx.nextFord = 0
  secretFx.valeShrine = 0; secretFx.reefBeacon = 0; secretFx.starFlare = 0
  secretFx.echo.fill(0); secretFx.mushrooms.fill(0); secretFx.ford.fill(0); secretFx.vale.fill(0); secretFx.reef.fill(0)
}
