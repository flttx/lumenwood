# VEG-001 针叶树 · 参考图提示词 v1

词汇全部取自 docs/ART_DIRECTION.md（Master Prompt v1 与单资产要求），未引入新风格。尺寸比例对齐灰盒：树高 ≈ 4.8 m、树冠最宽 ≈ 3 m、树干在最低一层枝叶下方清晰可见。

## Prompt
```text
A single stylized conifer tree for a premium stylized magical forest fantasy 3D game. A tall, elegant evergreen with a soft but clearly defined organic silhouette, built from layered tiers of rich foliage clusters in deep forest green and muted moss green. Naturally sculpted tree bark trunk in natural bark brown with tactile warm wood character, clearly visible below the lowest foliage tier, with soft moss around the exposed roots at the base. Carefully sculpted forms, subtle geometric simplification, restrained surface detail, high-quality stylized PBR materials with subtle roughness variation, rich but controlled saturation. Height about 1.6 times the canopy width.
Full tree visible from roots to tip, front view at eye level, single isolated game asset, centered, neutral light gray background, soft even studio lighting without strong shadows, no ground plane, no scene, no text, no watermark. Readable from a third-person gameplay camera distance.
```

## Negative（附加）
```text
Photorealistic photography, childish cartoon proportions, excessively cute toy aesthetics, flat mobile-game graphics, Minecraft, voxel art, blocky geometry, overly simplistic low-poly assets, anime cel shading, plastic-looking surfaces, oversaturated candy colors, excessive neon, cluttered micro-details, muddy textures, noisy materials, blurry silhouettes, multiple trees, cropped tree, ground scenery.
```
Negative 前半段为 Master Negative Prompt 中与植被相关的条目；末尾三项（multiple trees, cropped tree, ground scenery）是单资产要求“单体、完整、无场景”的直接表述。
