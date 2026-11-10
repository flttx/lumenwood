# INT-001 发光植物 · 参考图提示词 v1

词汇取自 docs/ART_DIRECTION.md（Master Prompt v1 的 luminous flowers、soft amber gold、soft moss 与单资产结构），未引入新风格。尺寸目标：高约 0.7 m，以角色（约 1.7 m）膝到腰之间为参照。发光部位只用于花冠，便于拆出 Emissive。

## Prompt
```text
A single small cluster of luminous magical forest flowers growing from a soft mossy mound, for a premium stylized magical forest fantasy 3D game. Five to seven slender curved stems in muted moss green with a few broad elegant leaves, each stem ending in a delicate bell-shaped flower whose petals are cream with a soft amber gold inner glow, gently luminous but not neon. Weathered natural stone pebble partly embedded in the moss. Soft but clearly defined organic silhouette, carefully sculpted forms, subtle geometric simplification, restrained surface detail, delicate botanical details, high-quality stylized PBR materials with subtle roughness variation, rich but controlled saturation.
Whole plant visible including the moss base, front view at slightly elevated eye level, single isolated game asset, centered, neutral light gray background, soft even studio lighting without strong shadows, no ground plane, no scene, no text, no watermark. Readable from a third-person gameplay camera distance.
```

## Negative（附加）
```text
Photorealistic photography, childish cartoon proportions, excessively cute toy aesthetics, flat mobile-game graphics, Minecraft, voxel art, blocky geometry, overly simplistic low-poly assets, anime cel shading, plastic-looking surfaces, oversaturated candy colors, excessive neon, cyberpunk, exaggerated bloom, cluttered micro-details, muddy textures, noisy materials, blurry silhouettes, multiple separate plants, cropped plant, ground scenery, light rays, particles.
```
Negative 前半段取自 Master Negative Prompt；末尾五项是“单体、完整、无场景、光效由代码负责”的直接表述。
