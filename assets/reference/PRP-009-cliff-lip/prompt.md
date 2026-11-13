# PRP-009 崖顶岩檐 · 参考图提示词 v1（四视图）

2026-11-12 第三轮（画面、扩图与玩法）：用户授权 Meshy ≤ 150 积分。瀑布溪谷崖顶的岩檐，遮住瀑布顶端与崖顶交界，让水像是从石槽中泻下。游戏内约 9 m 长、3 m 深、2.5 m 高。
沿用 ARC-002 第 3 版的经验：一张图画同一物体的四个视角，裁开后用 multi-image-to-3d 提交；词汇取自 docs/ART_DIRECTION.md 的 Master Prompt v1。

## Prompt（sheet.png，1536x1024；裁成 4 张）
```text
A product turnaround sheet of ONE long natural rock ledge for a premium stylized magical forest fantasy 3D game, shown four times in a clean 2 by 2 grid with wide empty light gray gutters between the panels and nothing crossing the gutters: top left a three-quarter view from the front left and slightly above, top right a straight front elevation, bottom left a straight side elevation, bottom right a three-quarter view from the back right and slightly above. The same object in every panel, identical shape and colours. The ledge: a long flat-topped slab of layered warm gray sedimentary stone, about three times longer than it is deep, its front face made of a few stacked rounded strata, soft moss and small ferns on its top surface and back, a smooth worn shallow channel cut down the middle of the front edge where a stream would pour over, dry with no water. Natural irregular outline but a clean readable silhouette, solid and heavy. Elegant stylized proportions, soft but clearly defined silhouette, carefully sculpted forms, subtle geometric simplification, restrained surface detail, high-quality stylized PBR materials with subtle roughness variation, rich but controlled saturation.
Neutral light gray background, soft even studio lighting without strong shadows, no ground plane, no water, no scene, no text, no labels, no watermark.
```

## Negative（附加）
```text
Photorealistic photography, childish cartoon proportions, excessively cute toy aesthetics, flat mobile-game graphics, Minecraft, voxel art, blocky geometry, overly simplistic low-poly assets, anime cel shading, plastic-looking surfaces, oversaturated candy colors, excessive neon, cyberpunk, exaggerated bloom, gothic architecture, grimdark horror, cluttered micro-details, muddy textures, noisy materials, blurry silhouettes, thin railings, rope, different objects in different panels, overlapping panels, labels, arrows, water, ground scenery, light rays, particles.
```
