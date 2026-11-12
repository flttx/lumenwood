# VEG-010 开花灌木 · 参考图提示词 v2

v1（`prompt-v1.md`，参考图 `front-v1.png`）生成的模型丢失了花簇、叶片偏尖碎：小而分散的花被 Meshy 的重网格化与烘焙吃掉。2026-11-12 用户要求“效果优先”重做。v2 把花改为大而集中的球状花团、叶片改为宽圆，并在 Meshy 参数中提高面数上限。词汇仍取自 docs/ART_DIRECTION.md 的 Master Prompt v1，未引入新风格。游戏内高约 1.4 m。

## Prompt（front.png，1024x1024）
```text
A single rounded flowering forest shrub for a premium stylized magical forest fantasy 3D game. A full dome-shaped bush of broad, soft, rounded leaves in deep forest green and muted moss green, crowned with about twelve large, dense, ball-shaped flower clusters in cream and soft blush pink, each cluster as big as a fist-sized sculpted mass of overlapping petals, clearly standing out from the foliage and spread evenly over the top and sides, a few woody stems visible at the base. Elegant stylized proportions, soft but clearly defined organic silhouette, carefully sculpted forms, subtle geometric simplification, restrained surface detail, high-quality stylized PBR materials with subtle roughness variation, rich but controlled saturation.
Whole shrub visible, three-quarter view at slightly elevated eye level, single isolated game asset, centered, neutral light gray background, soft even studio lighting without strong shadows, no ground plane, no scene, no text, no watermark. The flower clusters must read as big solid shapes.
```

## Negative（附加）
```text
Photorealistic photography, childish cartoon proportions, excessively cute toy aesthetics, flat mobile-game graphics, Minecraft, voxel art, blocky geometry, overly simplistic low-poly assets, anime cel shading, plastic-looking surfaces, oversaturated candy colors, excessive neon, cyberpunk, exaggerated bloom, gothic architecture, grimdark horror, cluttered micro-details, muddy textures, noisy materials, blurry silhouettes, tiny scattered flowers, pointed spiky leaves, sparse foliage, pot, vase, tree trunk, multiple separate plants, cropped plant, ground scenery, light rays, particles.
```
