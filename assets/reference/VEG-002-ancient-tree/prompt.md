# VEG-002 古树 · 参考图提示词 v1

词汇取自 docs/ART_DIRECTION.md（Master Prompt 的 ancient trees、naturally sculpted tree bark、soft moss、deep forest green、warm honey brown、soft amber gold），未引入新风格。用途：古树高地的地标，玩家点亮三座灯座后逐层发光（根 → 树干 → 树冠）。尺寸目标：游戏内高约 24 m（角色 1.6 m 的 15 倍），树冠宽约 20 m，根系展开约 10 m。发光只来自树皮缝隙中细的暖光纹路，便于 Meshy 拆出 Emission，强弱由代码控制。

## Prompt（正面，front.png）
```text
A single colossal ancient tree for a premium stylized magical forest fantasy 3D game, a majestic landmark. A massive gnarled trunk of naturally sculpted bark in natural bark brown and warm honey brown, wide sprawling roots gripping weathered natural stones and soft moss, a broad layered canopy of rich deep forest green and muted moss green foliage clumps, the crown far wider than the trunk. Thin veins of soft amber gold light run faintly through cracks in the bark of the roots and trunk, gently luminous but not neon. Elegant stylized proportions, memorable silhouette, soft but clearly defined organic shapes, carefully sculpted forms, subtle geometric simplification, restrained surface detail, high-quality stylized PBR materials with subtle roughness variation, rich but controlled saturation.
Entire tree visible from the roots to the top of the canopy, front view at eye level, single isolated game asset, centered, neutral light gray background, soft even studio lighting without strong shadows, no ground plane, no scene, no text, no watermark. Readable from a distance as a landmark.
```

## Negative（附加）
```text
Photorealistic photography, childish cartoon proportions, excessively cute toy aesthetics, flat mobile-game graphics, Minecraft, voxel art, blocky geometry, overly simplistic low-poly assets, anime cel shading, plastic-looking surfaces, oversaturated candy colors, excessive neon, cyberpunk, exaggerated bloom, gothic architecture, grimdark horror, cluttered micro-details, muddy textures, noisy materials, blurry silhouettes, multiple trees, dead leafless tree, twisted horror tree, faces in the bark, cropped tree, ground scenery, light rays, particles, fireflies.
```
