# ARC-001 森林木屋 · 参考图提示词 v1

词汇取自 docs/ART_DIRECTION.md（cozy wooden structures、tactile warm wood、soft moss、weathered natural stone、warm honey brown、cream、soft amber gold），未引入新风格；遵守 Negative Prompt 的 gothic architecture 禁项。尺寸目标：占地约 5 × 4 m、屋脊高约 4.5 m、门高约 2.1 m（角色约 1.7 m）。门朝正面（+Z）。

## Prompt（正面，front.png）
```text
A single cozy small wooden forest cabin for a premium stylized magical forest fantasy 3D game. One-room log cabin with tactile warm wood walls in warm honey brown and natural bark brown, a steep gabled roof of overlapping wooden shingles covered with patches of soft moss, a weathered natural stone foundation and a short stone chimney on one side, a rounded wooden front door in the center, two small cream-framed windows, and a small amber gold lantern hanging beside the door, unlit. Elegant stylized proportions, soft but clearly defined organic silhouette, slightly organic crooked lines, carefully sculpted forms, subtle geometric simplification, restrained surface detail, high-quality stylized PBR materials with subtle roughness variation, rich but controlled saturation.
Entire cabin visible from foundation to chimney top, front view at eye level, single isolated game asset, centered, neutral light gray background, soft even studio lighting without strong shadows, no ground plane, no scene, no trees, no text, no watermark. Readable from a third-person gameplay camera distance.
```

## Prompt（3/4 视图，three-quarter.png）
以 front.png 作为输入图，要求同一木屋、同一设计：
```text
The exact same wooden cabin as in the attached image, identical design, materials, colors, door, windows, lantern, chimney position and proportions, now shown from a three-quarter front-left view at eye level so the front and the left side wall are both visible. Single isolated game asset, centered, neutral light gray background, soft even studio lighting without strong shadows, no ground plane, no scene, no text, no watermark.
```

## Negative（附加，两张共用）
```text
Photorealistic photography, childish cartoon proportions, excessively cute toy aesthetics, flat mobile-game graphics, Minecraft, voxel art, blocky geometry, overly simplistic low-poly assets, anime cel shading, plastic-looking surfaces, oversaturated candy colors, excessive neon, gothic architecture, grimdark horror, cluttered micro-details, inconsistent scale, muddy textures, noisy materials, blurry silhouettes, multiple buildings, cropped building, ground scenery, fence, people.
```
